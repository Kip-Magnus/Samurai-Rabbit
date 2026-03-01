# SAMURAI USAGI — VISUAL DNA SYSTEM
## *The Art Pipeline That Makes Everything Beautiful From The Start*

---

## PHILOSOPHY

We don't copy sprites from other games. We extract the **techniques** that make
those games beautiful and codify them into rules our procedural renderer follows
automatically. Every character, every blade of grass, every battle stance, every
dialogue box follows these rules. No manual tweaking. The system produces beauty
by default because the rules are beautiful.

### SOURCE GAMES (Our Visual Teachers)

| Game | What We Extract | Why |
|------|----------------|-----|
| **FF6 (SNES)** | Character proportions, battle stances, pixel economy, palette discipline | 15-color sprites with more personality than most 3D models |
| **Chrono Trigger** | Animation fluidity, diagonal energy lines, personality in idle poses, scene transitions | 120+ fully animated sprites, each with distinct body language |
| **Tactics Ogre** | Political weight in art, muted palettes for moral complexity, isometric atmosphere | Proves pixel art can feel heavy and adult |
| **Dragon Quest V** | Life-stage storytelling through sprite changes, warm pastoral palettes, creature design | Emotional range through simple sprite swaps |
| **Octopath Traveler** | HD-2D lighting, depth-of-field on pixel art, atmospheric particles | Modern proof that pixel art scales to HD displays |
| **Celeste** | Sub-pixel animation, hair/cloth physics in pixels, expressive micro-movements | 2-3 pixel shifts that convey enormous emotion |

---

## PART 1: SPRITE CONSTRUCTION RULES

### 1.1 Character Proportions (The FF6/CT Standard)

```
OVERWORLD SPRITES: 16×24 pixels (displayed at 4x = 64×96 on screen)
┌────────────────┐
│    ██  ██      │ ← Ears (species-specific, 2-4px tall)
│   ████████     │
│   ████████     │ ← Head: 8×7px block
│   █○██○███     │    Eyes at row 3 of head
│   ████████     │    Nose/mouth row 5-6
│   ████████     │
│    ██████      │ ← Neck: 1px transition
│   ████████     │ ← Torso: 6×5px
│   ████████     │    Arms: 2px wide each side
│   ████████     │
│   ██    ██     │ ← Legs: 2px wide each
│   ██    ██     │    2-3px tall
└────────────────┘

BATTLE SPRITES: 32×48 pixels (displayed at 3x = 96×144 on screen)
- 2x the detail of overworld
- Room for facial expressions, weapon details, armor articulation
- Asymmetric stances (weight shifted, weapon ready)
- This is where Chrono Trigger excels: diagonal energy lines

PORTRAIT SPRITES: 48×48 pixels (displayed at 2x = 96×96 in dialogue box)
- Head and shoulders only
- 4-6 expressions per character: neutral, happy, angry, sad, afraid, determined
- Eyes are 60% of the emotion — 4×3px minimum for eye area
- Thick upper eyelid line (2px) = anime readability cue
```

### 1.2 The 15-Color Rule (FF6 Palette Discipline)

Every character sprite uses **exactly 15 colors + transparency**. This is the
SNES 4bpp limit and it's a feature, not a bug. Constraint forces clarity.

```
COLOR SLOT ALLOCATION PER CHARACTER:
Slot 0:  Transparency
Slot 1:  Darkest outline (#1a1a2e or era-specific dark)
Slot 2:  Fur/skin base
Slot 3:  Fur/skin shadow
Slot 4:  Fur/skin highlight
Slot 5:  Eye color
Slot 6:  Eye highlight (white or near-white)
Slot 7:  Clothing primary
Slot 8:  Clothing primary shadow
Slot 9:  Clothing primary highlight
Slot 10: Clothing secondary
Slot 11: Clothing secondary shadow
Slot 12: Weapon/accessory metal
Slot 13: Weapon/accessory highlight
Slot 14: Hair/ear inner / accent color
Slot 15: Special (cross glow, blood, holy effect)
```

