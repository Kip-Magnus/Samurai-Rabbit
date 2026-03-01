/**
 * SAMURAI USAGI — EQUIPMENT VISUAL SYSTEM
 * ==========================================
 *
 * Every weapon and armor piece visually changes Usagi's sprite.
 *
 * HOW IT WORKS:
 *   The existing sprite renderer draws Usagi in layers:
 *     1. Legs → 2. Body → 3. Arms → 4. Head → 5. Ears/Eyes
 *
 *   This system injects equipment layers into that pipeline:
 *     1. Legs (+ leg armor overlay)
 *     2. Body (cloth palette REPLACED by garment colors)
 *     3. Arms (+ gauntlet/bracers overlay)
 *     4. Head (+ headgear layer)
 *     5. Ears/Eyes
 *     6. WEAPON (drawn on arm, position based on animation frame)
 *     7. RELIC GLOW (subtle effect behind sprite if relic equipped)
 *     8. QUALITY EFFECTS (glow, sparkle, radiance based on grade)
 *
 * VISUAL RULES:
 *   - Weapons have: blade shape, blade color, guard style, handle color, length
 *   - Garments have: cloth palette (3 colors), body coverage, added elements
 *   - Head gear has: shape, color, position offset
 *   - Quality adds: outline glow, particle trail, aura
 *   - Blessings add: shimmer overlay, color tint
 *   - Devotion Grace adds: golden inner glow
 *
 * All rendering is procedural pixel art on canvas. No sprite sheets.
 * Everything follows the 15-color palette discipline.
 */


// ═══════════════════════════════════════════════════════════════
// WEAPON VISUAL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Every weapon class has a base shape template.
 * Individual weapons override colors, length, and details.
 *
 * Pixel coordinates are relative to the hand position.
 * Weapons are drawn at 1x scale (each unit = 1 pixel).
 * Maximum weapon size: 16px tall for most, 20px for spears/staves.
 */

export const WEAPON_CLASS_SHAPES = {

  katana: {
    grip: { width: 1, height: 3 },
    guard: { width: 3, height: 1, style: 'tsuba_round' },
    blade: { width: 1, height: 'variable', curve: true, curve_amount: 1 },
    draw_order: ['grip', 'guard', 'blade', 'edge_highlight'],
    idle_angle: -10,    // Slight backward lean at rest
    attack_arc: [-45, 60],  // Swing arc in degrees
  },

  staff: {
    grip: { width: 1, height: 'variable' },  // Full length
    top_ornament: { style: 'variable' },      // Cross, orb, spiral, etc.
    draw_order: ['shaft', 'ornament', 'wrapping'],
    idle_angle: 5,
    attack_arc: [-30, 45],
  },

  cross_blade: {
    grip: { width: 1, height: 2 },
    crossguard: { width: 5, height: 1, style: 'cross' },  // Always cross-shaped
    blade: { width: 1, height: 'variable' },
    draw_order: ['grip', 'crossguard', 'blade', 'holy_edge'],
    idle_angle: 0,
    attack_arc: [-40, 50],
  },

  improvised: {
    shape: 'variable',  // Each improvised weapon is unique
    draw_order: ['base_shape', 'detail'],
    idle_angle: -15,
    attack_arc: [-50, 60],
  },

  fist: {
    shape: 'none',  // No visible weapon — hands glow at high quality
    wrapping: { style: 'variable' },  // Bandages, holy wraps, stigmata
    draw_order: ['hand_overlay'],
    idle_angle: 0,
    attack_arc: [-20, 30],
  },

  spear: {
    shaft: { width: 1, height: 'variable' },  // Long
    head: { width: 3, height: 4, style: 'variable' },
    draw_order: ['shaft', 'head', 'head_highlight'],
    idle_angle: 80,   // Held upright
    attack_arc: [80, 0],  // Thrust forward
  },

  bow: {
    limbs: { width: 1, height: 'variable', curve: true },
    string: { width: 1 },
    draw_order: ['limb_back', 'string', 'limb_front', 'arrow'],
    idle_angle: 0,
    attack_arc: [0, -15],  // Pull back
  },
};


// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL WEAPON VISUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Visual data for every weapon in the catalog.
 * References weapon IDs from weapons-catalog.json.
 *
 * blade_colors: [shadow, base, highlight] — 3 colors for the metal
 * handle_colors: [shadow, base] — 2 colors for the grip
 * length: pixel length of the blade/shaft
 * special: unique visual effects
 */
