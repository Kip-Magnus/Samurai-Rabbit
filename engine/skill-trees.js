/**
 * SAMURAI USAGI — SKILL TREE SYSTEM
 * =====================================
 * Every weapon type and blessing gets a full branching tree.
 *
 * Design:
 *   - Skill Points (SP) earned at level-up (1 per level) and virtue milestones (1 per 3 virtue total)
 *   - Each weapon tree has 3 branches: Martial (damage), Guardian (defense), Sacred (spirit)
 *   - Each blessing tree has 3 tiers that stack and evolve
 *   - Cross-tree synergies reward specialization AND hybridization
 *   - Ultimate skills require deep commitment to one path
 *
 * Weapon Types:
 *   1. Katana     — The blade path. Speed and precision.
 *   2. Staff      — The pilgrim's path. Balance and spirit.
 *   3. Cross-Blade — The holy warrior's path. Faith as weapon.
 *   4. Improvised  — The farmer's path. Creativity and resilience.
 *   5. Fist       — The ascetic's path. Body as prayer.
 *   6. Spear      — The soldier's path. Reach and discipline.
 *   7. Bow        — The watchman's path. Distance and patience.
 *
 * Blessing Types:
 *   1. Priestly Blessing     — The shepherd's grace
 *   2. Aspersion (Holy Water) — The baptismal grace
 *   3. Chrism Anointing      — The bishop's seal
 *   4. Miracle-Touched       — Heaven's fingerprint
 *   5. Devotion Grace        — The quiet reward of faithfulness
 */


// ═══════════════════════════════════════════════════════════════
// SKILL POINT SYSTEM
// ═══════════════════════════════════════════════════════════════

export class SkillTreeManager {
  constructor(events) {
    this.events = events;
    this.unlockedSkills = new Set();
    this.skillPoints = 0;
    this.weaponXP = {};  // weapon_type → xp (earned by using that weapon in combat)
    this.blessingXP = {};  // blessing_type → xp (earned by using blessed items)
    this.masteryLevels = {};  // weapon_type → mastery_level (0-10)
  }

  /**
   * Award a skill point. Sources: level-up, virtue milestone, quest reward.
   */
  awardSP(amount = 1, source = 'level_up') {
    this.skillPoints += amount;
    this.events?.emit('sp_gained', { amount, source, total: this.skillPoints });
  }

  /**
   * Award weapon XP for using a weapon type in combat.
   * Every attack with a weapon type earns 1-3 XP.
   * Mastery levels unlock at 10, 30, 60, 100, 150, 210, 280, 360, 450, 550.
   */
  awardWeaponXP(weaponType, amount = 1) {
    if (!this.weaponXP[weaponType]) this.weaponXP[weaponType] = 0;
    this.weaponXP[weaponType] += amount;

    const thresholds = [10, 30, 60, 100, 150, 210, 280, 360, 450, 550];
    const currentLevel = this.masteryLevels[weaponType] || 0;
    if (currentLevel < 10 && this.weaponXP[weaponType] >= thresholds[currentLevel]) {
      this.masteryLevels[weaponType] = currentLevel + 1;
      this.events?.emit('mastery_up', { weaponType, level: currentLevel + 1 });
    }
  }

  /**
   * Check if a skill can be learned.
   */
  canLearn(skillId) {
    if (this.unlockedSkills.has(skillId)) return false;
    if (this.skillPoints <= 0) return false;

    const skill = this.getSkill(skillId);
    if (!skill) return false;

    // Check prerequisites
    if (skill.requires) {
      for (const req of skill.requires) {
        if (!this.unlockedSkills.has(req)) return false;
      }
    }

    // Check mastery level
    if (skill.masteryReq) {
      const level = this.masteryLevels[skill.weaponType] || 0;
      if (level < skill.masteryReq) return false;
    }

    // Check level
    if (skill.levelReq) {
      // Caller must provide player level
      return true; // checked externally
    }

    return true;
  }

  /**
   * Learn a skill.
   */
  learn(skillId) {
    if (!this.canLearn(skillId)) return false;

    const skill = this.getSkill(skillId);
    this.skillPoints -= (skill.cost || 1);
    this.unlockedSkills.add(skillId);
    this.events?.emit('skill_learned', { skillId, skill });
    return true;
  }

  /**
   * Get a skill definition by ID.
   */
  getSkill(skillId) {
    for (const tree of Object.values(WEAPON_TREES)) {
      for (const branch of Object.values(tree.branches)) {
        for (const skill of branch.skills) {
          if (skill.id === skillId) return { ...skill, weaponType: tree.weaponType };
        }
      }
    }
    for (const tree of Object.values(BLESSING_TREES)) {
      for (const tier of tree.tiers) {
        for (const skill of tier.skills) {
          if (skill.id === skillId) return skill;
        }
      }
    }
    return null;
  }

  /**
   * Get all skills in a weapon tree with their unlock status.
   */
  getWeaponTree(weaponType) {
    const tree = WEAPON_TREES[weaponType];
    if (!tree) return null;

    return {
      ...tree,
      mastery: this.masteryLevels[weaponType] || 0,
      xp: this.weaponXP[weaponType] || 0,
      branches: Object.fromEntries(
        Object.entries(tree.branches).map(([key, branch]) => [
          key,
          {
            ...branch,
            skills: branch.skills.map(s => ({
              ...s,
              unlocked: this.unlockedSkills.has(s.id),
              canLearn: this.canLearn(s.id),
            })),
          },
        ])
      ),
    };
  }

  /**
   * Get all blessing tree skills.
   */
  getBlessingTree(blessingType) {
    const tree = BLESSING_TREES[blessingType];
    if (!tree) return null;

    return {
      ...tree,
      xp: this.blessingXP[blessingType] || 0,
      tiers: tree.tiers.map(tier => ({
        ...tier,
        skills: tier.skills.map(s => ({
          ...s,
          unlocked: this.unlockedSkills.has(s.id),
          canLearn: this.canLearn(s.id),
        })),
      })),
    };
  }

  /**
   * Get passive bonuses from all unlocked skills.
   */
  getPassives() {
    const passives = { atk: 0, def: 0, spd: 0, spr: 0, hp: 0, mp: 0, crit: 0, evasion: 0 };
    const effects = [];

    for (const skillId of this.unlockedSkills) {
      const skill = this.getSkill(skillId);
      if (skill?.passive) {
        for (const [stat, val] of Object.entries(skill.passive)) {
          if (passives[stat] !== undefined) passives[stat] += val;
        }
      }
      if (skill?.effect) effects.push(skill.effect);
    }

    return { stats: passives, effects };
  }

  /**
   * Serialize for save.
   */
  toJSON() {
    return {
      unlocked: [...this.unlockedSkills],
      sp: this.skillPoints,
      weaponXP: this.weaponXP,
      blessingXP: this.blessingXP,
      mastery: this.masteryLevels,
    };
  }

  static fromSave(data, events) {
    const mgr = new SkillTreeManager(events);
    if (data) {
      mgr.unlockedSkills = new Set(data.unlocked || []);
      mgr.skillPoints = data.sp || 0;
      mgr.weaponXP = data.weaponXP || {};
      mgr.blessingXP = data.blessingXP || {};
      mgr.masteryLevels = data.mastery || {};
    }
    return mgr;
  }
}


// ═══════════════════════════════════════════════════════════════
// WEAPON SKILL TREES
// ═══════════════════════════════════════════════════════════════

