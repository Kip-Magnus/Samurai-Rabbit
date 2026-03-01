/**
 * SAMURAI USAGI — EQUIPMENT VISUAL EXPANSION
 * =============================================
 *
 * COMPLETE visual definitions for ALL 117 weapons,
 * 60+ garments, 30+ headgear, accessories, and relics.
 *
 * Every single item Usagi can equip changes his appearance.
 * No two loadouts look the same.
 *
 * This file extends equipment-visuals.js with full coverage.
 */


// ═══════════════════════════════════════════════════════════════
// COMPLETE WEAPON VISUALS — ALL 117 WEAPONS
// ═══════════════════════════════════════════════════════════════

export const WEAPON_VISUALS_COMPLETE = {

  // ─── KATANA (20) ────────────────────────────────────────

  rusty_tanto: {
    class: 'katana', length: 5,
    blade: ['#5c3a1a', '#8b5e3c', '#a07850'],
    handle: ['#3d2b1f', '#5c4033'],
    guard_color: '#5c4d3c',
    special: 'rust_spots',
  },
  farmers_sickle: {
    class: 'katana', length: 5,
    blade: ['#4a4a4a', '#6b6b6b', '#8a8a8a'],
    handle: ['#5c4033', '#7a5c40'],
    curve_amount: 4,
    special: 'sickle_shape',
  },
  fish_knife: {
    class: 'katana', length: 4,
    blade: ['#5a5a6a', '#7a7a8a', '#9a9aaa'],
    handle: ['#654321', '#8b6914'],
    guard_color: null,
    special: 'thin_fillet_blade',
  },
  ashigaru_katana: {
    class: 'katana', length: 8,
    blade: ['#505060', '#707088', '#9090a8'],
    handle: ['#2e1f14', '#4a3528'],
    guard_color: '#5a5a6a',
    wrapping: '#1a1a2e',
  },
  soldiers_yari: {
    class: 'spear', length: 14,
    shaft: ['#5c4033', '#7a5c40'],
    head: 'yari', head_color: ['#606070', '#808098'],
    special: 'straight_point',
  },
  pilgrims_blade: {
    class: 'katana', length: 10,
    blade: ['#8090a0', '#a0b0c0', '#c0d0e0'],
    handle: ['#3a2a1a', '#5c4033'],
    guard_color: '#c9a959',
    special: 'faint_cross_on_guard',
    quality_glow: '#ffd700',
  },
  moris_naginata: {
    class: 'katana', length: 13,
    blade: ['#5a5a6a', '#7a7a8a', '#9a9aaa'],
    handle: ['#5c4033', '#7a5c40'],
    guard_color: '#6a5a4a',
    blade_width: 2,
    special: 'wide_curved_blade',
  },
  roman_gladius: {
    class: 'katana', length: 7,
    blade: ['#707080', '#9898b0', '#b8b8d0'],
    handle: ['#8b4513', '#a0522d'],
    guard_color: '#c9a959',
    curve_amount: 0,
    special: 'leaf_blade_shape',
  },
  neros_gilded_blade: {
    class: 'katana', length: 10,
    blade: ['#a08020', '#c0a040', '#e0c060'],
    handle: ['#800020', '#a00030'],
    guard_color: '#ffd700',
    special: 'gold_drip_particles',
    quality_glow: '#ffd700', glow_radius: 3,
  },
  desert_scimitar: {
    class: 'katana', length: 9,
    blade: ['#808898', '#a0a8b8', '#c0c8d8'],
    handle: ['#8b4513', '#a0522d'],
    guard_color: '#c9a959',
    curve_amount: 3,
    special: 'damascus_etch',
  },
  athanasian_sword: {
    class: 'katana', length: 9,
    blade: ['#6878a0', '#8898c0', '#a8b8e0'],
    handle: ['#3d2b1f', '#5c4033'],
    guard_color: '#4169e1',
    special: 'blue_tinted_steel_cross_pommel',
    quality_glow: '#4169e1', glow_radius: 2,
  },
  crusader_longsword: {
    class: 'katana', length: 11,
    blade: ['#808898', '#a0a8b8', '#c8c8d8'],
    handle: ['#8b0000', '#a00020'],
    guard_color: '#c0c0c0',
    curve_amount: 0,
    special: 'straight_double_edged_cross_pommel',
  },
  saladins_mercy: {
    class: 'katana', length: 10,
    blade: ['#5070a0', '#7090c0', '#90b0e0'],
    handle: ['#006400', '#008000'],
    guard_color: '#c9a959',
    curve_amount: 2,
    special: 'damascus_wave_blue_green_grip',
    quality_glow: '#87ceeb', glow_radius: 2,
  },
  templar_blade: {
    class: 'katana', length: 10,
    blade: ['#a0a0b0', '#c0c0d0', '#e0e0f0'],
    handle: ['#8b0000', '#a00020'],
    guard_color: '#ffffff',
    curve_amount: 0,
    special: 'cross_etched_on_blade_red_grip',
  },
  mongol_dao: {
    class: 'katana', length: 9,
    blade: ['#505050', '#707070', '#909090'],
    handle: ['#3a2a1a', '#5c4033'],
    guard_color: '#8b6914',
    curve_amount: 2,
    special: 'wide_single_edge_nomad_wrapping',
  },
  shimabara_katana: {
    class: 'katana', length: 10,
    blade: ['#606878', '#808898', '#a0a8b8'],
    handle: ['#1a1a2e', '#2a2a4e'],
    guard_color: '#c9a959',
    wrapping: '#8b0000',
    special: 'rebel_cross_carved_in_tsuba',
  },
  lepanto_cutlass: {
    class: 'katana', length: 8,
    blade: ['#707080', '#9898a8', '#b0b0c0'],
    handle: ['#5c4033', '#7a5c40'],
    guard_color: '#808098',
    curve_amount: 2,
    special: 'basket_hilt_naval',
  },
  jacobin_saber: {
    class: 'katana', length: 10,
    blade: ['#707080', '#9090a8', '#b0b0c8'],
    handle: ['#1a1a8b', '#2a2aab'],
    guard_color: '#c0c0c0',
    curve_amount: 1,
    special: 'french_curved_guard_tricolor_pommel',
  },
  resistance_knife: {
    class: 'katana', length: 5,
    blade: ['#505050', '#707070', '#909090'],
    handle: ['#2a2a2a', '#4a4a4a'],
    guard_color: null,
    special: 'utilitarian_no_ornament',
  },
  blade_of_intercession: {
    class: 'katana', length: 12,
    blade: ['#d0d8ff', '#e8eeff', '#ffffff'],
    handle: ['#ffd700', '#ffe44d'],
    guard_color: '#ffd700',
    special: 'holy_light_blade',
    quality_glow: '#ffffff', glow_radius: 6,
    particles: 'golden_motes',
  },

  // ─── STAFF (18) ─────────────────────────────────────────

  broken_branch: {
    class: 'staff', length: 12,
    shaft: ['#5c4033', '#7a5c40'],
    ornament: null,
    special: 'rough_bark_knots_visible',
  },
  bamboo_staff: {
    class: 'staff', length: 14,
    shaft: ['#8b9a46', '#a0b050'],
    ornament: null,
    special: 'bamboo_joints_every_3px',
  },
  oak_walking_stick: {
    class: 'staff', length: 14,
    shaft: ['#654321', '#8b6914'],
    ornament: null,
    wrapping: '#8b6914',
    special: 'polished_smooth_grain',
  },
  fishing_pole: {
    class: 'staff', length: 16,
    shaft: ['#8b9a46', '#a0b050'],
    ornament: null,
    special: 'thin_flexible_line_at_tip',
    tip_detail: '#c0c0c0',
  },
  pilgrims_walking_staff: {
    class: 'staff', length: 15,
    shaft: ['#5c4033', '#7a5c40'],
    ornament: 'cross_top', ornament_color: '#c9a959',
    wrapping: '#f5f0e8',
    quality_glow: '#ffd700',
  },
  franciscan_staff: {
    class: 'staff', length: 14,
    shaft: ['#654321', '#8b6914'],
    ornament: 'tau_cross', ornament_color: '#8b6914',
    special: 'flowers_at_base',
    particles: 'tiny_petals',
  },
  roman_vinewood_staff: {
    class: 'staff', length: 13,
    shaft: ['#800020', '#a04040'],
    ornament: null,
    wrapping: '#8b6914',
    special: 'vine_spiral_carving',
  },
  catacomb_torch_staff: {
    class: 'staff', length: 14,
    shaft: ['#3a3a3a', '#5a5a5a'],
    ornament: 'flame_tip', ornament_color: '#ff6600',
    special: 'charred_wood_fire_top',
    particles: 'fire_sparks',
  },
  desert_hermits_crook: {
    class: 'staff', length: 15,
    shaft: ['#c4a870', '#d4b880'],
    ornament: 'shepherds_crook', ornament_color: '#c4a870',
    special: 'sun_bleached_wood',
  },
  athanasius_crozier: {
    class: 'staff', length: 16,
    shaft: ['#c9a959', '#d4b86a'],
    ornament: 'crozier_spiral', ornament_color: '#ffd700',
    special: 'gold_inlay_spiral',
    quality_glow: '#ffd700', glow_radius: 3,
  },
  crusader_banner_pole: {
    class: 'staff', length: 17,
    shaft: ['#5c4033', '#7a5c40'],
    ornament: 'cross_banner', ornament_color: '#8b0000',
    banner_colors: ['#ffffff', '#8b0000'],
    special: 'fabric_banner_flutters',
  },
  shepherd_of_hermas: {
    class: 'staff', length: 15,
    shaft: ['#f5f0e8', '#e0d8c8'],
    ornament: 'dove_top', ornament_color: '#ffffff',
    special: 'white_wood_dove_carving',
    quality_glow: '#f5f0e8', glow_radius: 2,
  },
  polish_oak_staff: {
    class: 'staff', length: 15,
    shaft: ['#5c3a1a', '#7a5030'],
    ornament: null,
    wrapping: '#c0c0c0',
    special: 'iron_banded_thick_oak',
  },
  kakure_prayer_staff: {
    class: 'staff', length: 14,
    shaft: ['#5c4033', '#7a5c40'],
    ornament: 'hidden_cross_inside_top', ornament_color: '#c9a959',
    special: 'cross_concealed_in_hollowed_tip',
  },
  galley_oar_staff: {
    class: 'staff', length: 16,
    shaft: ['#7a5c40', '#8b6914'],
    ornament: null,
    special: 'wide_flat_end_splintered',
    blade_width: 2,
  },
  carmelite_walking_stick: {
    class: 'staff', length: 14,
    shaft: ['#654321', '#8b6914'],
    ornament: 'star_top', ornament_color: '#ffd700',
    wrapping: '#5c4033',
    special: 'star_of_carmel_carved',
  },
  kolbes_cane: {
    class: 'staff', length: 13,
    shaft: ['#3a3a3a', '#5a5a5a'],
    ornament: null,
    special: 'plain_humble_worn_smooth',
    quality_glow: '#ffd700', glow_radius: 2,
  },
  rod_of_moses: {
    class: 'staff', length: 17,
    shaft: ['#8b6914', '#b8860b'],
    ornament: 'burning_bush', ornament_color: '#ff4500',
    special: 'holy_fire_tip',
    quality_glow: '#ff8c00', glow_radius: 8,
    particles: 'fire_and_light',
  },

  // ─── CROSS-BLADE (16) ──────────────────────────────────

  broken_cross_shard: {
    class: 'cross_blade', length: 5,
    blade: ['#5c4d3c', '#7a6852', '#8b7b6b'],
    handle: ['#3d2b1f', '#5c4033'],
    crossguard_color: '#5c4d3c',
    special: 'jagged_broken_edge',
  },
  hidden_cross_dagger: {
    class: 'cross_blade', length: 6,
    blade: ['#808098', '#a0a0b8', '#c0c0d8'],
    handle: ['#3a2a1a', '#5c4033'],
    crossguard_color: '#c9a959',
    special: 'reversible_cross_shape',
  },
  nail_cross_blade: {
    class: 'cross_blade', length: 7,
    blade: ['#4a4a4a', '#6a6a6a', '#8a8a8a'],
    handle: ['#4a4a4a', '#6a6a6a'],
    crossguard_color: '#4a4a4a',
    special: 'three_iron_nails_forged_together',
  },
  jesuit_cross_blade: {
    class: 'cross_blade', length: 8,
    blade: ['#1a1a3d', '#3d3d6d', '#6060a0'],
    handle: ['#1a1a1a', '#3d3d3d'],
    crossguard_color: '#ffd700',
    special: 'ihs_monogram_engraved',
  },
  catacomb_cross: {
    class: 'cross_blade', length: 7,
    blade: ['#808080', '#a0a0a0', '#c0c0c0'],
    handle: ['#654321', '#8b6914'],
    crossguard_color: '#808080',
    special: 'chi_rho_scratched_on_blade',
  },
  petrine_cross: {
    class: 'cross_blade', length: 8,
    blade: ['#606878', '#808898', '#a0a8b8'],
    handle: ['#5c4033', '#7a5c40'],
    crossguard_color: '#808898',
    special: 'inverted_cross_guard_shape',
  },
  nicene_blade: {
    class: 'cross_blade', length: 9,
    blade: ['#5070a0', '#7090c0', '#90b0e0'],
    handle: ['#c9a959', '#d4b86a'],
    crossguard_color: '#ffd700',
    special: 'homoousios_etched_greek_letters',
    quality_glow: '#4169e1', glow_radius: 2,
  },
  dominican_truth_blade: {
    class: 'cross_blade', length: 9,
    blade: ['#e8e8e8', '#f0f0f0', '#ffffff'],
    handle: ['#000000', '#1a1a1a'],
    crossguard_color: '#000000',
    special: 'black_white_veritas_pattern',
  },
  true_cross_relic_blade: {
    class: 'cross_blade', length: 10,
    blade: ['#8b6914', '#b8860b', '#d4af37'],
    handle: ['#5c4033', '#7a5c40'],
    crossguard_color: '#d4af37',
    special: 'ancient_wood_core_gold_overlay',
    quality_glow: '#ffd700', glow_radius: 4,
    particles: 'holy_dust',
  },
  teutonic_cross_sword: {
    class: 'cross_blade', length: 10,
    blade: ['#808898', '#a0a8b8', '#c0c8d8'],
    handle: ['#1a1a1a', '#3a3a3a'],
    crossguard_color: '#1a1a1a',
    special: 'black_cross_on_white_blade',
  },
  liegnitz_memorial_blade: {
    class: 'cross_blade', length: 9,
    blade: ['#8b0000', '#a02020', '#c04040'],
    handle: ['#c0c0c0', '#e0e0e0'],
    crossguard_color: '#c0c0c0',
    special: 'blood_stained_memorial_inscription',
  },
  kakure_hidden_cross: {
    class: 'cross_blade', length: 6,
    blade: ['#5c4d3c', '#7a6852', '#8b7b6b'],
    handle: ['#5c4033', '#7a5c40'],
    crossguard_color: '#5c4d3c',
    special: 'hidden_inside_farming_tool_handle',
  },
  rosary_chain_blade: {
    class: 'cross_blade', length: 8,
    blade: ['#808898', '#a0a8b8', '#c0c8d8'],
    handle: ['#1a1a1a', '#3a3a3a'],
    crossguard_color: '#c9a959',
    special: 'rosary_beads_wound_around_grip',
    bead_colors: ['#f5f0e8', '#c9a959'],
  },
  carmelite_scissors: {
    class: 'cross_blade', length: 6,
    blade: ['#606060', '#808080', '#a0a0a0'],
    handle: ['#5c4033', '#7a5c40'],
    crossguard_color: null,
    special: 'twin_blades_scissor_cross_shape',
  },
  kolbes_cross: {
    class: 'cross_blade', length: 7,
    blade: ['#4a4a4a', '#6a6a6a', '#8a8a8a'],
    handle: ['#5a5a5a', '#7a7a7a'],
    crossguard_color: '#6a6a6a',
    special: 'rough_makeshift_wire_bound',
    quality_glow: '#ffd700', glow_radius: 3,
  },
  crux_invicta: {
    class: 'cross_blade', length: 11,
    blade: ['#e0e8ff', '#f0f4ff', '#ffffff'],
    handle: ['#ffd700', '#ffe44d'],
    crossguard_color: '#ffd700',
    special: 'blazing_cross_shape_total_radiance',
    quality_glow: '#ffffff', glow_radius: 8,
    particles: 'holy_sparks_constant',
  },

  // ─── IMPROVISED (17) ────────────────────────────────────

  bare_fists_tool: { class: 'fist', shape: 'none' },
  river_stone: {
    class: 'improvised', shape: 'rock', length: 3,
    colors: ['#708090', '#8a9aaa', '#a0b0c0'],
    special: 'smooth_round_river_worn',
  },
  hoe_blade: {
    class: 'improvised', shape: 'hoe', length: 10,
    colors: ['#5c4033', '#6a6a7a', '#8a8a9a'],
    special: 'flat_blade_perpendicular_to_shaft',
  },
  chain_flail: {
    class: 'improvised', shape: 'chain_flail', length: 8,
    colors: ['#6a6a7a', '#8a8a9a', '#a0a0b0'],
    special: 'swinging_chain_with_weight',
  },
  roof_tile: {
    class: 'improvised', shape: 'disc', length: 3,
    colors: ['#8b4513', '#a0522d', '#b8733d'],
    special: 'curved_ceramic_shard',
  },
  iron_pot_lid: {
    class: 'improvised', shape: 'disc', length: 4,
    colors: ['#4a4a4a', '#6a6a6a', '#8a8a8a'],
    special: 'round_dented_makeshift_shield',
  },
  anchor_hook: {
    class: 'improvised', shape: 'hook', length: 7,
    colors: ['#4a4a4a', '#6a6a7a'],
    special: 'curved_iron_hook_rope_handle',
  },
  colosseum_chain: {
    class: 'improvised', shape: 'chain', length: 10,
    colors: ['#808098', '#a0a0b8'],
    special: 'heavy_arena_chain_swings_wide',
  },
  potters_wheel_disk: {
    class: 'improvised', shape: 'disc', length: 4,
    colors: ['#8b4513', '#a0522d', '#c0733d'],
    special: 'spinning_ceramic_disk_sharp_edge',
  },
  tent_stake: {
    class: 'improvised', shape: 'stake', length: 8,
    colors: ['#5c4033', '#7a5c40'],
    special: 'pointed_wood_iron_tip',
  },
  siege_rubble: {
    class: 'improvised', shape: 'rock', length: 4,
    colors: ['#a0a090', '#b0b0a0', '#c0c0b0'],
    special: 'jagged_masonry_chunk',
  },
  mongol_bola: {
    class: 'improvised', shape: 'bola', length: 6,
    colors: ['#8b6914', '#5c4033'],
    special: 'three_stones_on_leather_cords',
  },
  shimabara_pitchfork: {
    class: 'improvised', shape: 'pitchfork', length: 14,
    colors: ['#5c4033', '#6a6a7a'],
    special: 'three_prong_farm_tool',
  },
  galley_anchor_chain: {
    class: 'improvised', shape: 'chain', length: 12,
    colors: ['#4a4a5a', '#6a6a7a', '#808098'],
    special: 'massive_naval_chain_anchor_fragment',
  },
  guillotine_bolt: {
    class: 'improvised', shape: 'bolt', length: 6,
    colors: ['#4a4a4a', '#6a6a6a'],
    special: 'heavy_iron_bolt_from_guillotine_frame',
  },
  barbed_wire_wrap: {
    class: 'fist', shape: 'wrapped_fists', length: 0,
    colors: ['#6a6a7a', '#8a8a9a'],
    special: 'wire_barbs_around_hands',
  },
  jawbone_of_samson: {
    class: 'improvised', shape: 'jawbone', length: 8,
    colors: ['#f5f0e8', '#d4c4a8', '#b0a080'],
    special: 'bone_shape_holy_radiance',
    quality_glow: '#ffd700', glow_radius: 5,
    particles: 'holy_dust',
  },

  // ─── FIST (15) ──────────────────────────────────────────

  bare_hands: { class: 'fist', shape: 'none' },
  cloth_hand_wraps: {
    class: 'fist', shape: 'wrapped',
    colors: ['#f5f0e8', '#e0d8c8'],
    special: 'white_cloth_strips_around_hands',
  },
  leather_fighting_gloves: {
    class: 'fist', shape: 'gloves',
    colors: ['#5c4033', '#7a5c40'],
    special: 'brown_leather_knuckle_pads',
  },
  iron_knuckles: {
    class: 'fist', shape: 'knuckles',
    colors: ['#6a6a7a', '#8a8a9a', '#a0a0b0'],
    special: 'iron_plates_over_fingers',
  },
  prayer_bead_wraps: {
    class: 'fist', shape: 'wrapped',
    colors: ['#c9a959', '#f5f0e8'],
    special: 'prayer_beads_wound_between_fingers',
    particles: 'faint_gold_motes',
  },
  roman_caestus: {
    class: 'fist', shape: 'caestus',
    colors: ['#8b4513', '#6a6a7a'],
    special: 'leather_strap_iron_studs_roman',
  },
  desert_father_wraps: {
    class: 'fist', shape: 'wrapped',
    colors: ['#c4a870', '#d4b880'],
    special: 'sun_bleached_linen_prayer_knots',
  },
  monks_discipline_bands: {
    class: 'fist', shape: 'bands',
    colors: ['#1a1a1a', '#3a3a3a'],
    special: 'black_leather_penitential_bands',
  },
  gauntlet_of_godfrey: {
    class: 'fist', shape: 'gauntlet',
    colors: ['#c0c0c0', '#d8d8d8', '#8b0000'],
    special: 'plate_gauntlet_red_cross_on_back',
    quality_glow: '#c0c0c0', glow_radius: 2,
  },
  mongol_horsehide_gloves: {
    class: 'fist', shape: 'gloves',
    colors: ['#654321', '#8b6914'],
    special: 'thick_horsehide_reinforced_knuckles',
  },
  shimabara_rebel_wraps: {
    class: 'fist', shape: 'wrapped',
    colors: ['#8b0000', '#f5f0e8'],
    special: 'red_and_white_rebel_wraps_cross_sewn',
  },
  galley_slave_chains: {
    class: 'fist', shape: 'chains',
    colors: ['#4a4a5a', '#6a6a7a'],
    special: 'broken_manacle_chains_on_wrists',
  },
  carmelite_discipline: {
    class: 'fist', shape: 'wrapped',
    colors: ['#654321', '#f5f0e8'],
    special: 'brown_cord_wraps_star_of_carmel_sewn',
  },
  camp_survivor_fists: {
    class: 'fist', shape: 'scarred',
    colors: ['#d4a574', '#b8956a'],
    special: 'scarred_knuckles_tattoo_number_visible',
  },
  hands_of_the_saint: {
    class: 'fist', shape: 'stigmata',
    colors: ['#ffd700', '#ffffff'],
    special: 'stigmata_wounds_of_light_on_palms',
    quality_glow: '#ffffff', glow_radius: 6,
    particles: 'golden_blood_drops',
  },

  // ─── SPEAR (16) ─────────────────────────────────────────

  sharpened_stick: {
    class: 'spear', length: 14,
    shaft: ['#5c4033', '#7a5c40'],
    head: null, head_color: null,
    special: 'fire_hardened_point',
  },
  bamboo_spear: {
    class: 'spear', length: 15,
    shaft: ['#8b9a46', '#a0b050'],
    head: null, head_color: null,
    special: 'split_bamboo_point',
  },
  ashigaru_yari: {
    class: 'spear', length: 16,
    shaft: ['#5c4033', '#7a5c40'],
    head: 'yari', head_color: ['#808098', '#a0a0b8'],
    special: 'straight_double_edge_japanese',
  },
  fishing_harpoon: {
    class: 'spear', length: 14,
    shaft: ['#5c4033', '#7a5c40'],
    head: 'harpoon', head_color: ['#6a6a7a', '#8a8a9a'],
    special: 'barbed_single_point',
  },
  roman_pilum: {
    class: 'spear', length: 16,
    shaft: ['#5c4033', '#7a5c40'],
    head: 'pilum', head_color: ['#6a6a7a', '#8a8a9a'],
    special: 'long_iron_shank_bends_on_impact',
  },
  praetorian_spear: {
    class: 'spear', length: 17,
    shaft: ['#800020', '#a04040'],
    head: 'broad', head_color: ['#c0c0c0', '#d8d8d8'],
    special: 'gold_banded_shaft_broad_head',
  },
  desert_sarissa: {
    class: 'spear', length: 19,
    shaft: ['#c4a870', '#d4b880'],
    head: 'leaf', head_color: ['#808898', '#a0a8b8'],
    special: 'extremely_long_macedonian_style',
  },
  crusader_lance: {
    class: 'spear', length: 18,
    shaft: ['#5c4033', '#7a5c40'],
    head: 'lance', head_color: ['#c0c0c0', '#d8d8d8'],
    special: 'pennant_below_head_red_white',
    pennant_colors: ['#8b0000', '#ffffff'],
  },
  holy_lance_replica: {
    class: 'spear', length: 17,
    shaft: ['#654321', '#8b6914'],
    head: 'leaf', head_color: ['#a0a8b8', '#c0c8d8'],
    special: 'holy_nail_embedded_in_blade',
    quality_glow: '#c9a959', glow_radius: 3,
  },
  mongol_lance: {
    class: 'spear', length: 16,
    shaft: ['#654321', '#8b6914'],
    head: 'hook_lance', head_color: ['#505050', '#707070'],
    special: 'hook_below_blade_for_pulling_riders',
  },
  polish_winged_lance: {
    class: 'spear', length: 18,
    shaft: ['#5c4033', '#7a5c40'],
    head: 'lance', head_color: ['#c0c0c0', '#d8d8d8'],
    wing_colors: ['#ffffff', '#e0e0e0'],
    special: 'feathered_wings_on_shaft_hussar',
  },
  shimabara_bamboo_pike: {
    class: 'spear', length: 17,
    shaft: ['#8b9a46', '#a0b050'],
    head: 'crude', head_color: ['#5a5a6a', '#7a7a8a'],
    special: 'bamboo_shaft_iron_tip_rebel_weapon',
  },
  naval_boarding_pike: {
    class: 'spear', length: 15,
    shaft: ['#5c4033', '#7a5c40'],
    head: 'broad', head_color: ['#6a6a7a', '#8a8a9a'],
    special: 'short_thick_shipboard_combat',
  },
  revolutionary_pike: {
    class: 'spear', length: 17,
    shaft: ['#5c4033', '#7a5c40'],
    head: 'pike', head_color: ['#707080', '#9090a0'],
    special: 'tricolor_ribbon_below_head',
    ribbon_colors: ['#0000ff', '#ffffff', '#ff0000'],
  },
  camp_fence_stake: {
    class: 'spear', length: 13,
    shaft: ['#3a3a3a', '#5a5a5a'],
    head: null, head_color: null,
    special: 'barbed_wire_wrapped_tip',
  },
  spear_of_destiny: {
    class: 'spear', length: 19,
    shaft: ['#ffd700', '#ffe44d'],
    head: 'destiny', head_color: ['#e0e8ff', '#ffffff'],
    special: 'holy_radiance_full_golden_shaft',
    quality_glow: '#ffffff', glow_radius: 8,
    particles: 'holy_sparks_constant',
  },

  // ─── BOW (15) ───────────────────────────────────────────

  makeshift_sling: {
    class: 'bow', shape: 'sling', length: 5,
    sling_colors: ['#8b6914', '#654321'],
    special: 'leather_pouch_two_cords',
  },
  hunting_shortbow: {
    class: 'bow', length: 7,
    limbs: ['#5c4033', '#7a5c40'], string: ['#8b6914'],
    special: 'small_simple_wood_bow',
  },
  yumi_halfbow: {
    class: 'bow', length: 10,
    limbs: ['#5c4033', '#7a5c40'], string: ['#f5f0e8'],
    special: 'asymmetric_japanese_lower_grip',
  },
  ashigaru_longbow: {
    class: 'bow', length: 13,
    limbs: ['#5c4033', '#7a5c40'], string: ['#f5f0e8'],
    special: 'full_yumi_bamboo_and_wood_laminate',
  },
  roman_composite_bow: {
    class: 'bow', length: 8,
    limbs: ['#8b4513', '#a0522d'], string: ['#8b6914'],
    special: 'horn_and_sinew_composite_recurve',
  },
  colosseum_crossbow: {
    class: 'bow', shape: 'crossbow', length: 8,
    limbs: ['#5c4033', '#6a6a7a'], string: ['#4a4a4a'],
    stock_color: ['#5c4033', '#7a5c40'],
    special: 'arena_crossbow_iron_prod',
  },
  egyptian_recurve: {
    class: 'bow', length: 9,
    limbs: ['#c4a870', '#d4b880'], string: ['#8b6914'],
    special: 'angular_recurve_desert_materials',
  },
  saracen_horse_bow: {
    class: 'bow', length: 8,
    limbs: ['#654321', '#8b6914'], string: ['#8b6914'],
    special: 'compact_powerful_recurve_horn_tips',
  },
  english_longbow: {
    class: 'bow', length: 14,
    limbs: ['#654321', '#8b6914'], string: ['#8b6914'],
    special: 'tall_straight_yew_wood',
  },
  mongol_composite: {
    class: 'bow', length: 9,
    limbs: ['#5c4033', '#8b6914'], string: ['#8b6914'],
    limb_detail: ['#f5f0e8'],
    special: 'recurve_horn_tips_most_powerful_horse_bow',
  },
  kakure_bamboo_bow: {
    class: 'bow', length: 10,
    limbs: ['#8b9a46', '#a0b050'], string: ['#f5f0e8'],
    special: 'hidden_christian_bamboo_simple',
  },
  lepanto_naval_crossbow: {
    class: 'bow', shape: 'crossbow', length: 9,
    limbs: ['#5c4033', '#808098'], string: ['#4a4a4a'],
    stock_color: ['#5c4033', '#7a5c40'],
    special: 'heavy_naval_crossbow_iron_stirrup',
  },
  revolutionary_musket_bow: {
    class: 'bow', shape: 'crossbow', length: 10,
    limbs: ['#4a4a4a', '#6a6a6a'], string: ['#4a4a4a'],
    stock_color: ['#5c4033', '#7a5c40'],
    special: 'converted_musket_stock_bow_limbs_attached',
  },
  resistance_slingshot: {
    class: 'bow', shape: 'slingshot', length: 5,
    limbs: ['#5c4033'], string: ['#654321'],
    special: 'forked_stick_rubber_band',
  },
  bow_of_the_watchman: {
    class: 'bow', length: 12,
    limbs: ['#c9a959', '#ffd700'], string: ['#ffffff'],
    special: 'holy_light_arrows_golden_limbs',
    quality_glow: '#ffd700', glow_radius: 5,
    particles: 'light_trail_on_arrow',
  },
};