export const WEAPON_VISUALS = {

  // ─── KATANA ─────────────────────────────────────────────

  rusty_tanto:        { class: 'katana', blade: ['#5c3a1a', '#8b5e3c', '#a07850'], handle: ['#3d2b1f', '#5c4033'], length: 5, guard_color: '#5c4d3c', special: null },
  farmers_sickle:     { class: 'katana', blade: ['#4a4a4a', '#6b6b6b', '#8a8a8a'], handle: ['#5c4033', '#7a5c40'], length: 5, guard_color: null, curve_amount: 3, special: 'sickle_shape' },
  tanto_knife:        { class: 'katana', blade: ['#5a5a6a', '#7a7a8a', '#9a9aaa'], handle: ['#3d2b1f', '#5c4033'], length: 5, guard_color: '#6b5b4b' },
  wakizashi:          { class: 'katana', blade: ['#606070', '#8080a0', '#a0a0c0'], handle: ['#2e1f14', '#4a3528'], length: 7, guard_color: '#7a6a5a' },
  iron_katana:        { class: 'katana', blade: ['#4a4a5a', '#6a6a7a', '#8a8a9a'], handle: ['#2e1f14', '#4a3528'], length: 9, guard_color: '#5a5a6a' },
  steel_katana:       { class: 'katana', blade: ['#707080', '#9090a8', '#b0b0c8'], handle: ['#1a0a00', '#3a2a1a'], length: 10, guard_color: '#808090' },
  folded_katana:      { class: 'katana', blade: ['#808098', '#a0a0b8', '#c0c0d8'], handle: ['#1a0a00', '#3a2a1a'], length: 10, guard_color: '#9090a0', special: 'hamon_line' },
  pilgrims_blade:     { class: 'katana', blade: ['#8090a0', '#a0b0c0', '#c0d0e0'], handle: ['#3a2a1a', '#5c4033'], length: 10, guard_color: '#c9a959', special: 'faint_cross_on_guard', quality_glow: '#ffd700' },
  damascus_katana:    { class: 'katana', blade: ['#6070a0', '#8090c0', '#a0b0e0'], handle: ['#1a0a00', '#2e1f14'], length: 11, guard_color: '#a0a0b0', special: 'damascus_wave_pattern' },
  doujigiri:          { class: 'katana', blade: ['#404060', '#6060a0', '#8080e0'], handle: ['#2e0a2e', '#4a1a4a'], length: 11, guard_color: '#c9a959', special: 'demon_slayer_glow' },
  neros_gilded_blade: { class: 'katana', blade: ['#a08020', '#c0a040', '#e0c060'], handle: ['#800020', '#a00030'], length: 10, guard_color: '#ffd700', special: 'gold_drip_particles' },
  moris_naginata:     { class: 'katana', blade: ['#5a5a6a', '#7a7a8a', '#9a9aaa'], handle: ['#5c4033', '#7a5c40'], length: 12, guard_color: '#6a5a4a', special: 'naginata_wide_blade', blade_width: 2 },
  muramasa_echo:      { class: 'katana', blade: ['#600020', '#900040', '#c00060'], handle: ['#1a0a0a', '#2e1414'], length: 11, guard_color: '#600020', special: 'blood_red_edge_glow' },
  masamune_prayer:    { class: 'katana', blade: ['#a0b0d0', '#c0d0f0', '#e0e8ff'], handle: ['#1a1a3d', '#2a2a5d'], length: 11, guard_color: '#4169e1', special: 'serene_blue_glow' },
  hidden_cross_tanto: { class: 'katana', blade: ['#808098', '#a0a0b8', '#c0c0d8'], handle: ['#3a2a1a', '#5c4033'], length: 6, guard_color: '#c9a959', special: 'cross_etched_in_blade' },
  jacobin_saber:      { class: 'katana', blade: ['#707080', '#9090a8', '#b0b0c8'], handle: ['#1a1a8b', '#2a2aab'], length: 10, guard_color: '#c0c0c0', special: 'french_curved_guard', curve_amount: 0 },
  blade_of_intercession: { class: 'katana', blade: ['#d0d8ff', '#e8eeff', '#ffffff'], handle: ['#ffd700', '#ffe44d'], length: 12, guard_color: '#ffd700', special: 'holy_light_blade_glow_white_gold', quality_glow: '#ffffff', glow_radius: 6, particles: 'golden_motes' },

  // ─── STAFF ──────────────────────────────────────────────

  broken_branch:      { class: 'staff', shaft: ['#5c4033', '#7a5c40'], length: 14, ornament: null, special: 'rough_bark_texture' },
  walking_stick:      { class: 'staff', shaft: ['#4a3528', '#6b5040'], length: 15, ornament: null, wrapping: '#8b6914' },
  iron_shod_staff:    { class: 'staff', shaft: ['#5c4033', '#7a5c40'], length: 15, ornament: null, tip_color: '#6a6a7a', special: 'iron_cap_top_bottom' },
  monks_staff:        { class: 'staff', shaft: ['#5c4033', '#7a5c40'], length: 15, ornament: 'ring_top', ornament_color: '#c9a959', wrapping: '#f5f0e8' },
  pilgrims_staff:     { class: 'staff', shaft: ['#5c4033', '#7a5c40'], length: 15, ornament: 'cross_top', ornament_color: '#c9a959', wrapping: '#f5f0e8', quality_glow: '#ffd700' },
  franciscan_staff:   { class: 'staff', shaft: ['#654321', '#8b6914'], length: 14, ornament: 'tau_cross', ornament_color: '#8b6914', special: 'flowers_bloom_at_base', particles: 'tiny_flowers' },
  crosier:            { class: 'staff', shaft: ['#c9a959', '#e0c060'], length: 16, ornament: 'shepherds_crook', ornament_color: '#ffd700', special: 'golden_spiral_top' },
  rod_of_moses:       { class: 'staff', shaft: ['#8b6914', '#b8860b'], length: 17, ornament: 'burning_bush_top', ornament_color: '#ff4500', special: 'holy_fire_tip_glow', quality_glow: '#ff8c00', glow_radius: 8, particles: 'fire_sparks' },

  // ─── CROSS-BLADE ────────────────────────────────────────

  broken_cross_shard: { class: 'cross_blade', blade: ['#5c4d3c', '#7a6852', '#8b7b6b'], handle: ['#3d2b1f', '#5c4033'], length: 5, crossguard_color: '#5c4d3c', special: 'jagged_broken_shape' },
  hidden_cross_dagger:{ class: 'cross_blade', blade: ['#808098', '#a0a0b8', '#c0c0d8'], handle: ['#3a2a1a', '#5c4033'], length: 6, crossguard_color: '#c9a959', special: 'cross_shape_when_reversed' },
  templar_cross:      { class: 'cross_blade', blade: ['#c0c0c0', '#d8d8d8', '#f0f0f0'], handle: ['#8b0000', '#a00020'], length: 9, crossguard_color: '#c0c0c0', special: 'red_enamel_cross_on_guard' },
  jesuit_cross_blade: { class: 'cross_blade', blade: ['#1a1a3d', '#3d3d6d', '#6060a0'], handle: ['#1a1a1a', '#3d3d3d'], length: 8, crossguard_color: '#ffd700', special: 'ihs_monogram_on_guard' },
  dominican_truth:    { class: 'cross_blade', blade: ['#ffffff', '#f0f0f0', '#e0e0e0'], handle: ['#000000', '#1a1a1a'], length: 9, crossguard_color: '#000000', special: 'black_white_pattern' },
  crux_invicta:       { class: 'cross_blade', blade: ['#e0e8ff', '#f0f4ff', '#ffffff'], handle: ['#ffd700', '#ffe44d'], length: 11, crossguard_color: '#ffd700', special: 'blazing_cross_shape_glow', quality_glow: '#ffffff', glow_radius: 8, particles: 'holy_sparks' },

  // ─── IMPROVISED ─────────────────────────────────────────

  bare_fists_tool:    { class: 'fist', shape: 'none' },
  rock:               { class: 'improvised', shape: 'rock', colors: ['#6a6a6a', '#8a8a8a', '#aaaaaa'], size: 3 },
  torch:              { class: 'improvised', shape: 'torch', colors: ['#5c4033', '#7a5c40'], length: 8, special: 'flame_tip', particles: 'fire_sparks' },
  chain_link:         { class: 'improvised', shape: 'chain', colors: ['#6a6a7a', '#8a8a9a'], length: 10, special: 'swinging_chain_arc' },
  fishing_gaff:       { class: 'improvised', shape: 'hook', colors: ['#5c4033', '#6a6a7a'], length: 9, special: 'curved_hook_tip' },
  galley_oar_broken:  { class: 'improvised', shape: 'club', colors: ['#5c4033', '#7a5c40'], length: 12, special: 'splintered_end' },
  barbed_wire_wrap:   { class: 'fist', shape: 'wrapped_fists', colors: ['#6a6a7a', '#8a8a9a'], special: 'wire_around_hands' },
  camp_survivor_fists:{ class: 'fist', shape: 'scarred_fists', colors: ['#d4a574', '#b8956a'], special: 'scars_on_knuckles' },
  kolbes_cane:        { class: 'improvised', shape: 'cane', colors: ['#5c4033', '#7a5c40'], length: 12, special: 'plain_humble_cane', quality_glow: '#ffd700' },
  jawbone_of_samson:  { class: 'improvised', shape: 'jawbone', colors: ['#f5f0e8', '#d4c4a8', '#b0a080'], length: 8, special: 'bone_glow_holy', quality_glow: '#ffd700', glow_radius: 5 },

  // ─── SPEAR ──────────────────────────────────────────────

  sharpened_stick:    { class: 'spear', shaft: ['#5c4033', '#7a5c40'], length: 16, head: null, head_color: null, special: 'fire_hardened_tip' },
  bamboo_spear:       { class: 'spear', shaft: ['#8b9a46', '#a0b050'], length: 16, head: null, special: 'bamboo_joints' },
  roman_pilum:        { class: 'spear', shaft: ['#5c4033', '#7a5c40'], length: 16, head: 'pilum', head_color: ['#6a6a7a', '#8a8a9a'], special: 'long_iron_shank' },
  ashigaru_yari:      { class: 'spear', shaft: ['#5c4033', '#7a5c40'], length: 17, head: 'yari', head_color: ['#808098', '#a0a0b8'], special: 'straight_double_edge' },
  polish_winged_lance:{ class: 'spear', shaft: ['#5c4033', '#7a5c40'], length: 18, head: 'lance', head_color: ['#c0c0c0', '#d8d8d8'], special: 'wing_feathers_on_shaft', wing_colors: ['#ffffff', '#e0e0e0'] },
  longinus_echo:      { class: 'spear', shaft: ['#8b6914', '#b8860b'], length: 18, head: 'holy_lance', head_color: ['#c0d0e0', '#e0e8ff'], special: 'blood_of_christ_glow', quality_glow: '#8b0000', glow_radius: 4 },
  spear_of_destiny:   { class: 'spear', shaft: ['#ffd700', '#ffe44d'], length: 19, head: 'destiny', head_color: ['#e0e8ff', '#ffffff'], special: 'holy_radiance_full', quality_glow: '#ffffff', glow_radius: 8, particles: 'holy_sparks' },

  // ─── BOW ────────────────────────────────────────────────

  makeshift_sling:    { class: 'bow', limbs: null, string: ['#8b6914'], shape: 'sling', sling_colors: ['#8b6914', '#654321'], length: 6 },
  short_bow:          { class: 'bow', limbs: ['#5c4033', '#7a5c40'], string: ['#8b6914'], length: 8 },
  yumi_half:          { class: 'bow', limbs: ['#5c4033', '#7a5c40'], string: ['#f5f0e8'], length: 10, special: 'asymmetric_yumi' },
  mongol_composite:   { class: 'bow', limbs: ['#5c4033', '#8b6914'], string: ['#8b6914'], length: 9, special: 'recurve_tips', limb_detail: ['#f5f0e8'] },
  english_longbow:    { class: 'bow', limbs: ['#654321', '#8b6914'], string: ['#8b6914'], length: 14, special: 'tall_straight_limbs' },
  bow_of_the_watchman:{ class: 'bow', limbs: ['#c9a959', '#ffd700'], string: ['#ffffff'], length: 12, special: 'holy_light_arrows', quality_glow: '#ffd700', glow_radius: 5, particles: 'light_trail_on_arrow' },
};