### 1.3 Species-Specific Anatomy

```json
{
  "rabbit": {
    "ears": { "style": "long_upright", "height": 5, "width": 2, "innerColor": "pink_muted" },
    "head": { "shape": "round", "muzzle": "small_pointed", "cheeks": "soft" },
    "eyes": { "shape": "round_large", "highlight": "top_left", "size": [3, 3] },
    "body": { "proportion": "3_head_tall", "stance": "slightly_hunched" },
    "tail": { "visible_from": ["back", "side"], "size": "small_round" }
  },
  "fox": {
    "ears": { "style": "triangular_pointed", "height": 3, "width": 3, "innerColor": "dark" },
    "head": { "shape": "angular", "muzzle": "elongated", "cheeks": "none" },
    "eyes": { "shape": "narrow_angled", "highlight": "center", "size": [3, 2] },
    "body": { "proportion": "3.5_head_tall", "stance": "upright_dignified" },
    "tail": { "visible_from": ["back", "side"], "size": "large_flowing" }
  },
  "wolf": {
    "ears": { "style": "angular_alert", "height": 3, "width": 2, "innerColor": "dark" },
    "head": { "shape": "angular_strong", "muzzle": "wide_powerful", "cheeks": "defined" },
    "eyes": { "shape": "narrow_slit", "highlight": "none_or_minimal", "size": [4, 2] },
    "body": { "proportion": "4_head_tall", "stance": "military_erect" },
    "tail": { "visible_from": ["back"], "size": "thick_low" }
  },
  "celestial": {
    "ears": { "style": "undefined_luminous", "height": 0, "width": 0 },
    "head": { "shape": "indistinct_radiant", "muzzle": "none", "cheeks": "none" },
    "eyes": { "shape": "golden_points", "highlight": "full_glow", "size": [2, 2] },
    "body": { "proportion": "4_head_tall", "stance": "floating_slightly" },
    "glow": { "radius": 3, "color": "#ffd700", "alpha": 0.15, "animated": true }
  }
}
```

---

## PART 2: ANIMATION FRAME PATTERNS

### 2.1 The Animation Bible

Every animation type has a fixed frame count and timing pattern extracted from
the best JRPG sprites. These are rules, not suggestions.

```
IDLE (Overworld):
  Frames: 2 (CT-style breathing)
  Pattern: [base, breathe_down]
  Timing: 400ms per frame
  Technique: Shift torso down 1px, ears sway 1px opposite
  Hair/cloth: 1-frame delay behind body (Celeste technique)

IDLE (Battle):
  Frames: 4 (FF6-style ready stance)
  Pattern: [ready, breathe1, ready, breathe2]
  Timing: 200ms per frame
  Technique: Weight on back foot, weapon slightly raised
  Key: Asymmetric stance — one arm forward, weight shifted (CT technique)

WALK (4-direction):
  Frames: 4 per direction (modern standard, not FF6's 3-frame)
  Pattern: [step_right, pass_center, step_left, pass_center]
  Timing: 150ms per frame at normal speed
  Technique: Planted leg slides back (creates forward illusion)
  Key: Body bobs down 1px on step frames (weight transfer)
  Ears/hair: Trail 1 frame behind movement direction

ATTACK (Katana):
  Frames: 6
  Pattern: [ready, wind_up, anticipation, strike, impact_hold, recovery]
  Timing: [100, 100, 80, 60, 180, 120]ms
  Key: HOLD the impact frame 3x longer (Hollow Knight technique)
  Wind-up: Pull sword behind body, lean back 2px
  Strike: Full extension, diagonal slash line, lean forward 3px
  Recovery: Return to battle idle over 2 frames

ATTACK (Prayer/Miracle):
  Frames: 8
  Pattern: [ready, hands_raise1, hands_raise2, hands_together,
            glow_start, glow_peak, glow_release, recovery]
  Timing: [100, 120, 120, 200, 100, 150, 100, 120]ms
  Key: Hands come together at frame 4 (devotional pose)
  Particles: Holy motes rise from frame 5, burst at frame 6

DAMAGE (Hit):
  Frames: 3
  Pattern: [flinch_back, pain_peak, stagger_recover]
  Timing: [60, 200, 150]ms
  Technique: Flash white on frame 1 (2-frame flash cycle)
  Key: Lean back 2-3px, knees buckle, eyes shut
  Screen: 2px camera shake on impact

DEATH:
  Frames: 5
  Pattern: [hit, kneel, collapse_start, collapse_end, fade]
  Timing: [100, 200, 150, 200, 400]ms
  Technique: Alpha fade on final frame (not instant disappear)

WALK_EMOTIONAL (Grief/Exhaustion — Book Zero mountain):
  Frames: 6 (slower than normal walk)
  Pattern: [drag_step, lean, drag_step2, stumble, catch, continue]
  Timing: [250, 200, 250, 150, 300, 200]ms
  Technique: Head lowered 1px, arms hang, no ear bounce
  Key: Absence of normal animation tells the emotional story

DIALOGUE_GESTURE:
  nod: 2 frames, head drops 1px and returns
  shake: 3 frames, head shifts left-center-right
  surprise: 2 frames, body springs up 1px, eyes widen (add highlight pixel)
  bow: 3 frames, torso tilts forward progressively
  pray: 4 frames, hands rise and clasp, head lowers
```

