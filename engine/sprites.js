/**
 * SAMURAI USAGI — VISUAL DNA SPRITE FACTORY
 * ==========================================
 * Implements every rule from the Visual DNA system as working code.
 * Produces procedural pixel-art sprites, portraits, tilesets, and
 * animation frames following techniques extracted from FF6, Chrono
 * Trigger, Tactics Ogre, Celeste, and Octopath Traveler.
 *
 * SOURCE GAME TECHNIQUES IMPLEMENTED:
 *   FF6:     15-color palette discipline, character proportions, battle stances
 *   CT:      Diagonal energy lines, personality in idle, 120+ animation fluidity
 *   Celeste: Sub-pixel animation via highlight shifting
 *   Octopath: HD-2D parallax depth, atmospheric particles
 *   TO:      Muted palettes for moral weight
 *   DQV:    Warm pastoral palettes, life-stage sprite changes
 */

// ═══════════════════════════════════════════════════════════════
// PART 1: COLOR SCIENCE — Palette Ramps & Era Palettes
// ═══════════════════════════════════════════════════════════════

/**
 * Convert hex color to HSL components.
 * Returns { h: 0-360, s: 0-100, l: 0-100 }
 */
function hexToHSL(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Convert HSL to hex color string.
 * Clamps all values to valid ranges.
 */
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Parse hex to RGB object
 */
function hexToRGB(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

/**
 * BUILD A 4-STEP COLOR RAMP (FF6 hue-shift technique)
 *
 * RULE: Never just darken/lighten the same hue (that's pillow shading).
 * Shadows shift hue toward blue/purple, highlights shift toward yellow/gold.
 * Saturation: shadows slightly more saturated, highlights slightly less.
 * Value steps: ~20-25% brightness difference between each step.
 *
 * Returns [darkest, shadow, base, highlight]
 */
function buildRamp(baseHex) {
  const hsl = hexToHSL(baseHex);
  return [
    hslToHex(hsl.h + 5, Math.min(100, hsl.s + 10), Math.max(5, hsl.l - 25)),   // darkest: warm hue shift, more saturated
    hslToHex(hsl.h + 2, Math.min(100, hsl.s + 5), Math.max(5, hsl.l - 12)),     // shadow: slight warm shift
    baseHex,                                                                       // base: unchanged
    hslToHex(hsl.h - 8, Math.max(0, hsl.s - 15), Math.min(95, hsl.l + 15)),     // highlight: gold-shift, less saturated
  ];
}

/**
 * Build a full 15-color character palette from schema appearance data.
 *
 * SLOT ALLOCATION (FF6 discipline):
 *   0: transparent     1: outline          2-4: fur ramp
 *   5: eye color       6: eye highlight    7-9: clothing primary ramp
 *   10-11: clothing secondary  12-13: weapon/accessory
 *   14: accent/inner ear       15: special (glow/blood/holy)
 */
function buildCharacterPalette(appearance, eraPalette) {
  const furRamp = buildRamp(appearance.furColor || '#a0784c');
  const clothRamp = buildRamp(
    (appearance.outfit && appearance.outfit.palette && appearance.outfit.palette[0]) || '#7a6852'
  );
  const secondaryColor = (appearance.outfit && appearance.outfit.palette && appearance.outfit.palette[1]) || '#5c4d3c';
  const secondaryRamp = buildRamp(secondaryColor);

  const outlineColor = (eraPalette && eraPalette.dark) || '#1a1a2e';

  return {
    transparent: null,                         // slot 0
    outline: outlineColor,                     // slot 1
    furDarkest: furRamp[0],                     // slot 2
    furShadow: furRamp[1],                      // slot 3
    furBase: furRamp[2],                        // slot 4
    furHighlight: furRamp[3],                   // slot 5 (shifted from standard for more fur detail)
    eyeColor: appearance.eyeColor || '#4a3728', // slot 6
    eyeHighlight: '#f0ece4',                   // slot 7
    clothDarkest: clothRamp[0],                // slot 8
    clothShadow: clothRamp[1],                 // slot 9
    clothBase: clothRamp[2],                   // slot 10
    clothHighlight: clothRamp[3],              // slot 11
    secondary: secondaryRamp[2],               // slot 12
    secondaryShadow: secondaryRamp[1],         // slot 13
    accent: appearance.innerEarColor || '#c4887a', // slot 14
    special: (eraPalette && eraPalette.holy) || '#ffd700', // slot 15
  };
}


// ═══════════════════════════════════════════════════════════════
// PART 2: SPECIES TEMPLATES — Anatomy Definitions
// ═══════════════════════════════════════════════════════════════

/**
 * Species-specific anatomy rules.
 * Each species has unique ear shape, head proportions, eye style,
 * body stance, and special features that make them instantly readable.
 */
const SPECIES_TEMPLATES = {
  rabbit: {
    ears: { style: 'long_upright', height: 5, width: 2, innerColor: 'accent' },
    head: { width: 8, height: 7, shape: 'round', muzzleSize: 1 },
    eyes: { width: 3, height: 3, shape: 'round_large', highlightPos: 'top_left' },
    body: { width: 6, height: 5, proportion: 3, stance: 'slightly_hunched' },
    legs: { width: 2, height: 3 },
    arms: { width: 2 },
    tail: { visible: ['back', 'side'], size: 'small_round', pixels: [[0, 0]] },
    // Overworld: 16x24 total with ears
    overworldSize: { w: 16, h: 24 },
    battleSize: { w: 32, h: 48 },
    portraitSize: { w: 48, h: 48 },
  },

  fox: {
    ears: { style: 'triangular_pointed', height: 3, width: 3, innerColor: 'outline' },
    head: { width: 8, height: 6, shape: 'angular', muzzleSize: 2 },
    eyes: { width: 3, height: 2, shape: 'narrow_angled', highlightPos: 'center' },
    body: { width: 6, height: 6, proportion: 3.5, stance: 'upright_dignified' },
    legs: { width: 2, height: 3 },
    arms: { width: 2 },
    tail: { visible: ['back', 'side'], size: 'large_flowing', pixels: [[0, 0], [1, 0], [2, 1], [3, 1], [4, 2]] },
    overworldSize: { w: 16, h: 24 },
    battleSize: { w: 32, h: 48 },
    portraitSize: { w: 48, h: 48 },
  },

  wolf: {
    ears: { style: 'angular_alert', height: 3, width: 2, innerColor: 'outline' },
    head: { width: 9, height: 7, shape: 'angular_strong', muzzleSize: 3 },
    eyes: { width: 4, height: 2, shape: 'narrow_slit', highlightPos: 'none' },
    body: { width: 7, height: 6, proportion: 4, stance: 'military_erect' },
    legs: { width: 2, height: 4 },
    arms: { width: 2 },
    tail: { visible: ['back'], size: 'thick_low', pixels: [[0, 0], [1, 0], [2, 0]] },
    overworldSize: { w: 16, h: 24 },
    battleSize: { w: 32, h: 48 },
    portraitSize: { w: 48, h: 48 },
  },

  celestial: {
    ears: { style: 'luminous', height: 0, width: 0, innerColor: 'special' },
    head: { width: 8, height: 8, shape: 'indistinct_radiant', muzzleSize: 0 },
    eyes: { width: 2, height: 2, shape: 'golden_points', highlightPos: 'full_glow' },
    body: { width: 6, height: 7, proportion: 4, stance: 'floating' },
    legs: { width: 2, height: 3 },
    arms: { width: 2 },
    tail: { visible: [], size: 'none' },
    glow: { radius: 3, color: '#ffd700', alpha: 0.15, animated: true },
    overworldSize: { w: 16, h: 24 },
    battleSize: { w: 32, h: 48 },
    portraitSize: { w: 48, h: 48 },
  },
};


// ═══════════════════════════════════════════════════════════════
// PART 3: ANIMATION BIBLE — Frame Patterns & Timing
// ═══════════════════════════════════════════════════════════════

/**
 * Every animation type with exact frame counts and timing (in ms).
 * These are rules extracted from the best JRPG sprites, not suggestions.
 *
 * Each frame is defined as a set of transforms applied to the base pose:
 *   dx/dy: pixel offset for the whole sprite
 *   earDx/earDy: ear-specific offsets (sub-pixel highlight for Celeste technique)
 *   headDy: head vertical offset
 *   bodyDy: torso vertical offset
 *   armAngle: arm position shift
 *   legPhase: which leg frame to use
 *   weaponAngle: weapon rotation state
 *   expression: portrait expression key
 *   effect: special visual effect trigger
 */
const ANIMATION_BIBLE = {

  // ── IDLE (Overworld): CT-style breathing, 2 frames ──
  idle_overworld: {
    frameCount: 2,
    loop: true,
    frames: [
      { timing: 400, bodyDy: 0, earDy: 0, headDy: 0, legPhase: 'stand', subPixelShift: 0 },
      { timing: 400, bodyDy: 1, earDy: -1, headDy: 0, legPhase: 'stand', subPixelShift: 1 },
      // Celeste technique: ears sway opposite to body (1-frame delay feel)
    ],
  },

  // ── IDLE (Battle): FF6 ready stance, 4 frames ──
  idle_battle: {
    frameCount: 4,
    loop: true,
    frames: [
      { timing: 200, bodyDy: 0, weaponAngle: 0, stance: 'ready', subPixelShift: 0 },
      { timing: 200, bodyDy: 1, weaponAngle: 1, stance: 'breathe', subPixelShift: 1 },
      { timing: 200, bodyDy: 0, weaponAngle: 0, stance: 'ready', subPixelShift: 2 },
      { timing: 200, bodyDy: 1, weaponAngle: -1, stance: 'breathe2', subPixelShift: 3 },
      // CT technique: asymmetric stance, weight on back foot, weapon slightly raised
    ],
  },

  // ── WALK (4-direction): Modern 4-frame, not FF6's 3-frame ──
  walk: {
    frameCount: 4,
    loop: true,
    frames: [
      { timing: 150, legPhase: 'step_right', bodyDy: 1, earDy: 0, armSwing: 1 },
      { timing: 150, legPhase: 'pass_center', bodyDy: 0, earDy: 0, armSwing: 0 },
      { timing: 150, legPhase: 'step_left', bodyDy: 1, earDy: 0, armSwing: -1 },
      { timing: 150, legPhase: 'pass_center', bodyDy: 0, earDy: 0, armSwing: 0 },
      // Body bobs down 1px on step frames (weight transfer)
      // Ears/hair trail 1 frame behind movement direction
    ],
  },

  // ── ATTACK (Katana): 6 frames with held impact ──
  attack_katana: {
    frameCount: 6,
    loop: false,
    frames: [
      { timing: 100, dx: 0, stance: 'ready', weaponAngle: 0 },
      { timing: 100, dx: -2, stance: 'wind_up', weaponAngle: -30 },
      // Wind-up: Pull sword behind body, lean back 2px
      { timing: 80, dx: -1, stance: 'anticipation', weaponAngle: -45 },
      { timing: 60, dx: 3, stance: 'strike', weaponAngle: 45, effect: 'slash_line' },
      // Strike: Full extension, diagonal slash line, lean forward 3px
      { timing: 180, dx: 3, stance: 'impact_hold', weaponAngle: 60, effect: 'impact_flash' },
      // KEY: HOLD impact frame 3x longer (Hollow Knight technique)
      { timing: 120, dx: 0, stance: 'recovery', weaponAngle: 0 },
    ],
  },

  // ── ATTACK (Prayer/Miracle): 8 frames, devotional pose ──
  attack_prayer: {
    frameCount: 8,
    loop: false,
    frames: [
      { timing: 100, stance: 'ready', armPos: 'sides' },
      { timing: 120, stance: 'hands_raise1', armPos: 'raising', bodyDy: 0 },
      { timing: 120, stance: 'hands_raise2', armPos: 'mid', bodyDy: -1 },
      { timing: 200, stance: 'hands_together', armPos: 'clasped', bodyDy: -1 },
      // Hands come together at frame 4 — devotional pose held longest
      { timing: 100, stance: 'glow_start', effect: 'holy_motes_rise', bodyDy: -1 },
      { timing: 150, stance: 'glow_peak', effect: 'holy_burst', bodyDy: -2 },
      // Holy motes rise from frame 5, burst at frame 6
      { timing: 100, stance: 'glow_release', effect: 'holy_release', bodyDy: -1 },
      { timing: 120, stance: 'recovery', armPos: 'sides', bodyDy: 0 },
    ],
  },

  // ── DAMAGE (Hit): 3 frames ──
  damage: {
    frameCount: 3,
    loop: false,
    frames: [
      { timing: 60, dx: -2, stance: 'flinch', effect: 'flash_white' },
      // Flash white on frame 1 (2-frame flash cycle)
      { timing: 200, dx: -3, bodyDy: 1, stance: 'pain_peak', expression: 'hurt' },
      // Lean back 2-3px, knees buckle, eyes shut
      { timing: 150, dx: -1, bodyDy: 0, stance: 'stagger_recover' },
    ],
    screenEffect: { shake: { intensity: 2, frames: 3 } },
  },

  // ── DEATH: 5 frames with alpha fade ──
  death: {
    frameCount: 5,
    loop: false,
    frames: [
      { timing: 100, stance: 'hit', dx: -2 },
      { timing: 200, stance: 'kneel', bodyDy: 4, headDy: 2 },
      { timing: 150, stance: 'collapse_start', bodyDy: 8, rotation: 15 },
      { timing: 200, stance: 'collapse_end', bodyDy: 12, rotation: 45 },
      { timing: 400, stance: 'fade', bodyDy: 12, rotation: 45, alpha: 0 },
      // Alpha fade on final frame — NEVER instant disappear
    ],
  },

  // ── WALK_EMOTIONAL (Grief/Exhaustion): 6 frames, slower ──
  walk_emotional: {
    frameCount: 6,
    loop: true,
    frames: [
      { timing: 250, legPhase: 'drag_step', bodyDy: 1, headDy: 1 },
      { timing: 200, legPhase: 'lean', bodyDy: 2, headDy: 1 },
      { timing: 250, legPhase: 'drag_step2', bodyDy: 1, headDy: 1 },
      { timing: 150, legPhase: 'stumble', bodyDy: 3, headDy: 2, dx: -1 },
      { timing: 300, legPhase: 'catch', bodyDy: 1, headDy: 1, dx: 0 },
      { timing: 200, legPhase: 'continue', bodyDy: 1, headDy: 1 },
      // Head lowered 1px, arms hang, NO ear bounce
      // Absence of normal animation tells the emotional story
    ],
    noEarBounce: true,
    noArmSwing: true,
  },

  // ── DIALOGUE GESTURES ──
  gesture_nod: {
    frameCount: 2, loop: false,
    frames: [
      { timing: 150, headDy: 1 },
      { timing: 150, headDy: 0 },
    ],
  },
  gesture_shake: {
    frameCount: 3, loop: false,
    frames: [
      { timing: 120, headDx: -1 },
      { timing: 120, headDx: 0 },
      { timing: 120, headDx: 1 },
    ],
  },
  gesture_surprise: {
    frameCount: 2, loop: false,
    frames: [
      { timing: 100, bodyDy: -1, expression: 'surprised', effect: 'exclamation' },
      { timing: 200, bodyDy: 0, expression: 'surprised' },
    ],
  },
  gesture_bow: {
    frameCount: 3, loop: false,
    frames: [
      { timing: 150, headDy: 1, bodyDy: 1 },
      { timing: 300, headDy: 3, bodyDy: 2 },
      { timing: 200, headDy: 0, bodyDy: 0 },
    ],
  },
  gesture_pray: {
    frameCount: 4, loop: false,
    frames: [
      { timing: 200, armPos: 'raising' },
      { timing: 200, armPos: 'mid' },
      { timing: 400, armPos: 'clasped', headDy: 1 },
      { timing: 200, armPos: 'sides', headDy: 0 },
    ],
  },
};


// ═══════════════════════════════════════════════════════════════
// PART 4: SUB-PIXEL ANIMATION (Celeste Technique)
// ═══════════════════════════════════════════════════════════════

/**
 * For elements too small to move a full pixel (hair tips, ear tips,
 * cloth edges, cross pendant, blade edge), we shift the HIGHLIGHT
 * position instead of moving the element itself.
 *
 * This creates flowing motion without moving a single pixel's position.
 *
 * Pattern: highlight cycles through positions within a small region
 *   Frame 0: ░█░  (center)
 *   Frame 1: ░░█  (right — illusion of rightward sway)
 *   Frame 2: ░█░  (center)
 *   Frame 3: █░░  (left — illusion of leftward sway)
 */
const SUB_PIXEL_PATTERNS = {
  ear_sway: [
    { highlightOffset: 0 },   // center
    { highlightOffset: 1 },   // right
    { highlightOffset: 0 },   // center
    { highlightOffset: -1 },  // left
  ],
  hair_flow: [
    { highlightOffset: 0 },
    { highlightOffset: 1 },
    { highlightOffset: 1 },
    { highlightOffset: 0 },
    { highlightOffset: -1 },
    { highlightOffset: -1 },
  ],
  cloth_ripple: [
    { highlightOffset: 0 },
    { highlightOffset: 1 },
    { highlightOffset: 0 },
    { highlightOffset: -1 },
  ],
  pendant_swing: [
    { highlightOffset: 0 },
    { highlightOffset: 1 },
    { highlightOffset: 0 },
    { highlightOffset: -1 },
    { highlightOffset: 0 },
    { highlightOffset: 0 },  // hang longer at center (gravity)
  ],
  blade_glint: [
    { highlightOffset: -2 },
    { highlightOffset: -1 },
    { highlightOffset: 0 },
    { highlightOffset: 1 },
    { highlightOffset: 2 },
    { highlightOffset: 1 },
    { highlightOffset: 0 },
    { highlightOffset: -1 },
  ],
};


// ═══════════════════════════════════════════════════════════════
// PART 5: PORTRAIT EXPRESSION SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Each key character has 4-6 portrait variants.
 * Expressions are defined as pixel-level modifications to the base portrait.
 *
 * RULE: Captain Mori's portraits differ by fewer pixels than any other character.
 * This communicates his controlled nature through the art system itself.
 */
const EXPRESSION_DEFS = {
  // Default expression modifications applied to any character's base portrait
  neutral: {
    eyeState: 'open', browOffset: 0, mouthState: 'closed', earState: 'natural',
  },
  happy: {
    eyeState: 'squint_smile', browOffset: 0, mouthState: 'smile', earState: 'perked',
    cheekHighlight: true,
  },
  angry: {
    eyeState: 'narrow', browOffset: -1, mouthState: 'gritted', earState: 'back',
  },
  sad: {
    eyeState: 'half_closed', browOffset: 1, mouthState: 'slight_frown', earState: 'drooped',
    removeHighlight: true,  // dimmer eyes = sadness
  },
  afraid: {
    eyeState: 'wide', browOffset: -1, mouthState: 'open_small', earState: 'flat',
    extraHighlight: true,  // wider eyes catch more light
  },
  determined: {
    eyeState: 'focused', browOffset: -1, mouthState: 'set', earState: 'forward',
    jawSet: true,
  },

  // Character-specific expressions
  remembering: {
    eyeState: 'upward_soft', browOffset: 0, mouthState: 'gentle', earState: 'natural',
    gazeDirection: 'up',
  },
  fierce: {
    eyeState: 'narrow', browOffset: -2, mouthState: 'gritted', earState: 'back',
    jawSet: true,
  },
  luminous: {
    eyeState: 'closed', browOffset: 0, mouthState: 'peaceful',
    glowOverlay: { color: '#ffd700', alpha: 0.3 },
    auraParticles: true,
  },
  sleepy: {
    eyeState: 'drooping', browOffset: 0, mouthState: 'yawn', earState: 'relaxed',
  },
  worried: {
    eyeState: 'open', browOffset: 1, mouthState: 'slight_frown', earState: 'flat',
    browFurrow: true,  // 1px brow shift
  },
  broken: {
    eyeState: 'downcast', browOffset: 1, mouthState: 'slack', earState: 'drooped',
    removeHighlight: true, removeHighlightAll: true,  // no highlights = defeated
  },
  bewildered: {
    eyeState: 'extra_wide', browOffset: -1, mouthState: 'open',
    extraHighlight: true,  // add extra highlight pixel in each eye
  },
  calm_controlled: {
    // Mori special: almost no change from neutral
    eyeState: 'open', browOffset: 0, mouthState: 'closed', earState: 'natural',
    pixelDifference: 0,  // marker: this expression changes fewest pixels
  },
  sad_restrained: {
    // Mori special: 1px brow change, eyes soften slightly
    eyeState: 'slightly_soft', browOffset: 0.5, mouthState: 'closed', earState: 'natural',
    pixelDifference: 2,  // only 2 pixels change — the restraint IS the character
  },
};


// ═══════════════════════════════════════════════════════════════
// PART 6: THE SPRITE FACTORY — Core Renderer
// ═══════════════════════════════════════════════════════════════

/**
 * The SpriteFactory is the engine's art department.
 * It takes character schema data and produces:
 *   - Overworld sprites (16×24) with walk/idle animations
 *   - Battle sprites (32×48) with attack/damage/death animations
 *   - Portrait sprites (48×48) with 4-6 expressions
 *   - Tileset textures with era palette swaps
 *
 * All sprites are drawn procedurally on OffscreenCanvas (or regular Canvas),
 * then converted to Phaser textures for use in the game.
 */
export class SpriteFactory {
  constructor(phaserScene) {
    this.scene = phaserScene;
    this.textureCache = new Map();
    this.paletteCache = new Map();
  }

  // ── Main entry: generate all sprites for a character ──

  generateCharacterSprites(characterSchema, eraPalette) {
    const species = characterSchema.species || 'rabbit';
    const template = SPECIES_TEMPLATES[species];
    if (!template) {
      console.warn(`Unknown species: ${species}, falling back to rabbit`);
    }
    const tmpl = template || SPECIES_TEMPLATES.rabbit;
    const palette = buildCharacterPalette(characterSchema.appearance || {}, eraPalette);
    const id = characterSchema.id;

    // Check for hand-crafted overrides first
    // (override system: data/sprites/overrides/{id}_{anim}_{frame}.png)
    // For now, all procedural — overrides loaded separately if files exist

    // Generate overworld sprite sheet (all directions × walk + idle frames)
    this._generateOverworldSheet(id, tmpl, palette, species);

    // Generate battle sprite sheet (idle, attack, damage, death, prayer)
    this._generateBattleSheet(id, tmpl, palette, species, characterSchema);

    // Generate portrait expressions
    this._generatePortraits(id, tmpl, palette, species, characterSchema);

    return id;
  }

  // ── Overworld Sprite Sheet ──

  _generateOverworldSheet(id, template, palette, species) {
    const fw = template.overworldSize.w;  // 16
    const fh = template.overworldSize.h;  // 24
    const directions = ['down', 'left', 'right', 'up'];
    const walkFrames = 4;
    const idleFrames = 2;
    const totalFrames = directions.length * (walkFrames + idleFrames);

    // Create sprite sheet canvas
    const sheetW = fw * (walkFrames + idleFrames);
    const sheetH = fh * directions.length;
    const canvas = this._createCanvas(sheetW, sheetH);
    const ctx = canvas.getContext('2d');

    for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
      const dir = directions[dirIdx];
      const y = dirIdx * fh;

      // Walk frames (0-3)
      for (let frame = 0; frame < walkFrames; frame++) {
        const x = frame * fw;
        const frameData = ANIMATION_BIBLE.walk.frames[frame];
        this._drawOverworldSprite(ctx, x, y, fw, fh, template, palette, species, dir, frameData, frame);
      }

      // Idle frames (4-5)
      for (let frame = 0; frame < idleFrames; frame++) {
        const x = (walkFrames + frame) * fw;
        const frameData = ANIMATION_BIBLE.idle_overworld.frames[frame];
        this._drawOverworldSprite(ctx, x, y, fw, fh, template, palette, species, dir, frameData, frame);
      }
    }

    // Register as Phaser texture
    const key = `sprite_ow_${id}`;
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    this.scene.textures.addCanvas(key, canvas);

    // Create animations
    const texture = this.scene.textures.get(key);
    // Add frame data manually since we're using canvas textures
    this._registerFrames(key, fw, fh, sheetW, sheetH);
    this._createOverworldAnimations(id, key, walkFrames, idleFrames, directions);
  }

  _drawOverworldSprite(ctx, ox, oy, fw, fh, template, palette, species, direction, frameData, frameIdx) {
    // Clear the frame area
    ctx.clearRect(ox, oy, fw, fh);

    const bodyDy = (frameData && frameData.bodyDy) || 0;
    const earDy = (frameData && frameData.earDy) || 0;
    const legPhase = (frameData && frameData.legPhase) || 'stand';
    const armSwing = (frameData && frameData.armSwing) || 0;
    const noEarBounce = (frameData && frameData.noEarBounce) || false;

    // Center the sprite in the frame
    const cx = ox + Math.floor(fw / 2);
    const baseY = oy + fh - template.legs.height;

    // ── Draw legs ──
    const legW = template.legs.width;
    const legH = template.legs.height;
    const legSpacing = Math.floor(template.body.width / 2) - 1;

    if (legPhase === 'step_right') {
      // Right leg forward, left leg back
      this._drawPixelBlock(ctx, cx - legSpacing - 1, baseY - legH + 1, legW, legH, palette.clothDarkest);
      this._drawPixelBlock(ctx, cx + legSpacing - 1, baseY - legH - 1, legW, legH, palette.clothShadow);
    } else if (legPhase === 'step_left') {
      this._drawPixelBlock(ctx, cx - legSpacing - 1, baseY - legH - 1, legW, legH, palette.clothShadow);
      this._drawPixelBlock(ctx, cx + legSpacing - 1, baseY - legH + 1, legW, legH, palette.clothDarkest);
    } else {
      // Standing or pass_center
      this._drawPixelBlock(ctx, cx - legSpacing - 1, baseY - legH, legW, legH, palette.clothDarkest);
      this._drawPixelBlock(ctx, cx + legSpacing - 1, baseY - legH, legW, legH, palette.clothDarkest);
    }

    // ── Draw body / torso ──
    const bodyW = template.body.width;
    const bodyH = template.body.height;
    const bodyTop = baseY - legH - bodyH + bodyDy;

    // Main torso block
    this._drawPixelBlock(ctx, cx - Math.floor(bodyW / 2), bodyTop, bodyW, bodyH, palette.clothBase);
    // Clothing shadow (left side for directional lighting)
    this._drawPixelBlock(ctx, cx - Math.floor(bodyW / 2), bodyTop, 1, bodyH, palette.clothShadow);
    // Clothing highlight (right side)
    this._drawPixelBlock(ctx, cx + Math.floor(bodyW / 2) - 1, bodyTop, 1, bodyH, palette.clothHighlight);

    // ── Draw arms ──
    const armW = template.arms.width;
    const armTop = bodyTop + 1;
    const armH = bodyH - 1;

    if (armSwing > 0) {
      // Right arm forward
      this._drawPixelBlock(ctx, cx + Math.floor(bodyW / 2), armTop - 1, armW, armH, palette.furBase);
      this._drawPixelBlock(ctx, cx - Math.floor(bodyW / 2) - armW, armTop + 1, armW, armH, palette.furShadow);
    } else if (armSwing < 0) {
      this._drawPixelBlock(ctx, cx + Math.floor(bodyW / 2), armTop + 1, armW, armH, palette.furShadow);
      this._drawPixelBlock(ctx, cx - Math.floor(bodyW / 2) - armW, armTop - 1, armW, armH, palette.furBase);
    } else {
      this._drawPixelBlock(ctx, cx + Math.floor(bodyW / 2), armTop, armW, armH, palette.furBase);
      this._drawPixelBlock(ctx, cx - Math.floor(bodyW / 2) - armW, armTop, armW, armH, palette.furShadow);
    }

    // ── Draw neck transition (1px) ──
    this._drawPixelBlock(ctx, cx - 2, bodyTop - 1, 4, 1, palette.furBase);

    // ── Draw head ──
    const headW = template.head.width;
    const headH = template.head.height;
    const headTop = bodyTop - 1 - headH + bodyDy;

    // Head block (fur-colored)
    this._drawPixelBlock(ctx, cx - Math.floor(headW / 2), headTop, headW, headH, palette.furBase);
    // Head shadow (left side)
    this._drawPixelBlock(ctx, cx - Math.floor(headW / 2), headTop, 1, headH, palette.furShadow);
    // Head highlight (top-right)
    this._drawPixelBlock(ctx, cx + Math.floor(headW / 2) - 2, headTop, 2, 1, palette.furHighlight);

    // ── Draw eyes (direction-aware) ──
    const eyeW = Math.min(template.eyes.width, 2); // Overworld eyes are smaller
    const eyeH = Math.min(template.eyes.height, 2);
    const eyeY = headTop + 3;

    if (direction === 'down' || direction === 'up') {
      // Both eyes visible
      const eyeSpacing = 2;
      const leftEyeX = cx - eyeSpacing - 1;
      const rightEyeX = cx + eyeSpacing - 1;

      if (direction === 'down') {
        this._drawPixelBlock(ctx, leftEyeX, eyeY, eyeW, eyeH, palette.eyeColor);
        this._drawPixelBlock(ctx, rightEyeX, eyeY, eyeW, eyeH, palette.eyeColor);
        // Eye highlights (top-left of each eye — anime cue)
        ctx.fillStyle = palette.eyeHighlight;
        ctx.fillRect(leftEyeX, eyeY, 1, 1);
        ctx.fillRect(rightEyeX, eyeY, 1, 1);
      }
      // Up direction: no eyes visible (back of head)
    } else {
      // Side view: one eye visible
      const eyeX = direction === 'left'
        ? cx - Math.floor(headW / 2) + 1
        : cx + Math.floor(headW / 2) - eyeW - 1;
      this._drawPixelBlock(ctx, eyeX, eyeY, eyeW, eyeH, palette.eyeColor);
      ctx.fillStyle = palette.eyeHighlight;
      ctx.fillRect(eyeX, eyeY, 1, 1);
    }

    // ── Draw muzzle/nose ──
    if (direction === 'down' && template.head.muzzleSize > 0) {
      ctx.fillStyle = palette.furShadow;
      ctx.fillRect(cx - 1, eyeY + eyeH + 1, 2, 1);
    }

    // ── Draw ears (species-specific) ──
    const earH = template.ears.height;
    const earW = template.ears.width;
    const earTop = headTop - earH + (noEarBounce ? 0 : earDy);

    if (species === 'rabbit') {
      // Long upright ears with inner color
      const earSpacing = 2;
      // Left ear
      this._drawPixelBlock(ctx, cx - earSpacing - earW, earTop, earW, earH, palette.furBase);
      ctx.fillStyle = palette.accent; // inner ear color
      ctx.fillRect(cx - earSpacing - earW + (earW > 1 ? 1 : 0), earTop + 1, Math.max(1, earW - 1), earH - 2);
      // Right ear
      this._drawPixelBlock(ctx, cx + earSpacing, earTop, earW, earH, palette.furBase);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(cx + earSpacing, earTop + 1, Math.max(1, earW - 1), earH - 2);

      // Sub-pixel highlight shift on ear tips (Celeste technique)
      const subShift = SUB_PIXEL_PATTERNS.ear_sway[frameIdx % SUB_PIXEL_PATTERNS.ear_sway.length];
      if (subShift && !noEarBounce) {
        ctx.fillStyle = palette.furHighlight;
        ctx.fillRect(cx - earSpacing - earW + 1 + subShift.highlightOffset, earTop, 1, 1);
        ctx.fillRect(cx + earSpacing + subShift.highlightOffset, earTop, 1, 1);
      }
    } else if (species === 'fox') {
      // Triangular pointed ears
      for (let ey = 0; ey < earH; ey++) {
        const w = Math.max(1, earW - ey);
        this._drawPixelBlock(ctx, cx - 3, earTop + ey, w, 1, palette.furBase);
        this._drawPixelBlock(ctx, cx + 3 - w + 1, earTop + ey, w, 1, palette.furBase);
      }
    } else if (species === 'wolf') {
      // Angular alert ears
      this._drawPixelBlock(ctx, cx - 3, earTop, earW, earH, palette.furBase);
      this._drawPixelBlock(ctx, cx + 2, earTop, earW, earH, palette.furBase);
      // Dark inner
      ctx.fillStyle = palette.outline;
      ctx.fillRect(cx - 3, earTop + 1, 1, earH - 1);
      ctx.fillRect(cx + 2, earTop + 1, 1, earH - 1);
    }
    // Celestial: no ears (luminous beings have no defined form)

    // ── Apply outline (FF6 standard: 1px dark outline on all sprite edges) ──
    this._applyOutline(ctx, ox, oy, fw, fh, palette.outline);
  }

  // ── Battle Sprite Sheet ──

  _generateBattleSheet(id, template, palette, species, schema) {
    const fw = template.battleSize.w;  // 32
    const fh = template.battleSize.h;  // 48

    // Animations to include: idle(4), attack_katana(6), attack_prayer(8), damage(3), death(5)
    const animations = [
      { key: 'idle_battle', count: 4 },
      { key: 'attack_katana', count: 6 },
      { key: 'attack_prayer', count: 8 },
      { key: 'damage', count: 3 },
      { key: 'death', count: 5 },
    ];

    const totalFrames = animations.reduce((sum, a) => sum + a.count, 0); // 26
    const cols = 8; // frames per row
    const rows = Math.ceil(totalFrames / cols);
    const canvas = this._createCanvas(fw * cols, fh * rows);
    const ctx = canvas.getContext('2d');

    let frameIdx = 0;
    for (const anim of animations) {
      const animData = ANIMATION_BIBLE[anim.key];
      for (let f = 0; f < anim.count; f++) {
        const col = frameIdx % cols;
        const row = Math.floor(frameIdx / cols);
        const x = col * fw;
        const y = row * fh;
        const frameData = animData ? animData.frames[f] : {};
        this._drawBattleSprite(ctx, x, y, fw, fh, template, palette, species, frameData, anim.key, f);
        frameIdx++;
      }
    }

    const key = `sprite_bt_${id}`;
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    this.scene.textures.addCanvas(key, canvas);
    this._registerFrames(key, fw, fh, fw * cols, fh * rows);
    this._createBattleAnimations(id, key, animations);
  }

  _drawBattleSprite(ctx, ox, oy, fw, fh, template, palette, species, frameData, animKey, frameIdx) {
    ctx.clearRect(ox, oy, fw, fh);

    // Battle sprites are 2x overworld detail
    // Scale factor for internal drawing
    const s = 2;
    const bodyDy = ((frameData && frameData.bodyDy) || 0) * s;
    const dx = ((frameData && frameData.dx) || 0) * s;
    const headDy = ((frameData && frameData.headDy) || 0) * s;
    const stance = (frameData && frameData.stance) || 'ready';
    const weaponAngle = (frameData && frameData.weaponAngle) || 0;
    const alpha = frameData && frameData.alpha !== undefined ? frameData.alpha : 1;

    if (alpha < 1) {
      ctx.globalAlpha = alpha;
    }

    const cx = ox + Math.floor(fw / 2) + dx;
    const baseY = oy + fh - 4;

    // ── Legs (scaled up) ──
    const legW = template.legs.width * s;
    const legH = template.legs.height * s;
    const legSpacing = 4;

    this._drawPixelBlock(ctx, cx - legSpacing - legW / 2, baseY - legH, legW, legH, palette.clothDarkest);
    this._drawPixelBlock(ctx, cx + legSpacing - legW / 2, baseY - legH, legW, legH, palette.clothDarkest);

    // ── Body ──
    const bodyW = template.body.width * s;
    const bodyH = template.body.height * s;
    const bodyTop = baseY - legH - bodyH + bodyDy;

    this._drawPixelBlock(ctx, cx - bodyW / 2, bodyTop, bodyW, bodyH, palette.clothBase);
    // Shading: left shadow, right highlight (directional lighting)
    this._drawPixelBlock(ctx, cx - bodyW / 2, bodyTop, s, bodyH, palette.clothShadow);
    this._drawPixelBlock(ctx, cx + bodyW / 2 - s, bodyTop, s, bodyH, palette.clothHighlight);

    // Secondary clothing detail (belt, sash)
    this._drawPixelBlock(ctx, cx - bodyW / 2 + s, bodyTop + bodyH - s * 2, bodyW - s * 2, s, palette.secondary);

    // ── Arms (position depends on animation) ──
    const armW = template.arms.width * s;
    const armH = (template.body.height - 1) * s;

    if (stance === 'wind_up' || stance === 'anticipation') {
      // Arms pulled back
      this._drawPixelBlock(ctx, cx - bodyW / 2 - armW - 2, bodyTop + s, armW, armH, palette.furBase);
      this._drawPixelBlock(ctx, cx + bodyW / 2, bodyTop + 2, armW, armH, palette.furShadow);
    } else if (stance === 'strike' || stance === 'impact_hold') {
      // Arms extended forward
      this._drawPixelBlock(ctx, cx + bodyW / 2, bodyTop - s, armW + 4, armH - s, palette.furBase);
      this._drawPixelBlock(ctx, cx - bodyW / 2 - armW, bodyTop + s, armW, armH, palette.furShadow);
    } else if (stance === 'hands_together' || stance === 'hands_raise2' || stance === 'glow_start' || stance === 'glow_peak') {
      // Prayer: hands clasped in front
      this._drawPixelBlock(ctx, cx - s, bodyTop - s * 2, s * 2, s * 2, palette.furBase);
      this._drawPixelBlock(ctx, cx - s - 1, bodyTop - s * 2, 1, s * 2, palette.furHighlight);
    } else {
      // Default: arms at sides
      this._drawPixelBlock(ctx, cx + bodyW / 2, bodyTop + s, armW, armH, palette.furBase);
      this._drawPixelBlock(ctx, cx - bodyW / 2 - armW, bodyTop + s, armW, armH, palette.furShadow);
    }

    // ── Neck ──
    this._drawPixelBlock(ctx, cx - s * 2, bodyTop - s, s * 4, s, palette.furBase);

    // ── Head ──
    const headW = template.head.width * s;
    const headH = template.head.height * s;
    const headTop = bodyTop - s - headH + bodyDy + headDy;

    this._drawPixelBlock(ctx, cx - headW / 2, headTop, headW, headH, palette.furBase);
    this._drawPixelBlock(ctx, cx - headW / 2, headTop, s, headH, palette.furShadow);
    this._drawPixelBlock(ctx, cx + headW / 2 - s * 2, headTop, s * 2, s, palette.furHighlight);

    // ── Eyes (battle size: room for expressions) ──
    const eyeW = template.eyes.width * s;
    const eyeH = template.eyes.height * s;
    const eyeY = headTop + s * 3;
    const eyeSpacing = s * 2;

    if (stance !== 'collapse_end' && stance !== 'fade') {
      // Left eye
      this._drawPixelBlock(ctx, cx - eyeSpacing - eyeW / 2, eyeY, eyeW, eyeH, palette.eyeColor);
      // Right eye
      this._drawPixelBlock(ctx, cx + eyeSpacing - eyeW / 2, eyeY, eyeW, eyeH, palette.eyeColor);

      // Eye highlights — thick upper eyelid line (2px = anime readability cue)
      ctx.fillStyle = palette.outline;
      ctx.fillRect(cx - eyeSpacing - eyeW / 2, eyeY - 1, eyeW, s); // upper lid left
      ctx.fillRect(cx + eyeSpacing - eyeW / 2, eyeY - 1, eyeW, s); // upper lid right

      // Highlight dots
      if (stance !== 'pain_peak' && stance !== 'flinch') {
        ctx.fillStyle = palette.eyeHighlight;
        ctx.fillRect(cx - eyeSpacing - eyeW / 2 + 1, eyeY + 1, s, s);
        ctx.fillRect(cx + eyeSpacing - eyeW / 2 + 1, eyeY + 1, s, s);
      }
    }

    // ── Muzzle ──
    if (template.head.muzzleSize > 0) {
      ctx.fillStyle = palette.furShadow;
      ctx.fillRect(cx - s, eyeY + eyeH + s, s * 2, s);
    }

    // ── Ears (species-specific, scaled) ──
    const earH = template.ears.height * s;
    const earW = template.ears.width * s;
    const earTop = headTop - earH;

    if (species === 'rabbit') {
      const earSpacing = s * 2;
      // Left ear
      this._drawPixelBlock(ctx, cx - earSpacing - earW, earTop, earW, earH, palette.furBase);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(cx - earSpacing - earW + s, earTop + s, Math.max(s, earW - s * 2), earH - s * 2);
      // Right ear
      this._drawPixelBlock(ctx, cx + earSpacing, earTop, earW, earH, palette.furBase);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(cx + earSpacing + s, earTop + s, Math.max(s, earW - s * 2), earH - s * 2);
      // Sub-pixel ear highlights
      const subShift = SUB_PIXEL_PATTERNS.ear_sway[frameIdx % SUB_PIXEL_PATTERNS.ear_sway.length];
      if (subShift) {
        ctx.fillStyle = palette.furHighlight;
        ctx.fillRect(cx - earSpacing - earW + s + subShift.highlightOffset, earTop, s, s);
        ctx.fillRect(cx + earSpacing + s + subShift.highlightOffset, earTop, s, s);
      }
    } else if (species === 'wolf') {
      this._drawPixelBlock(ctx, cx - headW / 2, earTop + s, earW, earH - s, palette.furBase);
      this._drawPixelBlock(ctx, cx + headW / 2 - earW, earTop + s, earW, earH - s, palette.furBase);
    } else if (species === 'fox') {
      for (let ey = 0; ey < earH; ey += s) {
        const w = Math.max(s, earW - ey);
        this._drawPixelBlock(ctx, cx - headW / 2 + s, earTop + ey, w, s, palette.furBase);
        this._drawPixelBlock(ctx, cx + headW / 2 - s - w, earTop + ey, w, s, palette.furBase);
      }
    } else if (species === 'celestial') {
      // No ears — instead draw a golden glow aura
      ctx.fillStyle = `rgba(255, 215, 0, 0.15)`;
      const glowR = template.glow ? template.glow.radius * s : 6;
      for (let gr = glowR; gr > 0; gr -= s) {
        ctx.globalAlpha = 0.05 + (0.1 * (1 - gr / glowR));
        ctx.fillRect(cx - headW / 2 - gr, headTop - gr, headW + gr * 2, headH + earH + gr * 2);
      }
      ctx.globalAlpha = alpha;
    }

    // ── Weapon (if in combat stance) ──
    if (stance === 'ready' || stance === 'breathe' || stance === 'breathe2' ||
        stance === 'wind_up' || stance === 'anticipation' ||
        stance === 'strike' || stance === 'impact_hold' || stance === 'recovery') {
      this._drawWeapon(ctx, cx, bodyTop, fw, fh, palette, stance, weaponAngle, s);
    }

    // ── Asymmetric stance (CT technique: weight on back foot) ──
    if (stance === 'ready' || stance === 'breathe' || stance === 'breathe2') {
      // Shift left leg slightly back, right leg forward for diagonal energy
      // Already handled by default leg placement + bodyDy
    }

    // ── Apply outline ──
    this._applyOutline(ctx, ox, oy, fw, fh, palette.outline);

    ctx.globalAlpha = 1;
  }

  _drawWeapon(ctx, cx, bodyTop, fw, fh, palette, stance, angle, s) {
    // Katana: thin vertical blade
    const bladeColor = palette.secondary || '#c0c0c0';
    const hiltColor = palette.secondaryShadow || '#5c4d3c';
    const bladeHighlight = palette.special || '#e0e0e0';

    if (stance === 'wind_up' || stance === 'anticipation') {
      // Sword behind body
      this._drawPixelBlock(ctx, cx - fw / 2 - s * 2, bodyTop - s * 4, s, s * 8, bladeColor);
      this._drawPixelBlock(ctx, cx - fw / 2 - s * 2, bodyTop + s * 2, s * 2, s * 2, hiltColor);
    } else if (stance === 'strike' || stance === 'impact_hold') {
      // Sword extended forward with diagonal slash line
      this._drawPixelBlock(ctx, cx + fw / 4, bodyTop - s * 6, s, s * 10, bladeColor);
      // Slash line effect
      ctx.fillStyle = bladeHighlight;
      ctx.globalAlpha = stance === 'impact_hold' ? 0.8 : 0.5;
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(cx + fw / 4 - i * s, bodyTop - s * 6 + i * s, s, s);
      }
      ctx.globalAlpha = 1;
      // Hilt
      this._drawPixelBlock(ctx, cx + fw / 4 - s, bodyTop + s * 2, s * 3, s * 2, hiltColor);
    } else {
      // Default: sword at side
      this._drawPixelBlock(ctx, cx + fw / 4 + s, bodyTop - s * 2, s, s * 8, bladeColor);
      this._drawPixelBlock(ctx, cx + fw / 4, bodyTop + s * 4, s * 2, s * 2, hiltColor);

      // Sub-pixel blade glint (Celeste technique)
      const glintPattern = SUB_PIXEL_PATTERNS.blade_glint;
      const glintFrame = glintPattern[Math.floor(Date.now() / 200) % glintPattern.length];
      ctx.fillStyle = bladeHighlight;
      ctx.fillRect(cx + fw / 4 + s, bodyTop - s * 2 + (glintFrame.highlightOffset + 2) * s, s, s);
    }
  }

  // ── Portrait Sprites ──

  _generatePortraits(id, template, palette, species, schema) {
    const pw = template.portraitSize.w;  // 48
    const ph = template.portraitSize.h;  // 48

    // Determine which expressions this character gets
    const role = schema.role || 'minor';
    let expressions;
    if (role === 'player' || role === 'npc_key' || role === 'companion') {
      expressions = ['neutral', 'happy', 'sad', 'angry', 'determined', 'afraid'];
    } else if (role === 'antagonist') {
      expressions = ['calm_controlled', 'sad_restrained', 'angry'];
    } else {
      expressions = ['neutral', 'happy', 'sad'];
    }

    // Add character-specific expressions from schema
    if (schema.id === 'obaa_chan') {
      expressions = ['neutral', 'remembering', 'fierce', 'luminous', 'happy'];
    } else if (schema.id === 'usagi') {
      expressions = ['neutral', 'sleepy', 'worried', 'broken', 'determined', 'bewildered'];
    } else if (schema.id === 'captain_mori') {
      expressions = ['calm_controlled', 'sad_restrained'];
    }

    const canvas = this._createCanvas(pw * expressions.length, ph);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < expressions.length; i++) {
      const ex = expressions[i];
      const exprData = EXPRESSION_DEFS[ex] || EXPRESSION_DEFS.neutral;
      this._drawPortrait(ctx, i * pw, 0, pw, ph, template, palette, species, exprData, ex);
    }

    const key = `portrait_${id}`;
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    this.scene.textures.addCanvas(key, canvas);
    this._registerFrames(key, pw, ph, pw * expressions.length, ph);

    // Store expression-to-frame mapping
    this.textureCache.set(`${id}_expressions`, expressions);
  }

  _drawPortrait(ctx, ox, oy, pw, ph, template, palette, species, exprData, exprKey) {
    ctx.clearRect(ox, oy, pw, ph);

    // Portrait is head and shoulders only, 48×48 pixels
    // Fill background with slight scene color
    ctx.fillStyle = palette.outline;
    ctx.fillRect(ox, oy, pw, ph);

    // ── Shoulders ──
    const shoulderW = 36;
    const shoulderH = 12;
    const shoulderTop = oy + ph - shoulderH;
    this._drawPixelBlock(ctx, ox + (pw - shoulderW) / 2, shoulderTop, shoulderW, shoulderH, palette.clothBase);
    // Clothing detail
    this._drawPixelBlock(ctx, ox + (pw - shoulderW) / 2, shoulderTop, 4, shoulderH, palette.clothShadow);
    this._drawPixelBlock(ctx, ox + (pw + shoulderW) / 2 - 4, shoulderTop, 4, shoulderH, palette.clothHighlight);
    // Collar/neckline
    this._drawPixelBlock(ctx, ox + pw / 2 - 4, shoulderTop - 2, 8, 4, palette.furBase);

    // ── Neck ──
    this._drawPixelBlock(ctx, ox + pw / 2 - 3, shoulderTop - 4, 6, 4, palette.furBase);

    // ── Head ──
    const headW = 28;
    const headH = 24;
    const headTop = shoulderTop - 4 - headH;

    // Main head shape
    this._drawRoundedBlock(ctx, ox + (pw - headW) / 2, headTop, headW, headH, palette.furBase, 3);
    // Shadow side
    this._drawPixelBlock(ctx, ox + (pw - headW) / 2, headTop + 2, 3, headH - 4, palette.furShadow);
    // Highlight
    this._drawPixelBlock(ctx, ox + (pw + headW) / 2 - 4, headTop + 1, 3, 4, palette.furHighlight);
    // Cheek blush area (subtle)
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(ox + (pw - headW) / 2 + 3, headTop + headH - 8, 4, 3);
    ctx.fillRect(ox + (pw + headW) / 2 - 7, headTop + headH - 8, 4, 3);
    ctx.globalAlpha = 1;

    // ── Eyes (60% of the emotion — 4×3px minimum) ──
    const eyeW = 5;
    const eyeH = 4;
    const eyeY = headTop + 10 + (exprData.browOffset || 0);
    const leftEyeX = ox + pw / 2 - 8;
    const rightEyeX = ox + pw / 2 + 3;

    // Thick upper eyelid line (2px = anime readability cue)
    ctx.fillStyle = palette.outline;
    ctx.fillRect(leftEyeX - 1, eyeY - 2, eyeW + 2, 2);
    ctx.fillRect(rightEyeX - 1, eyeY - 2, eyeW + 2, 2);

    if (exprData.eyeState === 'closed' || exprData.eyeState === 'drooping') {
      // Closed eyes: just the lid lines
      ctx.fillStyle = palette.outline;
      ctx.fillRect(leftEyeX, eyeY, eyeW, 1);
      ctx.fillRect(rightEyeX, eyeY, eyeW, 1);
    } else if (exprData.eyeState === 'half_closed' || exprData.eyeState === 'slightly_soft') {
      // Half-closed: smaller eye area
      this._drawPixelBlock(ctx, leftEyeX, eyeY, eyeW, eyeH - 2, palette.eyeColor);
      this._drawPixelBlock(ctx, rightEyeX, eyeY, eyeW, eyeH - 2, palette.eyeColor);
      if (!exprData.removeHighlight) {
        ctx.fillStyle = palette.eyeHighlight;
        ctx.fillRect(leftEyeX + 1, eyeY, 2, 1);
        ctx.fillRect(rightEyeX + 1, eyeY, 2, 1);
      }
    } else if (exprData.eyeState === 'narrow' || exprData.eyeState === 'focused') {
      // Narrow: compressed vertically
      this._drawPixelBlock(ctx, leftEyeX, eyeY + 1, eyeW, eyeH - 2, palette.eyeColor);
      this._drawPixelBlock(ctx, rightEyeX, eyeY + 1, eyeW, eyeH - 2, palette.eyeColor);
      ctx.fillStyle = palette.eyeHighlight;
      ctx.fillRect(leftEyeX + 1, eyeY + 1, 1, 1);
      ctx.fillRect(rightEyeX + 1, eyeY + 1, 1, 1);
    } else if (exprData.eyeState === 'extra_wide' || exprData.eyeState === 'wide') {
      // Extra wide: larger eye area + extra highlight pixel
      this._drawPixelBlock(ctx, leftEyeX - 1, eyeY - 1, eyeW + 2, eyeH + 2, palette.eyeColor);
      this._drawPixelBlock(ctx, rightEyeX - 1, eyeY - 1, eyeW + 2, eyeH + 2, palette.eyeColor);
      ctx.fillStyle = palette.eyeHighlight;
      ctx.fillRect(leftEyeX, eyeY, 2, 2);    // larger highlight
      ctx.fillRect(rightEyeX, eyeY, 2, 2);
      ctx.fillRect(leftEyeX + 3, eyeY + 2, 1, 1); // extra highlight pixel
      ctx.fillRect(rightEyeX + 3, eyeY + 2, 1, 1);
    } else if (exprData.eyeState === 'squint_smile') {
      // Happy squint: curved lines
      ctx.fillStyle = palette.outline;
      ctx.fillRect(leftEyeX, eyeY + 1, eyeW, 1);
      ctx.fillRect(leftEyeX + 1, eyeY, eyeW - 2, 1);
      ctx.fillRect(rightEyeX, eyeY + 1, eyeW, 1);
      ctx.fillRect(rightEyeX + 1, eyeY, eyeW - 2, 1);
    } else if (exprData.eyeState === 'downcast') {
      // Looking down: iris positioned low
      this._drawPixelBlock(ctx, leftEyeX, eyeY, eyeW, eyeH, palette.eyeColor);
      this._drawPixelBlock(ctx, rightEyeX, eyeY, eyeW, eyeH, palette.eyeColor);
      // No highlights = defeated (removeHighlightAll)
    } else if (exprData.eyeState === 'upward_soft') {
      // Looking up with soft focus
      this._drawPixelBlock(ctx, leftEyeX, eyeY - 1, eyeW, eyeH, palette.eyeColor);
      this._drawPixelBlock(ctx, rightEyeX, eyeY - 1, eyeW, eyeH, palette.eyeColor);
      ctx.fillStyle = palette.eyeHighlight;
      ctx.globalAlpha = 0.6; // softer highlight
      ctx.fillRect(leftEyeX + 1, eyeY - 1, 2, 1);
      ctx.fillRect(rightEyeX + 1, eyeY - 1, 2, 1);
      ctx.globalAlpha = 1;
    } else {
      // Default open eyes
      this._drawPixelBlock(ctx, leftEyeX, eyeY, eyeW, eyeH, palette.eyeColor);
      this._drawPixelBlock(ctx, rightEyeX, eyeY, eyeW, eyeH, palette.eyeColor);
      if (!exprData.removeHighlight && !exprData.removeHighlightAll) {
        ctx.fillStyle = palette.eyeHighlight;
        ctx.fillRect(leftEyeX + 1, eyeY, 2, 1);
        ctx.fillRect(rightEyeX + 1, eyeY, 2, 1);
      }
    }

    // ── Mouth ──
    const mouthY = eyeY + eyeH + 3;
    ctx.fillStyle = palette.furShadow;
    if (exprData.mouthState === 'smile') {
      ctx.fillRect(ox + pw / 2 - 3, mouthY, 6, 1);
      ctx.fillRect(ox + pw / 2 - 2, mouthY + 1, 4, 1);
    } else if (exprData.mouthState === 'open' || exprData.mouthState === 'open_small') {
      const mw = exprData.mouthState === 'open_small' ? 3 : 4;
      ctx.fillStyle = palette.outline;
      ctx.fillRect(ox + pw / 2 - mw / 2, mouthY, mw, 2);
    } else if (exprData.mouthState === 'gritted') {
      ctx.fillRect(ox + pw / 2 - 3, mouthY, 6, 1);
      ctx.fillStyle = palette.eyeHighlight;
      ctx.fillRect(ox + pw / 2 - 2, mouthY, 1, 1);
      ctx.fillRect(ox + pw / 2, mouthY, 1, 1);
      ctx.fillRect(ox + pw / 2 + 2, mouthY, 1, 1);
    } else if (exprData.mouthState === 'slight_frown') {
      ctx.fillRect(ox + pw / 2 - 2, mouthY + 1, 4, 1);
      ctx.fillRect(ox + pw / 2 - 3, mouthY, 1, 1);
      ctx.fillRect(ox + pw / 2 + 3, mouthY, 1, 1);
    } else if (exprData.mouthState === 'peaceful' || exprData.mouthState === 'gentle') {
      ctx.globalAlpha = 0.5;
      ctx.fillRect(ox + pw / 2 - 2, mouthY, 4, 1);
      ctx.globalAlpha = 1;
    } else {
      // Default closed mouth
      ctx.fillRect(ox + pw / 2 - 2, mouthY, 4, 1);
    }

    // ── Ears ──
    if (species === 'rabbit') {
      const earH = 10;
      const earW = 4;
      const earTop = headTop - earH + 2;
      const earState = exprData.earState || 'natural';

      let leftEarAngle = 0;
      let rightEarAngle = 0;
      if (earState === 'perked') { leftEarAngle = -2; rightEarAngle = -2; }
      if (earState === 'back') { leftEarAngle = 3; rightEarAngle = 3; }
      if (earState === 'flat') { leftEarAngle = 4; rightEarAngle = 4; }
      if (earState === 'drooped') { leftEarAngle = 5; rightEarAngle = 5; }
      if (earState === 'forward') { leftEarAngle = -1; rightEarAngle = -1; }

      // Left ear
      this._drawPixelBlock(ctx, ox + pw / 2 - 10, earTop + leftEarAngle, earW, earH - Math.abs(leftEarAngle), palette.furBase);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(ox + pw / 2 - 9, earTop + leftEarAngle + 2, 2, earH - Math.abs(leftEarAngle) - 4);
      // Right ear
      this._drawPixelBlock(ctx, ox + pw / 2 + 6, earTop + rightEarAngle, earW, earH - Math.abs(rightEarAngle), palette.furBase);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(ox + pw / 2 + 7, earTop + rightEarAngle + 2, 2, earH - Math.abs(rightEarAngle) - 4);
    } else if (species === 'fox') {
      const earH = 8;
      const earTop = headTop - earH + 4;
      for (let ey = 0; ey < earH; ey++) {
        const w = Math.max(1, 5 - ey);
        ctx.fillStyle = palette.furBase;
        ctx.fillRect(ox + pw / 2 - 12, earTop + ey, w, 1);
        ctx.fillRect(ox + pw / 2 + 12 - w, earTop + ey, w, 1);
      }
    } else if (species === 'wolf') {
      this._drawPixelBlock(ctx, ox + pw / 2 - 12, headTop - 4, 5, 8, palette.furBase);
      this._drawPixelBlock(ctx, ox + pw / 2 + 7, headTop - 4, 5, 8, palette.furBase);
    }

    // ── Luminous overlay (for Obaa-chan's special expression) ──
    if (exprData.glowOverlay) {
      const gc = hexToRGB(exprData.glowOverlay.color);
      ctx.fillStyle = `rgba(${gc.r}, ${gc.g}, ${gc.b}, ${exprData.glowOverlay.alpha})`;
      ctx.fillRect(ox, oy, pw, ph);
    }

    // ── Border (2px gold when speaking) ──
    ctx.strokeStyle = palette.special || '#c9a959';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 1, oy + 1, pw - 2, ph - 2);
  }


  // ═══════════════════════════════════════════════════════════════
  // PART 7: TILESET GENERATION & PALETTE SWAPS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate a tileset for an era by palette-swapping the base tileset.
   *
   * Base tileset: "generic_village" with reference palette
   * Each era overrides specific color slots:
   *   Ground, Path, Wall, Roof, Wood, Water
   *
   * Result: Same structural tileset, completely different atmosphere.
   * Saves 80% of art production time.
   */
  generateTileset(eraPalette, eraId) {
    const TILE_SIZE = 16;
    const TILES_PER_ROW = 8;
    const TILE_TYPES = [
      'grass', 'grass_dark', 'grass_light', 'dirt',
      'path_h', 'path_v', 'path_corner', 'path_t',
      'water_deep', 'water_shallow', 'water_shore', 'water_anim',
      'wall_base', 'wall_top', 'wall_window', 'wall_door',
      'roof_flat', 'roof_peaked', 'roof_edge_l', 'roof_edge_r',
      'tree_trunk', 'tree_canopy', 'bush', 'flower',
      'grass_blade', 'crop', 'interior_floor', 'interior_wall',
      'decor_1', 'decor_2', 'decor_3', 'decor_4',
      'transition_ns', 'transition_ew', 'transition_corner_nw', 'transition_corner_ne',
      'transition_corner_sw', 'transition_corner_se', 'transition_t_n', 'transition_t_s',
    ];

    const rows = Math.ceil(TILE_TYPES.length / TILES_PER_ROW);
    const canvas = this._createCanvas(TILE_SIZE * TILES_PER_ROW, TILE_SIZE * rows);
    const ctx = canvas.getContext('2d');

    // Build era-specific color ramps
    const groundRamp = buildRamp(eraPalette.dominant || '#4a7c59');
    const pathColor = eraPalette.path || '#8b7355';
    const wallRamp = buildRamp(eraPalette.wall || '#a09080');
    const roofRamp = buildRamp(eraPalette.roof || '#8b4513');
    const waterRamp = buildRamp(eraPalette.water || '#2b6ca3');
    const woodRamp = buildRamp(eraPalette.wood || '#5c4d3c');

    for (let i = 0; i < TILE_TYPES.length; i++) {
      const col = i % TILES_PER_ROW;
      const row = Math.floor(i / TILES_PER_ROW);
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      const type = TILE_TYPES[i];

      this._drawTile(ctx, x, y, TILE_SIZE, type, {
        ground: groundRamp,
        path: buildRamp(pathColor),
        wall: wallRamp,
        roof: roofRamp,
        water: waterRamp,
        wood: woodRamp,
        accent: eraPalette.accent || '#c9a959',
        dark: eraPalette.dark || '#1a1a2e',
        holy: eraPalette.holy || '#ffd700',
      });
    }

    const key = `tileset_${eraId}`;
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    this.scene.textures.addCanvas(key, canvas);

    return { key, tileSize: TILE_SIZE, tilesPerRow: TILES_PER_ROW, tileTypes: TILE_TYPES };
  }

  _drawTile(ctx, x, y, size, type, ramps) {
    const s = size;

    if (type.startsWith('grass')) {
      // Fill with base ground color
      ctx.fillStyle = ramps.ground[2];
      ctx.fillRect(x, y, s, s);

      // Add texture variation (3-4 blade shapes following Visual DNA grass rules)
      const variant = type === 'grass_dark' ? 1 : type === 'grass_light' ? 3 : 2;
      ctx.fillStyle = ramps.ground[variant === 1 ? 0 : variant === 3 ? 3 : 1];

      // Procedural grass blades (1-3px wide, 3-6px tall)
      const seed = x * 7 + y * 13; // deterministic pseudo-random
      for (let i = 0; i < 4; i++) {
        const bx = ((seed + i * 37) % (s - 2)) + 1;
        const by = ((seed + i * 53) % (s - 4)) + 2;
        const bh = 3 + ((seed + i * 19) % 4);
        const bw = 1 + ((seed + i * 11) % 2);
        ctx.fillRect(x + bx, y + by, bw, Math.min(bh, s - by));
      }

      // Golden highlight for sun-caught blade tips
      if (type === 'grass_light') {
        ctx.fillStyle = ramps.ground[3];
        ctx.fillRect(x + 3, y + 2, 1, 2);
        ctx.fillRect(x + 10, y + 4, 1, 2);
      }

    } else if (type.startsWith('path')) {
      ctx.fillStyle = ramps.path[2];
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = ramps.path[1];
      ctx.fillRect(x, y, s, 1);
      ctx.fillStyle = ramps.path[3];
      ctx.fillRect(x, y + s - 1, s, 1);
      // Pebble detail
      ctx.fillStyle = ramps.path[0];
      ctx.fillRect(x + 3, y + 5, 2, 1);
      ctx.fillRect(x + 9, y + 10, 2, 1);

    } else if (type.startsWith('water')) {
      const depth = type.includes('deep') ? 0 : type.includes('shallow') ? 1 : 2;
      ctx.fillStyle = ramps.water[depth === 0 ? 0 : depth === 1 ? 1 : 2];
      ctx.fillRect(x, y, s, s);
      // Horizontal highlight lines (scroll animation in-game)
      ctx.fillStyle = ramps.water[3];
      ctx.globalAlpha = 0.4;
      ctx.fillRect(x, y + 4, s, 1);
      ctx.fillRect(x + 3, y + 10, s - 6, 1);
      ctx.globalAlpha = 1;
      // Shore foam
      if (type.includes('shore')) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, s, 2);
        ctx.globalAlpha = 1;
      }

    } else if (type.startsWith('wall')) {
      ctx.fillStyle = ramps.wall[2];
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = ramps.wall[1];
      ctx.fillRect(x, y, 1, s);
      ctx.fillStyle = ramps.wall[3];
      ctx.fillRect(x + s - 1, y, 1, s);
      // Mortar lines
      ctx.fillStyle = ramps.wall[0];
      ctx.fillRect(x, y + s / 2, s, 1);
      ctx.fillRect(x + s / 2, y, 1, s);
      if (type.includes('window')) {
        ctx.fillStyle = ramps.dark;
        ctx.fillRect(x + 4, y + 3, 8, 6);
        ctx.fillStyle = ramps.water[3];
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x + 5, y + 4, 3, 2);
        ctx.globalAlpha = 1;
      }
      if (type.includes('door')) {
        ctx.fillStyle = ramps.wood[2];
        ctx.fillRect(x + 3, y + 4, 10, 12);
        ctx.fillStyle = ramps.wood[0];
        ctx.fillRect(x + 3, y + 4, 10, 1);
        ctx.fillStyle = ramps.accent;
        ctx.fillRect(x + 11, y + 10, 1, 1); // door handle
      }

    } else if (type.startsWith('roof')) {
      ctx.fillStyle = ramps.roof[2];
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = ramps.roof[1];
      ctx.fillRect(x, y, s, 2);
      ctx.fillStyle = ramps.roof[3];
      ctx.fillRect(x, y + s - 2, s, 2);

    } else if (type.startsWith('tree')) {
      if (type.includes('trunk')) {
        ctx.fillStyle = ramps.ground[2];
        ctx.fillRect(x, y, s, s); // background grass
        ctx.fillStyle = ramps.wood[2];
        ctx.fillRect(x + 5, y, 6, s);
        ctx.fillStyle = ramps.wood[0];
        ctx.fillRect(x + 5, y, 2, s);
        ctx.fillStyle = ramps.wood[3];
        ctx.fillRect(x + 9, y, 2, s);
      } else { // canopy
        ctx.fillStyle = ramps.ground[0];
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = ramps.ground[2];
        ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
        ctx.fillStyle = ramps.ground[3];
        ctx.fillRect(x + 4, y + 3, 4, 3);
      }

    } else if (type === 'bush') {
      ctx.fillStyle = ramps.ground[2]; // bg
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = ramps.ground[1];
      this._drawRoundedBlock(ctx, x + 2, y + 4, 12, 10, ramps.ground[1], 2);
      ctx.fillStyle = ramps.ground[3];
      ctx.fillRect(x + 5, y + 5, 3, 2);

    } else if (type === 'flower') {
      ctx.fillStyle = ramps.ground[2]; // bg
      ctx.fillRect(x, y, s, s);
      // Stem
      ctx.fillStyle = ramps.ground[1];
      ctx.fillRect(x + 7, y + 6, 1, 8);
      // Petals
      ctx.fillStyle = ramps.accent;
      ctx.fillRect(x + 6, y + 4, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 7, y + 5, 1, 1); // center

    } else if (type.startsWith('decor')) {
      ctx.fillStyle = ramps.ground[2]; // bg
      ctx.fillRect(x, y, s, s);
      // Generic decorative element
      ctx.fillStyle = ramps.accent;
      ctx.fillRect(x + 4, y + 4, 8, 8);
      ctx.fillStyle = ramps.dark;
      ctx.fillRect(x + 5, y + 5, 6, 6);

    } else if (type.startsWith('transition')) {
      // Auto-tile transitions: gradient between two ground types
      ctx.fillStyle = ramps.ground[2];
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = ramps.path[2];
      if (type.includes('ns')) {
        ctx.fillRect(x, y + s / 2, s, s / 2);
      } else if (type.includes('ew')) {
        ctx.fillRect(x + s / 2, y, s / 2, s);
      } else if (type.includes('corner')) {
        // Corner transitions
        const qx = type.includes('_ne') || type.includes('_se') ? s / 2 : 0;
        const qy = type.includes('_sw') || type.includes('_se') ? s / 2 : 0;
        ctx.fillRect(x + qx, y + qy, s / 2, s / 2);
      }

    } else {
      // Fallback: solid with era color
      ctx.fillStyle = ramps.ground[2];
      ctx.fillRect(x, y, s, s);
    }
  }


  // ═══════════════════════════════════════════════════════════════
  // PART 8: UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  _createCanvas(w, h) {
    // Use OffscreenCanvas if available, otherwise regular canvas
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(w, h);
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  _drawPixelBlock(ctx, x, y, w, h, color) {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  _drawRoundedBlock(ctx, x, y, w, h, color, radius) {
    ctx.fillStyle = color;
    // Simple rounded corners by omitting corner pixels
    ctx.fillRect(x + radius, y, w - radius * 2, h);
    ctx.fillRect(x, y + radius, w, h - radius * 2);
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }

  /**
   * Apply 1px dark outline around all non-transparent pixels.
   * FF6 standard: every sprite has a clean dark outline.
   * RULE: Outline color is era-specific dark, never pure black.
   */
  _applyOutline(ctx, ox, oy, fw, fh, outlineColor) {
    const imageData = ctx.getImageData(ox, oy, fw, fh);
    const data = imageData.data;
    const outline = hexToRGB(outlineColor || '#1a1a2e');
    const outlinePixels = [];

    for (let py = 0; py < fh; py++) {
      for (let px = 0; px < fw; px++) {
        const idx = (py * fw + px) * 4;
        if (data[idx + 3] === 0) {
          // This pixel is transparent — check if any neighbor is opaque
          const neighbors = [
            [px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1],
          ];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < fw && ny >= 0 && ny < fh) {
              const nIdx = (ny * fw + nx) * 4;
              if (data[nIdx + 3] > 0) {
                outlinePixels.push([px, py]);
                break;
              }
            }
          }
        }
      }
    }

    // Draw outline pixels
    ctx.fillStyle = outlineColor || '#1a1a2e';
    for (const [px, py] of outlinePixels) {
      ctx.fillRect(ox + px, oy + py, 1, 1);
    }
  }

  _registerFrames(key, fw, fh, sheetW, sheetH) {
    const texture = this.scene.textures.get(key);
    if (!texture) return;

    const cols = Math.floor(sheetW / fw);
    const rows = Math.floor(sheetH / fh);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const frameIndex = row * cols + col;
        texture.add(frameIndex, 0, col * fw, row * fh, fw, fh);
      }
    }
  }

  _createOverworldAnimations(charId, textureKey, walkFrames, idleFrames, directions) {
    const cols = walkFrames + idleFrames;

    for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
      const dir = directions[dirIdx];
      const rowStart = dirIdx * cols;

      // Walk animation
      const walkKey = `${charId}_walk_${dir}`;
      if (!this.scene.anims.exists(walkKey)) {
        this.scene.anims.create({
          key: walkKey,
          frames: Array.from({ length: walkFrames }, (_, i) => ({
            key: textureKey, frame: rowStart + i,
          })),
          frameRate: 1000 / ANIMATION_BIBLE.walk.frames[0].timing,
          repeat: -1,
        });
      }

      // Idle animation
      const idleKey = `${charId}_idle_${dir}`;
      if (!this.scene.anims.exists(idleKey)) {
        this.scene.anims.create({
          key: idleKey,
          frames: Array.from({ length: idleFrames }, (_, i) => ({
            key: textureKey, frame: rowStart + walkFrames + i,
          })),
          frameRate: 1000 / ANIMATION_BIBLE.idle_overworld.frames[0].timing,
          repeat: -1,
        });
      }
    }
  }

  _createBattleAnimations(charId, textureKey, animations) {
    let frameOffset = 0;

    for (const anim of animations) {
      const animData = ANIMATION_BIBLE[anim.key];
      const key = `${charId}_${anim.key}`;

      if (!this.scene.anims.exists(key)) {
        const frames = [];
        for (let f = 0; f < anim.count; f++) {
          const timing = animData ? animData.frames[f].timing : 150;
          frames.push({
            key: textureKey,
            frame: frameOffset + f,
            duration: timing,
          });
        }

        this.scene.anims.create({
          key,
          frames,
          frameRate: 8, // overridden by per-frame duration
          repeat: animData && animData.loop ? -1 : 0,
        });
      }
      frameOffset += anim.count;
    }
  }

  // ── Get expression frame index for a character's portrait ──

  getExpressionFrame(charId, expression) {
    const expressions = this.textureCache.get(`${charId}_expressions`) || [];
    const idx = expressions.indexOf(expression);
    return idx >= 0 ? idx : 0;
  }

  getPortraitKey(charId) {
    return `portrait_${charId}`;
  }

  getOverworldKey(charId) {
    return `sprite_ow_${charId}`;
  }

  getBattleKey(charId) {
    return `sprite_bt_${charId}`;
  }
}


