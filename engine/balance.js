/**
 * SAMURAI USAGI — BALANCE ENGINE
 * ================================
 * Difficulty modes, damage formulas, level curves, encounter scaling.
 *
 * Philosophy: Challenging but fair. Death means something.
 * The game is about enduring persecution — combat should feel like
 * a struggle where prayer and virtue matter as much as stats.
 *
 * Reference: FF6 damage curves, Chrono Trigger encounter pacing.
 */

// ═══════════════════════════════════════════════════════════════
// DIFFICULTY SYSTEM
// ═══════════════════════════════════════════════════════════════

export class DifficultyManager {
  constructor() {
    this.mode = 'disciple';  // Default: intended experience
    this.modes = {};
    this.loaded = false;
  }

  async load(basePath = '') {
    try {
      const resp = await fetch(`${basePath}data/balance.json`);
      const data = await resp.json();
      this.modes = data.difficulty_modes || {};
      this.levelSystem = data.level_system || {};
      this.damageFormulas = data.damage_formulas || {};
      this.encounterRules = data.encounter_tables || {};
      this.enemyDesignRules = data.enemy_design_rules || {};
      this.loaded = true;
    } catch (err) {
      console.warn('Balance data not found, using defaults:', err.message);
      this._loadDefaults();
    }
  }

  _loadDefaults() {
    this.modes = {
      pilgrim:  { enemy_hp_mult: 0.7, enemy_atk_mult: 0.7, enemy_def_mult: 0.8, enemy_spd_mult: 0.9, xp_mult: 1.5, gold_mult: 1.5, item_drop_bonus: 0.2, encounter_rate_mult: 0.7, ai_aggression: 0.6, player_heal_bonus: 1.3, virtue_gain_bonus: 1.2, accuser_status_duration_mult: 0.5, revive_on_defeat: true, revive_hp_pct: 50 },
      disciple: { enemy_hp_mult: 1.0, enemy_atk_mult: 1.0, enemy_def_mult: 1.0, enemy_spd_mult: 1.0, xp_mult: 1.0, gold_mult: 1.0, item_drop_bonus: 0.0, encounter_rate_mult: 1.0, ai_aggression: 1.0, player_heal_bonus: 1.0, virtue_gain_bonus: 1.0, accuser_status_duration_mult: 1.0, revive_on_defeat: false },
      martyr:   { enemy_hp_mult: 1.4, enemy_atk_mult: 1.3, enemy_def_mult: 1.2, enemy_spd_mult: 1.15, xp_mult: 0.8, gold_mult: 0.7, item_drop_bonus: -0.1, encounter_rate_mult: 1.3, ai_aggression: 1.5, player_heal_bonus: 0.8, virtue_gain_bonus: 0.8, accuser_status_duration_mult: 1.5, revive_on_defeat: false, boss_extra_phase: true },
    };
    this.loaded = true;
  }

  setDifficulty(mode) {
    if (this.modes[mode]) this.mode = mode;
  }

  get current() {
    return this.modes[this.mode] || this.modes.disciple;
  }

  /** Apply difficulty scaling to enemy base stats */
  scaleEnemyStats(baseStats) {
    const d = this.current;
    return {
      hp:  Math.max(1, Math.round(baseStats.hp * d.enemy_hp_mult)),
      atk: Math.max(1, Math.round(baseStats.atk * d.enemy_atk_mult)),
      def: Math.max(0, Math.round(baseStats.def * d.enemy_def_mult)),
      spd: Math.max(1, Math.round(baseStats.spd * d.enemy_spd_mult)),
      spr: baseStats.spr || 0,
    };
  }

  /** Scale XP reward */
  scaleXP(baseXP) {
    return Math.max(1, Math.round(baseXP * this.current.xp_mult));
  }

  /** Scale gold reward */
  scaleGold(baseGold) {
    return Math.max(0, Math.round(baseGold * this.current.gold_mult));
  }

  /** Check if item drops (with difficulty bonus) */
  checkItemDrop(baseChance) {
    return Math.random() < (baseChance + (this.current.item_drop_bonus || 0));
  }

  /** Scale encounter rate */
  getEncounterRate(baseRate) {
    return baseRate * (this.current.encounter_rate_mult || 1);
  }

  /** Scale healing amount */
  scaleHealing(baseHeal) {
    return Math.round(baseHeal * (this.current.player_heal_bonus || 1));
  }

  /** Scale virtue gain */
  scaleVirtueGain(baseGain) {
    return Math.round(baseGain * (this.current.virtue_gain_bonus || 1));
  }

  /** Should boss have extra phase? (Martyr only) */
  hasBossExtraPhase() {
    return this.current.boss_extra_phase === true;
  }
}


// ═══════════════════════════════════════════════════════════════
// DAMAGE CALCULATOR — FF6-inspired formulas
// ═══════════════════════════════════════════════════════════════