### 2.2 Sub-Pixel Animation (Celeste Technique)

For elements too small to move a full pixel (hair tips, cloth edges, ear tips):

```
Instead of moving the element, SHIFT THE HIGHLIGHT:

Frame 1: ░█░    (highlight on center pixel)
Frame 2: ░░█    (highlight shifts right = illusion of rightward sway)
Frame 3: ░█░    (back to center)
Frame 4: █░░    (highlight shifts left = leftward sway)

This creates flowing motion without moving a single pixel's position.
Apply to: ear tips, hair ends, kimono hem, cross pendant, blade edge
```

### 2.3 Anticipation & Follow-Through (The 12 Principles)

```
EVERY action follows: ANTICIPATION → ACTION → FOLLOW-THROUGH

Jumping:     Crouch 1px down → Spring up → Land with 1px squash
Attacking:   Pull weapon back → Strike → Weapon continues past target
Turning:     Lean slightly in new direction → Rotate → Settle
Door opening: Reach forward → Pull → Step back from momentum
Praying:     Hands begin at sides → Rise slowly → Clasp (hold longest)

The anticipation frame is what separates amateur from professional animation.
Without it, actions feel instant and weightless.
Without follow-through, actions feel robotic and clipped.
```

---

## PART 3: PALETTE SCIENCE

### 3.1 Era Color Theory

Each historical era has a scientifically designed palette that evokes its
emotional tone. These aren't random — they follow color psychology research
mapped to the narrative design.

```
BOOK 00 — JAPAN 1587 (Pastoral → Grief → Awe)
  Base:    Muted green (#4a7c59) — rice paddies, life, peace
  Accent:  Warm gold (#c9a959) — hidden faith, precious things
  Shadow:  Deep earth (#2b1d0e) — soil, roots, tradition
  Sky:     Soft blue (#87ceeb) — innocence (Act 1 only)
  Night:   Deep indigo (#0f0e17) — loss, unknown
  Fire:    True red-orange (#ff4500) — destruction of innocence
  Holy:    Pure gold (#ffd700) — Obaa-chan's luminosity
  ─── Emotional arc: warm green → darkening → fire red → cold blue → gold breakthrough

BOOK 01 — ROME 64 AD (Underground → Arena → Catacomb)
  Base:    Terracotta (#8b4513) — Roman earth, clay, age
  Accent:  Blood red (#c0392b) — persecution, empire, martyrdom
  Shadow:  Catacomb black (#1a1410) — underground, hidden
  Stone:   Warm grey (#9a8c7a) — Roman architecture
  Torch:   Amber (#d4a017) — only light in darkness
  Holy:    Pure gold (#ffd700) — consistent across all eras
  ─── Emotional arc: darkness → torchlit warmth → arena exposure → crypt peace

BOOK 05 — JAPAN 1638 (Echo → Recognition)
  Base:    Near-black (#2d3436) — oppression, hiding, 250 years of darkness
  Accent:  Hidden gold (#ffd700) — faith survived, cross revealed
  Mirror:  Same green as Book 00 (#4a7c59) — memory, return
  ─── Usagi recognizes: this green. This coast. 250 years and the grass is the same.
```

