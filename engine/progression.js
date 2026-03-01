/**
 * SAMURAI USAGI — LEVEL 100 PROGRESSION & DIVINE RECYCLING (NG+)
 * ================================================================
 *
 * TWO SYSTEMS IN ONE MODULE:
 *
 * 1. LEVEL 100 PROGRESSION
 *    - XP curve from 1-100 with three phases: Novice (1-30), Veteran (31-60), Saint (61-100)
 *    - Stat growth with sweet spots at 5-8, 15-20, 35-40, 55-60, 75-80, and a final surge 90-100
 *    - 10 Prestige Tiers with titles, passive bonuses, and visual changes
 *    - Enemy auto-scaling formula so every book remains challenging
 *    - Milestone rewards at every 10th level
 *
 * 2. DIVINE RECYCLING (NEW GAME+)
 *    - "God recycles you" — Pilgrim → Disciple → Martyr → Saint → Apostle
 *    - 5 difficulty tiers, each harder than the last
 *    - KEPT: blessings, devotion graces, skill tree, virtue progress, named weapon bonds,
 *            Accuser encounter count, fumi-e count, secret path progress
 *    - RESET: level (compressed to 1 but with stat echoes), gold, consumables, story flags
 *    - STAT ECHOES: 10-15% of previous cycle's stats carry forward as "memory"
 *    - New content unlocks per cycle: new Accuser dialogues, hidden NPCs, secret areas
 *
 * Design Philosophy:
 *   The game rewards FAITHFULNESS, not grinding. A level 40 player with high virtues
 *   and blessed equipment is stronger than a level 60 player who skipped prayers.
 *   Divine Recycling rewards completing the story, not farming XP.
 */


// ═══════════════════════════════════════════════════════════════
// LEVEL 100 XP CURVE
// ═══════════════════════════════════════════════════════════════

/**
 * Generate the full 100-level XP table.
 * Three phases with different growth rates:
 *   Phase 1 (1-30): Novice — gentle curve, quick early levels
 *   Phase 2 (31-60): Veteran — steeper, book transitions feel significant
 *   Phase 3 (61-100): Saint — demanding but rewarding, every level is an achievement
 */
export function generateXPTable() {
  const table = [0]; // Level 0 placeholder

  for (let level = 1; level <= 100; level++) {
    let xp;
    if (level <= 30) {
      // Phase 1: Novice — base * level^1.65
      xp = Math.floor(20 * Math.pow(level, 1.65));
    } else if (level <= 60) {
      // Phase 2: Veteran — steeper curve, offset from phase 1 endpoint
      const adjusted = level - 30;
      const phase1Cap = Math.floor(20 * Math.pow(30, 1.65));
      xp = phase1Cap + Math.floor(45 * Math.pow(adjusted, 1.75));
    } else {
      // Phase 3: Saint — demanding, each level feels earned
      const adjusted = level - 60;
      const phase1Cap = Math.floor(20 * Math.pow(30, 1.65));
      const phase2Cap = phase1Cap + Math.floor(45 * Math.pow(30, 1.75));
      xp = phase2Cap + Math.floor(80 * Math.pow(adjusted, 1.85));
    }
    table.push(xp);
  }

  return table;
}


// ═══════════════════════════════════════════════════════════════
// STAT GROWTH TABLE (100 levels)
// ═══════════════════════════════════════════════════════════════

/**
 * Per-level stat gains with sweet spots and breakthrough levels.
 * Sweet spots: 5-8, 15-20, 35-40, 55-60, 75-80, 90-100
 * Breakthroughs (every 10th level): significantly higher gains
 * Plateau periods between sweet spots create classic JRPG pacing
 */
export function generateStatGrowth() {
  const stats = { hp: [], mp: [], atk: [], def: [], spd: [], spr: [] };

  for (let level = 0; level <= 100; level++) {
    if (level === 0) {
      // Base (level 0 = no gain, placeholder)
      stats.hp.push(0); stats.mp.push(0);
      stats.atk.push(0); stats.def.push(0);
      stats.spd.push(0); stats.spr.push(0);
      continue;
    }

    const isMilestone = level % 10 === 0;
    const isSweet = _isInSweetSpot(level);
    const phase = level <= 30 ? 1 : level <= 60 ? 2 : 3;

    // Base gains per phase
    let hp, mp, atk, def, spd, spr;

    if (phase === 1) {
      hp = isSweet ? 8 : 5;   mp = isSweet ? 3 : 2;
      atk = isSweet ? 2 : 1;  def = isSweet ? 2 : 1;
      spd = isSweet ? 1 : 1;  spr = isSweet ? 2 : 1;
    } else if (phase === 2) {
      hp = isSweet ? 10 : 6;  mp = isSweet ? 4 : 2;
      atk = isSweet ? 3 : 1;  def = isSweet ? 3 : 1;
      spd = isSweet ? 2 : 1;  spr = isSweet ? 3 : 2;
    } else {
      // Phase 3: Saint — growth slows but milestones are massive
      hp = isSweet ? 12 : 4;  mp = isSweet ? 5 : 2;
      atk = isSweet ? 3 : 1;  def = isSweet ? 3 : 1;
      spd = isSweet ? 2 : 0;  spr = isSweet ? 4 : 2;
    }

    // Milestone bonuses (every 10th level is a breakthrough)
    if (isMilestone) {
      hp += 15; mp += 8; atk += 3; def += 3; spd += 2; spr += 3;
    }

    // Level 100 — the final level is extraordinary
    if (level === 100) {
      hp += 25; mp += 15; atk += 5; def += 5; spd += 3; spr += 10;
    }

    stats.hp.push(hp); stats.mp.push(mp);
    stats.atk.push(atk); stats.def.push(def);
    stats.spd.push(spd); stats.spr.push(spr);
  }

  return stats;
}

function _isInSweetSpot(level) {
  const spots = [[5,8],[15,20],[35,40],[55,60],[75,80],[90,100]];
  return spots.some(([lo, hi]) => level >= lo && level <= hi);
}


// ═══════════════════════════════════════════════════════════════
// EXPECTED STAT TOTALS AT KEY LEVELS
// ═══════════════════════════════════════════════════════════════