// ═══════════════════════════════════════════════════════════════
// PART 9: ERA PALETTE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Complete era palette definitions following the Visual DNA color theory.
 * Each era has scientifically designed colors that evoke its emotional tone.
 */
export const ERA_PALETTES = {
  'book-00': {
    // Japan 1587 — Pastoral → Grief → Awe
    dominant: '#4a7c59',  // rice paddies, life, peace
    accent: '#c9a959',    // hidden faith, precious things
    dark: '#1a1a2e',      // era outline color
    shadow: '#2b1d0e',    // deep earth, soil, roots
    sky: '#87ceeb',       // innocence (Act 1 only)
    night: '#0f0e17',     // loss, unknown
    fire: '#ff4500',      // destruction of innocence
    blood: '#8b0000',     // martyrdom
    holy: '#ffd700',      // Obaa-chan's luminosity
    accuser: '#9a6aaa',   // purple whisper
    wall: '#7a6852',      // Japanese wood
    roof: '#7a3c10',      // dark thatch
    path: '#8b7355',      // packed earth
    water: '#2b6ca3',     // coastal blue
    wood: '#5c4d3c',      // aged timber
    // Emotional arc: warm green → darkening → fire red → cold blue → gold breakthrough
  },

  'book-01': {
    // Rome 64 AD — Underground → Arena → Catacomb
    dominant: '#8b4513',  // terracotta earth, clay, age
    accent: '#c0392b',    // blood red, persecution, empire
    dark: '#1a1410',      // catacomb black, underground
    shadow: '#1a1410',
    sky: '#d4a574',       // Mediterranean bronze
    night: '#0f0a08',
    fire: '#d4a017',      // torchlight amber
    blood: '#8b0000',
    holy: '#ffd700',      // consistent across all eras
    accuser: '#4a0080',
    wall: '#c9b898',      // Roman limestone
    roof: '#b85c38',      // Roman tile
    path: '#9a8c7a',      // warm stone
    water: '#1a5276',     // deep Mediterranean
    wood: '#8b6f4e',      // olive wood
    // Emotional arc: darkness → torchlit warmth → arena exposure → crypt peace
  },

  'book-02': {
    // Egypt 325 AD — Desert → Council
    dominant: '#daa520',  // sand gold
    accent: '#1a5276',    // lapis lazuli
    dark: '#2b1d0e',
    shadow: '#1a1410',
    sky: '#f0e68c',
    night: '#0f0e17',
    fire: '#ff6347',
    blood: '#8b0000',
    holy: '#ffd700',
    accuser: '#4a0080',
    wall: '#daa520',
    roof: '#c9a959',
    path: '#c9a87a',
    water: '#1a5276',
    wood: '#8b6f4e',
  },

  'book-05': {
    // Japan 1638 — Echo → Recognition
    dominant: '#2d3436',  // near-black oppression
    accent: '#ffd700',    // hidden gold, faith survived
    dark: '#1a1a1a',
    shadow: '#0f0e17',
    sky: '#2d3436',       // no open sky in oppression
    night: '#0a0a0a',
    fire: '#ff4500',
    blood: '#8b0000',
    holy: '#ffd700',
    accuser: '#4a0080',
    wall: '#3d3226',
    roof: '#2d2d2d',
    path: '#4a4a3a',
    water: '#1a3a4a',
    wood: '#3d3226',
    mirror: '#4a7c59',    // Same green as Book 00 — memory, return
    // Usagi recognizes: this green. This coast. 250 years and the grass is the same.
  },
};

/**
 * Get the palette for a given book ID, with fallback to Book 00.
 */
export function getEraPalette(bookId) {
  return ERA_PALETTES[bookId] || ERA_PALETTES['book-00'];
}


// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  buildRamp,
  buildCharacterPalette,
  hexToHSL,
  hslToHex,
  hexToRGB,
  rgbToHex,
  SPECIES_TEMPLATES,
  ANIMATION_BIBLE,
  SUB_PIXEL_PATTERNS,
  EXPRESSION_DEFS,
};