export class DamageCalculator {
  /**
   * Physical attack damage.
   * Formula: (atk * level / 4 + atk^2 / 64) * variance - (def^2 / 256)
   * Quadratic scaling — level-ups feel impactful. Defense also quadratic.
   */
  static physicalDamage(atk, level, targetDef, options = {}) {
    const base = (atk * level / 4) + (atk * atk / 64);
    const defense = (targetDef * targetDef) / 256;
    const variance = 0.875 + Math.random() * 0.25; // 87.5% - 112.5%
    let damage = Math.floor((base * variance) - defense);

    // Critical hit
    if (options.critChance && Math.random() < options.critChance) {
      damage = Math.floor(damage * 1.5);
      options._crit = true;
    }

    // Weakness/resistance
    if (options.weaknessMult) damage = Math.floor(damage * options.weaknessMult);

    return Math.max(1, Math.min(9999, damage));
  }

  /**
   * Holy/spiritual damage.
   * Ignores physical defense. Uses SPR and faith virtue.
   * Formula: (spr * level / 4 + spr^2 / 64) * (1 + faith * 0.08) * variance
   */
  static holyDamage(spr, level, faithVirtue, options = {}) {
    const base = (spr * level / 4) + (spr * spr / 64);
    const faithBonus = 1 + (faithVirtue || 0) * 0.08;
    const variance = 0.875 + Math.random() * 0.25;
    let damage = Math.floor(base * faithBonus * variance);

    // Bonus vs undead/shadow/accuser
    if (options.bonusVsType) damage = Math.floor(damage * 1.5);

    return Math.max(1, Math.min(9999, damage));
  }

  /**
   * Healing amount.
   * Formula: (spr * 2 + charity * 3) * (1 + charity * 0.10) * variance
   */
  static healing(spr, charityVirtue, options = {}) {
    const base = spr * 2 + (charityVirtue || 0) * 3;
    const charityBonus = 1 + (charityVirtue || 0) * 0.10;
    const variance = 0.9 + Math.random() * 0.2;
    let heal = Math.floor(base * charityBonus * variance);

    if (options.difficultyScale) heal = Math.round(heal * options.difficultyScale);

    return Math.max(1, heal);
  }

  /**
   * Enemy attack damage against player.
   * Formula: (enemy_atk * difficulty_mult * variance) - (player_def^2 / 256)
   */
  static enemyDamage(enemyAtk, playerDef, difficultyMult = 1, options = {}) {
    const base = enemyAtk * difficultyMult;
    const defense = (playerDef * playerDef) / 256;
    const variance = 0.85 + Math.random() * 0.3;
    let damage = Math.floor(base * variance - defense);

    return Math.max(1, Math.min(9999, damage));
  }

  /**
   * Spiritual attack damage (Accuser, shadow enemies).
   * Uses attacker's SPR vs defender's SPR. Virtue can resist.
   */
  static spiritDamage(attackerSpr, defenderSpr, defenderVirtues, options = {}) {
    const base = attackerSpr * 1.5;
    const defense = defenderSpr * 0.5;
    const virtueResist = (defenderVirtues[options.counterVirtue] || 0) * 2;
    const variance = 0.9 + Math.random() * 0.2;
    let damage = Math.floor((base - defense - virtueResist) * variance);

    return Math.max(0, damage); // Spiritual damage CAN be reduced to 0 by high virtue
  }

  /**
   * Critical hit chance.
   * Base 6% + 3% per prudence level.
   */
  static critChance(prudenceVirtue) {
    return 0.06 + (prudenceVirtue || 0) * 0.03;
  }
}


// ═══════════════════════════════════════════════════════════════
// LEVEL SYSTEM
// ═══════════════════════════════════════════════════════════════

export class LevelSystem {
  constructor(balanceData) {
    this.xpTable = balanceData?.level_system?.xp_curve?.table || this._defaultXPTable();
    this.statGrowth = balanceData?.level_system?.stat_growth || this._defaultGrowth();
    this.maxLevel = balanceData?.level_system?.max_level || 100;
  }

  _defaultXPTable() {
    // Three-phase curve: Novice (1-30), Veteran (31-60), Saint (61-100)
    const table = [0];
    for (let i = 1; i <= 100; i++) {
      if (i <= 30) {
        table.push(Math.floor(20 * Math.pow(i, 1.65)));
      } else if (i <= 60) {
        const adj = i - 30;
        const p1 = Math.floor(20 * Math.pow(30, 1.65));
        table.push(p1 + Math.floor(45 * Math.pow(adj, 1.75)));
      } else {
        const adj = i - 60;
        const p1 = Math.floor(20 * Math.pow(30, 1.65));
        const p2 = p1 + Math.floor(45 * Math.pow(30, 1.75));
        table.push(p2 + Math.floor(80 * Math.pow(adj, 1.85)));
      }
    }
    return table;
  }