// ═══════════════════════════════════════════════════════════════
// GARMENT (ARMOR) VISUAL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Every garment changes Usagi's body colors and may add visual elements.
 *
 * cloth_palette: [darkest, shadow, base, highlight] — replaces the default cloth colors
 * coverage: what parts of the body are colored
 * additions: extra visual elements drawn on top (pauldrons, belt, cross, etc.)
 * legs_palette: optional separate leg colors (for pants/greaves)
 */
export const GARMENT_VISUALS = {

  // ─── STARTING / BASIC ──────────────────────────────────

  farmers_kosode: {
    cloth_palette: ['#3d3528', '#5c4d3c', '#7a6852', '#8b7b6b'],
    coverage: 'full_body',
    additions: [],
    description: 'Plain brown farmer\'s clothing. Humble. Honest.',
  },
  linen_wrap: {
    cloth_palette: ['#c4b090', '#d4c4a8', '#e4d4b8', '#f0e8d8'],
    coverage: 'torso_only',
    additions: [],
    description: 'Simple undyed linen. The clothing of the poor.',
  },
  travelers_cloak: {
    cloth_palette: ['#3a3a2e', '#5a5a46', '#7a7a5e', '#8a8a6e'],
    coverage: 'full_body',
    additions: [{ type: 'hood_down', color: '#3a3a2e', position: 'shoulders' }],
    description: 'Dark green-grey cloak. Practical for the road.',
  },

  // ─── RELIGIOUS / VOCATIONAL ────────────────────────────

  franciscan_habit: {
    cloth_palette: ['#3d2b1f', '#654321', '#8b6914', '#a07830'],
    coverage: 'full_body',
    additions: [
      { type: 'rope_belt', color: '#f5f0e8', position: 'waist' },
      { type: 'hood_down', color: '#654321', position: 'shoulders' },
    ],
    legs_palette: ['#3d2b1f', '#654321'],
    description: 'Brown habit with rope belt. The poverty of Francis.',
  },
  dominican_habit: {
    cloth_palette: ['#e0e0e0', '#f0f0f0', '#ffffff', '#ffffff'],
    coverage: 'full_body',
    additions: [
      { type: 'scapular', color: '#1a1a1a', position: 'over_torso' },
      { type: 'hood_down', color: '#ffffff', position: 'shoulders' },
    ],
    legs_palette: ['#e0e0e0', '#f0f0f0'],
    description: 'White habit with black scapular. Truth in black and white.',
  },
  jesuit_cassock: {
    cloth_palette: ['#0a0a0a', '#1a1a1a', '#2a2a2a', '#3a3a3a'],
    coverage: 'full_body',
    additions: [
      { type: 'collar', color: '#ffffff', position: 'neck' },
      { type: 'sash', color: '#1a1a1a', position: 'waist' },
    ],
    description: 'Black cassock with white collar. Ad Majorem Dei Gloriam.',
  },
  carmelite_scapular_robe: {
    cloth_palette: ['#3d2b1f', '#5c4033', '#7a5c40', '#8b6914'],
    coverage: 'full_body',
    additions: [
      { type: 'scapular', color: '#f5f0e8', position: 'over_torso' },
      { type: 'star_emblem', color: '#ffd700', position: 'chest' },
    ],
    description: 'Brown robe with white scapular. Our Lady of Mount Carmel.',
  },

  // ─── ERA-SPECIFIC ARMOR ────────────────────────────────

  roman_tunic: {
    cloth_palette: ['#800020', '#a00030', '#c01040', '#d02050'],
    coverage: 'full_body',
    additions: [
      { type: 'belt', color: '#8b6914', position: 'waist' },
      { type: 'sandal_straps', color: '#8b6914', position: 'legs' },
    ],
    description: 'Red Roman tunic. Taken from a soldier who no longer needed it.',
  },
  lorica_segmentata: {
    cloth_palette: ['#800020', '#a00030', '#c01040', '#d02050'],
    coverage: 'full_body',
    additions: [
      { type: 'plate_segments', color: '#808098', position: 'torso', highlight: '#a0a0b8' },
      { type: 'shoulder_plates', color: '#808098', position: 'shoulders' },
      { type: 'belt', color: '#8b6914', position: 'waist' },
    ],
    description: 'Roman legionary armor. Heavy, rattling, protective.',
  },
  desert_robes: {
    cloth_palette: ['#c4a870', '#d4b880', '#e4c890', '#f0d8a0'],
    coverage: 'full_body',
    additions: [
      { type: 'headwrap_down', color: '#d4b880', position: 'shoulders' },
    ],
    description: 'Sandy desert robes. Protection from sun and sand.',
  },
  monks_desert_robe: {
    cloth_palette: ['#c4a870', '#d4b880', '#e4c890', '#f0d8a0'],
    coverage: 'full_body',
    additions: [
      { type: 'cross_pendant', color: '#5c4033', position: 'chest' },
      { type: 'rope_belt', color: '#5c4033', position: 'waist' },
    ],
    description: 'Desert hermit\'s robe with wooden cross. The uniform of the Desert Fathers.',
  },
  crusader_surcoat: {
    cloth_palette: ['#c0c0c0', '#d0d0d0', '#e0e0e0', '#f0f0f0'],
    coverage: 'full_body',
    additions: [
      { type: 'cross_emblem', color: '#8b0000', position: 'chest', size: 'large' },
      { type: 'chain_mail', color: '#808098', position: 'arms_legs' },
      { type: 'belt', color: '#8b6914', position: 'waist' },
    ],
    description: 'White surcoat over chain mail. Red cross on the chest.',
  },
  samurai_yoroi: {
    cloth_palette: ['#1a1a2e', '#2a2a4e', '#3a3a6e', '#4a4a8e'],
    coverage: 'full_body',
    additions: [
      { type: 'lamellar_plates', color: '#2a2a4e', position: 'torso', highlight: '#4a4a8e' },
      { type: 'shoulder_guards', color: '#2a2a4e', position: 'shoulders' },
      { type: 'tassets', color: '#1a1a2e', position: 'waist' },
    ],
    description: 'Japanese lacquered armor. Dark blue with cord lacing.',
  },
  kakure_peasant: {
    cloth_palette: ['#3d3528', '#5c4d3c', '#7a6852', '#8b7b6b'],
    coverage: 'full_body',
    additions: [
      { type: 'hidden_cross', color: '#c9a959', position: 'inner_collar', visible: false },
    ],
    description: 'Peasant clothes that hide a cross inside the collar. The uniform of the Hidden Christians.',
  },
  ottoman_sipahi: {
    cloth_palette: ['#8b0000', '#a00020', '#c01040', '#d02050'],
    coverage: 'full_body',
    additions: [
      { type: 'mail_shirt', color: '#808098', position: 'torso' },
      { type: 'turban_cloth', color: '#ffffff', position: 'waist_sash' },
    ],
    description: 'Red Ottoman cavalry armor. Mail and plate.',
  },
  revolutionary_coat: {
    cloth_palette: ['#1a1a5a', '#2a2a7a', '#3a3a9a', '#4a4aba'],
    coverage: 'full_body',
    additions: [
      { type: 'lapels', color: '#ffffff', position: 'chest' },
      { type: 'tricolor_cockade', color: ['#0000ff', '#ffffff', '#ff0000'], position: 'chest_left' },
    ],
    description: 'Blue Revolutionary coat with tricolor cockade.',
  },
  resistance_jacket: {
    cloth_palette: ['#2a2a2a', '#3a3a3a', '#4a4a4a', '#5a5a5a'],
    coverage: 'full_body',
    additions: [
      { type: 'armband', color: '#ffffff', position: 'left_arm', emblem: 'anchor_cross' },
    ],
    description: 'Dark jacket with Polish resistance armband. The anchor cross means "Poland Fights."',
  },
  camp_uniform: {
    cloth_palette: ['#4a4a5a', '#5a5a6a', '#6a6a7a', '#7a7a8a'],
    coverage: 'full_body',
    additions: [
      { type: 'stripes', color: '#3a3a4a', position: 'vertical_body' },
      { type: 'number_patch', color: '#ffffff', position: 'chest_left' },
    ],
    description: 'Striped camp uniform. A number, not a name.',
  },

  // ─── HOLY / ENDGAME ────────────────────────────────────

  pilgrims_mantle: {
    cloth_palette: ['#5a5080', '#7a70a0', '#9a90c0', '#b0a8d0'],
    coverage: 'full_body',
    additions: [
      { type: 'cross_clasp', color: '#c9a959', position: 'neck' },
      { type: 'cape', color: '#5a5080', position: 'back' },
    ],
    quality_glow: '#c9a959',
    description: 'Purple-grey mantle with golden cross clasp. A pilgrim who has walked far.',
  },
  saints_vestment: {
    cloth_palette: ['#c9a959', '#d4b86a', '#e0c87a', '#f0d88a'],
    coverage: 'full_body',
    additions: [
      { type: 'stole', color: '#ffffff', position: 'shoulders_to_waist' },
      { type: 'cross_emblem', color: '#ffffff', position: 'chest', size: 'medium' },
    ],
    quality_glow: '#ffd700',
    glow_radius: 4,
    description: 'Golden vestment. Glowing faintly. Not earned — given.',
  },
  transfigured_robe: {
    cloth_palette: ['#e0e8ff', '#eef0ff', '#f8f8ff', '#ffffff'],
    coverage: 'full_body',
    additions: [
      { type: 'light_emanation', color: '#ffffff', position: 'whole_body' },
    ],
    quality_glow: '#ffffff',
    glow_radius: 8,
    particles: 'gentle_white_motes',
    description: 'White robes that glow from within. The Transfiguration. Not by your power.',
  },
};