// ═══════════════════════════════════════════════════════════════
// EXPANDED GARMENT CATALOG — 65+ OUTFITS
// ═══════════════════════════════════════════════════════════════

export const GARMENT_VISUALS_COMPLETE = {

  // ━━━ BOOK 0: JAPAN 1587 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  farmers_kosode: {
    cloth: ['#3d3528', '#5c4d3c', '#7a6852', '#8b7b6b'],
    adds: [],
    desc: 'Brown farmer\'s clothing.',
  },
  patched_kimono: {
    cloth: ['#4a4a3e', '#6a6a56', '#8a8a6e', '#9a9a7e'],
    adds: [{ type: 'patches', color: '#5c4d3c', pos: 'random_body' }],
    desc: 'Grey-green kimono with visible patches. Worn but dignified.',
  },
  fishermans_coat: {
    cloth: ['#2a3a4a', '#3a5060', '#4a6878', '#5a7888'],
    adds: [{ type: 'rope_belt', color: '#8b6914', pos: 'waist' }],
    desc: 'Deep sea-blue coat. Smells of salt and fish.',
  },
  merchants_haori: {
    cloth: ['#1a2a3a', '#2a3a5a', '#3a4a6a', '#4a5a7a'],
    adds: [{ type: 'mon_crest', color: '#c9a959', pos: 'back_upper' }],
    desc: 'Dark indigo haori jacket with family crest.',
  },
  hidden_christian_robe: {
    cloth: ['#4a4040', '#6a5858', '#8a7070', '#9a8080'],
    adds: [{ type: 'hidden_cross', color: '#c9a959', pos: 'inner_collar', visible: false }],
    desc: 'Muted brown-rose. Cross hidden inside the collar.',
  },
  shrine_maidens_garment: {
    cloth: ['#c01040', '#d02050', '#e03060', '#f04070'],
    legs: ['#e0e0e0', '#f0f0f0'],
    adds: [],
    desc: 'Red and white miko garb. An unusual choice for a rabbit warrior.',
  },
  samurai_training_gi: {
    cloth: ['#1a1a2e', '#2a2a4e', '#3a3a6e', '#4a4a8e'],
    adds: [{ type: 'obi_sash', color: '#1a1a1a', pos: 'waist' }],
    desc: 'Dark indigo training gi with black obi.',
  },
  bamboo_woven_vest: {
    cloth: ['#7a8a46', '#8a9a56', '#9aaa66', '#aaba76'],
    adds: [],
    desc: 'Light green bamboo-fiber vest. Cool in summer.',
  },

  // ━━━ BOOK 1: ROME 64 AD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  roman_tunic: {
    cloth: ['#800020', '#a00030', '#c01040', '#d02050'],
    adds: [{ type: 'belt', color: '#8b6914', pos: 'waist' }, { type: 'sandal_straps', color: '#8b6914', pos: 'legs' }],
    desc: 'Red Roman tunic.',
  },
  roman_toga_simple: {
    cloth: ['#d4c4a8', '#e4d4b8', '#f0e8d8', '#f8f0e8'],
    adds: [{ type: 'drape', color: '#e4d4b8', pos: 'left_shoulder_to_waist' }],
    desc: 'Undyed wool toga. Citizen\'s garment.',
  },
  roman_toga_purple: {
    cloth: ['#4a0060', '#6a0080', '#8a00a0', '#aa20c0'],
    adds: [{ type: 'gold_border', color: '#c9a959', pos: 'hem' }],
    desc: 'Imperial purple. Tyrian dye. Extremely valuable.',
  },
  catacomb_rags: {
    cloth: ['#3a3030', '#5a4848', '#7a6060', '#8a7070'],
    adds: [],
    desc: 'Torn, dirt-stained. The clothes of someone who lives underground.',
  },
  slave_tunic: {
    cloth: ['#8a7a60', '#9a8a70', '#aa9a80', '#baaa90'],
    adds: [],
    desc: 'Rough undyed linen. No belt. No ornament. A slave\'s garment.',
  },
  lorica_segmentata: {
    cloth: ['#800020', '#a00030', '#c01040', '#d02050'],
    adds: [
      { type: 'plate_segments', color: '#808098', pos: 'torso', hl: '#a0a0b8' },
      { type: 'shoulder_plates', color: '#808098', pos: 'shoulders' },
      { type: 'belt', color: '#8b6914', pos: 'waist' },
    ],
    desc: 'Roman legionary armor. Banded iron plates.',
  },
  gladiator_leather: {
    cloth: ['#654321', '#8b6914', '#a07830', '#b88840'],
    adds: [
      { type: 'shoulder_guard', color: '#8b6914', pos: 'left_shoulder' },
      { type: 'arm_wrap', color: '#654321', pos: 'right_arm' },
    ],
    desc: 'Arena fighter\'s leather. One shoulder protected. One arm wrapped.',
  },
  christian_burial_wrap: {
    cloth: ['#f0e8d8', '#f5f0e8', '#f8f4f0', '#ffffff'],
    adds: [{ type: 'cross_fold', color: '#c9a959', pos: 'chest' }],
    desc: 'White burial linen. Consecrated. Worn by those who expect martyrdom.',
  },

  // ━━━ BOOK 2: EGYPT 325 AD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  desert_robes: {
    cloth: ['#c4a870', '#d4b880', '#e4c890', '#f0d8a0'],
    adds: [{ type: 'headwrap_down', color: '#d4b880', pos: 'shoulders' }],
    desc: 'Sandy desert robes.',
  },
  monks_desert_robe: {
    cloth: ['#a08860', '#b09870', '#c0a880', '#d0b890'],
    adds: [{ type: 'cross_pendant', color: '#5c4033', pos: 'chest' }, { type: 'rope_belt', color: '#5c4033', pos: 'waist' }],
    desc: 'Desert hermit\'s robe with wooden cross.',
  },
  coptic_tunic: {
    cloth: ['#f0e8d8', '#f5f0e8', '#f8f4f0', '#ffffff'],
    adds: [
      { type: 'coptic_cross', color: '#c9a959', pos: 'chest' },
      { type: 'woven_bands', color: '#800080', pos: 'hem_and_cuffs' },
    ],
    desc: 'White linen with purple woven bands. Coptic Christian.',
  },
  egyptian_noble_robe: {
    cloth: ['#e0d0b0', '#f0e0c0', '#f8f0d8', '#ffffff'],
    adds: [
      { type: 'gold_collar', color: '#ffd700', pos: 'neck_wide' },
      { type: 'sash', color: '#4169e1', pos: 'waist' },
    ],
    desc: 'White linen with gold collar and blue sash. Egyptian nobility.',
  },
  arian_soldiers_cloak: {
    cloth: ['#2a2a4a', '#3a3a5a', '#4a4a6a', '#5a5a7a'],
    adds: [{ type: 'cloak_pin', color: '#c0c0c0', pos: 'right_shoulder' }],
    desc: 'Dark blue military cloak. Arian faction.',
  },
  desert_bandit_wrap: {
    cloth: ['#4a3a2a', '#6a5a4a', '#8a7a6a', '#9a8a7a'],
    adds: [{ type: 'face_wrap', color: '#4a3a2a', pos: 'lower_face' }],
    desc: 'Dark brown desert wraps. Face covered.',
  },

  // ━━━ BOOK 3: ACRE 1291 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  crusader_surcoat: {
    cloth: ['#c0c0c0', '#d0d0d0', '#e0e0e0', '#f0f0f0'],
    adds: [
      { type: 'cross_emblem', color: '#8b0000', pos: 'chest', size: 'large' },
      { type: 'chain_mail', color: '#808098', pos: 'arms_legs' },
      { type: 'belt', color: '#8b6914', pos: 'waist' },
    ],
    desc: 'White surcoat over chain mail. Red cross.',
  },
  hospitaller_surcoat: {
    cloth: ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'],
    adds: [{ type: 'cross_emblem', color: '#ffffff', pos: 'chest', size: 'large' }, { type: 'chain_mail', color: '#808098', pos: 'arms_legs' }],
    desc: 'Black surcoat. White cross. Knights Hospitaller.',
  },
  templar_surcoat: {
    cloth: ['#e8e0d0', '#f0e8d8', '#f5f0e8', '#f8f4f0'],
    adds: [{ type: 'cross_emblem', color: '#8b0000', pos: 'chest', size: 'large' }, { type: 'chain_mail', color: '#808098', pos: 'arms_legs' }],
    desc: 'White-cream surcoat. Red cross pattée. Knights Templar.',
  },
  mamluk_armor: {
    cloth: ['#c9a959', '#d4b86a', '#e0c87a', '#f0d88a'],
    adds: [
      { type: 'lamellar', color: '#808098', pos: 'torso' },
      { type: 'turban_cloth', color: '#ffffff', pos: 'waist_sash' },
    ],
    desc: 'Gold cloth over lamellar armor. Mamluk warrior.',
  },
  merchant_pilgrim: {
    cloth: ['#5a5040', '#7a7058', '#9a9070', '#aaa080'],
    adds: [{ type: 'travel_pack', color: '#5c4033', pos: 'back' }, { type: 'money_pouch', color: '#8b6914', pos: 'waist' }],
    desc: 'Travel-worn merchant\'s garb. Belt of pouches.',
  },
  chain_mail_byrnie: {
    cloth: ['#808098', '#9898b0', '#a8a8c0', '#b8b8d0'],
    adds: [{ type: 'coif', color: '#808098', pos: 'neck' }],
    desc: 'Full chain mail shirt. Rattling iron rings.',
  },
  saracen_silk_robe: {
    cloth: ['#006400', '#008000', '#00a000', '#20c020'],
    adds: [
      { type: 'gold_trim', color: '#c9a959', pos: 'hem_and_cuffs' },
      { type: 'sash', color: '#ffffff', pos: 'waist' },
    ],
    desc: 'Green silk with gold trim. Elegant. Enemy garb worn in necessity.',
  },

  // ━━━ BOOK 4: POLAND 1241 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  polish_peasant_coat: {
    cloth: ['#5a5040', '#7a7058', '#9a9070', '#aaa080'],
    adds: [{ type: 'fur_collar', color: '#654321', pos: 'neck' }],
    desc: 'Heavy wool coat. Fur collar against the Polish cold.',
  },
  polish_soldiers_gambeson: {
    cloth: ['#3a3a2e', '#5a5a46', '#7a7a5e', '#8a8a6e'],
    adds: [
      { type: 'quilted_pattern', color: '#5a5a46', pos: 'torso' },
      { type: 'eagle_emblem', color: '#ffffff', pos: 'chest', bg: '#8b0000' },
    ],
    desc: 'Quilted green gambeson. White eagle on red — Poland.',
  },
  teutonic_habit: {
    cloth: ['#f0f0f0', '#f5f5f5', '#fafafa', '#ffffff'],
    adds: [{ type: 'cross_emblem', color: '#1a1a1a', pos: 'chest', size: 'large' }],
    desc: 'White habit. Black cross. Teutonic Order.',
  },
  mongol_deel: {
    cloth: ['#8b6914', '#a07830', '#b88840', '#c89850'],
    adds: [{ type: 'sash', color: '#006400', pos: 'waist' }, { type: 'fur_trim', color: '#654321', pos: 'hem' }],
    desc: 'Mongolian deel robe. Gold-brown with fur trim. Captured or traded.',
  },
  steppe_fur_coat: {
    cloth: ['#654321', '#8b6914', '#a07830', '#b88840'],
    adds: [{ type: 'full_fur', color: '#4a3a2a', pos: 'outer_layer' }],
    desc: 'Heavy fur outer coat. Survival gear for the steppe winter.',
  },
  hussar_light_armor: {
    cloth: ['#8b0000', '#a02020', '#c04040', '#d06060'],
    adds: [
      { type: 'scale_mail', color: '#c0c0c0', pos: 'torso' },
      { type: 'wing_frame', color: '#ffffff', pos: 'back_shoulders' },
    ],
    desc: 'Red with scale mail. Wings on the back. Polish Hussar.',
  },

  // ━━━ BOOK 5: JAPAN 1614-1638 ━━━━━━━━━━━━━━━━━━━━━━━━━

  kakure_peasant: {
    cloth: ['#3d3528', '#5c4d3c', '#7a6852', '#8b7b6b'],
    adds: [{ type: 'hidden_cross', color: '#c9a959', pos: 'inner_collar', visible: false }],
    desc: 'Peasant clothes. Cross hidden inside.',
  },
  samurai_yoroi: {
    cloth: ['#1a1a2e', '#2a2a4e', '#3a3a6e', '#4a4a8e'],
    adds: [
      { type: 'lamellar_plates', color: '#2a2a4e', pos: 'torso', hl: '#4a4a8e' },
      { type: 'shoulder_guards', color: '#2a2a4e', pos: 'shoulders' },
      { type: 'tassets', color: '#1a1a2e', pos: 'waist' },
    ],
    desc: 'Dark blue lacquered armor.',
  },
  shimabara_rebel_garb: {
    cloth: ['#5a3030', '#7a4040', '#9a5050', '#aa6060'],
    adds: [
      { type: 'headband', color: '#ffffff', pos: 'forehead' },
      { type: 'cross_banner_back', color: '#ffffff', pos: 'back' },
    ],
    desc: 'Red-brown rebel clothing. White headband. Cross banner on back.',
  },
  night_infiltration_suit: {
    cloth: ['#0a0a0a', '#1a1a1a', '#2a2a2a', '#3a3a3a'],
    adds: [{ type: 'tabi_socks', color: '#0a0a0a', pos: 'feet' }],
    desc: 'Full black. For moving unseen at night.',
  },
  orasho_prayer_robe: {
    cloth: ['#4a3a5a', '#6a5a7a', '#8a7a9a', '#9a8aaa'],
    adds: [{ type: 'hidden_rosary', color: '#c9a959', pos: 'inner_pocket', visible: false }],
    desc: 'Purple-grey. The color of Lenten penance. Rosary hidden inside.',
  },
  silk_merchant_formal: {
    cloth: ['#2a2a5a', '#3a3a7a', '#4a4a9a', '#5a5aba'],
    adds: [{ type: 'obi_sash', color: '#c9a959', pos: 'waist' }, { type: 'mon_crest', color: '#c9a959', pos: 'back_upper' }],
    desc: 'Rich indigo silk. Golden obi. For blending with merchants.',
  },

  // ━━━ BOOK 6: LEPANTO 1571 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  galley_slave_rags: {
    cloth: ['#5a5040', '#7a7058', '#9a9070', '#aaa080'],
    adds: [{ type: 'chain_marks', color: '#4a4a5a', pos: 'wrists_ankles' }],
    desc: 'Torn cloth. Chain marks on wrists. A freed man\'s garment.',
  },
  venetian_doublet: {
    cloth: ['#600010', '#800020', '#a00030', '#c01040'],
    adds: [
      { type: 'slashed_sleeves', color: '#ffd700', pos: 'arms' },
      { type: 'ruff_collar', color: '#ffffff', pos: 'neck' },
    ],
    desc: 'Crimson velvet with gold-slashed sleeves. Venetian style.',
  },
  spanish_naval_coat: {
    cloth: ['#1a1a3d', '#2a2a5d', '#3a3a7d', '#4a4a9d'],
    adds: [
      { type: 'gold_braid', color: '#c9a959', pos: 'chest_diagonal' },
      { type: 'collar', color: '#ffffff', pos: 'neck' },
    ],
    desc: 'Dark blue naval coat. Gold braid. Spanish fleet.',
  },
  ottoman_sipahi: {
    cloth: ['#8b0000', '#a00020', '#c01040', '#d02050'],
    adds: [{ type: 'mail_shirt', color: '#808098', pos: 'torso' }, { type: 'turban_cloth', color: '#ffffff', pos: 'waist_sash' }],
    desc: 'Red Ottoman cavalry armor.',
  },
  sailors_canvas: {
    cloth: ['#5a5a6a', '#7a7a8a', '#9a9aaa', '#aaaaaa'],
    adds: [{ type: 'rope_belt', color: '#8b6914', pos: 'waist' }],
    desc: 'Canvas shirt and trousers. Salt-stained. A sailor\'s uniform.',
  },
  corsair_vest: {
    cloth: ['#4a2a2a', '#6a4a3a', '#8a6a4a', '#aa8a5a'],
    adds: [
      { type: 'sash', color: '#8b0000', pos: 'waist_wide' },
      { type: 'open_chest', pos: 'chest' },
    ],
    desc: 'Leather vest. Red sash. Open chest. Barbary pirate style.',
  },

  // ━━━ BOOK 7: FRANCE 1793 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  revolutionary_coat: {
    cloth: ['#1a1a5a', '#2a2a7a', '#3a3a9a', '#4a4aba'],
    adds: [
      { type: 'lapels', color: '#ffffff', pos: 'chest' },
      { type: 'tricolor_cockade', color: ['#0000ff', '#ffffff', '#ff0000'], pos: 'chest_left' },
    ],
    desc: 'Blue Revolutionary coat.',
  },
  sans_culotte_garb: {
    cloth: ['#5a4a3a', '#7a6a5a', '#9a8a7a', '#aa9a8a'],
    adds: [
      { type: 'liberty_cap', color: '#8b0000', pos: 'note_headgear' },
      { type: 'striped_trousers', color: '#1a1a5a', pos: 'legs', stripe: '#ffffff' },
    ],
    desc: 'Working class garb. Long trousers instead of aristocratic breeches.',
  },
  priests_cassock_hidden: {
    cloth: ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'],
    adds: [
      { type: 'hidden_stole', color: '#800080', pos: 'under_coat', visible: false },
      { type: 'collar_hidden', color: '#ffffff', pos: 'under_coat', visible: false },
    ],
    desc: 'Black coat. Looks secular. Stole and collar hidden beneath.',
  },
  aristocrat_disguise: {
    cloth: ['#4a4a6a', '#5a5a7a', '#6a6a8a', '#7a7a9a'],
    adds: [
      { type: 'lace_cuffs', color: '#ffffff', pos: 'wrists' },
      { type: 'waistcoat', color: '#c9a959', pos: 'inner_torso' },
    ],
    desc: 'Muted aristocratic clothing. Dangerous to wear.',
  },
  carmelite_robe: {
    cloth: ['#3d2b1f', '#5c4033', '#7a5c40', '#8b6914'],
    adds: [
      { type: 'scapular', color: '#f5f0e8', pos: 'over_torso' },
      { type: 'star_emblem', color: '#ffd700', pos: 'chest' },
    ],
    desc: 'Brown Carmelite robe. White scapular. Star of Carmel.',
  },
  prison_uniform_bastille: {
    cloth: ['#6a6a5a', '#8a8a7a', '#aaa09a', '#bab0aa'],
    adds: [{ type: 'number_patch', color: '#1a1a1a', pos: 'chest_left' }],
    desc: 'Grey prison clothes. Revolutionary prison. A number, not a name.',
  },
  nuns_habit: {
    cloth: ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'],
    adds: [
      { type: 'wimple', color: '#ffffff', pos: 'head_frame' },
      { type: 'crucifix', color: '#c9a959', pos: 'chest' },
    ],
    desc: 'Black habit. White wimple. The Carmelite nuns of Compiègne wore this to the guillotine.',
  },

  // ━━━ BOOK 8: POLAND 1940s ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  camp_uniform: {
    cloth: ['#4a4a5a', '#5a5a6a', '#6a6a7a', '#7a7a8a'],
    adds: [
      { type: 'stripes', color: '#3a3a4a', pos: 'vertical_body' },
      { type: 'number_patch', color: '#ffffff', pos: 'chest_left' },
    ],
    desc: 'Striped camp uniform.',
  },
  resistance_jacket: {
    cloth: ['#2a2a2a', '#3a3a3a', '#4a4a4a', '#5a5a5a'],
    adds: [{ type: 'armband', color: '#ffffff', pos: 'left_arm', emblem: 'anchor_cross' }],
    desc: 'Dark jacket. Polish resistance armband.',
  },
  civilian_overcoat: {
    cloth: ['#3a3a30', '#5a5a48', '#7a7a60', '#8a8a70'],
    adds: [{ type: 'collar_up', color: '#3a3a30', pos: 'neck' }],
    desc: 'Grey-green overcoat. Collar turned up. Trying to be invisible.',
  },
  franciscan_habit: {
    cloth: ['#3d2b1f', '#654321', '#8b6914', '#a07830'],
    adds: [
      { type: 'rope_belt', color: '#f5f0e8', pos: 'waist' },
      { type: 'hood_down', color: '#654321', pos: 'shoulders' },
    ],
    legs: ['#3d2b1f', '#654321'],
    desc: 'Brown Franciscan habit. What Kolbe wore.',
  },
  kolbes_number_16670: {
    cloth: ['#4a4a5a', '#5a5a6a', '#6a6a7a', '#7a7a8a'],
    adds: [
      { type: 'stripes', color: '#3a3a4a', pos: 'vertical_body' },
      { type: 'specific_number', text: '16670', color: '#ffffff', pos: 'chest_left' },
      { type: 'faint_stigmata_glow', color: '#ffd700', pos: 'hands', visible: 'phase3+' },
    ],
    desc: 'Camp uniform number 16670. Maximilian Kolbe\'s number. It glows faintly at high holiness.',
  },
  stolen_officers_coat: {
    cloth: ['#3a4a3a', '#4a5a4a', '#5a6a5a', '#6a7a6a'],
    adds: [
      { type: 'buttons', color: '#c0c0c0', pos: 'center_line' },
      { type: 'shoulder_boards', color: '#c0c0c0', pos: 'shoulders' },
    ],
    desc: 'Wehrmacht officer\'s coat. Stolen. Dangerous disguise.',
  },

  // ━━━ FINAL BOOK: PRESENT DAY ━━━━━━━━━━━━━━━━━━━━━━━━━

  modern_jacket: {
    cloth: ['#2a2a3a', '#3a3a4a', '#4a4a5a', '#5a5a6a'],
    adds: [],
    desc: 'Modern dark jacket. The present day.',
  },
  priest_vestments_modern: {
    cloth: ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'],
    adds: [
      { type: 'collar', color: '#ffffff', pos: 'neck' },
      { type: 'stole', color: '#800080', pos: 'shoulders_to_waist' },
    ],
    desc: 'Modern clerical black with purple stole.',
  },

  // ━━━ RELIGIOUS VOCATIONS (any era) ━━━━━━━━━━━━━━━━━━━━

  dominican_habit: {
    cloth: ['#e0e0e0', '#f0f0f0', '#ffffff', '#ffffff'],
    adds: [{ type: 'scapular', color: '#1a1a1a', pos: 'over_torso' }, { type: 'hood_down', color: '#ffffff', pos: 'shoulders' }],
    legs: ['#e0e0e0', '#f0f0f0'],
    desc: 'White habit, black scapular. Dominican.',
  },
  jesuit_cassock: {
    cloth: ['#0a0a0a', '#1a1a1a', '#2a2a2a', '#3a3a3a'],
    adds: [{ type: 'collar', color: '#ffffff', pos: 'neck' }, { type: 'sash', color: '#1a1a1a', pos: 'waist' }],
    desc: 'Black cassock. White collar. Jesuit.',
  },
  benedictine_habit: {
    cloth: ['#0a0a0a', '#1a1a1a', '#2a2a2a', '#3a3a3a'],
    adds: [{ type: 'scapular', color: '#0a0a0a', pos: 'over_torso' }, { type: 'belt', color: '#5c4033', pos: 'waist' }],
    desc: 'All black. Benedictine. Ora et Labora.',
  },
  augustinian_habit: {
    cloth: ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'],
    adds: [{ type: 'leather_belt', color: '#654321', pos: 'waist' }, { type: 'heart_emblem', color: '#8b0000', pos: 'chest' }],
    desc: 'Black habit with leather belt. Flaming heart. Augustinian.',
  },
  cistercian_habit: {
    cloth: ['#d4c4a8', '#e4d4b8', '#f0e8d8', '#f8f0e8'],
    adds: [{ type: 'scapular', color: '#d4c4a8', pos: 'over_torso' }],
    desc: 'Undyed white-grey wool. Cistercian simplicity.',
  },

  // ━━━ HOLY / ENDGAME ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  pilgrims_mantle: {
    cloth: ['#5a5080', '#7a70a0', '#9a90c0', '#b0a8d0'],
    adds: [{ type: 'cross_clasp', color: '#c9a959', pos: 'neck' }, { type: 'cape', color: '#5a5080', pos: 'back' }],
    quality_glow: '#c9a959',
    desc: 'Purple-grey mantle. Golden cross clasp.',
  },
  saints_vestment: {
    cloth: ['#c9a959', '#d4b86a', '#e0c87a', '#f0d88a'],
    adds: [{ type: 'stole', color: '#ffffff', pos: 'shoulders_to_waist' }, { type: 'cross_emblem', color: '#ffffff', pos: 'chest' }],
    quality_glow: '#ffd700', glow_radius: 4,
    desc: 'Golden vestment. Given, not earned.',
  },
  marian_blue_mantle: {
    cloth: ['#2a4a8a', '#3a5aaa', '#4a6aca', '#5a7aea'],
    adds: [
      { type: 'star_pattern', color: '#ffd700', pos: 'scattered_body' },
      { type: 'white_lining', color: '#ffffff', pos: 'inner_hem' },
    ],
    quality_glow: '#4169e1', glow_radius: 4,
    desc: 'Blue of the Blessed Virgin. Stars scattered like the sky.',
  },
  transfigured_robe: {
    cloth: ['#e0e8ff', '#eef0ff', '#f8f8ff', '#ffffff'],
    adds: [{ type: 'light_emanation', color: '#ffffff', pos: 'whole_body' }],
    quality_glow: '#ffffff', glow_radius: 8,
    particles: 'gentle_white_motes',
    desc: 'White robes that glow from within. The Transfiguration.',
  },
  robe_of_glory: {
    cloth: ['#ffd700', '#ffe44d', '#fff080', '#ffffa0'],
    adds: [{ type: 'light_emanation', color: '#ffffff', pos: 'whole_body' }],
    quality_glow: '#ffd700', glow_radius: 10,
    particles: 'golden_radiance_constant',
    desc: 'Pure gold light. The robe of the resurrected body. Final garment.',
  },
};