  _defaultGrowth() {
    return {
      hp:  [0, 5, 5, 6, 6, 8, 8, 9, 7, 7, 6, 6, 7, 8, 8, 9, 10, 10, 9, 8, 7, 7, 6, 6, 5, 5, 5, 4, 4, 4, 4],
      mp:  [0, 2, 2, 2, 3, 3, 3, 4, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2],
      atk: [0, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      def: [0, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      spd: [0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      spr: [0, 1, 1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 2, 1, 2, 2, 3, 2, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1],
    };
  }

  /** Get XP needed to reach next level */
  xpForLevel(level) {
    if (level < 0 || level >= this.maxLevel) return Infinity;
    return this.xpTable[level] || Infinity;
  }

  /** Get cumulative XP for a level */
  cumulativeXP(level) {
    let total = 0;
    for (let i = 1; i <= level; i++) {
      total += this.xpTable[i] || 0;
    }
    return total;
  }

  /**
   * Process XP gain and level up if needed.
   * @returns Array of level-up events with stat gains
   */
  addXP(player, xpAmount) {
    const levelUps = [];
    player.xp = (player.xp || 0) + xpAmount;

    while (player.level < this.maxLevel) {
      const needed = this.xpForLevel(player.level + 1);
      if (player.xp < needed) break;

      player.xp -= needed;
      player.level++;

      const gains = this._getStatGains(player.level);
      for (const [stat, amount] of Object.entries(gains)) {
        player[stat] = (player[stat] || 0) + amount;
        if (stat === 'hp') player.maxHp = (player.maxHp || 0) + amount;
        if (stat === 'mp') player.maxMp = (player.maxMp || 0) + amount;
      }

      // Full restore on level up (JRPG tradition)
      player.hp = player.maxHp;
      player.mp = player.maxMp;

      levelUps.push({
        newLevel: player.level,
        gains,
        totalStats: { hp: player.maxHp, mp: player.maxMp, atk: player.atk, def: player.def, spd: player.spd, spr: player.spr },
      });
    }

    return levelUps;
  }

  _getStatGains(level) {
    const gains = {};
    for (const stat of ['hp', 'mp', 'atk', 'def', 'spd', 'spr']) {
      const growthArray = this.statGrowth[stat];
      gains[stat] = (growthArray && growthArray[level]) || 0;
    }
    return gains;
  }
}


// ═══════════════════════════════════════════════════════════════
// ENCOUNTER GENERATOR
// ═══════════════════════════════════════════════════════════════

export class EncounterGenerator {
  constructor(difficulty, enemyData) {
    this.difficulty = difficulty;
    this.enemies = enemyData || [];
    this.enemiesById = {};
    this.encounterTables = {};
    this.stepsSinceEncounter = 0;
    this.minSteps = 32;
    this.maxSteps = 128;

    // Index enemies
    for (const e of this.enemies) {
      if (e.id) this.enemiesById[e.id] = e;
      // Extract encounter tables from the special entry
      if (e._encounter_tables) this.encounterTables = e._encounter_tables;
    }
  }

  /**
   * Check if a random encounter should trigger.
   * Called every N steps (typically 16).
   */
  checkEncounter(areaId, playerLevel) {
    const table = this.encounterTables[areaId];
    if (!table || table.rate === 'none') return null;

    this.stepsSinceEncounter += 16;

    // Minimum distance between encounters
    if (this.stepsSinceEncounter < this.minSteps) return null;

    // Calculate chance
    const rateMap = { low: 0.08, medium: 0.15, medium_high: 0.2, high: 0.25 };
    let baseChance = rateMap[table.rate] || 0.15;
    baseChance = this.difficulty.getEncounterRate(baseChance);

    // Increase chance as steps grow (guaranteed by maxSteps)
    if (this.stepsSinceEncounter >= this.maxSteps) baseChance = 1;

    if (Math.random() > baseChance) return null;

    // Generate formation
    this.stepsSinceEncounter = 0;
    return this._selectFormation(table, playerLevel);
  }

  _selectFormation(table, playerLevel) {
    const formations = table.formations || [];
    if (formations.length === 0) return null;

    // Weighted selection
    const totalWeight = formations.reduce((s, f) => s + (f.weight || 1), 0);
    let roll = Math.random() * totalWeight;

    for (const formation of formations) {
      roll -= (formation.weight || 1);
      if (roll <= 0) {
        return {
          enemies: formation.enemies,
          ambush: Math.random() < 0.1,
          preemptive: Math.random() < 0.08,
        };
      }
    }

    return { enemies: formations[0].enemies, ambush: false, preemptive: false };
  }

  /**
   * Build enemy instances for combat from a formation.
   */
  buildEnemies(formation) {
    return formation.enemies.map(id => {
      const template = this.enemiesById[id];
      if (!template) return null;

      // Roll stats from ranges
      const stats = {};
      for (const [stat, range] of Object.entries(template.stats)) {
        stats[stat] = Array.isArray(range)
          ? range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1))
          : range;
      }

      // Apply difficulty scaling
      const scaled = this.difficulty.scaleEnemyStats(stats);

      return {
        id: template.id,
        name: template.name,
        species: template.species,
        tier: template.tier,
        ...scaled,
        maxHp: scaled.hp,
        weakness: template.weakness || [],
        resistance: template.resistance || [],
        immune: template.immune || [],
        behavior: template.behavior,
        drops: template.drops,
        alive: true,
        statusEffects: [],
      };
    }).filter(Boolean);
  }

  /** Get boss data for a scripted encounter */
  getBoss(bossId) {
    return this.enemiesById[bossId] || null;
  }
}


// ═══════════════════════════════════════════════════════════════
// ENHANCED COMBAT ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Replaces the basic CombatEngine in game.js.
 * Full FF6-style damage formulas, virtue integration, boss phases,
 * status effects, the Accuser's survival mechanic, and the
 * Forgiveness pacifist victory condition.
 */
export class EnhancedCombatEngine {
  constructor(state, difficulty, miracleSystem, virtueEngine) {
    this.state = state;
    this.difficulty = difficulty;
    this.miracles = miracleSystem;
    this.virtues = virtueEngine;
    this.enemies = [];
    this.turnCount = 0;
    this.battleLog = [];
    this.isAccuserFight = false;
    this.accuserSurvivalTurns = 0;
    this.bossPhase = 0;
    this.bossData = null;
    this.statusEffects = { player: [] };
    this.playerGuarding = false;
    this.moralChoiceActive = null;
    this.onBattleEvent = null; // Callback for animations/UI
  }