### 3.2 Palette Ramp Construction

Every color exists in a 4-step ramp: darkest → shadow → base → highlight.
This is how FF6 achieves depth with 15 colors.

```
RAMP RULES:
- Hue shift: Shadows shift toward blue/purple, highlights toward yellow
  (Never just darken/lighten the same hue — that's "pillow shading")
- Saturation: Shadows slightly more saturated, highlights slightly less
- Value steps: ~20-25% brightness difference between each step

EXAMPLE — Usagi's fur (#a0784c):
  Darkest:   #5c4232  (hue shifted toward brown-red, deeper)
  Shadow:    #7a5a3a  (midtone shadow)
  Base:      #a0784c  (the defined fur color)
  Highlight: #c4a878  (shifted toward gold-cream)

EXAMPLE — Village green (#4a7c59):
  Darkest:   #1e3a28  (deep forest shadow)
  Shadow:    #366b48  (under-canopy)
  Base:      #4a7c59  (sunlit grass)
  Highlight: #7aad82  (sun-caught blade tips)

NEVER: Use pure black for shadows or pure white for highlights.
ALWAYS: Shift hue, not just value.
```

### 3.3 Atmospheric Color Rules

```
TIME OF DAY OVERLAYS (applied to entire scene):
  Morning:    No overlay (true colors) + warm particle motes
  Afternoon:  Slight amber overlay (multiply #fff8e0 at 10%)
  Evening:    Orange-pink overlay (multiply #ffb07a at 15%) + long shadows
  Night:      Blue overlay (multiply #1a2a4a at 30%) + reduced saturation
  Firelight:  Orange point-light gradient from source, rest in deep shadow

WEATHER OVERLAYS:
  Rain:       Desaturate 20%, add blue tint 10%, rain particle layer
  Storm:      Desaturate 40%, lightning flash (full white at 50% for 2 frames)
  Fog:        White overlay at 15% on far objects, 0% on near
  Snow:       Lighten ground 20%, white particle layer, muted everything
```

---

## PART 4: ATMOSPHERIC EFFECTS

### 4.1 Parallax Layers (Octopath Technique)

Every scene has depth built from discrete layers that move at different speeds:

```
LAYER STACK (back to front):
  Layer 0: Sky gradient (static or very slow scroll)
  Layer 1: Far background — mountains/clouds (0.1x scroll speed)
  Layer 2: Mid background — treeline/buildings (0.3x scroll speed)
  Layer 3: Ground plane — where characters walk (1.0x = camera speed)
  Layer 4: Foreground decoration — grass blades, posts (1.3x scroll speed)
  Layer 5: Overlay effects — rain, particles, light shafts (independent)
  Layer 6: UI layer — dialogue box, HUD (fixed)

PARALLAX CREATES DEPTH WITH ZERO 3D RENDERING.
Even 2-3 layers at different speeds transforms flat pixel art into a living scene.
```

### 4.2 Environmental Detail Generators