// ═══════════════════════════════════════════════════════════════
// HEADGEAR VISUAL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const HEADGEAR_VISUALS = {
  none:             { shape: null },
  sedge_hat:        { shape: 'wide_cone', colors: ['#8b6914', '#a07830'], size: { w: 10, h: 3 }, offset_y: -3, description: 'Woven sedge hat. Classic pilgrim.' },
  bandana:          { shape: 'headband', colors: ['#8b0000', '#a00020'], size: { w: 6, h: 1 }, offset_y: -1, description: 'Red headband. Tied at the back.' },
  hood_up:          { shape: 'hood', colors: 'inherit_garment', size: { w: 7, h: 5 }, offset_y: -2, covers_ears: true, description: 'Hood pulled up. Shadows the face.' },
  tonsure:          { shape: 'tonsure_mark', colors: ['#d4a574'], size: { w: 4, h: 1 }, offset_y: -1, description: 'Shaved crown. The monk\'s mark.' },
  crusader_helm:    { shape: 'great_helm', colors: ['#808098', '#a0a0b8'], size: { w: 8, h: 7 }, offset_y: -3, covers_ears: true, cross_slit: '#1a1a1a', description: 'Iron great helm. Cross-shaped eye slit.' },
  samurai_kabuto:   { shape: 'kabuto', colors: ['#2a2a4e', '#4a4a8e'], size: { w: 9, h: 6 }, offset_y: -3, crest: '#8b0000', covers_ears: true, description: 'Lacquered helmet with crest. Samurai.' },
  desert_headwrap:  { shape: 'headwrap', colors: ['#d4b880', '#e4c890'], size: { w: 7, h: 4 }, offset_y: -2, description: 'Cloth headwrap. Sand and sun protection.' },
  tricorn:          { shape: 'tricorn', colors: ['#1a1a3d', '#2a2a5d'], size: { w: 9, h: 4 }, offset_y: -3, cockade: ['#0000ff', '#ffffff', '#ff0000'], description: 'Revolutionary tricorn with tricolor cockade.' },
  camp_cap:         { shape: 'flat_cap', colors: ['#4a4a5a', '#5a5a6a'], size: { w: 6, h: 2 }, offset_y: -1, stripes: true, description: 'Striped camp cap. Dehumanizing. Worn with dignity.' },
  halo:             { shape: 'halo_ring', colors: ['#ffd700', '#ffe44d'], size: { w: 8, h: 2 }, offset_y: -5, glow: true, glow_radius: 4, description: 'Not a hat. A gift. Visible only at Phase 4.' },
};