// ═══════════════════════════════════════════════════════════════
// EXPANDED HEADGEAR — 30+ TYPES
// ═══════════════════════════════════════════════════════════════

export const HEADGEAR_VISUALS_COMPLETE = {
  // Japan
  none:              { shape: null },
  sedge_hat:         { shape: 'wide_cone', colors: ['#8b6914', '#a07830'], w: 10, h: 3, dy: -3 },
  straw_field_hat:   { shape: 'wide_flat', colors: ['#c4a870', '#d4b880'], w: 12, h: 2, dy: -3 },
  bandana_red:       { shape: 'headband', colors: ['#8b0000', '#a00020'], w: 6, h: 1, dy: -1 },
  bandana_white:     { shape: 'headband', colors: ['#e0e0e0', '#ffffff'], w: 6, h: 1, dy: -1 },
  samurai_kabuto:    { shape: 'kabuto', colors: ['#2a2a4e', '#4a4a8e'], w: 9, h: 6, dy: -3, crest: '#8b0000', covers_ears: true },
  samurai_jingasa:   { shape: 'wide_cone', colors: ['#1a1a2e', '#2a2a4e'], w: 9, h: 3, dy: -3 },
  shinobi_mask:      { shape: 'face_wrap', colors: ['#0a0a0a', '#1a1a1a'], w: 6, h: 3, dy: 0, covers_face: true },

  // Rome
  roman_galea:       { shape: 'galea', colors: ['#808098', '#a0a0b8'], w: 8, h: 5, dy: -3, crest: '#8b0000', crest_type: 'plume' },
  laurel_wreath:     { shape: 'wreath', colors: ['#006400', '#008000'], w: 7, h: 2, dy: -2 },
  slave_headcloth:   { shape: 'headband', colors: ['#8a7a60', '#9a8a70'], w: 6, h: 1, dy: -1 },

  // Desert
  desert_headwrap:   { shape: 'headwrap', colors: ['#d4b880', '#e4c890'], w: 7, h: 4, dy: -2 },
  coptic_cap:        { shape: 'skullcap', colors: ['#ffffff', '#f5f0e8'], w: 5, h: 2, dy: -1 },
  monks_tonsure:     { shape: 'tonsure_mark', colors: ['#d4a574'], w: 4, h: 1, dy: -1 },
  bishops_mitre:     { shape: 'mitre', colors: ['#ffd700', '#ffe44d'], w: 5, h: 6, dy: -4 },

  // Crusades
  crusader_helm:     { shape: 'great_helm', colors: ['#808098', '#a0a0b8'], w: 8, h: 7, dy: -3, cross_slit: '#1a1a1a', covers_ears: true },
  crusader_coif:     { shape: 'coif', colors: ['#808098', '#9898b0'], w: 7, h: 5, dy: -2, covers_ears: true },
  nasal_helm:        { shape: 'nasal_helm', colors: ['#808098', '#a0a0b8'], w: 7, h: 5, dy: -3, nasal: '#6a6a7a' },
  turban_white:      { shape: 'turban', colors: ['#f5f0e8', '#ffffff'], w: 7, h: 4, dy: -2 },
  turban_green:      { shape: 'turban', colors: ['#006400', '#008000'], w: 7, h: 4, dy: -2 },

  // Mongol
  mongol_fur_hat:    { shape: 'fur_hat', colors: ['#654321', '#8b6914'], w: 7, h: 4, dy: -2, fur_rim: '#4a3a2a' },
  polish_kettle_helm:{ shape: 'kettle', colors: ['#808098', '#a0a0b8'], w: 8, h: 4, dy: -3 },
  winged_hussar_helm:{ shape: 'winged', colors: ['#808098', '#a0a0b8'], w: 10, h: 6, dy: -4, wings: '#ffffff' },

  // Japan 2
  kakure_towel:      { shape: 'headband', colors: ['#5c4d3c', '#7a6852'], w: 6, h: 1, dy: -1 },

  // Lepanto
  morion_helm:       { shape: 'morion', colors: ['#808098', '#a0a0b8'], w: 8, h: 5, dy: -3, comb: '#808098' },
  ottoman_turban:    { shape: 'turban', colors: ['#ffffff', '#f5f0e8'], w: 8, h: 5, dy: -2, gem: '#8b0000' },
  venetian_cap:      { shape: 'flat_cap', colors: ['#600010', '#800020'], w: 6, h: 2, dy: -1 },

  // France
  tricorn:           { shape: 'tricorn', colors: ['#1a1a3d', '#2a2a5d'], w: 9, h: 4, dy: -3, cockade: ['#0000ff', '#ffffff', '#ff0000'] },
  liberty_cap:       { shape: 'phrygian', colors: ['#8b0000', '#a02020'], w: 6, h: 4, dy: -2 },
  nuns_wimple:       { shape: 'wimple', colors: ['#ffffff', '#f5f0e8'], w: 8, h: 5, dy: -2, covers_ears: true },

  // WWII
  camp_cap:          { shape: 'flat_cap', colors: ['#4a4a5a', '#5a5a6a'], w: 6, h: 2, dy: -1, stripes: true },
  resistance_beret:  { shape: 'beret', colors: ['#2a2a2a', '#3a3a3a'], w: 6, h: 2, dy: -1 },
  stahlhelm:         { shape: 'stahlhelm', colors: ['#3a4a3a', '#4a5a4a'], w: 8, h: 5, dy: -3, covers_ears: true },

  // Holy
  halo_faint:        { shape: 'halo_ring', colors: ['#c9a959', '#d4b86a'], w: 8, h: 2, dy: -5, glow: true, glow_radius: 2, opacity: 0.4 },
  halo_bright:       { shape: 'halo_ring', colors: ['#ffd700', '#ffe44d'], w: 8, h: 2, dy: -5, glow: true, glow_radius: 4, opacity: 0.7 },
  halo_blazing:      { shape: 'halo_ring', colors: ['#ffffff', '#ffffa0'], w: 10, h: 3, dy: -6, glow: true, glow_radius: 6, opacity: 1.0, particles: 'holy_motes' },
  crown_of_thorns:   { shape: 'crown_thorns', colors: ['#5c4033', '#7a5c40'], w: 7, h: 3, dy: -2, blood_spots: '#8b0000' },
  crown_of_stars:    { shape: 'crown_stars', colors: ['#ffd700', '#ffffff'], w: 9, h: 4, dy: -4, star_count: 12, glow: true, glow_radius: 5 },
};