```
GRASS:
  Technique: 3-4 blade shapes, each 1-3px wide, 3-6px tall
  Animation: Sub-pixel highlight shift (not position change) every 8 frames
  Wind: All blades shift highlight in same direction simultaneously
  Density: 1 blade per 3-4 ground tiles in foreground layer
  Colors: 3 greens from era palette ramp + 1 golden highlight for sun-catch

WATER:
  Surface: Horizontal highlight lines that scroll slowly (1px per 12 frames)
  Reflection: Vertically flipped, desaturated version of shore objects
  Edge: 2-frame animation between shore tile and water tile (foam)
  Colors: 3 blues + 1 white highlight for sparkle

FIRE:
  Core: Yellow-white, 2×2px, random position jitter ±1px per frame
  Mid: Orange, 3×4px envelope around core, shape changes each frame
  Outer: Red-orange, 5×6px, alpha fading at edges
  Sparks: 1px particles rising, random horizontal drift, fade out
  Frame count: 4 frames minimum, 6 ideal, all unique shapes
  Key: Fire never repeats the same shape — randomize within constraints

RAIN:
  Drop: 1px wide, 8-15px tall, slight angle (not vertical)
  Speed: 0.4-0.8s fall duration (vary per drop for depth)
  Density: 30-50 drops visible, staggered start times
  Splash: On ground contact, 2-frame expanding ring (3px → 5px → gone)
  Sound cue: Flag for audio system, no visual substitute needed

LIGHT SHAFTS (Octopath):
  Shape: Triangular gradient, widening downward
  Color: Warm gold (#ffd700) at 8-12% opacity
  Animation: Slow horizontal drift (1px per 30 frames)
  Particles: 1-2px motes floating upward within shaft
  Use: Forest scenes, chapel windows, divine moments

SNOW / ASH:
  Particle: 1-2px, white or grey
  Motion: Slow diagonal drift (wind direction), slight sine-wave path
  Depth: Smaller + slower = farther away
  Accumulation: Ground tiles gradually lighten over scene duration
```

### 4.3 Screen Effects

```
CAMERA SHAKE:
  Light (hit):     ±2px, 3 frames, decreasing amplitude
  Heavy (quake):   ±4px, 6 frames, sine wave decay
  Emotional (loss): ±1px sustained for 2 seconds (subtle unease)

FLASH:
  Damage:   White overlay at 80%, 2 frames on / 2 frames off, 2 cycles
  Holy:     Gold overlay at 40%, fade in over 6 frames, hold 4, fade out 8
  Lightning: Full white 2 frames, then dark 4 frames (contrast shock)
  Memory:   Sepia overlay (multiply #d4a574 at 30%), slight blur

FADE:
  Scene transition: Black, 30 frames out / 20 frames in (asymmetric = intentional)
  Death:    Slow fade to white (20 frames), then hard cut to black
  Time travel: Gold expanding circle from center, engulf screen in 15 frames

VIGNETTE:
  Always active: Subtle dark corners at 10-15% opacity
  Danger: Intensify to 30%, tint red
  Sacred: Lighten center, gold tint at 5%
```

---

## PART 5: TILESET CONSTRUCTION

### 5.1 Base Tileset Architecture

Every era shares an underlying tile structure with era-specific palette swaps
and detail overrides. Build one tileset system, skin it per era.

```
TILE SIZE: 16×16 pixels (standard, matches character foot-size)

TILE CATEGORIES (minimum per era):
  Ground:      4 variants (grass/sand/stone/dirt + transitions)
  Water:       3 variants (deep + shallow + shore) + 2 animation frames
  Path:        2 variants (horizontal + vertical) + corners + T-junctions
  Wall:        3 variants (base + top-cap + window)
  Roof:        2 variants (flat + peaked) + edge tiles
  Vegetation:  6 variants (tree trunk + canopy + bush + flower + grass + crop)
  Interior:    4 variants (floor + wall + door + furniture base)
  Decorative:  8 variants (era-specific: shrine, cross, lantern, well, sign, etc.)
  Transition:  12 tiles (auto-tile edges between ground types)

MINIMUM PER ERA: ~40 unique tiles
With palette swap from base set: Only need ~15 truly new tiles per era
```

### 5.2 Palette Swap System