  /**
   * Start a battle.
   */
  startBattle(enemies, options = {}) {
    this.enemies = enemies;
    this.turnCount = 0;
    this.battleLog = [];
    this.playerGuarding = false;
    this.statusEffects = { player: [] };
    this.moralChoiceActive = null;
    this.bossPhase = 0;

    // Detect special battle types
    this.isAccuserFight = enemies.some(e => e.behavior?.cannot_be_killed);
    if (this.isAccuserFight) {
      const accuser = enemies.find(e => e.behavior?.cannot_be_killed);
      this.accuserSurvivalTurns = accuser.behavior.survival_turns || 8;
    }

    // Boss phase tracking
    this.bossData = options.bossData || null;

    // Ambush/preemptive
    if (options.ambush) {
      this._emit('ambush', { message: 'Ambushed! Enemies act first.' });
      // Process enemy turns immediately
      for (let i = 0; i < this.enemies.length; i++) {
        if (this.enemies[i].alive) this.processEnemyTurn(i);
      }
    }

    return this.enemies;
  }

  /**
   * Player physical attack.
   */
  playerAttack(targetIndex) {
    const enemy = this.enemies[targetIndex];
    if (!enemy || !enemy.alive) return null;

    const p = this.state.player;
    const virtues = this.state.virtues || {};

    // FF6-style damage
    const critChance = DamageCalculator.critChance(virtues.prudence || 0);
    const options = { critChance };

    // Check weakness/resistance
    if (enemy.weakness?.includes('physical')) options.weaknessMult = 1.5;
    if (enemy.resistance?.includes('physical')) options.weaknessMult = 0.5;

    const damage = DamageCalculator.physicalDamage(p.atk, p.level || 1, enemy.def, options);
    const isCrit = options._crit || false;

    // Accuser: physical damage is near-useless
    if (enemy.behavior?.cannot_be_killed) {
      const reducedDmg = Math.max(0, Math.floor(damage * 0.05));
      enemy.hp = Math.max(1, enemy.hp - reducedDmg);
      const result = { action: 'attack', target: enemy.name, damage: reducedDmg, crit: false,
        message: 'Physical attacks barely scratch the Accuser...', ineffective: true };
      this.battleLog.push(result);
      this._emit('attack', result);
      return result;
    }

    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemy.hp <= 0) enemy.alive = false;

    const result = { action: 'attack', target: enemy.name, damage, crit: isCrit, killed: !enemy.alive };
    this.battleLog.push(result);
    this._emit('attack', result);
    return result;
  }