/**
 * For reference / balance tuning. These are the approximate total stats
 * (base + all level-up gains, NOT including equipment, blessings, virtues).
 *
 * Level  1: HP  60 | MP 15 | ATK  5 | DEF  4 | SPD 5 | SPR  3
 * Level 10: HP 125 | MP 35 | ATK 15 | DEF 13 | SPD 12| SPR 14
 * Level 20: HP 210 | MP 60 | ATK 28 | DEF 25 | SPD 20| SPR 28
 * Level 30: HP 310 | MP 90 | ATK 42 | DEF 38 | SPD 28| SPR 44
 * Level 40: HP 440 | MP 125| ATK 56 | DEF 52 | SPD 37| SPR 62
 * Level 50: HP 570 | MP 160| ATK 68 | DEF 64 | SPD 45| SPR 78
 * Level 60: HP 730 | MP 205| ATK 85 | DEF 80 | SPD 55| SPR 100
 * Level 70: HP 850 | MP 240| ATK 96 | DEF 92 | SPD 60| SPR 118
 * Level 80: HP 1010| MP 290| ATK 112| DEF 107| SPD 70| SPR 142
 * Level 90: HP 1130| MP 325| ATK 124| DEF 119| SPD 75| SPR 160
 * Level 100:HP 1380| MP 400| ATK 148| DEF 142| SPD 88| SPR 200
 *
 * Note: SPR is intentionally the highest scaling stat. This is a game about faith.
 * A prayerful level 60 character with high virtues will outperform a faithless level 80.
 */


// ═══════════════════════════════════════════════════════════════
// PRESTIGE TIERS
// ═══════════════════════════════════════════════════════════════

/**
 * Every 10 levels unlocks a prestige tier with:
 * - A title (displayed next to Usagi's name)
 * - A passive bonus
 * - A visual change to Usagi's sprite
 * - A milestone reward (item, miracle, or permanent stat boost)
 */
export const PRESTIGE_TIERS = [
  {
    tier: 1,
    level: 10,
    title: 'Novice',
    subtitle: 'The journey of a thousand miles begins.',
    passive: { hp_bonus_pct: 5 },
    visual: 'sprite_outline_faint_white',
    reward: { type: 'stat_boost', stat: 'spr', amount: 2, description: 'Spiritual awareness deepens.' }
  },
  {
    tier: 2,
    level: 20,
    title: 'Pilgrim',
    subtitle: 'You walk the road. The road walks you.',
    passive: { xp_bonus_pct: 5, mp_regen_battle: 1 },
    visual: 'sprite_outline_steady_white',
    reward: { type: 'miracle_unlock', miracleId: 'pilgrims_prayer', description: 'The Pilgrim\'s Prayer: heal 25% HP, usable out of battle.' }
  },
  {
    tier: 3,
    level: 30,
    title: 'Disciple',
    subtitle: 'You have learned to listen.',
    passive: { virtue_gain_bonus: 0.1, holy_damage_pct: 5 },
    visual: 'cross_glow_faint',
    reward: { type: 'skill_point', amount: 3, description: '3 bonus Skill Points for mastering the basics.' }
  },
  {
    tier: 4,
    level: 40,
    title: 'Penitent',
    subtitle: 'The cross you carry has made you stronger.',
    passive: { damage_reduction_pct: 5, status_resist_pct: 5 },
    visual: 'sprite_scars_glow',
    reward: { type: 'stat_boost', stat: 'def', amount: 5, description: 'Scarred but unbroken.' }
  },
  {
    tier: 5,
    level: 50,
    title: 'Confessor',
    subtitle: 'You speak truth in the face of the lie.',
    passive: { accuser_damage_reduction: 0.1, miracle_power_pct: 10 },
    visual: 'holy_aura_dim',
    reward: { type: 'miracle_unlock', miracleId: 'confessors_truth', description: 'Confessor\'s Truth: reveal all enemy weaknesses and remove one immunity.' }
  },
  {
    tier: 6,
    level: 60,
    title: 'Witness',
    subtitle: 'Your presence changes the battlefield.',
    passive: { ally_stat_aura: { atk: 2, def: 2, spr: 3 } },
    visual: 'holy_aura_steady',
    reward: { type: 'skill_point', amount: 5, description: '5 bonus Skill Points. You have witnessed enough to teach others.' }
  },
  {
    tier: 7,
    level: 70,
    title: 'Servant',
    subtitle: 'The greatest among you shall be your servant.',
    passive: { healing_given_pct: 15, healing_received_pct: 10 },
    visual: 'sprite_halo_faint',
    reward: { type: 'stat_boost', stat: 'spr', amount: 8, description: 'Servanthood is strength.' }
  },
  {
    tier: 8,
    level: 80,
    title: 'Apostle',
    subtitle: 'Sent forth. The word made action.',
    passive: { all_damage_pct: 10, all_resist_pct: 10 },
    visual: 'sprite_halo_steady_wings_faint',
    reward: { type: 'miracle_unlock', miracleId: 'apostolic_authority', description: 'Apostolic Authority: command one non-boss enemy to flee. Works on spiritual enemies.' }
  },
  {
    tier: 9,
    level: 90,
    title: 'Martyr',
    subtitle: 'You have died to yourself. What remains is indestructible.',
    passive: { death_save_chance: 0.15, xp_bonus_pct: 10, virtue_gain_bonus: 0.2 },
    visual: 'sprite_glowing_wounds_stigmata',
    reward: { type: 'stat_boost', stat: 'all', amount: 5, description: '+5 to ALL stats. The body is transfigured.' }
  },
  {
    tier: 10,
    level: 100,
    title: 'Saint',
    subtitle: 'Not by your own power. Never by your own power.',
    passive: {
      all_damage_pct: 15,
      all_resist_pct: 15,
      miracle_cost_reduction_pct: 25,
      holy_damage_pct: 20,
      death_save_chance: 0.25,
      accuser_damage_reduction: 0.2
    },
    visual: 'full_transfiguration_glow_wings_halo_stigmata',
    reward: {
      type: 'ultimate_reward',
      description: 'The Saint\'s Crown: all virtues +2, all miracle costs -25%, the Accuser\'s dialogue changes permanently to acknowledge your holiness. The Pilgrim\'s Blade (or your devoted weapon) evolves to its final legendary form.'
    }
  },
];