```
BASE TILESET: "generic_village" uses reference palette
EACH ERA overrides specific color slots:

           Base       Japan 1587   Rome 64 AD    Japan 1638
Ground1:   #4a7c59    #4a7c59      #c9a87a       #2d3a2f
Ground2:   #366b48    #366b48      #a08860       #1e2a1e
Path:      #8b7355    #8b7355      #9a8c7a       #4a4a3a
Wall:      #a09080    #7a6852      #c9b898       #3d3226
Roof:      #8b4513    #7a3c10      #b85c38       #2d2d2d
Wood:      #5c4d3c    #5c4d3c      #8b6f4e       #3d3226
Water:     #2b6ca3    #2b6ca3      #1a5276       #1a3a4a

Result: Same structural tileset, completely different atmosphere per era.
Saves 80% of art production time.
```

### 5.3 Auto-Tiling Rules

```
Every ground type connects to every other ground type using a 47-tile
auto-tile set (Wang tiles). The renderer picks the correct tile based
on neighbor analysis:

  ┌───┬───┬───┐
  │ NW│ N │ NE│   Each neighbor is same-type or different-type
  ├───┼───┼───┤   8 neighbors = 256 combinations
  │ W │ C │ E │   But only 47 visually distinct patterns
  ├───┼───┼───┤   (mirroring + rotation reduces the set)
  │ SW│ S │ SE│
  └───┴───┴───┘

This means: drop "grass" tiles and "water" tiles on a map, and the
engine AUTOMATICALLY draws correct shorelines, paths, forest edges.
No manual transition tile placement.
```

---

## PART 6: BATTLE SCENE COMPOSITION

### 6.1 FF6 Battle Layout

```
SCREEN LAYOUT (256×224 base, scaled to display):
┌─────────────────────────────────────────┐
│                                         │
│         BACKGROUND (parallax)           │
│                                         │
│    ┌─────┐  ┌─────┐  ┌─────┐           │
│    │Enemy│  │Enemy│  │Enemy│           │
│    │  1  │  │  2  │  │  3  │           │
│    └─────┘  └─────┘  └─────┘           │
│                                         │
│                          ┌──────┐       │
│              ┌──────┐    │ Usagi│       │
│              │Compan│    │      │       │
│              │  ion │    │      │       │
│              └──────┘    └──────┘       │
│─────────────────────────────────────────│
│ Usagi    HP ████████░░ 85/100          │
│          MP ████░░░░░░ 18/50           │
│                                         │
│  ┌───────┐  ┌───────┐  ┌──────┐        │
│  │ FIGHT │  │ PRAYER│  │ ITEM │        │
│  └───────┘  └───────┘  └──────┘        │
│  ┌───────┐  ┌───────┐                  │
│  │ GUARD │  │ FLEE  │                  │
│  └───────┘  └───────┘                  │
└─────────────────────────────────────────┘

RULES:
- Enemies: LEFT side, staggered vertically (front row lower)
- Party: RIGHT side, staggered (CT-style, not FF6 column)
- Background: Era-specific parallax scene
- UI: Bottom 30%, semi-transparent dark panel
- ATB Bar: Thin gold bar under each character name
```

### 6.2 Battle Animation Choreography

```
ATTACK SEQUENCE (12-15 frames total):
1. Character steps forward 8px (4 frames, ease-out)
2. Wind-up animation plays (2 frames)
3. Dash toward enemy (3 frames, fast)
4. Strike animation + impact frame HELD 180ms
5. Damage number rises from enemy (floaty, 1px per 3 frames upward)
6. Enemy plays damage animation (flash + flinch)
7. Character returns to position (4 frames, ease-in)

PRAYER SEQUENCE (20 frames total):
1. Character steps forward slightly (2 frames)
2. Hands raise animation (4 frames, slow)
3. Golden particles gather (6 frames, spiral inward)
4. Release: particles explode outward to target
5. Target plays heal/damage effect
6. Character returns (2 frames)

CRITICAL HIT:
- Freeze all animation for 6 frames after impact (dramatic pause)
- Screen flash white 2 frames
- Damage number is 2x size, gold color instead of white
- Camera shake heavy (±4px, 4 frames)

ENEMY DEATH:
- Flash white 3 times (on/off/on/off/on/off, 2 frames each)
- Collapse animation or shatter effect (per enemy type)
- Fade to transparent over 8 frames
- XP/gold popup rises from death location
```