  /**
   * Player prayer/miracle.
   */
  playerPrayer(miracleId, targetIndex) {
    const p = this.state.player;
    const virtues = this.state.virtues || {};

    if (!this.miracles) {
      // Fallback basic heal
      const heal = Math.floor(p.spr * 1.5 + Math.random() * 5);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      p.mp = Math.max(0, p.mp - 5);
      return { action: 'prayer', heal };
    }

    const miracle = this.miracles.miracles.find(m => m.id === miracleId);
    if (!miracle) return null;

    const effect = this.miracles.calculateEffect(miracle, p, virtues);

    // Check MP
    if (p.mp < effect.adjustedMpCost) {
      return { action: 'prayer_failed', reason: 'Not enough MP', miracleId };
    }

    p.mp -= effect.adjustedMpCost;

    const result = { action: 'prayer', miracleId, miracleName: miracle.name,
      mpCost: effect.adjustedMpCost, effects: [] };

    // Process by type
    switch (effect.type) {
      case 'heal':
      case 'heal_buff': {
        let heal = effect.value || effect.healValue || Math.floor(p.spr * 2);
        heal = this.difficulty.scaleHealing(heal);
        const target = (effect.target === 'self' || effect.target === 'self_or_ally') ? p : p;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        result.effects.push({ type: 'heal', amount: heal });

        if (effect.buff) {
          result.effects.push({ type: 'buff', buff: effect.buff, amount: effect.buff_amount || 1, duration: effect.duration || 3 });
        }
        break;
      }

      case 'damage': {
        const enemy = this.enemies[targetIndex || 0];
        if (!enemy || !enemy.alive) break;

        let damage = DamageCalculator.holyDamage(p.spr, p.level || 1, virtues.faith || 0, {
          bonusVsType: enemy.weakness?.includes('holy'),
        });

        // Virtue scaling from formula
        if (effect.value) damage = Math.max(damage, effect.value);

        // Resistance check
        if (enemy.resistance?.includes('holy')) damage = Math.floor(damage * 0.5);

        // Accuser: holy does slightly more than physical but still low
        if (enemy.behavior?.cannot_be_killed) {
          damage = Math.max(1, Math.floor(damage * 0.15));
        }

        enemy.hp = Math.max(enemy.behavior?.cannot_be_killed ? 1 : 0, enemy.hp - damage);
        if (enemy.hp <= 0 && !enemy.behavior?.cannot_be_killed) enemy.alive = false;

        result.effects.push({ type: 'damage', target: enemy.name, amount: damage, element: 'holy', killed: !enemy.alive });
        break;
      }

      case 'buff': {
        result.effects.push({ type: 'buff', buff: effect.buff, formula: effect.formula, duration: effect.duration || 3 });
        this.statusEffects.player.push({
          type: effect.buff, value: effect.value || 5,
          duration: effect.duration || 3, source: miracleId,
        });
        break;
      }

      case 'cleanse':
      case 'cleanse_buff': {
        const removed = [];
        const removes = effect.removes || [];
        this.statusEffects.player = this.statusEffects.player.filter(s => {
          if (removes.includes(s.type)) { removed.push(s.type); return false; }
          return true;
        });
        result.effects.push({ type: 'cleanse', removed });
        break;
      }

      case 'reveal': {
        for (const enemy of this.enemies.filter(e => e.alive)) {
          result.effects.push({ type: 'reveal', target: enemy.name,
            hp: enemy.hp, maxHp: enemy.maxHp,
            weakness: enemy.weakness, nextAction: 'revealed' });
        }
        break;
      }

      case 'pacify': {
        const enemy = this.enemies[targetIndex || 0];
        if (!enemy || !enemy.alive) break;

        // Forgiveness: only works on humans/lost souls, not the Accuser
        if (enemy.behavior?.cannot_be_killed || enemy.species === 'environmental') {
          result.effects.push({ type: 'pacify_failed', reason: 'Cannot forgive this enemy' });
        } else if (enemy.species === 'spiritual') {
          result.effects.push({ type: 'pacify_failed', reason: 'This shadow has no will to forgive. Destroy it with light.' });
        } else {
          // Pacifist victory!
          enemy.alive = false;
          enemy.pacified = true;
          result.effects.push({ type: 'pacify_success', target: enemy.name,
            message: `${enemy.name} lowers their weapon. The fight is over.` });
        }
        break;
      }

      case 'revive': {
        // De Profundis — only usable on death screen
        result.effects.push({ type: 'revive', hp_pct: 30 });
        break;
      }

      case 'emergency': {
        // Memorare — full heal, cleanse, invulnerability
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        this.statusEffects.player = this.statusEffects.player.filter(s => s.type === 'buff');
        this.statusEffects.player.push({ type: 'invulnerable', duration: 2, source: 'memorare' });
        result.effects.push({ type: 'emergency', message: 'Never was it known that anyone who fled to thy protection was left unaided.' });
        break;
      }
    }

    this.battleLog.push(result);
    this._emit('prayer', result);
    return result;
  }

  /**
   * Player guard — doubles defense for one turn.
   */
  playerGuard() {
    this.playerGuarding = true;
    const result = { action: 'guard', defBoost: this.state.player.def };
    this.battleLog.push(result);
    this._emit('guard', result);
    return result;
  }