// ═══════════════════════════════════════════════════════════════
// MILESTONE REWARDS (every 10 levels, non-prestige bonuses)
// ═══════════════════════════════════════════════════════════════

export const MILESTONE_REWARDS = {
  5:  { type: 'skill_point', amount: 1, message: 'Your hands remember the blade.' },
  10: { type: 'prestige', tier: 1 },
  15: { type: 'skill_point', amount: 1, message: 'Muscle and prayer grow together.' },
  20: { type: 'prestige', tier: 2 },
  25: { type: 'item', itemId: 'holy_water_vial', quantity: 3, message: 'A gift appears in your pack. Grace is not earned.' },
  30: { type: 'prestige', tier: 3 },
  35: { type: 'skill_point', amount: 2, message: 'The road teaches what no master can.' },
  40: { type: 'prestige', tier: 4 },
  45: { type: 'stat_boost', stat: 'spr', amount: 3, message: 'Prayer deepens without effort. The Spirit moves.' },
  50: { type: 'prestige', tier: 5 },
  55: { type: 'skill_point', amount: 2, message: 'You see patterns in battle that others miss.' },
  60: { type: 'prestige', tier: 6 },
  65: { type: 'item', itemId: 'chrism_oil', quantity: 1, message: 'Sacred Chrism materializes in your pack. "For the journey ahead."' },
  70: { type: 'prestige', tier: 7 },
  75: { type: 'skill_point', amount: 3, message: 'Mastery is not perfection. It is faithfulness.' },
  80: { type: 'prestige', tier: 8 },
  85: { type: 'stat_boost', stat: 'all', amount: 2, message: 'The body and spirit move as one.' },
  90: { type: 'prestige', tier: 9 },
  95: { type: 'skill_point', amount: 3, message: 'Almost there. But "there" was never the point.' },
  100: { type: 'prestige', tier: 10 },
};


// ═══════════════════════════════════════════════════════════════
// ENEMY LEVEL SCALING
// ═══════════════════════════════════════════════════════════════

/**
 * Enemies scale with player level AND difficulty AND NG+ cycle.
 * The formula ensures every book remains challenging regardless of level.
 *
 * Base enemy stats come from the JSON data. These are then multiplied:
 *   final_stat = base * level_scalar * difficulty_mult * cycle_mult * area_mult
 *
 * level_scalar: soft scaling based on player level vs enemy base level
 *   - If player is near enemy's intended level: 1.0×
 *   - If player is 10+ levels above: enemies scale up (soft cap, not full match)
 *   - If player is below: no scaling down (the game should be hard when underleveled)
 *
 * cycle_mult: 1.0 on first playthrough, increases per NG+ cycle
 * area_mult: per-book multiplier (later books have inherently stronger enemies)
 */
export function scaleEnemy(baseStats, baseLevel, playerLevel, difficulty, ngPlusCycle = 0) {
  // Level scalar: soft upscaling for overleveled players
  const levelDiff = playerLevel - baseLevel;
  let levelScalar = 1.0;
  if (levelDiff > 0) {
    // Scale up enemies by 3% per level above, soft-capped at 2.5×
    levelScalar = Math.min(2.5, 1.0 + (levelDiff * 0.03));
  }

  // Difficulty multipliers (from balance.json structure)
  const diffMults = {
    pilgrim:  { hp: 0.7, atk: 0.7, def: 0.8, spd: 0.9, spr: 0.8 },
    disciple: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, spr: 1.0 },
    martyr:   { hp: 1.4, atk: 1.3, def: 1.2, spd: 1.1, spr: 1.2 },
    saint:    { hp: 1.8, atk: 1.6, def: 1.4, spd: 1.2, spr: 1.5 },
    apostle:  { hp: 2.2, atk: 2.0, def: 1.7, spd: 1.3, spr: 1.8 },
  };
  const dMult = diffMults[difficulty] || diffMults.disciple;

  // NG+ cycle multiplier: +15% per cycle, compounding
  const cycleMult = Math.pow(1.15, ngPlusCycle);

  // Apply all multipliers
  const scaled = {};
  for (const [stat, base] of Object.entries(baseStats)) {
    const dM = dMult[stat] || 1.0;
    scaled[stat] = Math.round(base * levelScalar * dM * cycleMult);
  }

  // Ensure minimums
  scaled.hp = Math.max(scaled.hp || 1, 1);
  scaled.atk = Math.max(scaled.atk || 1, 1);

  return scaled;
}


// ═══════════════════════════════════════════════════════════════
// XP REWARD SCALING
// ═══════════════════════════════════════════════════════════════

/**
 * XP gained from enemies scales with level difference.
 * Fighting enemies way below your level yields diminishing returns.
 * Fighting above your level yields bonus XP.
 */
export function calculateXPReward(baseXP, enemyLevel, playerLevel, difficulty, ngPlusCycle = 0) {
  const diff = enemyLevel - playerLevel;

  let multiplier;
  if (diff >= 10) multiplier = 2.0;       // Way above → double XP
  else if (diff >= 5) multiplier = 1.5;    // Above → 50% bonus
  else if (diff >= 0) multiplier = 1.0;    // At level → normal
  else if (diff >= -5) multiplier = 0.75;  // Below → 75%
  else if (diff >= -10) multiplier = 0.5;  // Way below → half
  else multiplier = 0.25;                   // Trivial → quarter

  // Difficulty XP multiplier
  const diffXPMult = {
    pilgrim: 1.5, disciple: 1.0, martyr: 0.85, saint: 0.75, apostle: 0.65,
  };
  const dMult = diffXPMult[difficulty] || 1.0;

  // NG+ bonus: +10% XP per cycle (compensates for harder enemies)
  const cycleMult = 1.0 + (ngPlusCycle * 0.1);

  return Math.max(1, Math.round(baseXP * multiplier * dMult * cycleMult));
}


// ═══════════════════════════════════════════════════════════════
// LEVEL-UP PROCESSOR
// ═══════════════════════════════════════════════════════════════

export class LevelUpProcessor {
  constructor(xpTable, statGrowth) {
    this.xpTable = xpTable || generateXPTable();
    this.statGrowth = statGrowth || generateStatGrowth();
    this.maxLevel = 100;
  }