// ═══════════════════════════════════════════════════════════════
// ERA-SPECIFIC COLOR PALETTES
// ═══════════════════════════════════════════════════════════════

/**
 * Each era has a dominant color palette that affects ambient light,
 * UI tinting, and the "feel" of equipment found in that era.
 */
export const ERA_COLOR_PALETTES = {
  'book-00': {
    name: 'Japan — Autumn',
    primary: '#8b6914',    // Warm gold-brown
    secondary: '#1a1a2e',  // Deep indigo
    accent: '#8b0000',     // Blood red
    earth: '#5c4033',      // Wood brown
    sky: '#4a6a8a',        // Misty blue
    sacred: '#c9a959',     // Temple gold
  },
  'book-01': {
    name: 'Rome — Imperial',
    primary: '#800020',    // Tyrian red
    secondary: '#c9a959',  // Roman gold
    accent: '#4b0082',     // Imperial purple
    earth: '#c4a870',      // Sandstone
    sky: '#4169e1',        // Mediterranean blue
    sacred: '#ffd700',     // Catacomb candlelight
  },
  'book-02': {
    name: 'Egypt — Desert Sun',
    primary: '#d4b880',    // Sand
    secondary: '#c9a959',  // Gold
    accent: '#006400',     // Nile green
    earth: '#a08860',      // Desert rock
    sky: '#87ceeb',        // Clear desert sky
    sacred: '#4169e1',     // Coptic blue
  },
  'book-03': {
    name: 'Acre — Blood and Stone',
    primary: '#808098',    // Steel
    secondary: '#8b0000',  // Crusader red
    accent: '#ffffff',     // Surcoat white
    earth: '#c4a870',      // Sandstone
    sky: '#4a6a8a',        // Mediterranean haze
    sacred: '#ffd700',     // Relic gold
  },
  'book-04': {
    name: 'Poland — Frozen Steppe',
    primary: '#808098',    // Iron
    secondary: '#ffffff',  // Snow
    accent: '#8b0000',     // Polish red
    earth: '#5a5a46',      // Frozen ground
    sky: '#b0b0c0',        // Overcast grey
    sacred: '#ffd700',     // Candlelight against grey
  },
  'book-05': {
    name: 'Japan — Hidden',
    primary: '#1a1a2e',    // Night indigo
    secondary: '#5c4d3c',  // Hidden earth
    accent: '#c9a959',     // Secret gold
    earth: '#3d3528',      // Dark soil
    sky: '#2a2a4e',        // Night sky
    sacred: '#c9a959',     // Concealed cross
  },
  'book-06': {
    name: 'Lepanto — Sea and Fire',
    primary: '#4169e1',    // Sea blue
    secondary: '#8b0000',  // Blood red
    accent: '#ff4500',     // Greek fire
    earth: '#5c4033',      // Ship wood
    sky: '#2a4a8a',        // Deep sea
    sacred: '#ffffff',     // Rosary white
  },
  'book-07': {
    name: 'France — Revolution',
    primary: '#1a1a5a',    // Revolutionary blue
    secondary: '#8b0000',  // Blood red
    accent: '#ffffff',     // Tricolor white
    earth: '#5a5a5a',      // Cobblestone
    sky: '#808090',        // Smoke-grey Paris
    sacred: '#800080',     // Liturgical purple (hidden)
  },
  'book-08': {
    name: 'Poland — Ash and Shadow',
    primary: '#3a3a3a',    // Ash grey
    secondary: '#4a4a5a',  // Camp stripe blue
    accent: '#ffffff',     // Resistance white
    earth: '#2a2a2a',      // Dark ground
    sky: '#5a5a5a',        // Overcast always
    sacred: '#ffd700',     // Kolbe's hidden light
  },
  'final_book': {
    name: 'Present — Light Returns',
    primary: '#4a5a6a',    // Modern steel blue
    secondary: '#ffd700',  // Returning gold
    accent: '#ffffff',     // Pure light
    earth: '#6a7a8a',      // Modern concrete
    sky: '#87ceeb',        // Clear sky
    sacred: '#ffffff',     // Full radiance
  },
};