  /**
   * Process an enemy's turn.
   */
  processEnemyTurn(enemyIndex) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy || !enemy.alive) return null;

    // Boss phase check
    if (this.bossData?.behavior?.phases) {
      this._updateBossPhase(enemy);
    }

    // Select action from behavior patterns
    const patterns = this._getCurrentPatterns(enemy);
    const action = this._selectAction(patterns, enemy);

    return this._executeEnemyAction(enemy, action);
  }

  _getCurrentPatterns(enemy) {
    // Boss with phases
    if (enemy.behavior?.phases) {
      const hpPct = enemy.hp / enemy.maxHp;
      let currentPhase = enemy.behavior.phases[0];

      for (const phase of enemy.behavior.phases) {
        if (hpPct <= phase.hp_threshold) currentPhase = phase;
      }

      // Martyr mode extra phase
      if (this.difficulty.hasBossExtraPhase() && enemy.behavior.martyr_mode_extra_phase) {
        if (hpPct <= enemy.behavior.martyr_mode_extra_phase.hp_threshold) {
          currentPhase = enemy.behavior.martyr_mode_extra_phase;
        }
      }

      return currentPhase.patterns;
    }

    return enemy.behavior?.patterns || [{ action: 'attack', weight: 100, name: 'Attack', power_mult: 1.0 }];
  }

  _selectAction(patterns, enemy) {
    const p = this.state.player;

    // Filter by conditions
    const valid = patterns.filter(pat => {
      if (!pat.condition) return true;
      if (pat.condition === 'always') return true;
      if (pat.condition === 'alone') return this.enemies.filter(e => e.alive).length <= 1;
      if (pat.condition === 'player_hp_above_50pct') return p.hp > p.maxHp * 0.5;
      if (pat.condition === 'allies_alive') return this.enemies.filter(e => e.alive && e.id !== enemy.id).length > 0;
      if (pat.condition === 'turn_3_or_later') return this.turnCount >= 3;
      if (pat.condition === 'turn_5_or_later') return this.turnCount >= 5;
      if (pat.condition === 'obaa_martyred_flag') return this.state.flags?.obaa_martyred;
      return true;
    });

    // Aggression modifier: on Martyr difficulty, heavy attacks are more likely
    const aggression = this.difficulty.current.ai_aggression || 1;

    // Weighted selection with aggression
    const weighted = valid.map(p => ({
      ...p,
      adjustedWeight: (p.action === 'heavy_attack' || p.action === 'spirit_attack')
        ? p.weight * aggression
        : p.weight,
    }));

    const totalWeight = weighted.reduce((s, p) => s + p.adjustedWeight, 0);
    let roll = Math.random() * totalWeight;

    for (const pat of weighted) {
      roll -= pat.adjustedWeight;
      if (roll <= 0) return pat;
    }

    return valid[0] || { action: 'attack', name: 'Attack', power_mult: 1.0 };
  }

  _executeEnemyAction(enemy, action) {
    const p = this.state.player;
    const virtues = this.state.virtues || {};

    // Check invulnerability
    const invuln = this.statusEffects.player.find(s => s.type === 'invulnerable');
    if (invuln && (action.action === 'attack' || action.action === 'heavy_attack')) {
      return { action: 'enemy_attack', attacker: enemy.name, damage: 0,
        blocked: true, message: 'Divine protection absorbs the blow!' };
    }

    let result = { action: 'enemy_turn', attacker: enemy.name, actionName: action.name };

    switch (action.action) {
      case 'attack':
      case 'heavy_attack': {
        const mult = action.power_mult || 1.0;
        const accuracy = action.accuracy || 1.0;

        // Miss check
        if (Math.random() > accuracy) {
          result.missed = true;
          result.message = `${enemy.name} misses!`;
          break;
        }

        let effectiveDef = p.def;
        if (this.playerGuarding) effectiveDef *= 2;
        if (action.ignore_def_pct) effectiveDef *= (1 - action.ignore_def_pct);

        // Virtue defense bonuses
        const defBonus = this.statusEffects.player
          .filter(s => s.type === 'damage_reduction')
          .reduce((sum, s) => sum + s.value, 0);
        effectiveDef += defBonus;

        let damage = DamageCalculator.enemyDamage(
          Math.floor(enemy.atk * mult),
          effectiveDef,
          1, // already scaled at spawn
        );

        p.hp = Math.max(0, p.hp - damage);
        result.damage = damage;
        result.playerHp = p.hp;
        result.playerDead = p.hp <= 0;
        result.dialogue = action.dialogue;

        // Status effect from attack
        if (action.status && Math.random() < (action.status_chance || 0)) {
          this.statusEffects.player.push({
            type: action.status,
            duration: this.difficulty.current.accuser_status_duration_mult
              ? Math.ceil(3 * this.difficulty.current.accuser_status_duration_mult)
              : 3,
          });
          result.statusInflicted = action.status;
        }
        break;
      }

      case 'spirit_attack': {
        // Spiritual damage — check virtue resistance
        const counterVirtue = action.counter_virtue;
        const counterLevel = action.counter_level || 3;

        if (counterVirtue && (virtues[counterVirtue] || 0) >= counterLevel) {
          result.resisted = true;
          result.message = `Your ${counterVirtue} repels the ${action.name}!`;
          result.dialogue = action.dialogue;
          break;
        }

        const mult = action.power_mult || 1.0;
        let damage = DamageCalculator.spiritDamage(
          Math.floor((enemy.spr || 10) * mult),
          p.spr,
          virtues,
          { counterVirtue }
        );

        p.hp = Math.max(0, p.hp - damage);
        result.damage = damage;
        result.playerHp = p.hp;
        result.playerDead = p.hp <= 0;
        result.dialogue = action.dialogue;

        // Spirit status effect
        if (action.status && Math.random() < (action.status_chance || 0)) {
          const dur = Math.ceil(3 * (this.difficulty.current.accuser_status_duration_mult || 1));
          this.statusEffects.player.push({ type: action.status, duration: dur });
          result.statusInflicted = action.status;
        }

        // MP drain
        if (action.drain_mp) {
          p.mp = Math.max(0, p.mp - action.drain_mp);
          result.mpDrained = action.drain_mp;
        }
        break;
      }

      case 'drain': {
        const mult = action.power_mult || 0.6;
        let damage = DamageCalculator.spiritDamage(
          Math.floor((enemy.spr || 10) * mult), p.spr, virtues, {}
        );
        p.hp = Math.max(0, p.hp - damage);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.floor(damage * 0.5));
        result.damage = damage;
        result.drained = Math.floor(damage * 0.5);
        result.dialogue = action.dialogue;

        if (action.drain_mp) {
          p.mp = Math.max(0, p.mp - action.drain_mp);
          result.mpDrained = action.drain_mp;
        }
        break;
      }

      case 'defend': {
        enemy._tempDefBoost = action.def_boost || 4;
        result.message = `${enemy.name} takes a defensive stance.`;
        break;
      }

      case 'intimidate': {
        if (action.status && Math.random() < (action.status_chance || 0.3)) {
          const dur = Math.ceil(3 * (this.difficulty.current.accuser_status_duration_mult || 1));
          this.statusEffects.player.push({ type: action.status, duration: dur });
          result.statusInflicted = action.status;
        }
        result.dialogue = action.dialogue;
        result.message = action.dialogue || `${enemy.name} tries to intimidate you!`;
        break;
      }

      case 'command':
      case 'call_reinforcement': {
        // Summon additional enemies
        if (action.summon && this.enemies.filter(e => e.alive).length < 4) {
          result.summon = action.summon;
          result.message = action.dialogue || `${enemy.name} calls for reinforcements!`;
        }
        break;
      }

      case 'howl': {
        // Buff allies
        for (const ally of this.enemies.filter(e => e.alive && e.id !== enemy.id)) {
          ally._tempAtkBoost = (ally._tempAtkBoost || 0) + 3;
        }
        result.message = `${enemy.name} howls, strengthening their allies!`;
        break;
      }

      case 'debuff':
      case 'debuff_aoe':
      case 'aoe_debuff': {
        this.statusEffects.player.push({
          type: action.debuff,
          amount: action.amount || 2,
          duration: action.duration || 3,
        });
        result.statusInflicted = action.debuff;
        result.dialogue = action.dialogue;
        break;
      }

      case 'flee': {
        enemy.alive = false;
        enemy.fled = true;
        result.message = `${enemy.name} flees!`;
        break;
      }

      case 'taunt': {
        // Accuser's taunts — no damage, just psychological
        result.dialogue = action.dialogue;
        result.taunt = true;

        // Virtue challenge: Accuser references player's past actions
        if (action.special === 'virtue_challenge') {
          const kills = this.battleLog.filter(l => l.killed).length;
          if (kills > 0) {
            result.dialogue = `You have killed ${kills} of God's creatures in this battle alone. What does your commandment say about that?`;
          }
        }
        break;
      }

      case 'dot_attack': {
        let damage = Math.floor((enemy.atk || 5) * (action.power_mult || 0.5));
        p.hp = Math.max(0, p.hp - damage);
        result.damage = damage;
        if (action.status && Math.random() < (action.status_chance || 0.5)) {
          this.statusEffects.player.push({ type: action.status, duration: 3 });
          result.statusInflicted = action.status;
        }
        break;
      }

      case 'poison_attack': {
        let damage = Math.floor(enemy.atk * (action.power_mult || 0.8));
        p.hp = Math.max(0, p.hp - damage);
        result.damage = damage;
        if (action.status && Math.random() < (action.status_chance || 0.3)) {
          this.statusEffects.player.push({ type: 'poison', duration: 4, dot: Math.floor(p.maxHp * 0.05) });
          result.statusInflicted = 'poison';
        }
        break;
      }

      default: {
        // Generic attack fallback
        let damage = DamageCalculator.enemyDamage(enemy.atk, p.def, 1);
        p.hp = Math.max(0, p.hp - damage);
        result.damage = damage;
        result.playerDead = p.hp <= 0;
        break;
      }
    }

    this.battleLog.push(result);
    this._emit('enemy_turn', result);
    return result;
  }

  /**
   * End of round processing.
   * Called after all units have acted.
   */
  endRound() {
    this.turnCount++;
    this.playerGuarding = false;

    // Process status effects (tick down durations)
    const p = this.state.player;

    // Poison tick
    const poison = this.statusEffects.player.find(s => s.type === 'poison');
    if (poison) {
      const dot = poison.dot || Math.floor(p.maxHp * 0.05);
      p.hp = Math.max(1, p.hp - dot); // Poison can't kill (JRPG tradition)
      this._emit('status_tick', { type: 'poison', damage: dot });
    }

    // Despair effect: healing reduced by 50%
    // Fear effect: attack reduced by 30%
    // Confusion: 30% chance to attack self

    // Tick down durations
    this.statusEffects.player = this.statusEffects.player
      .map(s => ({ ...s, duration: s.duration - 1 }))
      .filter(s => s.duration > 0);

    // Clear enemy temp boosts
    for (const enemy of this.enemies) {
      enemy._tempDefBoost = 0;
      enemy._tempAtkBoost = 0;
    }
  }

  /**
   * Check if battle is over.
   * Returns: 'victory', 'defeat', 'survived', 'pacifist', or null (ongoing)
   */
  isBattleOver() {
    const p = this.state.player;

    // Player dead
    if (p.hp <= 0) {
      // Pilgrim mode: auto-revive
      if (this.difficulty.current.revive_on_defeat) {
        p.hp = Math.floor(p.maxHp * (this.difficulty.current.revive_hp_pct / 100));
        this._emit('auto_revive', { message: 'Grace sustains you.' });
        return null; // Battle continues
      }

      // Fortitude passive: Last Stand
      const fortitude = this.state.virtues?.fortitude || 0;
      if (fortitude >= 3 && !this._lastStandUsed) {
        p.hp = 1;
        this._lastStandUsed = true;
        this._emit('last_stand', { message: 'Fortitude holds you upright at the edge of death.' });
        return null;
      }

      return 'defeat';
    }

    // Accuser fight: survive X turns
    if (this.isAccuserFight && this.turnCount >= this.accuserSurvivalTurns) {
      return 'survived';
    }

    // All enemies dead or pacified
    if (this.enemies.every(e => !e.alive)) {
      const pacified = this.enemies.some(e => e.pacified);
      return pacified ? 'pacifist' : 'victory';
    }

    return null;
  }

  /**
   * Calculate rewards based on outcome.
   */
  calculateRewards(outcome) {
    let xp = 0, gold = 0;
    const items = [];

    if (outcome === 'defeat') return { xp: 0, gold: 0, items: [] };

    // Pacifist victory: double XP, bonus virtue
    const pacifistMult = outcome === 'pacifist' ? 2 : 1;

    // Survived Accuser: flat bonus
    if (outcome === 'survived') {
      xp = 100;
      // Check if no status effects were taken (perfect resistance)
      const tookStatus = this.battleLog.some(l => l.statusInflicted);
      if (!tookStatus) {
        xp = 200;
        items.push('accuser_resistance_badge');
      }
      return { xp: this.difficulty.scaleXP(xp), gold: 0, items, perfect: !tookStatus };
    }

    for (const enemy of this.enemies) {
      if (enemy.drops) {
        const [xpMin, xpMax] = enemy.drops.xp || [5, 10];
        xp += (xpMin + Math.floor(Math.random() * (xpMax - xpMin + 1))) * pacifistMult;

        const [gMin, gMax] = enemy.drops.gold || [3, 8];
        gold += gMin + Math.floor(Math.random() * (gMax - gMin + 1));

        if (enemy.drops.items) {
          for (const drop of enemy.drops.items) {
            if (this.difficulty.checkItemDrop(drop.chance)) {
              items.push(drop.id);
            }
          }
        }
      }
    }

    return {
      xp: this.difficulty.scaleXP(xp),
      gold: this.difficulty.scaleGold(gold),
      items,
    };
  }

  _updateBossPhase(enemy) {
    if (!enemy.behavior?.phases) return;
    const hpPct = enemy.hp / enemy.maxHp;
    const phases = enemy.behavior.phases;

    for (let i = phases.length - 1; i >= 0; i--) {
      if (hpPct <= phases[i].hp_threshold && i > this.bossPhase) {
        this.bossPhase = i;
        this._emit('phase_change', { phase: phases[i].name, enemy: enemy.name });
        break;
      }
    }
  }

  _emit(event, data) {
    if (this.onBattleEvent) this.onBattleEvent(event, data);
  }
}