  /**
   * XP needed to reach the next level from current.
   */
  xpToNext(currentLevel) {
    if (currentLevel >= this.maxLevel) return Infinity;
    return this.xpTable[currentLevel + 1] || Infinity;
  }

  /**
   * Total XP needed from 0 to reach a given level.
   */
  totalXPForLevel(level) {
    let total = 0;
    for (let i = 1; i <= Math.min(level, this.maxLevel); i++) {
      total += this.xpTable[i] || 0;
    }
    return total;
  }

  /**
   * Process XP gain. Returns array of level-up events.
   * Each event: { level, statGains: {hp, mp, atk, def, spd, spr}, milestone?, prestige? }
   */
  processXP(player, xpGained) {
    player.xp = (player.xp || 0) + xpGained;
    const levelUps = [];

    while (player.level < this.maxLevel) {
      const needed = this.xpToNext(player.level);
      if (player.xp < needed) break;

      player.xp -= needed;
      player.level++;

      // Apply stat gains
      const gains = {};
      for (const stat of ['hp', 'mp', 'atk', 'def', 'spd', 'spr']) {
        const gain = this.statGrowth[stat]?.[player.level] || 0;
        gains[stat] = gain;
        if (stat === 'hp') player.maxHp = (player.maxHp || 60) + gain;
        else if (stat === 'mp') player.maxMp = (player.maxMp || 15) + gain;
        else player[stat] = (player[stat] || 0) + gain;
      }

      // Full heal on level up (classic JRPG tradition)
      player.hp = player.maxHp;
      player.mp = player.maxMp;

      const event = { level: player.level, statGains: gains };

      // Check for milestone
      const milestone = MILESTONE_REWARDS[player.level];
      if (milestone) {
        event.milestone = milestone;
      }

      // Check for prestige
      const prestige = PRESTIGE_TIERS.find(t => t.level === player.level);
      if (prestige) {
        event.prestige = prestige;
        player.title = prestige.title;
      }

      // Skill point every 3 levels (in addition to milestones)
      if (player.level % 3 === 0) {
        event.skillPointGained = true;
      }

      levelUps.push(event);
    }

    return levelUps;
  }

  /**
   * Get all currently active prestige passives for a player.
   */
  getPrestigePassives(playerLevel) {
    const passives = {};
    for (const tier of PRESTIGE_TIERS) {
      if (playerLevel >= tier.level) {
        for (const [key, val] of Object.entries(tier.passive)) {
          if (typeof val === 'number') {
            passives[key] = (passives[key] || 0) + val;
          } else if (typeof val === 'object') {
            passives[key] = passives[key] || {};
            for (const [k, v] of Object.entries(val)) {
              passives[key][k] = (passives[key][k] || 0) + v;
            }
          }
        }
      }
    }
    return passives;
  }

  /**
   * Get the current prestige tier for a level.
   */
  getCurrentTier(playerLevel) {
    let current = null;
    for (const tier of PRESTIGE_TIERS) {
      if (playerLevel >= tier.level) current = tier;
    }
    return current;
  }
}


// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
//
// DIVINE RECYCLING — NEW GAME PLUS
//
// "God does not waste a single prayer. Every step of your
//  journey is remembered. Now walk the road again — harder,
//  deeper, truer."
//
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────
// DIFFICULTY PROGRESSION CHAIN
// ─────────────────────────────────────────────────────────────

export const DIFFICULTY_CHAIN = [
  {
    id: 'pilgrim',
    name: 'Pilgrim',
    subtitle: 'Walk in peace',
    description: 'The story unfolds gently. Enemies are merciful. Resources are plentiful. For those who came for the journey.',
    cycle: 0,
    next: 'disciple',
    enemy_hp_mult: 0.7,
    enemy_atk_mult: 0.7,
    enemy_def_mult: 0.8,
    enemy_spd_mult: 0.9,
    xp_mult: 1.5,
    gold_mult: 1.5,
    item_drop_bonus: 0.2,
    encounter_rate_mult: 0.7,
    ai_aggression: 0.6,
    player_heal_bonus: 1.3,
    virtue_gain_bonus: 1.2,
    death_penalty: 'none',
    revive_on_defeat: true,
  },
  {
    id: 'disciple',
    name: 'Disciple',
    subtitle: 'Take up your cross',
    description: 'The intended experience. Enemies test your resolve. Prayer is not optional — it is survival.',
    cycle: 1,
    next: 'martyr',
    enemy_hp_mult: 1.0,
    enemy_atk_mult: 1.0,
    enemy_def_mult: 1.0,
    enemy_spd_mult: 1.0,
    xp_mult: 1.0,
    gold_mult: 1.0,
    item_drop_bonus: 0.0,
    encounter_rate_mult: 1.0,
    ai_aggression: 1.0,
    player_heal_bonus: 1.0,
    virtue_gain_bonus: 1.0,
    death_penalty: 'gold_loss_10pct',
    revive_on_defeat: false,
  },
  {
    id: 'martyr',
    name: 'Martyr',
    subtitle: 'Blessed are the persecuted',
    description: 'Enemies are relentless. Resources are scarce. Spiritual attacks hit harder. Only the faithful will survive.',
    cycle: 2,
    next: 'saint',
    enemy_hp_mult: 1.4,
    enemy_atk_mult: 1.3,
    enemy_def_mult: 1.2,
    enemy_spd_mult: 1.1,
    xp_mult: 0.85,
    gold_mult: 0.8,
    item_drop_bonus: -0.1,
    encounter_rate_mult: 1.2,
    ai_aggression: 1.4,
    player_heal_bonus: 0.85,
    virtue_gain_bonus: 0.9,
    death_penalty: 'gold_loss_25pct_item_loss',
    revive_on_defeat: false,
    new_content: ['accuser_extended_dialogues', 'hidden_martyrdom_quests', 'secret_catacombs_area'],
  },
  {
    id: 'saint',
    name: 'Saint',
    subtitle: 'Through the fire',
    description: 'The game fights back. Enemies use advanced tactics. Bosses have new phases. The Accuser remembers everything.',
    cycle: 3,
    next: 'apostle',
    enemy_hp_mult: 1.8,
    enemy_atk_mult: 1.6,
    enemy_def_mult: 1.4,
    enemy_spd_mult: 1.2,
    xp_mult: 0.75,
    gold_mult: 0.65,
    item_drop_bonus: -0.15,
    encounter_rate_mult: 1.3,
    ai_aggression: 1.8,
    player_heal_bonus: 0.75,
    virtue_gain_bonus: 0.8,
    death_penalty: 'gold_loss_50pct_item_loss_xp_loss',
    revive_on_defeat: false,
    new_content: ['accuser_true_form_early', 'boss_extra_phases', 'hidden_saint_npcs', 'secret_relics'],
    enemy_new_abilities: true,
  },
  {
    id: 'apostle',
    name: 'Apostle',
    subtitle: 'Sent forth into the fire',
    description: 'The final cycle. No mercy. No safety net. Every enemy is at full power. The Accuser appears in every book with new attacks. One death is permanent. But the reward is eternal.',
    cycle: 4,
    next: null, // Final difficulty — completing this unlocks the true ending
    enemy_hp_mult: 2.2,
    enemy_atk_mult: 2.0,
    enemy_def_mult: 1.7,
    enemy_spd_mult: 1.3,
    xp_mult: 0.65,
    gold_mult: 0.5,
    item_drop_bonus: -0.2,
    encounter_rate_mult: 1.5,
    ai_aggression: 2.0,
    player_heal_bonus: 0.65,
    virtue_gain_bonus: 0.7,
    death_penalty: 'permadeath_per_book',
    revive_on_defeat: false,
    new_content: ['true_ending', 'accuser_final_forms', 'apostle_exclusive_miracles', 'all_secret_areas'],
    enemy_new_abilities: true,
    boss_extra_phases: true,
    accuser_remembers_all_cycles: true,
  },
];