---

## PART 7: DIALOGUE SYSTEM VISUAL DESIGN

### 7.1 Dialogue Box (FF6 Standard, Refined)

```
┌──────────────────────────────────────────────┐
│ ┌──────┐                                     │
│ │      │  OBAA-CHAN                           │
│ │ 48x48│                                     │
│ │portra│  When I was young, there was a great │
│ │  it  │  church in Nagasaki. Built of stone, │
│ │      │  with a bell that rang across the    │
│ └──────┘  harbor.                          ▸  │
└──────────────────────────────────────────────┘

CONSTRUCTION:
- Background: #0f0e17 at 94% opacity (see-through to scene slightly)
- Border: 1px solid, era gold (#c9a959) at 40% opacity
- Inner padding: 8px
- Portrait: 48×48, left-aligned, 2px gold border when speaking
- Name: Era gold, Noto Serif JP, 14px, letter-spacing 2px
- Text: #e8e0d8, IM Fell English or era-appropriate, 16-18px
- Line height: 1.65 (generous — readability on iPad)
- Typewriter: 30ms per character, 80ms pause on periods/em-dashes
- Continue indicator: ▸ symbol, bottom-right, gentle pulse animation
- Max lines visible: 3 (scroll if more)
```

### 7.2 Portrait Expression System

```
Each key character has 4-6 portrait variants stored as separate frames:

  obaa_chan:
    neutral    — gentle half-smile, eyes warm
    remembering — eyes slightly upward, softer focus
    fierce     — eyes narrow, jaw set, ears back
    luminous   — eyes closed, golden highlight overlay, peaceful
    smiling    — full smile, eye-crinkle detail

  usagi:
    neutral    — slight worry in brow, gentle eyes
    sleepy     — half-closed eyes, relaxed ears
    worried    — brow furrowed (1px shift), ears flat
    broken     — eyes down, no highlights, defeated posture
    determined — jaw set, eyes bright, ears up
    bewildered — eyes wide (add extra highlight pixel), mouth open

  captain_mori:
    calm       — completely neutral, unsettling stillness
    sad        — 1px brow change, eyes soften slightly
               — (the restraint IS the character — almost no expression shift)

RULE: Mori's portraits differ by fewer pixels than any other character.
This communicates his controlled nature through the art system itself.
```

---

## PART 8: THE PROCEDURAL RENDERER

### 8.1 How It Works

The engine takes character schema data and draws sprites procedurally on canvas.
No pre-made sprite sheets needed for standard characters. The renderer IS the art.

```javascript
// PSEUDOCODE — Sprite Factory Function
function renderCharacter(schema, animation, frame, direction) {
  // 1. Load species template (proportions, ear shape, body plan)
  const template = SPECIES_TEMPLATES[schema.species];

  // 2. Build color ramp from schema fur/clothing colors
  const furRamp = buildRamp(schema.appearance.furColor);    // 4 colors
  const clothRamp = buildRamp(schema.appearance.outfit.palette[0]); // 4 colors

  // 3. Get animation frame data
  const frameData = ANIMATION_PATTERNS[animation][frame];

  // 4. Apply frame transforms to base template
  const pixels = applyTransforms(template, frameData, direction);

  // 5. Color the pixels using the ramps
  const colored = applyPalette(pixels, {
    fur: furRamp,
    cloth: clothRamp,
    eye: schema.appearance.eyeColor,
    accent: schema.appearance.outfit.palette[1] || furRamp[3],
  });

  // 6. Apply outline
  const outlined = addOutline(colored, ERA_DARK_COLOR);

  // 7. Apply sub-pixel effects (highlight shifts for hair/ears)
  const animated = applySubPixel(outlined, animation, frame);

  return animated;
}
```