// ═══════════════════════════════════════════════════════════════
// QUALITY GRADE VISUAL EFFECTS
// ═══════════════════════════════════════════════════════════════

/**
 * Quality grade of equipment adds visual effects to the sprite.
 * These layer on TOP of the base weapon/armor visuals.
 */
export const QUALITY_VISUAL_EFFECTS = {
  0: { name: 'Broken',    outline: null,       glow: null,             particles: null,                 description: 'Cracked, dull, barely functional.' },
  1: { name: 'Worn',      outline: null,       glow: null,             particles: null,                 description: 'Used but usable. No visual flourish.' },
  2: { name: 'Rusted',    outline: null,       glow: null,             particles: null,                 tint: '#8b5e3c', description: 'Rust spots visible on metal parts.' },
  3: { name: 'Common',    outline: null,       glow: null,             particles: null,                 description: 'Standard. Clean. Unremarkable.' },
  4: { name: 'Sturdy',    outline: null,       glow: null,             particles: null,                 description: 'Well-maintained. Slight polish.' },
  5: { name: 'Fine',      outline: '#c9a959',  glow: { color: '#c9a959', radius: 2, opacity: 0.2 }, particles: null, description: 'Faint golden outline. Quality craftsmanship.' },
  6: { name: 'Exquisite', outline: '#d4af37',  glow: { color: '#d4af37', radius: 3, opacity: 0.3 }, particles: 'occasional_sparkle', description: 'Golden glow. Catches the light.' },
  7: { name: 'Artificer', outline: '#ffd700',  glow: { color: '#ffd700', radius: 4, opacity: 0.4 }, particles: 'steady_sparkle',     description: 'Radiant golden aura. Unmistakably special.' },
};

export const BLESSING_VISUAL_EFFECTS = {
  none:            { overlay: null },
  holy_water:      { overlay: { color: '#87ceeb', type: 'faint_shimmer', opacity: 0.15 } },
  chrism_oil:      { overlay: { color: '#4169e1', type: 'blue_shimmer', opacity: 0.2 } },
  priestly_blessing: { overlay: { color: '#ffd700', type: 'golden_shimmer', opacity: 0.25 } },
  blessing_type: {
    divine_light:      { edge_glow: '#ffffff', opacity: 0.3 },
    shield_faith:      { edge_glow: '#4169e1', opacity: 0.25 },
    ave_maria:         { edge_glow: '#87ceeb', star_accent: true, opacity: 0.3 },
    communion_saints:  { edge_glow: '#ffd700', ghost_glow: true, opacity: 0.2 },
    forgiveness:       { edge_glow: '#ff69b4', warm_pulse: true, opacity: 0.2 },
  },
};

export const DEVOTION_GRACE_VISUAL = {
  tier_1: { inner_glow: '#ffd700', intensity: 0.15, pulse_rate: 3000, description: '100 battles. A warm inner light.' },
  tier_2: { inner_glow: '#ffd700', intensity: 0.25, pulse_rate: 2000, particles: 'prayer_motes', description: '250 battles. Golden motes drift around the weapon.' },
  tier_3: { inner_glow: '#ffffff', intensity: 0.35, pulse_rate: 1500, particles: 'holy_radiance', halo_on_weapon: true, description: '500 battles. The weapon glows white-gold. It has a presence.' },
};