// ─────────────────────────────────────────────────────────────
// WHAT GETS KEPT VS RESET
// ─────────────────────────────────────────────────────────────

/**
 * When Divine Recycling triggers, the game calculates what carries forward.
 * This is NOT a simple NG+ where you keep everything.
 * God "recycles" — transforms, refines, compresses.
 * You are reborn, not replayed.
 */
export const RECYCLING_RULES = {

  // ─── FULLY KEPT (100%) ──────────────────────────────────
  kept: {
    blessings: 'All blessed items retain their blessing status and blessing tree progress.',
    devotion_graces: 'All devotion grace progress on items (100-battle, 250-battle, 500-battle tiers). This is the BIG reward for faithful players.',
    skill_tree: 'All unlocked weapon and blessing skills remain unlocked. Skill points already spent are preserved.',
    named_weapon_bonds: 'If a weapon has achieved Devotion Grace status, it transfers to the new cycle. Its description notes: "It remembers another life."',
    accuser_data: 'The Accuser encounter count, fumi-e count (stepped on vs refused), pacifist kill count. The Accuser uses this in dialogue.',
    secret_path_flags: 'Miko\'s Flower (if kept), Obaa-chan survival flag, mercy flags. These unlock variant scenes in future cycles.',
    bestiary: 'All discovered enemy data. The game remembers what you\'ve faced.',
    lore_items_read: 'All lore items that have been read. The knowledge persists.',
    miracle_list: 'All learned miracles remain available.',
    prestige_title: 'Your highest prestige title is preserved and displayed.',
    total_playtime: 'Cumulative across all cycles.',
    cycle_count: 'The number of times you\'ve been recycled.',
  },

  // ─── PARTIALLY KEPT (Stat Echoes) ──────────────────────
  echoed: {
    stats: {
      description: 'Stats are reset to level 1 base, but "stat echoes" carry forward.',
      formula: 'echo = previous_total_stat * echo_rate',
      echo_rates: {
        pilgrim_to_disciple: 0.10,  // 10% of previous stats as bonus
        disciple_to_martyr:  0.12,  // 12%
        martyr_to_saint:     0.13,  // 13%
        saint_to_apostle:    0.15,  // 15%
      },
      cap: 'Stat echoes are capped at 50% of the base stat at level 30. Prevents runaway scaling.',
      application: 'Stat echoes are applied as a flat bonus at level 1 and do not grow with levels.',
      display: 'Echoed stats show in the status screen as "(+X echo)" in a faint golden color.',
    },
    virtues: {
      description: 'Virtues are partially preserved.',
      formula: 'new_virtue = previous_virtue * virtue_echo_rate',
      virtue_echo_rate: 0.50,  // Keep 50% of virtue levels
      min: 0,
      max: 5, // Virtues echo up to 5.0 max (even if they were 10)
      note: 'This means a player who maxed all virtues (10) enters the next cycle with 5.0 in each. Significant but not overpowering.',
    },
  },

  // ─── FULLY RESET ────────────────────────────────────────
  reset: {
    level: 'Reset to 1. You are reborn.',
    xp: 'Reset to 0.',
    gold: 'Reset to 0. "Blessed are the poor in spirit."',
    consumables: 'All consumable items are removed. You start with 3 Rice Balls and 1 Holy Water.',
    equipment: 'All equipment is removed EXCEPT devotion-graced items. You start in Farmer\'s Kosode with a Farmer\'s Sickle. Or bare hands if Franciscan.',
    story_flags: 'All story progress flags reset. The narrative begins anew — but with different dialogue if the Accuser remembers you.',
    area_progress: 'All areas reset. Maps are re-fogged.',
    npc_relationships: 'Reset. But NPCs have variant dialogue if they "sense" something about you (cycle_count > 0 flag).',
    dialogues_seen: 'Reset. New dialogue options appear based on cycle count.',
  },

  // ─── NEW IN EACH CYCLE ──────────────────────────────────
  new_per_cycle: {
    accuser_dialogue: 'The Accuser gains new lines based on what happened in previous cycles. If you stepped on the fumi-e, he remembers. If you showed mercy to Hideki, he is puzzled.',
    npc_variants: 'Key NPCs have "echo" dialogue. Obaa-chan says: "I dreamed of you before you were born. But in the dream, you were... older." Father Tomas: "Have we met? I feel as though I know your face."',
    hidden_areas: 'Each cycle unlocks one additional secret area per book (Martyr: secret catacombs in Book I; Saint: hidden desert shrine in Book II; Apostle: all secrets open).',
    boss_phases: 'Bosses gain additional phases on Saint+ difficulty. Captain Hideki gains a second phase where he questions his orders. The Accuser gains a physical attack form on Apostle.',
    true_ending: 'Only available on Apostle difficulty. The final confrontation with the Accuser includes a unique sequence where every NPC you saved across all cycles appears.',
  },
};