### 8.2 Ramp Builder

```javascript
function buildRamp(baseColor) {
  const hsl = hexToHSL(baseColor);
  return [
    hslToHex(hsl.h + 5, hsl.s + 10, hsl.l - 25),   // darkest (hue-shift warm)
    hslToHex(hsl.h + 2, hsl.s + 5, hsl.l - 12),     // shadow
    baseColor,                                         // base
    hslToHex(hsl.h - 8, hsl.s - 15, hsl.l + 15),     // highlight (shift toward gold)
  ];
}
// This automatically generates the 4-step ramp for ANY input color
// following the FF6 hue-shift-not-just-value principle
```

---

## PART 9: THE ART PIPELINE IN PRACTICE

### 9.1 What Happens When You Say "Build Book I"

```
1. BOOK SCHEMA provides:
   - Era palette (terracotta + blood red for Rome)
   - Character list with species + colors

2. PALETTE SYSTEM generates:
   - 4-step ramps for every color in the era
   - Atmospheric overlays for time-of-day
   - Weather particle colors

3. CHARACTER RENDERER produces:
   - 15-color sprite per character
   - All animation frames (idle, walk 4-dir, battle idle, attack, damage, death)
   - Portrait expressions (4-6 per key character)
   - All follow the species template + animation bible

4. TILESET GENERATOR produces:
   - Base tileset palette-swapped to era colors
   - Auto-tile transitions computed
   - Era-specific override tiles (Roman columns, catacomb arches)

5. EFFECT SYSTEM configures:
   - Particle types for this era (torch sparks, catacomb dust)
   - Screen effects (underground darkness vignette)
   - Battle background parallax layers

6. VALIDATOR checks:
   - All sprites use ≤15 colors
   - All animation frames present
   - Palette matches era constraints
   - All effects referenced exist

RESULT: Complete visual package for an entire era.
No artist needed. No manual pixel pushing.
Beauty by system, not by hand.
```

### 9.2 Override System (For Special Moments)

```
90% of sprites are procedurally generated.
10% are hand-crafted overrides for moments that matter:

  - Obaa-chan's luminosity death scene (unique golden glow sprite)
  - The Messenger's appearance (breaks all species templates intentionally)
  - The Accuser in each era (subtle wrongness in proportions)
  - Boss enemies (larger, more detailed, unique silhouettes)
  - Key item close-ups (Blade of Pilgrim, Obaa-chan's Cross)

The override system: if a hand-crafted sprite exists at
  data/sprites/overrides/{character_id}_{animation}_{frame}.png
it replaces the procedural version. Everything else auto-generates.
```

---

## PART 10: QUALITY METRICS

### 10.1 Visual Regression Tests

```
The validator gains new visual checks:

  ✅ All character sprites use ≤15 colors + transparency
  ✅ No pillow shading detected (shadow-base-highlight ramps shift hue)
  ✅ All battle sprites have asymmetric stances
  ✅ Attack animations include anticipation frame (wind-up)
  ✅ Impact frames held ≥150ms
  ✅ Idle animations include sub-pixel element (ears, hair, cloth)
  ✅ Era palette dominant color matches constraint
  ✅ Foreground grass uses ≥3 green variants
  ✅ Water has ≥2 animation frames
  ✅ Fire shapes are non-repeating across frames
  ✅ Scene has ≥2 parallax layers
  ✅ Dialogue portraits have ≥4 expressions for key characters
  ✅ Death animations fade (no hard cut)
  ✅ Camera shake present on heavy attacks
  ✅ No pure black shadows or pure white highlights
```

---

*"The amateur practices until they get it right.*
*The professional practices until they can't get it wrong."*

*The Visual DNA system is the professional's practice — encoded into rules*
*so every frame, every pixel, every blade of grass comes out right*
*not because someone tweaked it, but because the system won't allow ugly.*