// ═══════════════════════════════════════════════════════════════
// EQUIPMENT VISUAL RENDERER
// ═══════════════════════════════════════════════════════════════

export class EquipmentVisualRenderer {
  /**
   * Apply equipment visuals to a character's render data.
   * Called by the main sprite renderer before drawing.
   *
   * @param {object} baseRenderData - The character's base palette and template
   * @param {object} equipment - { weapon, garment, head, accessory, relic }
   * @param {object} equipmentDB - Loaded equipment data with quality/blessing info
   * @returns {object} Modified render data with equipment layers
   */
  static applyEquipment(baseRenderData, equipment, equipmentDB) {
    const result = { ...baseRenderData, equipmentLayers: [] };

    // 1. GARMENT — replace cloth palette
    if (equipment.garment) {
      const garmentVis = GARMENT_VISUALS[equipment.garment];
      if (garmentVis) {
        result.clothPalette = garmentVis.cloth_palette;
        if (garmentVis.legs_palette) result.legsPalette = garmentVis.legs_palette;
        if (garmentVis.additions) {
          for (const add of garmentVis.additions) {
            result.equipmentLayers.push({ type: 'garment_addition', ...add });
          }
        }
        if (garmentVis.quality_glow) {
          result.equipmentLayers.push({ type: 'body_glow', color: garmentVis.quality_glow, radius: garmentVis.glow_radius || 3 });
        }
        if (garmentVis.particles) {
          result.equipmentLayers.push({ type: 'body_particles', style: garmentVis.particles });
        }
      }
    }

    // 2. HEADGEAR — add head layer
    if (equipment.head) {
      const headVis = HEADGEAR_VISUALS[equipment.head];
      if (headVis && headVis.shape) {
        result.equipmentLayers.push({
          type: 'headgear',
          ...headVis,
          colors: headVis.colors === 'inherit_garment'
            ? (GARMENT_VISUALS[equipment.garment]?.cloth_palette?.slice(0, 2) || ['#5c4d3c', '#7a6852'])
            : headVis.colors,
        });
      }
    }

    // 3. WEAPON — add weapon layer
    if (equipment.weapon) {
      const weaponVis = WEAPON_VISUALS[equipment.weapon];
      if (weaponVis) {
        const weaponData = equipmentDB?.[equipment.weapon] || {};
        const quality = weaponData.quality || 3;
        const qualityVis = QUALITY_VISUAL_EFFECTS[quality] || QUALITY_VISUAL_EFFECTS[3];

        result.equipmentLayers.push({
          type: 'weapon',
          ...weaponVis,
          quality,
          qualityEffects: qualityVis,
        });

        // Blessing visual
        if (weaponData.blessing) {
          const blessingVis = BLESSING_VISUAL_EFFECTS[weaponData.blessing] ||
                              BLESSING_VISUAL_EFFECTS.blessing_type?.[weaponData.blessing_type];
          if (blessingVis) {
            result.equipmentLayers.push({ type: 'weapon_blessing', ...blessingVis });
          }
        }

        // Devotion grace visual
        if (weaponData.devotion_tier) {
          const graceVis = DEVOTION_GRACE_VISUAL[`tier_${weaponData.devotion_tier}`];
          if (graceVis) {
            result.equipmentLayers.push({ type: 'weapon_devotion', ...graceVis });
          }
        }
      }
    }

    // 4. RELIC — subtle background glow
    if (equipment.relic) {
      result.equipmentLayers.push({
        type: 'relic_aura',
        id: equipment.relic,
        glow: equipment.relic === 'obaas_cross'
          ? { color: '#ffd700', radius: 2, opacity: 0.1, pulse: true }
          : { color: '#c9a959', radius: 3, opacity: 0.15 },
      });
    }

    return result;
  }