// ─────────────────────────────────────────────────────────────
// DIVINE RECYCLING ENGINE
// ─────────────────────────────────────────────────────────────

export class DivineRecycler {
  constructor(events) {
    this.events = events;
  }

  /**
   * Check if the player is eligible for Divine Recycling.
   * Requirements: completed the final book on current difficulty.
   */
  canRecycle(gameState) {
    return gameState.flags?.game_complete === true;
  }

  /**
   * Get the next difficulty in the chain.
   */
  getNextDifficulty(currentDifficulty) {
    const current = DIFFICULTY_CHAIN.find(d => d.id === currentDifficulty);
    if (!current || !current.next) return null;
    return DIFFICULTY_CHAIN.find(d => d.id === current.next);
  }

  /**
   * Execute Divine Recycling.
   * Returns the new game state for the next cycle.
   */
  recycle(gameState, skillTreeManager) {
    const currentDiff = gameState.difficulty || 'pilgrim';
    const nextDiff = this.getNextDifficulty(currentDiff);

    if (!nextDiff) {
      // Already on Apostle — game is truly complete
      return { complete: true, trueEnding: true };
    }

    // ─── Calculate stat echoes ──────────────────────
    const echoKey = `${currentDiff}_to_${nextDiff.id}`;
    const echoRate = RECYCLING_RULES.echoed.stats.echo_rates[echoKey] || 0.10;

    // Cap: 50% of level-30 base stats
    const level30Caps = { hp: 155, mp: 45, atk: 21, def: 19, spd: 14, spr: 22 };

    const statEchoes = {};
    for (const stat of ['hp', 'mp', 'atk', 'def', 'spd', 'spr']) {
      const prevTotal = stat === 'hp' ? gameState.player.maxHp :
                        stat === 'mp' ? gameState.player.maxMp :
                        gameState.player[stat] || 0;
      const echo = Math.round(prevTotal * echoRate);
      const cap = level30Caps[stat] || 20;
      statEchoes[stat] = Math.min(echo, cap);
    }

    // ─── Calculate virtue echoes ────────────────────
    const virtueEchoRate = RECYCLING_RULES.echoed.virtues.virtue_echo_rate;
    const virtueMax = RECYCLING_RULES.echoed.virtues.max;
    const virtueEchoes = {};
    for (const virtue of ['faith', 'hope', 'charity', 'prudence', 'justice', 'fortitude', 'temperance']) {
      const prev = gameState.virtues?.[virtue] || 0;
      virtueEchoes[virtue] = Math.min(virtueMax, Math.round(prev * virtueEchoRate * 10) / 10);
    }

    // ─── Collect kept data ──────────────────────────
    const keptBlessings = this._extractBlessings(gameState);
    const keptDevotionItems = this._extractDevotionGracedItems(gameState);
    const keptMiracles = gameState.player?.knownMiracles || [];
    const keptBestiary = gameState.bestiary || {};
    const keptLore = gameState.loreRead || [];

    // ─── Build the recycled state ───────────────────
    const recycledState = {
      // Meta
      difficulty: nextDiff.id,
      cycleCount: (gameState.cycleCount || 0) + 1,
      previousCycles: [
        ...(gameState.previousCycles || []),
        {
          difficulty: currentDiff,
          finalLevel: gameState.player.level,
          totalPlaytime: gameState.totalPlaytime || 0,
          fumiECount: gameState.fumiECount || { stepped: 0, refused: 0, broken: 0 },
          accuserEncounters: gameState.accuserEncounters || 0,
          killCount: gameState.killCount || 0,
          mercyCount: gameState.mercyCount || 0,
        },
      ],
      totalPlaytime: gameState.totalPlaytime || 0,

      // Story — reset
      currentBookId: 'book-00',
      currentAreaId: 'kurosaki_village',
      act: 1,
      flags: {
        divine_recycled: true,
        cycle_count: (gameState.cycleCount || 0) + 1,
        prev_difficulty: currentDiff,
        // Secret path flags preserved
        miko_flower_kept: gameState.flags?.miko_flower_kept || false,
        obaa_survived: gameState.flags?.obaa_survived || false,
        pacifist_run: gameState.killCount === 0,
        fumi_e_never_stepped: (gameState.fumiECount?.stepped || 0) === 0,
        hideki_mercy: gameState.flags?.hideki_mercy || false,
      },
      dialoguesSeen: [], // Reset — but cycle-aware dialogue will appear

      // Player — reborn with echoes
      player: {
        name: gameState.player.name || 'Usagi',
        level: 1,
        xp: 0,
        hp: 60 + statEchoes.hp,
        maxHp: 60 + statEchoes.hp,
        mp: 15 + statEchoes.mp,
        maxMp: 15 + statEchoes.mp,
        atk: 5 + statEchoes.atk,
        def: 4 + statEchoes.def,
        spd: 5 + statEchoes.spd,
        spr: 3 + statEchoes.spr,
        statEchoes: statEchoes,  // Stored for display: "(+12 echo)"
        title: gameState.player.title || null,  // Keep highest prestige title
        knownMiracles: keptMiracles,
        vocation: gameState.player.vocation || 'laity',
      },

      // Virtues — echoed
      virtues: virtueEchoes,

      // Inventory — mostly reset
      inventory: [
        { id: 'rice_ball', quantity: 3 },
        { id: 'holy_water_vial', quantity: 1 },
        ...keptDevotionItems,  // Devotion-graced items survive
      ],

      // Equipment — reset to defaults (except devotion items)
      equipment: {
        weapon: keptDevotionItems.find(i => i.slot === 'weapon')?.id || 'farmers_sickle',
        garment: 'farmers_kosode',
        head: null,
        accessory: null,
        relic: 'obaas_cross', // The cross ALWAYS carries over
      },

      gold: 0,

      // Kept systems
      blessings: keptBlessings,
      bestiary: keptBestiary,
      loreRead: keptLore,

      // Tracking — cumulative
      fumiECount: gameState.fumiECount || { stepped: 0, refused: 0, broken: 0 },
      accuserEncounters: gameState.accuserEncounters || 0,
      killCount: 0,  // Reset per cycle (but pacifist flag from prev cycles preserved)
      mercyCount: 0,

      // Skill tree — fully kept (handled externally by SkillTreeManager.toJSON())
      skillTree: skillTreeManager?.toJSON() || null,
    };

    this.events?.emit('divine_recycling', {
      fromDifficulty: currentDiff,
      toDifficulty: nextDiff.id,
      cycle: recycledState.cycleCount,
      statEchoes,
      virtueEchoes,
      keptItems: keptDevotionItems.length,
      keptMiracles: keptMiracles.length,
    });

    return recycledState;
  }