export const WEAPON_TREES = {

  // ─────────────────────────────────────────────────────────────
  // KATANA — The Blade Path
  // ─────────────────────────────────────────────────────────────
  katana: {
    weaponType: 'katana',
    name: 'Way of the Blade',
    description: 'The katana is speed and precision. Each cut is a prayer — economical, deliberate, final.',
    icon: '⚔',
    branches: {

      martial: {
        name: 'Iaijutsu (Quick-Draw)',
        description: 'The art of the single decisive strike.',
        color: '#cc3333',
        skills: [
          { id: 'kat_swift_draw', name: 'Swift Draw', desc: 'First-strike advantage. 30% chance to act first regardless of SPD.', cost: 1, masteryReq: 1, passive: { spd: 2 }, effect: 'first_strike_30' },
          { id: 'kat_rising_cut', name: 'Rising Cut', desc: 'Upward slash. 1.3× damage. Launches small enemies (stun 1 turn).', cost: 1, masteryReq: 2, requires: ['kat_swift_draw'], effect: { type: 'active', damage: 1.3, stun_small: 1 } },
          { id: 'kat_twin_slash', name: 'Twin Slash', desc: 'Two rapid cuts in succession. Each deals 0.7× damage.', cost: 1, masteryReq: 3, requires: ['kat_rising_cut'], effect: { type: 'active', hits: 2, damage_per_hit: 0.7 } },
          { id: 'kat_bleeding_edge', name: 'Bleeding Edge', desc: 'Precise cut to tendons. 40% chance to inflict Slow (3 turns).', cost: 1, masteryReq: 4, requires: ['kat_twin_slash'], effect: { type: 'active', damage: 1.1, slow_chance: 0.4, slow_duration: 3 } },
          { id: 'kat_death_blossom', name: 'Death Blossom', desc: 'Spinning slash hitting all enemies. 0.8× damage to each.', cost: 2, masteryReq: 6, requires: ['kat_bleeding_edge'], effect: { type: 'active', target: 'all', damage: 0.8 } },
          { id: 'kat_iai_ultimate', name: 'Musashi\'s Ghost', desc: 'ULTIMATE: Perfect draw. 3.0× damage, ignores DEF entirely. 3-turn cooldown.', cost: 3, masteryReq: 9, requires: ['kat_death_blossom'], effect: { type: 'ultimate', damage: 3.0, ignore_def: true, cooldown: 3 } },
        ],
      },

      guardian: {
        name: 'Kenjutsu (Sword Art)',
        description: 'Defense through precision. The blade protects as much as it strikes.',
        color: '#4a7c59',
        skills: [
          { id: 'kat_parry', name: 'Parry', desc: 'When Guarding, 25% chance to counter-attack for 0.5× damage.', cost: 1, masteryReq: 1, effect: 'guard_counter_25' },
          { id: 'kat_deflect', name: 'Deflect Arrow', desc: 'Immune to ranged physical attacks while Guarding.', cost: 1, masteryReq: 2, requires: ['kat_parry'], effect: 'deflect_ranged_guard' },
          { id: 'kat_blade_ward', name: 'Blade Ward', desc: 'Passive: +3 DEF when wielding a katana.', cost: 1, masteryReq: 3, requires: ['kat_deflect'], passive: { def: 3 } },
          { id: 'kat_riposte', name: 'Riposte', desc: 'After a successful Parry, next attack deals 1.5× damage.', cost: 1, masteryReq: 5, requires: ['kat_blade_ward'], effect: 'riposte_bonus_150' },
          { id: 'kat_perfect_guard', name: 'Perfect Guard', desc: 'Guard now blocks 75% damage (up from 50%). Counter chance rises to 40%.', cost: 2, masteryReq: 7, requires: ['kat_riposte'], effect: 'perfect_guard_75_counter_40' },
          { id: 'kat_bushido_ult', name: 'Bushidō: Living Wall', desc: 'ULTIMATE: For 3 turns, all attacks targeting allies are redirected to Usagi. He takes 30% damage from each.', cost: 3, masteryReq: 9, requires: ['kat_perfect_guard'], effect: { type: 'ultimate', taunt_all: true, damage_reduction: 0.7, duration: 3, cooldown: 5 } },
        ],
      },

      sacred: {
        name: 'Shinken (True Blade)',
        description: 'The blade becomes a vessel for divine will. Faith sharpens the edge.',
        color: '#c9a959',
        skills: [
          { id: 'kat_prayer_edge', name: 'Prayer Edge', desc: 'Adds 10% of SPR to katana ATK.', cost: 1, masteryReq: 1, passive: { effect: 'spr_to_atk_10pct' } },
          { id: 'kat_sanctified_cut', name: 'Sanctified Cut', desc: 'Attack deals hybrid physical+holy damage. Effective against spiritual enemies.', cost: 1, masteryReq: 3, requires: ['kat_prayer_edge'], effect: 'hybrid_holy_physical' },
          { id: 'kat_light_blade', name: 'Light of the Blade', desc: 'Critical hits with katana emit a flash that damages adjacent spiritual enemies for 20% holy.', cost: 1, masteryReq: 4, requires: ['kat_sanctified_cut'], effect: 'crit_holy_splash_20' },
          { id: 'kat_virtue_edge', name: 'Virtue\'s Edge', desc: 'Katana damage increases by 2% per total virtue level.', cost: 2, masteryReq: 6, requires: ['kat_light_blade'], effect: 'virtue_scaling_2pct' },
          { id: 'kat_pilgrims_strike', name: 'Pilgrim\'s Strike', desc: 'Special attack that scales with Faith × Fortitude. Deals pure holy damage.', cost: 2, masteryReq: 8, requires: ['kat_virtue_edge'], effect: { type: 'active', damage_formula: 'faith * fortitude * 3', damage_type: 'holy' } },
          { id: 'kat_shinken_ult', name: 'Shinken: Blade of Intercession', desc: 'ULTIMATE: Channel the prayers of every soul who held this blade. 4.0× holy damage. Heals party for 50% of damage dealt. Once per battle.', cost: 3, masteryReq: 10, requires: ['kat_pilgrims_strike'], effect: { type: 'ultimate', damage: 4.0, damage_type: 'holy', heal_pct_of_damage: 0.5, once_per_battle: true } },
        ],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // STAFF — The Pilgrim's Path
  // ─────────────────────────────────────────────────────────────
  staff: {
    weaponType: 'staff',
    name: 'Way of the Pilgrim',
    description: 'The staff is the oldest weapon and the simplest. It walks with you. It leans when you lean. It strikes only when it must.',
    icon: '🪄',
    branches: {

      martial: {
        name: 'Bōjutsu (Staff Art)',
        description: 'The staff spins, blocks, and sweeps. Flow, not force.',
        color: '#8b5e3c',
        skills: [
          { id: 'stf_sweep', name: 'Low Sweep', desc: 'Trip attack. 1.1× damage + 30% chance to stun 1 turn.', cost: 1, masteryReq: 1, effect: { type: 'active', damage: 1.1, stun_chance: 0.3 } },
          { id: 'stf_spin_block', name: 'Spinning Block', desc: 'Guard with staff: blocks 60% damage (up from 50%).', cost: 1, masteryReq: 2, requires: ['stf_sweep'], effect: 'guard_block_60' },
          { id: 'stf_vault', name: 'Vault Strike', desc: 'Pole-vault into overhead slam. 1.4× damage. Ignores front-row positioning.', cost: 1, masteryReq: 3, requires: ['stf_spin_block'], effect: { type: 'active', damage: 1.4, ignore_row: true } },
          { id: 'stf_whirlwind', name: 'Whirlwind', desc: 'Rapid staff spin hitting all enemies. 0.6× damage + push back (delays enemy turn).', cost: 2, masteryReq: 5, requires: ['stf_vault'], effect: { type: 'active', target: 'all', damage: 0.6, delay_turn: 1 } },
          { id: 'stf_bone_crack', name: 'Bone Crack', desc: 'Targeted strike. 1.2× damage + 50% chance to reduce enemy ATK by 20% for 3 turns.', cost: 1, masteryReq: 7, requires: ['stf_whirlwind'], effect: { type: 'active', damage: 1.2, debuff: { stat: 'atk', pct: 0.2, duration: 3, chance: 0.5 } } },
          { id: 'stf_bo_ult', name: 'Ten Thousand Steps', desc: 'ULTIMATE: A blur of strikes — 8 random hits at 0.4× damage each. Each hit that lands restores 2 MP.', cost: 3, masteryReq: 9, requires: ['stf_bone_crack'], effect: { type: 'ultimate', hits: 8, damage_per_hit: 0.4, mp_per_hit: 2, cooldown: 4 } },
        ],
      },

      guardian: {
        name: 'Shelter of the Road',
        description: 'The staff is a walking stick first. It supports, it shields, it endures.',
        color: '#4a7c59',
        skills: [
          { id: 'stf_steady', name: 'Steady Stance', desc: 'Passive: Cannot be knocked back or displaced by enemy abilities.', cost: 1, masteryReq: 1, effect: 'immune_knockback' },
          { id: 'stf_pilgrims_rest', name: "Pilgrim's Rest", desc: 'Once per battle: Guard + heal 15% max HP.', cost: 1, masteryReq: 2, requires: ['stf_steady'], effect: { type: 'active', guard: true, heal_pct: 0.15, once_per_battle: true } },
          { id: 'stf_walking_prayer', name: 'Walking Prayer', desc: 'Passive: Regenerate 1 MP per turn while holding a staff.', cost: 1, masteryReq: 3, requires: ['stf_pilgrims_rest'], passive: { mp_regen: 1 } },
          { id: 'stf_root', name: 'Take Root', desc: 'Plant staff: DEF +30% for 2 turns but cannot move or attack.', cost: 1, masteryReq: 5, requires: ['stf_walking_prayer'], effect: { type: 'active', def_bonus: 0.3, duration: 2, immobile: true } },
          { id: 'stf_shepherd', name: "Shepherd's Watch", desc: 'Passive: When an ally would be killed, 50% chance to intercept and take the hit at 50% damage.', cost: 2, masteryReq: 7, requires: ['stf_root'], effect: 'ally_intercept_50' },
          { id: 'stf_guard_ult', name: 'The Staff That Parted the Sea', desc: 'ULTIMATE: Plant staff and create a barrier. All allies take 0 damage for 2 turns. Staff breaks after use (repaired at next rest).', cost: 3, masteryReq: 10, requires: ['stf_shepherd'], effect: { type: 'ultimate', barrier_all: true, duration: 2, breaks_weapon: true, cooldown: 'once_per_battle' } },
        ],
      },

      sacred: {
        name: 'Shepherd\'s Crook',
        description: 'The staff becomes a conduit for prayer. Moses held one. So did Francis.',
        color: '#ffd700',
        skills: [
          { id: 'stf_spirit_channel', name: 'Spirit Channel', desc: 'Staff attacks deal holy damage based on SPR instead of ATK.', cost: 1, masteryReq: 1, effect: 'staff_uses_spr' },
          { id: 'stf_prayer_focus', name: 'Prayer Focus', desc: 'Miracle damage +15% while holding a staff.', cost: 1, masteryReq: 2, requires: ['stf_spirit_channel'], passive: { miracle_damage: 0.15 } },
          { id: 'stf_healing_touch', name: 'Healing Touch', desc: 'Staff melee attack heals Usagi for 10% of damage dealt.', cost: 1, masteryReq: 3, requires: ['stf_prayer_focus'], effect: 'lifesteal_holy_10' },
          { id: 'stf_franciscan_peace', name: "Francis's Peace", desc: 'Non-boss enemies have 15% chance to flee when struck by a holy staff attack.', cost: 1, masteryReq: 5, requires: ['stf_healing_touch'], effect: 'enemy_flee_chance_15' },
          { id: 'stf_burning_bush', name: 'Burning Bush', desc: 'Staff glows with divine fire. All attacks inflict Burn (holy) for 2 turns. +20% holy damage.', cost: 2, masteryReq: 7, requires: ['stf_franciscan_peace'], effect: { burn_holy: true, holy_bonus: 0.2 } },
          { id: 'stf_sacred_ult', name: 'Moses\'s Rod', desc: 'ULTIMATE: Slam staff into the ground. All enemies take 2.5× SPR as holy damage. All allies fully healed. Screen fills with divine light. Once per battle.', cost: 3, masteryReq: 10, requires: ['stf_burning_bush'], effect: { type: 'ultimate', damage: 2.5, damage_stat: 'spr', damage_type: 'holy', target: 'all_enemies', heal_all_allies: true, once_per_battle: true } },
        ],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // CROSS-BLADE — The Holy Warrior's Path
  // ─────────────────────────────────────────────────────────────
  cross_blade: {
    weaponType: 'cross_blade',
    name: 'Way of the Cross',
    description: 'A blade shaped like the Cross. It cuts and blesses in the same motion. Every strike is a prayer. Every prayer is a strike.',
    icon: '✝',
    branches: {

      martial: {
        name: 'Crusader\'s Edge',
        description: 'The martial discipline of Christian knights. Direct, powerful, righteous.',
        color: '#cc3333',
        skills: [
          { id: 'crb_smite', name: 'Smite', desc: 'Heavy downward strike. 1.3× damage. +30% vs undead/spiritual.', cost: 1, masteryReq: 1, effect: { type: 'active', damage: 1.3, bonus_vs: ['spiritual', 'undead'], bonus_pct: 0.3 } },
          { id: 'crb_cross_cut', name: 'Cross Cut', desc: 'Horizontal then vertical slash forming a cross. Two hits at 0.75× each. The cross-pattern weakens spiritual enemies.', cost: 1, masteryReq: 2, requires: ['crb_smite'], effect: { type: 'active', hits: 2, damage_per_hit: 0.75, spiritual_weaken: 0.1 } },
          { id: 'crb_holy_brand', name: 'Holy Brand', desc: 'Attack marks enemy with a cross of light. Marked enemies take +15% holy damage from all sources for 3 turns.', cost: 1, masteryReq: 4, requires: ['crb_cross_cut'], effect: { type: 'active', damage: 1.0, mark_holy: { bonus: 0.15, duration: 3 } } },
          { id: 'crb_crusade', name: 'Crusade', desc: 'Charge attack. 1.5× damage. Usagi moves to front position. Generates aggro.', cost: 2, masteryReq: 6, requires: ['crb_holy_brand'], effect: { type: 'active', damage: 1.5, move_front: true, taunt: true } },
          { id: 'crb_judgment', name: 'Judgment', desc: 'Strike that deals bonus damage equal to 5% of enemy\'s missing HP. Executes enemies below 10% HP.', cost: 2, masteryReq: 8, requires: ['crb_crusade'], effect: { type: 'active', damage: 1.2, missing_hp_bonus: 0.05, execute_threshold: 0.1 } },
          { id: 'crb_martial_ult', name: 'Deus Vult', desc: 'ULTIMATE: A single strike backed by unshakeable conviction. 3.5× damage. Pure holy. If Faith ≥ 8, cannot miss. 4-turn cooldown.', cost: 3, masteryReq: 10, requires: ['crb_judgment'], effect: { type: 'ultimate', damage: 3.5, damage_type: 'holy', no_miss_faith_8: true, cooldown: 4 } },
        ],
      },

      guardian: {
        name: 'Templar\'s Shield',
        description: 'The cross protects as much as it strikes. Faith is armor.',
        color: '#6495ed',
        skills: [
          { id: 'crb_cross_guard', name: 'Cross Guard', desc: 'Hold blade in cross position. Guard blocks 60% and reflects 10% holy damage.', cost: 1, masteryReq: 1, effect: 'guard_60_reflect_10_holy' },
          { id: 'crb_sanctuary', name: 'Sanctuary', desc: 'Passive: While HP > 50%, immune to Fear and Despair.', cost: 1, masteryReq: 2, requires: ['crb_cross_guard'], effect: 'immune_fear_despair_above_50' },
          { id: 'crb_martyrs_shield', name: "Martyr's Shield", desc: 'When taking lethal damage, survive with 1 HP once per battle. Gain 2-turn invulnerability.', cost: 2, masteryReq: 4, requires: ['crb_sanctuary'], effect: 'death_save_invuln_2' },
          { id: 'crb_consecrate', name: 'Consecrate Ground', desc: 'Active: Bless the battlefield. All allies gain +3 DEF, +3 SPR for 4 turns.', cost: 1, masteryReq: 6, requires: ['crb_martyrs_shield'], effect: { type: 'active', buff_all: { def: 3, spr: 3, duration: 4 } } },
          { id: 'crb_last_bastion', name: 'Last Bastion', desc: 'Passive: DEF increases by 1 for each ally who has fallen in this battle.', cost: 1, masteryReq: 8, requires: ['crb_consecrate'], effect: 'def_per_fallen_ally' },
          { id: 'crb_guard_ult', name: 'Christus Vincit', desc: 'ULTIMATE: Plant the cross-blade in the ground. For 3 turns: all allies cannot be reduced below 1 HP, all healing doubled. Usagi cannot attack during this time.', cost: 3, masteryReq: 10, requires: ['crb_last_bastion'], effect: { type: 'ultimate', ally_immortal: true, healing_double: true, duration: 3, usagi_cannot_attack: true, cooldown: 'once_per_battle' } },
        ],
      },

      sacred: {
        name: 'Veritas (Truth)',
        description: 'The Dominican path. The sword of the Word. Truth as weapon.',
        color: '#ffd700',
        skills: [
          { id: 'crb_truth_sight', name: 'Truth Sight', desc: 'Passive: Reveals hidden enemies, traps, and the Accuser\'s disguises.', cost: 1, masteryReq: 1, effect: 'reveal_hidden_all' },
          { id: 'crb_word_blade', name: 'Word Blade', desc: 'Attack that deals bonus damage equal to 20% of Usagi\'s total virtue.', cost: 1, masteryReq: 3, requires: ['crb_truth_sight'], effect: { type: 'active', damage: 1.0, virtue_bonus: 0.2 } },
          { id: 'crb_dispel', name: 'Dispel', desc: 'Active: Remove all buffs from one enemy. Deal 0.5× holy damage per buff removed.', cost: 1, masteryReq: 4, requires: ['crb_word_blade'], effect: { type: 'active', strip_buffs: true, damage_per_buff: 0.5 } },
          { id: 'crb_exorcist_blade', name: "Exorcist's Blade", desc: 'Cross-blade attacks deal 2× damage to possessed, demonic, and illusory enemies.', cost: 2, masteryReq: 6, requires: ['crb_dispel'], effect: 'double_damage_demonic' },
          { id: 'crb_inquisition', name: 'Inquisition', desc: 'Active: Force an enemy to reveal its true stats, weaknesses, and AI pattern.', cost: 1, masteryReq: 8, requires: ['crb_exorcist_blade'], effect: { type: 'active', reveal_enemy: true } },
          { id: 'crb_sacred_ult', name: 'Veritas Vos Liberabit', desc: 'ULTIMATE: "The truth shall set you free." All enemies are stripped of all buffs, illusions, and disguises. Deals 2× SPR as holy damage to each. If the Accuser is present, forces his true form. Once per battle.', cost: 3, masteryReq: 10, requires: ['crb_inquisition'], effect: { type: 'ultimate', strip_all: true, damage: 2.0, damage_stat: 'spr', force_accuser_form: true, once_per_battle: true } },
        ],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // IMPROVISED — The Farmer's Path
  // ─────────────────────────────────────────────────────────────
  improvised: {
    weaponType: 'improvised',
    name: 'Way of the Farmer',
    description: 'Sickles, hoes, rakes, chains, rocks. Whatever is at hand. David killed Goliath with a sling. You are no David — but God uses what He finds.',
    icon: '🌾',
    branches: {

      martial: {
        name: 'Makeshift Mastery',
        description: 'Fighting with the wrong tools builds creativity.',
        color: '#a0784c',
        skills: [
          { id: 'imp_resourceful', name: 'Resourceful', desc: 'Passive: Improvised weapons deal 15% more damage than their base stats suggest.', cost: 1, masteryReq: 1, passive: { effect: 'improvised_dmg_bonus_15' } },
          { id: 'imp_sickle_hook', name: 'Sickle Hook', desc: 'Hook enemy\'s weapon. 30% chance to disarm for 2 turns (-25% ATK).', cost: 1, masteryReq: 2, requires: ['imp_resourceful'], effect: { type: 'active', damage: 0.9, disarm_chance: 0.3, disarm_debuff: { atk: -0.25, duration: 2 } } },
          { id: 'imp_chain_whip', name: 'Chain Whip', desc: 'Improvised chain attack. Hits 1-3 random enemies at 0.6× each.', cost: 1, masteryReq: 3, requires: ['imp_sickle_hook'], effect: { type: 'active', hits_random: [1, 3], damage_per_hit: 0.6 } },
          { id: 'imp_dirty_fight', name: 'Dirty Fight', desc: 'Throw dirt/sand. 60% chance to inflict Blind (accuracy -50%) for 2 turns.', cost: 1, masteryReq: 4, requires: ['imp_chain_whip'], effect: { type: 'active', blind_chance: 0.6, blind_duration: 2 } },
          { id: 'imp_farmers_fury', name: 'Farmer\'s Fury', desc: 'Active: ATK +50% for 3 turns, but DEF -20%. The desperation of someone fighting for their home.', cost: 2, masteryReq: 6, requires: ['imp_dirty_fight'], effect: { type: 'active', self_buff: { atk: 0.5, def: -0.2, duration: 3 } } },
          { id: 'imp_martial_ult', name: 'David\'s Sling', desc: 'ULTIMATE: Throw weapon at target. 2.5× damage. 100% stun for 2 turns. Weapon returns next turn. If enemy is a "giant" (boss), damage is 4×.', cost: 3, masteryReq: 9, requires: ['imp_farmers_fury'], effect: { type: 'ultimate', damage: 2.5, stun: 2, giant_bonus: 4.0, cooldown: 4 } },
        ],
      },

      guardian: {
        name: 'Hard-Won Grit',
        description: 'You survive not by skill but by stubbornness.',
        color: '#55aa55',
        skills: [
          { id: 'imp_thick_skin', name: 'Thick Skin', desc: 'Passive: +5% damage reduction from all sources.', cost: 1, masteryReq: 1, passive: { damage_reduction: 0.05 } },
          { id: 'imp_second_wind', name: 'Second Wind', desc: 'Once per battle, when HP drops below 25%, automatically heal 20% max HP.', cost: 1, masteryReq: 2, requires: ['imp_thick_skin'], effect: 'auto_heal_20_at_25' },
          { id: 'imp_stubborn', name: 'Stubborn', desc: 'Passive: Duration of all negative status effects reduced by 1 turn.', cost: 1, masteryReq: 3, requires: ['imp_second_wind'], effect: 'status_duration_minus_1' },
          { id: 'imp_scavenge', name: 'Scavenge', desc: 'After battle, 20% chance to find an extra item (herbs, scraps, materials).', cost: 1, masteryReq: 5, requires: ['imp_stubborn'], effect: 'post_battle_scavenge_20' },
          { id: 'imp_will_to_live', name: 'Will to Live', desc: 'Passive: HP regeneration +3% per turn when below 50% HP.', cost: 2, masteryReq: 7, requires: ['imp_scavenge'], effect: 'regen_3pct_below_50' },
          { id: 'imp_guard_ult', name: 'Peasant\'s Defiance', desc: 'ULTIMATE: Cannot die for 3 turns. All damage that would kill instead sets HP to 1. ATK doubles during this time. "I am not done yet."', cost: 3, masteryReq: 9, requires: ['imp_will_to_live'], effect: { type: 'ultimate', unkillable: true, atk_double: true, duration: 3, cooldown: 'once_per_battle' } },
        ],
      },

      sacred: {
        name: 'Holy Poverty',
        description: 'The less you have, the more God provides. Blessed are the poor.',
        color: '#c9a959',
        skills: [
          { id: 'imp_poverty_bonus', name: 'Blessed Poverty', desc: 'Passive: SPR +1 for each empty equipment slot.', cost: 1, masteryReq: 1, passive: { effect: 'spr_per_empty_slot' } },
          { id: 'imp_humble_hands', name: 'Humble Hands', desc: 'Improvised weapons can channel miracles. Miracle damage +10% when wielding improvised.', cost: 1, masteryReq: 2, requires: ['imp_poverty_bonus'], passive: { miracle_damage: 0.1 } },
          { id: 'imp_labor_prayer', name: 'Labōrāre est Ōrāre', desc: '"To work is to pray." Each physical attack restores 1 MP.', cost: 1, masteryReq: 4, requires: ['imp_humble_hands'], effect: 'attack_restores_1mp' },
          { id: 'imp_beatitude', name: 'Beatitude', desc: 'Passive: When Usagi has fewer items than enemies, all stats +10%.', cost: 2, masteryReq: 6, requires: ['imp_labor_prayer'], effect: 'stat_bonus_when_outnumbered' },
          { id: 'imp_magnificat', name: 'Magnificat', desc: '"He has put down the mighty from their thrones." Attacks against enemies with higher level than Usagi deal +50% damage.', cost: 2, masteryReq: 8, requires: ['imp_beatitude'], effect: 'damage_bonus_vs_higher_level_50' },
          { id: 'imp_sacred_ult', name: 'The Widow\'s Mite', desc: 'ULTIMATE: Sacrifice all gold and consumable items. For each item sacrificed, deal 0.3× holy damage to all enemies and heal all allies for 10% max HP. "She gave everything she had."', cost: 3, masteryReq: 10, requires: ['imp_magnificat'], effect: { type: 'ultimate', sacrifice_items: true, damage_per_item: 0.3, heal_per_item: 0.1, once_per_battle: true } },
        ],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // FIST — The Ascetic's Path
  // ─────────────────────────────────────────────────────────────
  fist: {
    weaponType: 'fist',
    name: 'Way of the Open Hand',
    description: 'No weapon. The body itself becomes prayer. The Desert Fathers fought demons with fasting and prostrations. The fist is the last resort — or the first discipline.',
    icon: '✊',
    branches: {

      martial: {
        name: 'Iron Body',
        description: 'The body as weapon. Speed, precision, and the disciplined fury of restraint.',
        color: '#cc6633',
        skills: [
          { id: 'fst_quick_strike', name: 'Quick Strike', desc: 'Two rapid punches. Each deals 0.5× damage. Always acts first.', cost: 1, masteryReq: 1, effect: { type: 'active', hits: 2, damage_per_hit: 0.5, priority: true } },
          { id: 'fst_pressure_point', name: 'Pressure Point', desc: 'Target nerve cluster. 1.0× damage + 40% chance to paralyze for 1 turn.', cost: 1, masteryReq: 2, requires: ['fst_quick_strike'], effect: { type: 'active', damage: 1.0, stun_chance: 0.4 } },
          { id: 'fst_combo', name: 'Combo Chain', desc: 'Each consecutive unarmed attack in the same battle adds +10% damage (stacks to +50%).', cost: 1, masteryReq: 3, requires: ['fst_pressure_point'], effect: 'combo_chain_10pct_max_50' },
          { id: 'fst_iron_fist', name: 'Iron Fist', desc: 'Passive: Unarmed ATK = Level × 0.8 (scales better than most weapons at high levels).', cost: 2, masteryReq: 5, requires: ['fst_combo'], passive: { effect: 'unarmed_atk_level_scaling' } },
          { id: 'fst_hundred_fists', name: 'Hundred Fists', desc: 'Active: 5-10 random strikes at 0.3× damage each. Number of hits = SPD / 3 (rounded up).', cost: 2, masteryReq: 7, requires: ['fst_iron_fist'], effect: { type: 'active', hits_formula: 'spd / 3', damage_per_hit: 0.3 } },
          { id: 'fst_martial_ult', name: 'One Inch', desc: 'ULTIMATE: A single punch at point-blank range. 5.0× damage. Target is stunned for 2 turns. If target has higher ATK than Usagi, damage is 7.0×. "The smaller the motion, the greater the force."', cost: 3, masteryReq: 10, requires: ['fst_hundred_fists'], effect: { type: 'ultimate', damage: 5.0, stun: 2, bonus_if_outmatched: 7.0, cooldown: 5 } },
        ],
      },

      guardian: {
        name: 'Ascetic\'s Discipline',
        description: 'The body endures what the spirit demands.',
        color: '#4a7c59',
        skills: [
          { id: 'fst_tough_skin', name: 'Calloused Hands', desc: 'Passive: +5 DEF when unarmed.', cost: 1, masteryReq: 1, passive: { def: 5 } },
          { id: 'fst_dodge', name: 'Evasive Step', desc: 'Passive: +10% evasion when unarmed.', cost: 1, masteryReq: 2, requires: ['fst_tough_skin'], passive: { evasion: 10 } },
          { id: 'fst_counter', name: 'Counter Stance', desc: 'When guarding unarmed, 50% chance to counter-attack at 1.0× damage.', cost: 1, masteryReq: 3, requires: ['fst_dodge'], effect: 'guard_counter_50_full' },
          { id: 'fst_ki_shield', name: 'Spirit Shield', desc: 'Active: Use SPR as temporary HP shield. Shield = SPR × 2. Lasts 3 turns.', cost: 2, masteryReq: 5, requires: ['fst_counter'], effect: { type: 'active', shield_formula: 'spr * 2', duration: 3 } },
          { id: 'fst_endurance', name: 'Desert Father\'s Endurance', desc: 'Passive: Immune to Burn, Poison, and Slow. "The body is disciplined."', cost: 2, masteryReq: 7, requires: ['fst_ki_shield'], effect: 'immune_burn_poison_slow' },
          { id: 'fst_guard_ult', name: 'Stylite\'s Pillar', desc: 'ULTIMATE: Enter a meditative state. Cannot act for 2 turns. During this time: immune to all damage, regenerate 25% HP and MP per turn, all status effects cleansed.', cost: 3, masteryReq: 10, requires: ['fst_endurance'], effect: { type: 'ultimate', meditate: true, immune_all: true, regen_hp: 0.25, regen_mp: 0.25, cleanse: true, duration: 2, cooldown: 'once_per_battle' } },
        ],
      },

      sacred: {
        name: 'Prayer of the Body',
        description: 'Prostrations. Fasting. The body bowed in worship IS the prayer.',
        color: '#ffd700',
        skills: [
          { id: 'fst_prayer_fist', name: 'Prayer Fist', desc: 'Unarmed attacks deal holy damage based on SPR when Faith ≥ 3.', cost: 1, masteryReq: 1, effect: 'unarmed_holy_faith_3' },
          { id: 'fst_fasting', name: 'Fasting Strength', desc: 'Passive: When Usagi has 0 food items, SPR +20%.', cost: 1, masteryReq: 3, requires: ['fst_prayer_fist'], effect: 'spr_bonus_no_food_20' },
          { id: 'fst_prostration', name: 'Prostration', desc: 'Active: Bow in prayer. Skip one turn. Next miracle costs 0 MP.', cost: 1, masteryReq: 4, requires: ['fst_fasting'], effect: { type: 'active', skip_turn: true, next_miracle_free: true } },
          { id: 'fst_stigmata', name: 'Stigmata', desc: 'When Usagi takes damage, 10% chance the wounds glow with holy light, dealing 50% of damage taken back as holy damage to attacker.', cost: 2, masteryReq: 6, requires: ['fst_prostration'], effect: 'damage_reflect_holy_10pct' },
          { id: 'fst_transfigure', name: 'Transfigure', desc: 'Active: All stats become equal to highest stat for 3 turns. Usagi glows with divine light.', cost: 2, masteryReq: 8, requires: ['fst_stigmata'], effect: { type: 'active', equalize_stats_to_highest: true, duration: 3 } },
          { id: 'fst_sacred_ult', name: 'Theosis', desc: 'ULTIMATE: Union with the divine will. For 5 turns, all attacks deal pure holy damage, all damage taken is halved, all miracles cost 0 MP. But when it ends, Usagi is reduced to 1 HP. "Not I, but Christ in me."', cost: 3, masteryReq: 10, requires: ['fst_transfigure'], effect: { type: 'ultimate', holy_all: true, damage_taken_half: true, free_miracles: true, duration: 5, aftermath_hp_1: true, once_per_battle: true } },
        ],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // SPEAR — The Soldier's Path
  // ─────────────────────────────────────────────────────────────
  spear: {
    weaponType: 'spear',
    name: 'Way of the Yari',
    description: 'The spear is the soldier\'s weapon — reach, discipline, formation. It is the weapon of duty, not glory.',
    icon: '🔱',
    branches: {

      martial: {
        name: 'Sōjutsu (Spear Art)',
        description: 'Reach is power. Strike before they close.',
        color: '#cc3333',
        skills: [
          { id: 'spr_thrust', name: 'Long Thrust', desc: '1.2× damage. Strikes before melee enemies can reach you.', cost: 1, masteryReq: 1, effect: { type: 'active', damage: 1.2, priority_vs_melee: true } },
          { id: 'spr_sweep_arc', name: 'Sweeping Arc', desc: 'Wide spear sweep. Hits up to 3 enemies in front row. 0.8× damage each.', cost: 1, masteryReq: 2, requires: ['spr_thrust'], effect: { type: 'active', target: 'front_3', damage: 0.8 } },
          { id: 'spr_pin', name: 'Pin', desc: 'Spear pins target to ground. 1.0× damage + prevents target from acting for 1 turn.', cost: 1, masteryReq: 3, requires: ['spr_sweep_arc'], effect: { type: 'active', damage: 1.0, immobilize: 1 } },
          { id: 'spr_charge', name: 'Cavalry Charge', desc: '1.8× damage if Usagi acts first this turn. Otherwise 1.0×.', cost: 1, masteryReq: 5, requires: ['spr_pin'], effect: { type: 'active', damage_first: 1.8, damage_normal: 1.0 } },
          { id: 'spr_impale', name: 'Impale', desc: '2.0× damage to single target. If it kills, spear pierces to enemy behind for 1.0× damage.', cost: 2, masteryReq: 7, requires: ['spr_charge'], effect: { type: 'active', damage: 2.0, pierce_on_kill: 1.0 } },
          { id: 'spr_martial_ult', name: 'Liegnitz Formation', desc: 'ULTIMATE: Call the spirit of fallen soldiers. 6 phantom spear strikes hit random enemies at 1.0× each. Each hit reduces target DEF by 5%. "They died holding the line. Their line holds still."', cost: 3, masteryReq: 10, requires: ['spr_impale'], effect: { type: 'ultimate', phantom_hits: 6, damage_per_hit: 1.0, def_shred: 0.05, cooldown: 4 } },
        ],
      },

      guardian: {
        name: 'Phalanx',
        description: 'The spear wall does not break. Discipline over heroics.',
        color: '#6495ed',
        skills: [
          { id: 'spr_brace', name: 'Brace', desc: 'Guard with spear braced. Charging enemies take 1.0× counter-damage automatically.', cost: 1, masteryReq: 1, effect: 'brace_counter_chargers' },
          { id: 'spr_formation', name: 'Formation', desc: 'Passive: +3 DEF when in the front row.', cost: 1, masteryReq: 2, requires: ['spr_brace'], passive: { def: 3 } },
          { id: 'spr_hold_line', name: 'Hold the Line', desc: 'Active: Cannot be moved from position for 3 turns. +20% DEF during this time.', cost: 1, masteryReq: 4, requires: ['spr_formation'], effect: { type: 'active', immovable: true, def_bonus: 0.2, duration: 3 } },
          { id: 'spr_spear_wall', name: 'Spear Wall', desc: 'Passive: Enemies that attack Usagi in melee take 5% retaliation damage.', cost: 2, masteryReq: 6, requires: ['spr_hold_line'], effect: 'melee_retaliation_5' },
          { id: 'spr_shield_brothers', name: 'Shield-Brothers', desc: 'Passive: If companions are present, Usagi and all allies gain +2 DEF each.', cost: 2, masteryReq: 8, requires: ['spr_spear_wall'], effect: 'party_def_bonus_2' },
          { id: 'spr_guard_ult', name: 'Thermopylae', desc: 'ULTIMATE: Last stand. For 3 turns, Usagi absorbs ALL damage meant for allies. He takes 50% of redirected damage. His ATK doubles. If he survives, full heal.', cost: 3, masteryReq: 10, requires: ['spr_shield_brothers'], effect: { type: 'ultimate', absorb_all: true, damage_taken: 0.5, atk_double: true, duration: 3, survive_heal: true, cooldown: 'once_per_battle' } },
        ],
      },

      sacred: {
        name: 'Longinus\'s Spear',
        description: 'The spear that pierced Christ\'s side. From the wound flowed blood and water — death and life.',
        color: '#ffd700',
        skills: [
          { id: 'spr_holy_point', name: 'Holy Point', desc: 'Spear attacks deal 10% bonus holy damage to spiritual enemies.', cost: 1, masteryReq: 1, effect: 'spear_holy_10_spiritual' },
          { id: 'spr_blood_water', name: 'Blood and Water', desc: 'When Usagi takes damage from a spear, he has a 15% chance to heal for the same amount. "From the wound, life."', cost: 1, masteryReq: 3, requires: ['spr_holy_point'], effect: 'damage_to_heal_15' },
          { id: 'spr_centurions_faith', name: "Centurion's Faith", desc: '"Truly this was the Son of God." Spear attacks gain +3% damage per Faith level.', cost: 1, masteryReq: 5, requires: ['spr_blood_water'], effect: 'spear_faith_scaling_3pct' },
          { id: 'spr_pierce_veil', name: 'Pierce the Veil', desc: 'Spear attacks ignore magical barriers and shields. "The veil of the temple was torn in two."', cost: 2, masteryReq: 7, requires: ['spr_centurions_faith'], effect: 'ignore_barriers' },
          { id: 'spr_sacred_ult', name: 'Spear of Destiny', desc: 'ULTIMATE: The spear glows with sacred fire. 3.5× holy damage to all enemies. Enemies killed by this attack cannot resurrect. Heals all allies for 30% max HP. "It is finished." Once per battle.', cost: 3, masteryReq: 10, requires: ['spr_pierce_veil'], effect: { type: 'ultimate', damage: 3.5, target: 'all', damage_type: 'holy', no_resurrect: true, heal_all: 0.3, once_per_battle: true } },
        ],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // BOW — The Watchman's Path
  // ─────────────────────────────────────────────────────────────
  bow: {
    weaponType: 'bow',
    name: 'Way of the Watchman',
    description: 'The archer sees what others miss. Patience, distance, a single arrow at the right moment. The watchman on the wall sees the danger before it arrives.',
    icon: '🏹',
    branches: {

      martial: {
        name: 'Kyūjutsu (Archery)',
        description: 'The Japanese art of the bow. Precision over power.',
        color: '#cc3333',
        skills: [
          { id: 'bow_aimed_shot', name: 'Aimed Shot', desc: '1.3× damage. Cannot miss. Requires standing still this turn.', cost: 1, masteryReq: 1, effect: { type: 'active', damage: 1.3, no_miss: true, requires_no_move: true } },
          { id: 'bow_rapid_fire', name: 'Rapid Fire', desc: '3 arrows at 0.5× damage each. Targets randomly.', cost: 1, masteryReq: 2, requires: ['bow_aimed_shot'], effect: { type: 'active', hits: 3, damage_per_hit: 0.5, random_target: true } },
          { id: 'bow_weak_spot', name: 'Weak Spot', desc: 'Passive: Bow attacks have +10% critical chance.', cost: 1, masteryReq: 3, requires: ['bow_rapid_fire'], passive: { crit: 10 } },
          { id: 'bow_pin_arrow', name: 'Pinning Arrow', desc: 'Arrow pins target. 0.8× damage + immobilize for 2 turns.', cost: 1, masteryReq: 5, requires: ['bow_weak_spot'], effect: { type: 'active', damage: 0.8, immobilize: 2 } },
          { id: 'bow_rain', name: 'Arrow Rain', desc: 'Fire into the sky. All enemies hit for 0.6× damage next turn. Ignores cover and evasion.', cost: 2, masteryReq: 7, requires: ['bow_pin_arrow'], effect: { type: 'active', delayed_aoe: true, damage: 0.6, ignore_evasion: true } },
          { id: 'bow_martial_ult', name: 'Nasu no Yoichi', desc: 'ULTIMATE: A legendary shot across impossible distance. 4.0× damage to single target. Hits any enemy regardless of position, barriers, or phase. If enemy is airborne or retreating, damage is 6.0×.', cost: 3, masteryReq: 10, requires: ['bow_rain'], effect: { type: 'ultimate', damage: 4.0, ignore_all: true, airborne_bonus: 6.0, cooldown: 5 } },
        ],
      },

      guardian: {
        name: 'Sentinel',
        description: 'The archer controls the field. Vision is protection.',
        color: '#4a7c59',
        skills: [
          { id: 'bow_overwatch', name: 'Overwatch', desc: 'Skip turn. Next enemy that acts is automatically shot for 0.8× damage.', cost: 1, masteryReq: 1, effect: { type: 'active', overwatch: true, damage: 0.8 } },
          { id: 'bow_scout', name: 'Scout', desc: 'Passive: +20% chance to avoid random encounters. See enemy formations before battle.', cost: 1, masteryReq: 2, requires: ['bow_overwatch'], effect: 'encounter_avoid_20_preview' },
          { id: 'bow_suppressive', name: 'Suppressive Fire', desc: 'Active: Target area. All enemies in area have -20% accuracy for 2 turns.', cost: 1, masteryReq: 4, requires: ['bow_scout'], effect: { type: 'active', debuff_accuracy: 0.2, duration: 2, target: 'all' } },
          { id: 'bow_retreat_cover', name: 'Covering Retreat', desc: 'If Usagi flees, 100% success rate. Fire a parting shot at 0.5× damage.', cost: 1, masteryReq: 6, requires: ['bow_suppressive'], effect: 'flee_guaranteed_parting_shot' },
          { id: 'bow_watchtower', name: 'Watchtower', desc: 'Passive: See all hidden enemies, traps, and ambushes on the map. +5% evasion.', cost: 2, masteryReq: 8, requires: ['bow_retreat_cover'], passive: { evasion: 5 }, effect: 'reveal_map_all' },
          { id: 'bow_guard_ult', name: 'Angel of the Wall', desc: 'ULTIMATE: Take position. For 4 turns, every enemy action triggers a 0.5× counter-shot. Usagi cannot be targeted by melee attacks during this time. "No one passes the wall."', cost: 3, masteryReq: 10, requires: ['bow_watchtower'], effect: { type: 'ultimate', counter_all: 0.5, melee_immune: true, duration: 4, cooldown: 'once_per_battle' } },
        ],
      },

      sacred: {
        name: 'Light Arrow',
        description: 'The arrow of truth. It finds its mark across any distance, through any deception.',
        color: '#ffd700',
        skills: [
          { id: 'bow_light_tip', name: 'Light-Tipped Arrow', desc: 'Bow attacks deal 10% bonus holy damage.', cost: 1, masteryReq: 1, effect: 'bow_holy_10' },
          { id: 'bow_revelation', name: 'Arrow of Revelation', desc: 'Active: Fire a glowing arrow at target. Reveals all stats, weaknesses, and hidden abilities. Deals 0.5× holy damage.', cost: 1, masteryReq: 3, requires: ['bow_light_tip'], effect: { type: 'active', damage: 0.5, reveal: true } },
          { id: 'bow_prayer_arc', name: 'Prayer Arc', desc: 'Each arrow fired while a miracle buff is active deals +25% holy damage.', cost: 1, masteryReq: 5, requires: ['bow_revelation'], effect: 'bow_miracle_synergy_25' },
          { id: 'bow_star_shot', name: 'Star of Bethlehem', desc: 'Fire a luminous arrow skyward. It falls 2 turns later dealing 2.0× holy damage to all enemies and revealing all hidden elements.', cost: 2, masteryReq: 7, requires: ['bow_prayer_arc'], effect: { type: 'active', delayed: 2, damage: 2.0, target: 'all', reveal_all: true } },
          { id: 'bow_sacred_ult', name: 'Sagitta Dei', desc: 'ULTIMATE: "Arrow of God." A single arrow of pure light. Tracks target across any distance or dimension. 4.0× holy damage. If target is the Accuser, forces him to materialize and removes one of his immunities permanently. Once per battle.', cost: 3, masteryReq: 10, requires: ['bow_star_shot'], effect: { type: 'ultimate', damage: 4.0, damage_type: 'holy', tracks: true, accuser_strip: true, once_per_battle: true } },
        ],
      },
    },
  },
};


// ═══════════════════════════════════════════════════════════════
// BLESSING SKILL TREES
// ═══════════════════════════════════════════════════════════════

export const BLESSING_TREES = {

  // ─────────────────────────────────────────────────────────────
  // PRIESTLY BLESSING — The Shepherd's Grace
  // ─────────────────────────────────────────────────────────────
  priest_blessing: {
    id: 'priest_blessing',
    name: "The Shepherd's Grace",
    description: 'A priest blesses the item with prayer and the Sign of the Cross. The most common form of blessing, but its power grows with the priest\'s holiness — and yours.',
    icon: '✝',
    doctrine: 'CCC 1670: Sacramentals prepare us to receive grace and dispose us to cooperate with it.',
    tiers: [
      {
        tier: 1,
        name: 'Blessed',
        description: 'The item is marked by prayer. A faint warmth.',
        unlockCondition: 'Any priest NPC can apply this blessing.',
        skills: [
          { id: 'pb_warmth', name: 'Warmth of Blessing', desc: 'Blessed item grants SPR +2.', cost: 0, passive: { spr: 2 } },
          { id: 'pb_holy_resist', name: 'Holy Resilience', desc: 'Blessed item grants 5% resistance to spiritual attacks.', cost: 1, requires: ['pb_warmth'], passive: { spiritual_resist: 5 } },
          { id: 'pb_detect_evil', name: 'Evil Detection', desc: 'Blessed item vibrates near demonic enemies. Reveals hidden spiritual threats in a 3-tile radius.', cost: 1, requires: ['pb_warmth'], effect: 'detect_evil_3' },
        ],
      },
      {
        tier: 2,
        name: 'Consecrated',
        description: 'The blessing deepens through use and prayer. The item remembers every battle, every prayer.',
        unlockCondition: 'Use the blessed item in 50+ battles. Rest at 3+ sacred sites.',
        skills: [
          { id: 'pb_consecrated_edge', name: 'Consecrated Edge', desc: 'Blessed weapons deal +10% holy damage passively.', cost: 1, requires: ['pb_holy_resist'], effect: 'blessed_weapon_holy_10' },
          { id: 'pb_prayer_echo', name: 'Prayer Echo', desc: 'When you Pray in battle while holding a blessed item, 20% chance the prayer echoes (casts twice at half power).', cost: 2, requires: ['pb_consecrated_edge'], effect: 'miracle_echo_20' },
          { id: 'pb_shield_of_faith', name: 'Shield of Faith', desc: 'Blessed armor/garments reduce incoming damage by an additional 5%.', cost: 1, requires: ['pb_holy_resist'], passive: { damage_reduction: 0.05 } },
        ],
      },
      {
        tier: 3,
        name: 'Sanctified',
        description: 'The item is no longer merely blessed. It has become a vessel. Saints would recognize it.',
        unlockCondition: 'Use the blessed item in 200+ battles. Faith ≥ 6. Complete a pilgrimage quest.',
        skills: [
          { id: 'pb_saints_vessel', name: "Saint's Vessel", desc: 'The item periodically generates a free Holy Water charge (1 per 20 battles).', cost: 2, requires: ['pb_prayer_echo'], effect: 'generate_holy_water_20battles' },
          { id: 'pb_incorruptible', name: 'Incorruptible', desc: 'Blessed item cannot be destroyed, stolen, or cursed. Its quality cannot degrade.', cost: 2, requires: ['pb_shield_of_faith'], effect: 'item_indestructible' },
          { id: 'pb_intercessor', name: "Intercessor's Grace", desc: 'ULTIMATE: Once per book, when Usagi would die, the blessed item glows and fully heals him. The item\'s description changes permanently, noting the miracle.', cost: 3, requires: ['pb_saints_vessel', 'pb_incorruptible'], effect: { type: 'ultimate', death_save_full_heal: true, once_per_book: true, description_change: true } },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // ASPERSION — The Baptismal Grace
  // ─────────────────────────────────────────────────────────────
  holy_water_blessing: {
    id: 'holy_water_blessing',
    name: 'The Baptismal Grace',
    description: 'Sprinkled with holy water, recalling baptism — the first sacrament, the gateway to all others. Water purifies, cleanses, and renews.',
    icon: '💧',
    doctrine: 'CCC 1213: Baptism is the basis of the whole Christian life, the gateway to life in the Spirit.',
    tiers: [
      {
        tier: 1,
        name: 'Aspersed',
        description: 'Holy water clings to the item like morning dew.',
        unlockCondition: 'Player applies holy water (requires Faith ≥ 2).',
        skills: [
          { id: 'hw_purify', name: 'Purifying Touch', desc: 'Aspersed item grants immunity to Poison.', cost: 0, effect: 'immune_poison' },
          { id: 'hw_cleanse_strike', name: 'Cleansing Strike', desc: 'Aspersed weapons have 15% chance to cure one random negative status on hit.', cost: 1, requires: ['hw_purify'], effect: 'cure_status_on_hit_15' },
          { id: 'hw_water_ward', name: 'Water Ward', desc: 'Aspersed armor grants +10% resistance to Burn.', cost: 1, requires: ['hw_purify'], passive: { burn_resist: 10 } },
        ],
      },
      {
        tier: 2,
        name: 'Baptismal',
        description: 'The water remembers its blessing. The item remembers its baptism.',
        unlockCondition: 'Blessed item used to cure 10+ status effects in battle.',
        skills: [
          { id: 'hw_renewal', name: 'Renewal', desc: 'Once per battle, all negative statuses are automatically cleansed when HP drops below 30%.', cost: 1, requires: ['hw_cleanse_strike'], effect: 'auto_cleanse_below_30' },
          { id: 'hw_living_water', name: 'Living Water', desc: 'Aspersed item passively regenerates 2% max HP per turn.', cost: 2, requires: ['hw_renewal'], passive: { hp_regen_pct: 2 } },
          { id: 'hw_baptism_fire', name: 'Baptism of Fire', desc: 'Aspersed weapons convert 20% of physical damage to holy damage.', cost: 1, requires: ['hw_water_ward'], effect: 'convert_20_holy' },
        ],
      },
      {
        tier: 3,
        name: 'Jordan\'s Blessing',
        description: 'The water of the Jordan flows through the item. The Spirit descends.',
        unlockCondition: 'Faith ≥ 7. Hope ≥ 5. Find the hidden Jordan Spring in Book I or II.',
        skills: [
          { id: 'hw_spirit_descends', name: 'The Spirit Descends', desc: 'At the start of each battle, all negative status effects on Usagi are cleansed and he gains a 3-turn buff: +3 to all stats.', cost: 2, requires: ['hw_living_water'], effect: { battle_start_cleanse: true, buff_all: 3, buff_duration: 3 } },
          { id: 'hw_flood', name: 'Flood', desc: 'Active: Unleash the item\'s stored holy water. All enemies take 1.5× SPR as holy damage and are Slowed for 2 turns. Consumes the aspersion (must re-bless to use again).', cost: 2, requires: ['hw_baptism_fire'], effect: { type: 'active', damage: 1.5, damage_stat: 'spr', target: 'all', slow: 2, consumes_blessing: true } },
          { id: 'hw_jordan_ult', name: 'River of Life', desc: 'ULTIMATE: The item overflows with grace. For 5 turns, Usagi is immune to all status effects, heals 5% HP per turn, and all his attacks purify (remove one buff from each enemy hit). "A river of living water shall flow."', cost: 3, requires: ['hw_spirit_descends', 'hw_flood'], effect: { type: 'ultimate', immune_status: true, regen: 0.05, purify_on_hit: true, duration: 5, once_per_battle: true } },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // CHRISM ANOINTING — The Bishop's Seal
  // ─────────────────────────────────────────────────────────────
  chrism_anointing: {
    id: 'chrism_anointing',
    name: "The Bishop's Seal",
    description: 'Oil mixed with balsam, consecrated by a bishop. The anointing of kings and priests. In all of hidden Japan, there may be one vial left.',
    icon: '👑',
    doctrine: 'CCC 1241: The anointing with sacred Chrism signifies the gift of the Holy Spirit.',
    tiers: [
      {
        tier: 1,
        name: 'Chrismated',
        description: 'The oil sinks into the material. It will never wash out.',
        unlockCondition: 'Applied by a priest NPC using Sacred Chrism (legendary consumable).',
        skills: [
          { id: 'ch_all_stats', name: 'Anointed Strength', desc: 'Chrismated item grants +1 to ALL stats (ATK, DEF, SPD, SPR).', cost: 0, passive: { atk: 1, def: 1, spd: 1, spr: 1 } },
          { id: 'ch_holy_aura', name: 'Holy Aura', desc: 'Chrismated item emits an aura. Weak spiritual enemies (10+ levels below) cannot approach in the field.', cost: 1, requires: ['ch_all_stats'], effect: 'repel_weak_spiritual' },
          { id: 'ch_status_wall', name: 'Anointed Resilience', desc: '+10% resistance to ALL status effects.', cost: 1, requires: ['ch_all_stats'], passive: { all_status_resist: 10 } },
        ],
      },
      {
        tier: 2,
        name: 'Sealed',
        description: 'The Chrism has bonded with the item\'s essence. It is permanently changed.',
        unlockCondition: 'Win 30 battles with chrismated item. Charity ≥ 4.',
        skills: [
          { id: 'ch_kings_mark', name: "King's Mark", desc: 'NPC traders offer 20% better prices when Usagi wears chrismated equipment. Certain doors and seals recognize the anointing.', cost: 1, requires: ['ch_holy_aura'], effect: 'trade_bonus_20_seal_access' },
          { id: 'ch_spirit_armor', name: 'Spirit Armor', desc: 'Chrismated armor absorbs the first spiritual attack each battle completely.', cost: 2, requires: ['ch_status_wall'], effect: 'absorb_first_spiritual' },
          { id: 'ch_miracle_amp', name: 'Miracle Amplifier', desc: 'Miracles cast while wearing chrismated items deal +20% damage or +20% healing.', cost: 2, requires: ['ch_kings_mark'], passive: { miracle_power: 0.2 } },
        ],
      },
      {
        tier: 3,
        name: 'Pentecostal',
        description: 'The Spirit moves through the item. Tongues of fire hover above it.',
        unlockCondition: 'Faith ≥ 8. All seven virtues ≥ 3. Witness a miracle in the storyline.',
        skills: [
          { id: 'ch_tongues_fire', name: 'Tongues of Fire', desc: 'Chrismated weapon is permanently wreathed in holy flame. All attacks deal hybrid physical+holy. +5 ATK, +5 SPR.', cost: 2, requires: ['ch_miracle_amp'], passive: { atk: 5, spr: 5 }, effect: 'permanent_holy_flame' },
          { id: 'ch_gifts_spirit', name: 'Gifts of the Spirit', desc: 'At the start of each battle, randomly gain one of: Wisdom (+30% miracle power), Fortitude (+30% DEF), or Counsel (reveal all enemy weaknesses). Lasts entire battle.', cost: 2, requires: ['ch_spirit_armor'], effect: 'random_gift_per_battle' },
          { id: 'ch_pentecost_ult', name: 'Pentecost', desc: 'ULTIMATE: The seven gifts of the Holy Spirit activate simultaneously. For 3 turns: +30% ALL stats, immune to all status effects, miracles cost 0 MP, all attacks deal pure holy damage. The item glows so brightly that weak enemies flee. Once per book.', cost: 3, requires: ['ch_tongues_fire', 'ch_gifts_spirit'], effect: { type: 'ultimate', all_stats_30: true, immune_all: true, free_miracles: true, holy_all: true, flee_weak: true, duration: 3, once_per_book: true } },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // MIRACLE-TOUCHED — Heaven's Fingerprint
  // ─────────────────────────────────────────────────────────────
  miracle_blessing: {
    id: 'miracle_blessing',
    name: "Heaven's Fingerprint",
    description: 'When a miracle is cast while holding an item, sometimes the miracle leaves a mark. The item remembers the touch of heaven. This cannot be planned or purchased. It happens by grace.',
    icon: '✦',
    doctrine: 'CCC 2015: The way of perfection passes by way of the Cross.',
    tiers: [
      {
        tier: 1,
        name: 'Light-Touched',
        description: 'A faint glow in darkness. The item hums during prayer.',
        unlockCondition: 'Cast 20+ miracles while holding this item. Random chance per cast (5%).',
        skills: [
          { id: 'mt_prayer_hum', name: 'Prayer Resonance', desc: 'The item hums during prayer. +1 MP restored after each miracle cast.', cost: 0, passive: { mp_on_miracle: 1 } },
          { id: 'mt_light_glow', name: 'Divine Glow', desc: 'In dark areas, the item provides light (reveals 2-tile radius). Weak undead take 5% holy damage per turn nearby.', cost: 1, requires: ['mt_prayer_hum'], effect: 'light_2_tile_undead_5' },
          { id: 'mt_faith_memory', name: 'Faith Memory', desc: 'The item stores the last miracle cast. Once per battle, you can recast it for free.', cost: 1, requires: ['mt_prayer_hum'], effect: 'store_last_miracle_free_recast' },
        ],
      },
      {
        tier: 2,
        name: 'Heaven-Marked',
        description: 'The fingerprint of heaven is visible. Others can see it — the item glows to the faithful.',
        unlockCondition: 'Cast 100+ miracles total. Item has been miracle-touched for 3+ books.',
        skills: [
          { id: 'mt_miracle_chain', name: 'Miracle Chain', desc: 'When casting a miracle, 15% chance a second random miracle activates for free.', cost: 2, requires: ['mt_faith_memory'], effect: 'miracle_chain_15' },
          { id: 'mt_heavens_echo', name: "Heaven's Echo", desc: 'Healing miracles cast with this item heal 30% more.', cost: 1, requires: ['mt_light_glow'], passive: { heal_bonus: 0.3 } },
          { id: 'mt_burning_bright', name: 'Burning Bright', desc: 'Offensive miracles cast with this item have +20% critical chance.', cost: 2, requires: ['mt_miracle_chain'], passive: { miracle_crit: 20 } },
        ],
      },
      {
        tier: 3,
        name: 'Relic',
        description: 'The item has transcended its material nature. It is a first-class relic — an object touched by holiness so often it has become holy itself.',
        unlockCondition: 'Cast 500+ miracles. Faith 10. Witness a storyline miracle. Item has been equipped for 5+ books.',
        skills: [
          { id: 'mt_relic_presence', name: 'Relic Presence', desc: 'Passive: All allies in battle gain +2 SPR and +5% miracle power. NPCs react with reverence. Certain locked areas open.', cost: 2, requires: ['mt_heavens_echo'], effect: 'aura_spr_2_miracle_5' },
          { id: 'mt_intercession', name: 'Intercession', desc: 'Once per battle, call upon the saints. A random powerful miracle is cast for free (from the full miracle list, including unlearned ones).', cost: 2, requires: ['mt_burning_bright'], effect: 'random_miracle_free_once' },
          { id: 'mt_relic_ult', name: 'Living Relic', desc: 'ULTIMATE: The item achieves sentience of a kind — not thought, but prayer. It prays on its own. At the start of each turn, a random minor miracle effect triggers (small heal, small buff, small damage to enemies). The item\'s description becomes a prayer. Once unlocked, permanent.', cost: 3, requires: ['mt_relic_presence', 'mt_intercession'], effect: { type: 'ultimate', auto_minor_miracle: true, permanent: true } },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // DEVOTION GRACE — The Quiet Reward
  // ─────────────────────────────────────────────────────────────
  devotion_grace: {
    id: 'devotion_grace',
    name: 'The Quiet Reward',
    description: 'This is the surprise. The player doesn\'t know devotion graces exist. One day, after their hundredth battle with the same blade, they rest at a sacred site and the item description changes: "The wood of the handle has grown warm. It does not cool." Faithfulness is rewarded.',
    icon: '🕯',
    doctrine: 'CCC 2015: The way of perfection passes by way of the Cross. There is no holiness without renunciation and spiritual battle.',
    tiers: [
      {
        tier: 1,
        name: 'Familiar',
        description: 'The item knows your hand. Your hand knows the item.',
        unlockCondition: 'HIDDEN. Triggered automatically after 100 battles with the same item equipped.',
        skills: [
          { id: 'dg_comfort', name: 'Comfortable Grip', desc: 'The item feels lighter. +1 SPD when equipped.', cost: 0, passive: { spd: 1 } },
          { id: 'dg_worn_smooth', name: 'Worn Smooth', desc: 'The item has adapted to you. +2% crit chance.', cost: 0, requires: ['dg_comfort'], passive: { crit: 2 } },
          { id: 'dg_whisper', name: 'The Whisper', desc: 'Sometimes, in quiet moments, you hear it. Not words — feeling. The item warns you of danger. +5% evasion.', cost: 0, requires: ['dg_worn_smooth'], passive: { evasion: 5 } },
        ],
      },
      {
        tier: 2,
        name: 'Devoted',
        description: 'You could have chosen a better weapon. You didn\'t. The item remembers.',
        unlockCondition: 'HIDDEN. 250 battles with same item. Must have refused to replace it at least once when offered a "better" item.',
        skills: [
          { id: 'dg_faithful_edge', name: 'Faithful Edge', desc: 'The item performs beyond its stats. Effective quality grade is +1 (max Artificer).', cost: 0, requires: ['dg_whisper'], effect: 'quality_plus_1' },
          { id: 'dg_soul_bond', name: 'Soul Bond', desc: 'If the item is lost, stolen, or broken, it returns to Usagi\'s inventory within 3 battles. It finds its way back.', cost: 0, requires: ['dg_faithful_edge'], effect: 'item_always_returns' },
          { id: 'dg_prayer_marks', name: 'Prayer Marks', desc: 'Small scratches in the wood/metal form patterns. They are prayers — in a language older than Latin. +3 SPR.', cost: 0, requires: ['dg_soul_bond'], passive: { spr: 3 } },
        ],
      },
      {
        tier: 3,
        name: 'Sanctified by Use',
        description: 'The item has become an extension of your soul. Dropping it would feel like losing a limb. Priests who see it genuflect.',
        unlockCondition: 'HIDDEN. 500 battles. Must have blessed the item at least once. Faith ≥ 7. Item has been equipped across 3+ books.',
        skills: [
          { id: 'dg_warmth', name: 'The Warmth That Does Not Cool', desc: 'The item is always warm. Immune to cold/frost effects. +3 to ALL stats.', cost: 0, requires: ['dg_prayer_marks'], passive: { atk: 3, def: 3, spd: 3, spr: 3 } },
          { id: 'dg_name', name: 'It Has a Name', desc: 'The item\'s name changes. It is no longer "Pilgrim\'s Blade" — it is "(Usagi\'s name)\'s Blade" or a name the player chooses. +10% to all damage.', cost: 0, requires: ['dg_warmth'], effect: { rename_item: true, damage_bonus: 0.1 } },
          { id: 'dg_devotion_ult', name: 'Grandmother\'s Prayer Answered', desc: 'ULTIMATE: The item carries the accumulated prayer of every soul who touched it — including Obaa-chan. Once per game (not per battle — once EVER), the item can perform a miracle of its own: full heal, full cleanse, full MP restore, and the Accuser is forced to retreat from the current battle. The item\'s description changes one final time: "She never stopped praying. Neither did you."', cost: 0, requires: ['dg_name'], effect: { type: 'ultimate', full_heal: true, full_mp: true, full_cleanse: true, force_accuser_retreat: true, once_per_game: true, description: "She never stopped praying. Neither did you." } },
        ],
      },
    ],
  },
};


// ═══════════════════════════════════════════════════════════════
// CROSS-TREE SYNERGIES
// ═══════════════════════════════════════════════════════════════

export const SYNERGIES = [
  {
    id: 'syn_holy_warrior',
    name: 'Holy Warrior',
    description: 'Combining martial prowess with divine blessing.',
    requirements: { weapon_skills: 5, blessing_skills: 3 },
    bonus: { holy_damage: 0.15, crit: 5 },
  },
  {
    id: 'syn_peaceful_strength',
    name: 'Peaceful Strength',
    description: 'The paradox of the strong pacifist.',
    requirements: { guardian_branch: 4, sacred_branch: 4 },
    bonus: { def: 5, spr: 5, miracle_power: 0.1 },
  },
  {
    id: 'syn_pilgrim_ascetic',
    name: 'Pilgrim Ascetic',
    description: 'Walking the hardest road with the least.',
    requirements: { staff_sacred: 3, fist_sacred: 3 },
    bonus: { mp_regen: 2, status_resist_all: 10 },
  },
  {
    id: 'syn_templar',
    name: 'Templar',
    description: 'Sword and cross united.',
    requirements: { katana_martial: 3, cross_blade_sacred: 3 },
    bonus: { atk: 3, spr: 3, holy_damage: 0.1 },
  },
  {
    id: 'syn_devotion_master',
    name: 'Master of Devotion',
    description: 'The quiet faithfulness that transcends systems.',
    requirements: { devotion_grace_tier_3: true, any_weapon_mastery_10: true },
    bonus: { all_stats: 5, damage_bonus: 0.1, miracle_power: 0.15 },
  },
  {
    id: 'syn_seven_virtues',
    name: 'Seven Virtues Complete',
    description: 'All seven virtues at level 5+.',
    requirements: { all_virtues_5: true },
    bonus: { all_stats: 3, holy_damage: 0.2, damage_reduction: 0.1, mp_regen: 3 },
  },
];