  /**
   * Draw a weapon at the given hand position.
   * Called during the sprite render pipeline after the arm is drawn.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} handX - X position of the hand
   * @param {number} handY - Y position of the hand
   * @param {object} weaponVis - Weapon visual data from WEAPON_VISUALS
   * @param {number} angle - Current weapon angle (from animation)
   * @param {number} quality - Quality grade 0-7
   */
  static drawWeapon(ctx, handX, handY, weaponVis, angle, quality) {
    if (!weaponVis || weaponVis.shape === 'none') return;

    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate((angle || 0) * Math.PI / 180);

    const cls = weaponVis.class;

    if (cls === 'katana' || cls === 'cross_blade') {
      this._drawBladedWeapon(ctx, weaponVis);
    } else if (cls === 'staff') {
      this._drawStaff(ctx, weaponVis);
    } else if (cls === 'spear') {
      this._drawSpear(ctx, weaponVis);
    } else if (cls === 'bow') {
      this._drawBow(ctx, weaponVis);
    } else if (cls === 'improvised') {
      this._drawImprovised(ctx, weaponVis);
    } else if (cls === 'fist') {
      this._drawFistWeapon(ctx, weaponVis);
    }

    // Quality glow
    if (quality >= 5 && weaponVis.quality_glow) {
      const qe = QUALITY_VISUAL_EFFECTS[quality];
      if (qe?.glow) {
        ctx.globalAlpha = qe.glow.opacity;
        ctx.shadowColor = qe.glow.color;
        ctx.shadowBlur = qe.glow.radius;
        // Re-draw blade outline for glow
        ctx.strokeStyle = qe.glow.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(-1, -(weaponVis.length || 8), 3, weaponVis.length || 8);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }

  static _drawBladedWeapon(ctx, vis) {
    const bladeLen = vis.length || 8;
    const bladeColors = vis.blade || ['#6a6a7a', '#8a8a9a', '#aaaaaa'];
    const handleColors = vis.handle || ['#3d2b1f', '#5c4033'];
    const guardColor = vis.guard_color || vis.crossguard_color;
    const bladeW = vis.blade_width || 1;

    // Handle (below hand)
    ctx.fillStyle = handleColors[0];
    ctx.fillRect(0, 0, 1, 3);
    ctx.fillStyle = handleColors[1];
    ctx.fillRect(0, 0, 1, 1);

    // Guard
    if (guardColor) {
      ctx.fillStyle = guardColor;
      const guardW = vis.class === 'cross_blade' ? 5 : 3;
      ctx.fillRect(-Math.floor(guardW / 2), -1, guardW, 1);
    }

    // Blade (above hand, extending upward)
    ctx.fillStyle = bladeColors[0]; // shadow edge
    ctx.fillRect(0, -bladeLen, bladeW, bladeLen);
    ctx.fillStyle = bladeColors[1]; // base
    ctx.fillRect(0, -bladeLen, bladeW, bladeLen - 1);
    ctx.fillStyle = bladeColors[2]; // highlight edge
    ctx.fillRect(0, -bladeLen, 1, 1); // tip highlight

    // Curve for katana
    if (vis.curve_amount) {
      ctx.fillStyle = bladeColors[1];
      ctx.fillRect(-1, -Math.floor(bladeLen * 0.6), 1, Math.floor(bladeLen * 0.3));
    }

    // Special effects
    if (vis.special === 'hamon_line') {
      ctx.fillStyle = bladeColors[2];
      for (let y = 2; y < bladeLen - 1; y += 2) {
        ctx.fillRect(0, -y, 1, 1);
      }
    }
  }

  static _drawStaff(ctx, vis) {
    const len = vis.length || 14;
    const shaft = vis.shaft || ['#5c4033', '#7a5c40'];

    // Shaft
    ctx.fillStyle = shaft[0];
    ctx.fillRect(0, -len, 1, len + 2); // extends below hand too
    ctx.fillStyle = shaft[1];
    ctx.fillRect(0, -len, 1, 1); // top highlight

    // Wrapping
    if (vis.wrapping) {
      ctx.fillStyle = typeof vis.wrapping === 'string' ? vis.wrapping : '#f5f0e8';
      for (let y = 2; y < 6; y += 2) {
        ctx.fillRect(-1, -y, 3, 1);
      }
    }

    // Ornament
    if (vis.ornament && vis.ornament_color) {
      ctx.fillStyle = vis.ornament_color;
      if (vis.ornament === 'cross_top') {
        ctx.fillRect(-1, -len - 2, 3, 1); // horizontal
        ctx.fillRect(0, -len - 3, 1, 3);  // vertical
      } else if (vis.ornament === 'tau_cross') {
        ctx.fillRect(-1, -len - 1, 3, 1); // T shape
        ctx.fillRect(0, -len, 1, 1);
      } else if (vis.ornament === 'ring_top') {
        ctx.strokeStyle = vis.ornament_color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -len - 1, 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (vis.ornament === 'shepherds_crook') {
        ctx.beginPath();
        ctx.arc(-2, -len, 3, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.strokeStyle = vis.ornament_color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  static _drawSpear(ctx, vis) {
    const len = vis.length || 16;
    const shaft = vis.shaft || ['#5c4033', '#7a5c40'];
    const headColors = vis.head_color || ['#808098', '#a0a0b8'];

    // Shaft
    ctx.fillStyle = shaft[0];
    ctx.fillRect(0, -len, 1, len + 2);

    // Spearhead
    if (headColors) {
      ctx.fillStyle = headColors[0];
      ctx.fillRect(-1, -len - 3, 3, 3); // basic head shape
      ctx.fillRect(0, -len - 4, 1, 1);  // tip
      ctx.fillStyle = headColors[1];
      ctx.fillRect(0, -len - 3, 1, 2);  // highlight
    }

    // Wing feathers for Polish lance
    if (vis.wing_colors) {
      ctx.fillStyle = vis.wing_colors[0];
      ctx.fillRect(-2, -len + 2, 1, 3);
      ctx.fillRect(2, -len + 2, 1, 3);
    }
  }

  static _drawBow(ctx, vis) {
    if (vis.shape === 'sling') {
      ctx.fillStyle = vis.sling_colors?.[0] || '#8b6914';
      ctx.fillRect(-1, 0, 3, 1);
      ctx.fillRect(-2, -1, 1, 3);
      ctx.fillRect(2, -1, 1, 3);
      return;
    }

    const len = vis.length || 8;
    const limbColor = vis.limbs?.[0] || '#5c4033';
    const stringColor = vis.string?.[0] || '#8b6914';
    const halfLen = Math.floor(len / 2);

    // Limbs
    ctx.fillStyle = limbColor;
    ctx.fillRect(-2, -halfLen, 1, len); // left limb
    // String
    ctx.fillStyle = stringColor;
    ctx.fillRect(0, -halfLen + 1, 1, len - 2);
  }

  static _drawImprovised(ctx, vis) {
    const colors = vis.colors || ['#6a6a6a', '#8a8a8a'];
    const len = vis.length || 6;

    ctx.fillStyle = colors[0];
    if (vis.shape === 'torch') {
      ctx.fillRect(0, -len, 1, len);
      ctx.fillStyle = '#ff4500';
      ctx.fillRect(-1, -len - 2, 3, 2); // flame
    } else if (vis.shape === 'chain') {
      for (let y = 0; y < len; y += 2) {
        ctx.fillRect(y % 4 === 0 ? -1 : 0, -y, 2, 1);
      }
    } else if (vis.shape === 'jawbone') {
      ctx.fillRect(0, -len, 2, len);
      ctx.fillStyle = colors[1];
      ctx.fillRect(-1, -len, 1, 3); // jaw curve
    } else {
      // Generic club/stick
      ctx.fillRect(0, -len, 1, len);
      ctx.fillStyle = colors[1] || colors[0];
      ctx.fillRect(-1, -len, 3, 2); // wider head
    }
  }

  static _drawFistWeapon(ctx, vis) {
    if (!vis.special) return;
    const colors = vis.colors || ['#6a6a7a'];

    if (vis.special === 'wire_around_hands') {
      ctx.fillStyle = colors[0];
      ctx.fillRect(-2, -1, 4, 1);
      ctx.fillRect(-2, 1, 4, 1);
    } else if (vis.special === 'scars_on_knuckles') {
      ctx.fillStyle = '#a04040';
      ctx.fillRect(-1, -1, 3, 1);
    }
  }

  /**
   * Draw garment additions (shoulder plates, crosses, belt, etc.)
   * Called during body rendering after the cloth is drawn.
   */
  static drawGarmentAddition(ctx, addition, bodyX, bodyY, bodyW, bodyH) {
    ctx.fillStyle = addition.color || '#808098';

    switch (addition.type) {
      case 'cross_emblem': {
        const cx = bodyX + Math.floor(bodyW / 2);
        const cy = bodyY + Math.floor(bodyH * 0.4);
        const s = addition.size === 'large' ? 2 : 1;
        ctx.fillRect(cx - s, cy - s * 2, s * 2 + 1, 1);   // horizontal
        ctx.fillRect(cx, cy - s * 3, 1, s * 4 + 1);        // vertical
        break;
      }
      case 'plate_segments': {
        ctx.fillStyle = addition.color;
        for (let y = 0; y < bodyH; y += 2) {
          ctx.fillRect(bodyX, bodyY + y, bodyW, 1);
        }
        if (addition.highlight) {
          ctx.fillStyle = addition.highlight;
          ctx.fillRect(bodyX + bodyW - 1, bodyY, 1, bodyH);
        }
        break;
      }
      case 'shoulder_plates':
      case 'shoulder_guards': {
        ctx.fillRect(bodyX - 2, bodyY, 2, 2);
        ctx.fillRect(bodyX + bodyW, bodyY, 2, 2);
        break;
      }
      case 'rope_belt':
      case 'belt':
      case 'sash': {
        ctx.fillRect(bodyX - 1, bodyY + bodyH - 2, bodyW + 2, 1);
        break;
      }
      case 'hood_down': {
        ctx.fillRect(bodyX - 1, bodyY - 1, bodyW + 2, 2);
        break;
      }
      case 'collar': {
        ctx.fillRect(bodyX + 1, bodyY - 1, bodyW - 2, 1);
        break;
      }
      case 'scapular': {
        const scapW = Math.max(1, Math.floor(bodyW * 0.5));
        const scapX = bodyX + Math.floor((bodyW - scapW) / 2);
        ctx.fillRect(scapX, bodyY, scapW, bodyH);
        break;
      }
      case 'stripes': {
        ctx.fillStyle = addition.color;
        for (let x = 1; x < bodyW; x += 2) {
          ctx.fillRect(bodyX + x, bodyY, 1, bodyH);
        }
        break;
      }
      case 'cross_clasp':
      case 'cross_pendant': {
        const cx = bodyX + Math.floor(bodyW / 2);
        ctx.fillRect(cx, bodyY, 1, 2);
        ctx.fillRect(cx - 1, bodyY + 1, 3, 1);
        break;
      }
      case 'armband': {
        ctx.fillRect(bodyX - 2, bodyY + 2, 2, 2);
        break;
      }
      case 'tricolor_cockade': {
        if (Array.isArray(addition.color)) {
          const cx = bodyX + 1;
          const cy = bodyY + 1;
          ctx.fillStyle = addition.color[0]; ctx.fillRect(cx, cy, 1, 1);
          ctx.fillStyle = addition.color[1]; ctx.fillRect(cx + 1, cy, 1, 1);
          ctx.fillStyle = addition.color[2]; ctx.fillRect(cx + 2, cy, 1, 1);
        }
        break;
      }
      case 'star_emblem': {
        const cx = bodyX + Math.floor(bodyW / 2);
        const cy = bodyY + Math.floor(bodyH * 0.3);
        ctx.fillRect(cx, cy, 1, 1);
        ctx.fillRect(cx - 1, cy + 1, 3, 1);
        break;
      }
    }
  }

  /**
   * Draw headgear on the character.
   * Called after the head is drawn but before ears (unless covers_ears).
   */
  static drawHeadgear(ctx, headVis, headCenterX, headTopY, headW) {
    if (!headVis || !headVis.shape) return;

    const colors = headVis.colors || ['#808098', '#a0a0b8'];
    const offsetY = headVis.offset_y || 0;
    const y = headTopY + offsetY;

    ctx.fillStyle = colors[0];

    switch (headVis.shape) {
      case 'wide_cone': { // sedge hat
        const w = headVis.size?.w || 10;
        const h = headVis.size?.h || 3;
        for (let row = 0; row < h; row++) {
          const rowW = w - row * 2;
          ctx.fillRect(headCenterX - Math.floor(rowW / 2), y - row, rowW, 1);
        }
        break;
      }
      case 'headband': {
        ctx.fillRect(headCenterX - 3, y, 6, 1);
        break;
      }
      case 'hood': {
        const w = headVis.size?.w || 7;
        const h = headVis.size?.h || 5;
        ctx.fillRect(headCenterX - Math.floor(w / 2), y, w, h);
        ctx.fillStyle = colors[1] || colors[0];
        ctx.fillRect(headCenterX - Math.floor(w / 2) + 1, y + 1, w - 2, h - 2);
        break;
      }
      case 'great_helm': {
        const w = headVis.size?.w || 8;
        const h = headVis.size?.h || 7;
        ctx.fillRect(headCenterX - Math.floor(w / 2), y, w, h);
        ctx.fillStyle = headVis.cross_slit || '#1a1a1a';
        ctx.fillRect(headCenterX - 1, y + 2, 3, 1); // horizontal slit
        ctx.fillRect(headCenterX, y + 1, 1, 3);      // vertical slit
        break;
      }
      case 'kabuto': {
        const w = headVis.size?.w || 9;
        const h = headVis.size?.h || 6;
        ctx.fillRect(headCenterX - Math.floor(w / 2), y, w, h);
        if (headVis.crest) {
          ctx.fillStyle = headVis.crest;
          ctx.fillRect(headCenterX, y - 2, 1, 3); // crest
        }
        break;
      }
      case 'headwrap': {
        const w = headVis.size?.w || 7;
        ctx.fillRect(headCenterX - Math.floor(w / 2), y, w, 2);
        ctx.fillStyle = colors[1] || colors[0];
        ctx.fillRect(headCenterX - Math.floor(w / 2), y, w, 1);
        break;
      }
      case 'tricorn': {
        ctx.fillRect(headCenterX - 4, y, 9, 1); // brim
        ctx.fillRect(headCenterX - 3, y - 1, 7, 1);
        ctx.fillRect(headCenterX - 2, y - 2, 5, 1);
        if (headVis.cockade) {
          ctx.fillStyle = headVis.cockade[0]; ctx.fillRect(headCenterX + 2, y - 1, 1, 1);
        }
        break;
      }
      case 'flat_cap': {
        ctx.fillRect(headCenterX - 3, y, 6, 2);
        break;
      }
      case 'tonsure_mark': {
        ctx.fillStyle = colors[0];
        ctx.fillRect(headCenterX - 2, y, 4, 1);
        break;
      }
      case 'halo_ring': {
        ctx.fillStyle = colors[0];
        ctx.globalAlpha = 0.6;
        ctx.fillRect(headCenterX - 4, y, 8, 1);
        ctx.fillRect(headCenterX - 4, y + 1, 1, 1);
        ctx.fillRect(headCenterX + 3, y + 1, 1, 1);
        ctx.globalAlpha = 1;
        break;
      }
    }
  }
}