  /**
   * Extract blessing data from game state.
   */
  _extractBlessings(gameState) {
    const blessings = {};
    // Blessings are stored per-item
    if (gameState.itemBlessings) {
      for (const [itemId, blessingData] of Object.entries(gameState.itemBlessings)) {
        blessings[itemId] = { ...blessingData, recycled: true };
      }
    }
    return blessings;
  }

  /**
   * Extract items that have achieved Devotion Grace status.
   */
  _extractDevotionGracedItems(gameState) {
    const items = [];
    if (gameState.devotionGraces) {
      for (const [itemId, graceData] of Object.entries(gameState.devotionGraces)) {
        if (graceData.tier >= 1) {
          // Find the item in inventory or equipment
          const item = gameState.inventory?.find(i => i.id === itemId) ||
                       Object.values(gameState.equipment || {}).find(e => e === itemId);
          if (item || itemId) {
            items.push({
              id: itemId,
              slot: graceData.slot || 'weapon',
              devotionTier: graceData.tier,
              battleCount: graceData.battleCount || 0,
              description_suffix: ' It remembers another life.',
            });
          }
        }
      }
    }
    return items;
  }

  /**
   * Generate the Divine Recycling cutscene data.
   */
  getRecyclingCutscene(fromDiff, toDiff, cycleCount) {
    return {
      id: `divine_recycling_${cycleCount}`,
      steps: [
        { type: 'fade_out', duration: 2000, color: '#ffffff' },
        { type: 'wait', duration: 1000 },
        { type: 'dialogue', speaker: 'The Messenger', lines: [
          cycleCount === 1
            ? 'You have walked the road once. The road remembers.'
            : `${cycleCount} times now. Each time, deeper.`,
          'God wastes nothing. Not a single step. Not a single prayer.',
          'Your strength is refined. Your wisdom is preserved. Your scars are kept.',
          'But the road resets. The dawn is new. The enemies are stronger.',
          `You were a ${fromDiff.name}. Now you become a ${toDiff.name}.`,
          'Are you afraid?',
        ]},
        { type: 'choice', choices: [
          { text: 'Yes. But I will go anyway.', virtue: { fortitude: 1 } },
          { text: 'No. I trust the road.', virtue: { faith: 1 } },
        ]},
        { type: 'dialogue', speaker: 'The Messenger', lines: [
          'Then go. The faithful are waiting.',
          'They always are.',
        ]},
        { type: 'fade_out', duration: 1500, color: '#000000' },
        { type: 'set_flag', flag: 'divine_recycled' },
        { type: 'set_flag', flag: `cycle_${cycleCount}` },
        { type: 'fade_in', duration: 2000 },
      ],
    };
  }
}


// ─────────────────────────────────────────────────────────────
// ACCUSER CYCLE MEMORY
// ─────────────────────────────────────────────────────────────

/**
 * The Accuser remembers previous cycles. His dialogue changes based on
 * what the player did in past lives. This is the narrative payoff of NG+.
 */
export const ACCUSER_CYCLE_DIALOGUE = {
  cycle_1: {
    // First recycling (Pilgrim → Disciple)
    summit_greeting: "Back again? I wondered if you would return. Most saints only walk the road once.",
    if_fumi_e_stepped: "You stepped on the image last time. Did you think I'd forget? I never forget.",
    if_fumi_e_refused: "You refused the image last time. Let's see if your conviction survives a harder road.",
    if_pacifist: "Not a single kill. Remarkable. But this time the enemies won't be so gentle.",
    if_mercy_hideki: "You showed mercy to the captain. He didn't deserve it. Will you be so generous when the stakes are real?",
  },
  cycle_2: {
    // Second recycling (Disciple → Martyr)
    summit_greeting: "Twice now. Twice you've climbed this mountain. Does it get easier? (It doesn't.)",
    if_fumi_e_stepped: "You've stepped on it {stepped_count} times across {cycle_count} lives. Each time it costs you less. That should terrify you.",
    if_fumi_e_refused: "Twice refused. The world admires consistency. I find it... irritating.",
    if_all_virtues_high: "Your soul is almost... bright. I'll have to try harder this time.",
  },
  cycle_3: {
    // Third recycling (Martyr → Saint)
    summit_greeting: "Three lives. Three roads. And still you come. Why?",
    if_fumi_e_never_stepped: "In three lifetimes, you have never stepped on the image. Not once. I am beginning to... wonder.",
    if_devotion_grace_item: "That blade you carry — it remembers me across lives. I can feel its prayers. It hates me.",
    philosophical: "Do you know what you are? You are a prayer that refuses to end. A candle that relights itself. It shouldn't be possible.",
  },
  cycle_4: {
    // Final cycle (Saint → Apostle)
    summit_greeting: "The last time. The final road. After this, there is nothing left to prove. To anyone.",
    if_fumi_e_never_stepped: "Four lives. Never once. I have asked a thousand saints this question across two thousand years. You are... different.",
    final_words: "When this is over — when you have walked every road and fought every fight and prayed every prayer — I will still be here. Asking. Because that is what I am. But you... you might be what I cannot understand.",
  },
};


// ─────────────────────────────────────────────────────────────
// OBAA-CHAN CYCLE DIALOGUE
// ─────────────────────────────────────────────────────────────

/**
 * Obaa-chan's dialogue changes subtly in each cycle.
 * She doesn't "remember" — but she dreams.
 */
export const OBAA_CYCLE_DIALOGUE = {
  cycle_0: {
    morning: "Good morning, {playerName}. Your rice ball is on the table.",
  },
  cycle_1: {
    morning: "Good morning, {playerName}. I had the strangest dream last night. You were older in it. And sadder. And... stronger.",
    chapel: "The cross has been waiting for you. I think... it has been waiting for a very long time.",
  },
  cycle_2: {
    morning: "You're here. Good. I dreamed you were gone. That you walked roads I couldn't follow. But you came back.",
    chapel: "When I hold this cross, I feel echoes. Other hands. Other prayers. It frightens me. But the warmth is real.",
  },
  cycle_3: {
    morning: "{playerName}... do I know you? Not from this life. From... before. Don't answer. I don't think I want to know.",
    chapel: "The cross recognized you before I did. It blazed when you walked in. As if greeting an old friend.",
    final: "Whatever you are — whoever you have been — I love you. In every life. Remember that.",
  },
  cycle_4: {
    morning: "You've come so many times. I can see it in your eyes. The weight of roads I'll never walk.",
    chapel: "I know what you are now. You're the answer to my prayer. The prayer I pray every night — 'Send them a saint.' God sent you. Over and over and over. Until you got it right.",
    final: "This is the last time, isn't it? I can feel it. Go. Walk the road one more time. And this time... don't come back. Not because I don't love you. Because the road ends somewhere. And it's beautiful.",
  },
};


// ─────────────────────────────────────────────────────────────
// RECYCLING SUMMARY SCREEN
// ─────────────────────────────────────────────────────────────

/**
 * Data for the summary screen shown between cycles.
 * Displays what was achieved and what carries forward.
 */
export function generateRecyclingSummary(gameState, recycledState) {
  return {
    title: 'DIVINE RECYCLING',
    subtitle: `Cycle ${recycledState.cycleCount}: ${gameState.difficulty} → ${recycledState.difficulty}`,

    previousRun: {
      difficulty: gameState.difficulty,
      finalLevel: gameState.player.level,
      totalPlaytime: gameState.totalPlaytime,
      booksCompleted: 9,
      enemiesDefeated: gameState.totalEnemiesDefeated || 0,
      fumiE: gameState.fumiECount || { stepped: 0, refused: 0, broken: 0 },
      accuserEncounters: gameState.accuserEncounters || 0,
      killCount: gameState.killCount || 0,
      mercyCount: gameState.mercyCount || 0,
      highestVirtue: _getHighestVirtue(gameState.virtues),
    },

    carried: {
      statEchoes: recycledState.player.statEchoes,
      virtueEchoes: recycledState.virtues,
      miracles: recycledState.player.knownMiracles.length,
      blessings: Object.keys(recycledState.blessings).length,
      devotionItems: recycledState.inventory.filter(i => i.devotionTier).length,
      skillsUnlocked: recycledState.skillTree?.unlocked?.length || 0,
      title: recycledState.player.title,
    },

    newInThisCycle: {
      difficulty: recycledState.difficulty,
      newContent: DIFFICULTY_CHAIN.find(d => d.id === recycledState.difficulty)?.new_content || [],
      accuserRemembersYou: recycledState.cycleCount > 0,
      obaaHasDreams: recycledState.cycleCount > 0,
    },

    quote: _getRecyclingQuote(recycledState.cycleCount),
  };
}

function _getHighestVirtue(virtues) {
  if (!virtues) return null;
  let highest = null;
  let max = -1;
  for (const [virtue, val] of Object.entries(virtues)) {
    if (val > max) { max = val; highest = virtue; }
  }
  return { virtue: highest, value: max };
}

function _getRecyclingQuote(cycle) {
  const quotes = [
    '"Unless a grain of wheat falls into the earth and dies, it remains alone." — John 12:24',
    '"Behold, I am making all things new." — Revelation 21:5',
    '"We are afflicted in every way, but not crushed; perplexed, but not driven to despair." — 2 Corinthians 4:8',
    '"I have fought the good fight. I have finished the race. I have kept the faith." — 2 Timothy 4:7',
    '"The light shines in the darkness, and the darkness has not overcome it." — John 1:5',
  ];
  return quotes[Math.min(cycle, quotes.length - 1)];
}


// ─────────────────────────────────────────────────────────────
// INTEGRATION: UPDATE BALANCE.JSON STRUCTURE
// ─────────────────────────────────────────────────────────────

/**
 * Generates the updated level_system block for balance.json.
 * Call this to get the full 100-level data.
 */
export function generateBalanceUpdate() {
  const xpTable = generateXPTable();
  const statGrowth = generateStatGrowth();

  return {
    level_system: {
      max_level: 100,
      phases: {
        novice:  { levels: '1-30',  description: 'Learning the road. Book Zero through Book II.' },
        veteran: { levels: '31-60', description: 'Walking with purpose. Books III through VI.' },
        saint:   { levels: '61-100', description: 'The final ascent. Books VII, VIII, and the return.' },
      },
      xp_curve: {
        formula: 'Phase 1: 20 * level^1.65 | Phase 2: phase1_cap + 45 * (level-30)^1.75 | Phase 3: phase2_cap + 80 * (level-60)^1.85',
        table: xpTable,
      },
      stat_growth: statGrowth,
      milestone_rewards: MILESTONE_REWARDS,
      prestige_tiers: PRESTIGE_TIERS,
      expected_level_per_book: {
        'book-00': { start: 1,  end: 10, note: 'The Calling' },
        'book-01': { start: 10, end: 20, note: 'The Arena (Rome)' },
        'book-02': { start: 20, end: 30, note: 'Desert Fathers (Egypt)' },
        'book-03': { start: 30, end: 40, note: 'The Siege (Acre)' },
        'book-04': { start: 38, end: 48, note: 'Mongol Storm (Poland)' },
        'book-05': { start: 46, end: 58, note: 'Hidden Church (Japan)' },
        'book-06': { start: 55, end: 65, note: 'Sea of Fire (Lepanto)' },
        'book-07': { start: 63, end: 75, note: 'The Terror (France)' },
        'book-08': { start: 72, end: 85, note: 'Underground (Poland)' },
        'final':   { start: 82, end: 100, note: 'The Return (Nagasaki)' },
      },
    },
    difficulty_modes: Object.fromEntries(DIFFICULTY_CHAIN.map(d => [d.id, d])),
    divine_recycling: {
      rules: RECYCLING_RULES,
      difficulty_chain: DIFFICULTY_CHAIN.map(d => d.id),
    },
  };
}
