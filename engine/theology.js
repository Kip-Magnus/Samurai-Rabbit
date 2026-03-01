/**
 * SAMURAI USAGI — THEOLOGY ENGINE
 * =================================
 * Runtime systems for scripture, miracles, virtues, and cross-era echoes.
 * Reads from data/theology/*.json and integrates with the game engine.
 *
 * Catholic theology per Catechism of the Catholic Church.
 * Every mechanical effect has a doctrinal reason.
 */

import { hexToRGB } from './sprites.js';

// ═══════════════════════════════════════════════════════════════
// SCRIPTURE ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Manages the scripture database. Selects appropriate verses
 * based on game context and triggers display overlays.
 */
export class ScriptureEngine {
  constructor() {
    this.verses = [];
    this.prayers = {};
    this.displayRules = {};
    this.loaded = false;
  }

  async load(basePath = '') {
    try {
      const resp = await fetch(`${basePath}data/theology/scripture.json`);
      const data = await resp.json();
      this.verses = data.verses || [];
      this.prayers = data.prayers || {};
      this.displayRules = data.display_rules || {};
      this.loaded = true;
    } catch (err) {
      console.warn('Scripture data not found, using fallback:', err.message);
      this.loaded = false;
    }
  }

  /**
   * Get a verse for a loading screen.
   * Filters by current book and act, then selects randomly.
   */
  getLoadingScreenVerse(bookId, act) {
    const eligible = this.verses.filter(v => {
      const ls = v.triggers?.loading_screen;
      if (!ls) return false;
      const bookMatch = !ls.books || ls.books.includes(bookId);
      const actMatch = !ls.acts || ls.acts.includes(act);
      return bookMatch && actMatch;
    });

    if (eligible.length === 0) {
      // Fallback: any verse with a loading_screen trigger
      const fallback = this.verses.filter(v => v.triggers?.loading_screen);
      if (fallback.length === 0) return null;
      return fallback[Math.floor(Math.random() * fallback.length)];
    }

    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  /**
   * Get verse(s) triggered by a specific narrative moment.
   */
  getVersesForMoment(momentId) {
    return this.verses.filter(v =>
      v.triggers?.moment && v.triggers.moment.includes(momentId)
    );
  }

  /**
   * Get verse triggered by a battle condition.
   */
  getVersesForBattle(condition) {
    return this.verses.filter(v =>
      v.triggers?.battle && v.triggers.battle.condition === condition
    );
  }

  /**
   * Get verse triggered by entering an area.
   */
  getVersesForArea(areaId) {
    return this.verses.filter(v =>
      v.triggers?.area_entry && v.triggers.area_entry.includes(areaId)
    );
  }

  /**
   * Get verse for a virtue milestone.
   */
  getVerseForVirtueMilestone(virtue, level) {
    return this.verses.find(v => {
      const vm = v.triggers?.virtue_milestone;
      if (!vm) return false;
      return vm.virtue === virtue && vm.level === level;
    });
  }

  /**
   * Get verse for death screen.
   */
  getDeathScreenVerse() {
    const eligible = this.verses.filter(v => v.triggers?.death_screen);
    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  /**
   * Get verse for an item tooltip.
   */
  getItemVerse(itemId) {
    return this.verses.find(v =>
      v.triggers?.item_description === itemId
    );
  }

  /**
   * Get a named Catholic prayer.
   */
  getPrayer(prayerId) {
    return this.prayers[prayerId] || null;
  }
}


// ═══════════════════════════════════════════════════════════════
// MIRACLE SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Manages the miracle/prayer combat system.
 * Each miracle is tied to a Catholic virtue and has CCC references.
 * Miracles are not magic — they are graces (CCC 1996-2005).
 */
export class MiracleSystem {
  constructor() {
    this.miracles = [];
    this.virtueDefinitions = {};
    this.gifts = {};
    this.sacramentalGraces = {};
    this.loaded = false;
  }

  async load(basePath = '') {
    try {
      const resp = await fetch(`${basePath}data/theology/miracles.json`);
      const data = await resp.json();
      this.miracles = data.miracles || [];
      this.virtueDefinitions = data.virtues || {};
      this.gifts = data.gifts_of_holy_spirit || {};
      this.sacramentalGraces = data.sacramental_graces || {};
      this.loaded = true;
    } catch (err) {
      console.warn('Miracle data not found:', err.message);
      this.loaded = false;
    }
  }

  /**
   * Get all miracles currently available to the player.
   * Checks virtue unlock requirements.
   */
  getAvailableMiracles(virtues) {
    return this.miracles.filter(m => {
      if (!m.unlock) return true;
      for (const [virtue, required] of Object.entries(m.unlock)) {
        if ((virtues[virtue] || 0) < required) return false;
      }
      return true;
    });
  }

  /**
   * Get miracles organized by virtue category for the battle menu.
   */
  getMiraclesByCategory(virtues) {
    const available = this.getAvailableMiracles(virtues);
    const categories = {};

    for (const m of available) {
      const cat = m.category || 'faith';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(m);
    }

    return categories;
  }

  /**
   * Calculate miracle effect with virtue scaling.
   * @param {object} miracle - Miracle definition
   * @param {object} stats - Player stats {spr, atk, def, ...}
   * @param {object} virtues - Player virtues {faith, hope, charity, ...}
   */
  calculateEffect(miracle, stats, virtues) {
    const effect = { ...miracle.effect };

    // Parse formula and calculate
    if (effect.formula) {
      effect.value = this._evaluateFormula(effect.formula, stats, virtues);
    }
    if (effect.heal_formula) {
      effect.healValue = this._evaluateFormula(effect.heal_formula, stats, virtues);
    }
    if (effect.banish_chance) {
      effect.banishChance = this._evaluateFormula(String(effect.banish_chance), stats, virtues);
    }

    // Apply temperance MP reduction
    const tempReduction = (virtues.temperance || 0) * 5;
    effect.adjustedMpCost = Math.max(0, Math.floor((miracle.mp_cost || 0) * (1 - tempReduction / 100)));

    // Apply charity healing bonus
    if (effect.type === 'heal' || effect.type === 'heal_buff') {
      const charityBonus = (virtues.charity || 0) * 10;
      if (effect.value) effect.value = Math.floor(effect.value * (1 + charityBonus / 100));
      if (effect.healValue) effect.healValue = Math.floor(effect.healValue * (1 + charityBonus / 100));
    }

    return effect;
  }

  _evaluateFormula(formula, stats, virtues) {
    // Simple formula evaluator: "spr * 1.5 + charity * 3"
    let result = 0;
    try {
      // Replace variable names with values
      let expr = formula;
      for (const [key, val] of Object.entries(stats)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val || 0));
      }
      for (const [key, val] of Object.entries(virtues)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val || 0));
      }
      // total_virtue = sum of all virtues
      const totalVirtue = Object.values(virtues).reduce((s, v) => s + (v || 0), 0);
      expr = expr.replace(/\btotal_virtue\b/g, String(totalVirtue));
      expr = expr.replace(/\btotal_virtue_all_books\b/g, String(totalVirtue)); // TODO: cross-book tracking

      // Evaluate (safe: only numbers and operators)
      expr = expr.replace(/[^0-9+\-*/().]/g, '');
      if (expr) result = Math.floor(Function(`"use strict"; return (${expr})`)());
    } catch (e) {
      result = 10; // Fallback
    }
    return Math.max(1, result);
  }

  /**
   * Check which Gifts of the Holy Spirit are unlocked.
   */
  getUnlockedGifts(virtues) {
    const totalVirtue = Object.values(virtues).reduce((s, v) => s + (v || 0), 0);
    const unlocked = [];

    for (const [giftId, gift] of Object.entries(this.gifts)) {
      if (giftId.startsWith('_')) continue;
      if (totalVirtue >= (gift.unlock_total_virtue || 999)) {
        unlocked.push({ id: giftId, ...gift });
      }
    }

    return unlocked;
  }

  /**
   * Get virtue stat bonuses for current virtue levels.
   */
  getVirtueStatBonuses(virtues) {
    const bonuses = {};

    for (const [virtueId, def] of Object.entries(this.virtueDefinitions)) {
      if (virtueId.startsWith('_')) continue;
      const level = virtues[virtueId] || 0;
      if (level > 0 && def.stat_bonus_per_level) {
        for (const [stat, perLevel] of Object.entries(def.stat_bonus_per_level)) {
          bonuses[stat] = (bonuses[stat] || 0) + Math.floor(perLevel * level);
        }
      }
    }

    return bonuses;
  }

  /**
   * Check if a sacramental grace should trigger.
   */
  checkSacramentalGrace(triggerId) {
    for (const [sacId, sac] of Object.entries(this.sacramentalGraces)) {
      if (sacId.startsWith('_')) continue;
      if (sac.trigger === triggerId) return { id: sacId, ...sac };
    }
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════
// VIRTUE ENGINE — Deep System
// ═══════════════════════════════════════════════════════════════

/**
 * The virtue system with real theological depth.
 * Seven virtues per CCC 1803-1845.
 * Three theological (faith, hope, charity) + four cardinal (prudence, justice, fortitude, temperance).
 * Charity is the "form of all virtues" (CCC 1827) — mechanically, it enhances everything.
 */
export class VirtueEngine {
  constructor(miracleSystem) {
    this.miracleSystem = miracleSystem;
    this.milestoneCallbacks = [];
  }

  /**
   * Register a callback for virtue milestones.
   */
  onMilestone(callback) {
    this.milestoneCallbacks.push(callback);
  }

  /**
   * Apply virtue changes and check for milestones.
   * @param {object} virtues - Current virtue state (mutable)
   * @param {object} changes - {virtue: amount} pairs
   * @returns {array} Milestones triggered
   */
  applyVirtueChanges(virtues, changes) {
    const milestones = [];

    for (const [virtue, amount] of Object.entries(changes)) {
      if (virtues[virtue] === undefined) continue;

      const oldLevel = virtues[virtue];
      virtues[virtue] = Math.max(0, Math.min(10, virtues[virtue] + amount));
      const newLevel = virtues[virtue];

      // Check milestone crossings (1, 3, 5 are milestone levels)
      for (const threshold of [1, 3, 5]) {
        if (oldLevel < threshold && newLevel >= threshold) {
          const milestone = {
            virtue,
            level: threshold,
            definition: this._getVirtueDefinition(virtue),
            unlocks: this._getUnlocksAtLevel(virtue, threshold),
          };
          milestones.push(milestone);
        }
      }
    }

    // Fire callbacks
    for (const milestone of milestones) {
      for (const cb of this.milestoneCallbacks) {
        cb(milestone);
      }
    }

    return milestones;
  }

  _getVirtueDefinition(virtueId) {
    if (!this.miracleSystem?.virtueDefinitions) return null;
    return this.miracleSystem.virtueDefinitions[virtueId] || null;
  }

  _getUnlocksAtLevel(virtueId, level) {
    const def = this._getVirtueDefinition(virtueId);
    if (!def?.unlocks_at) return '';
    return def.unlocks_at[String(level)] || '';
  }

  /**
   * Get complete combat modifier set from virtues.
   * CCC 1827: Charity is the form of all virtues — it amplifies everything.
   */
  getCombatModifiers(virtues) {
    const mods = {};

    // Base virtue bonuses from miracle system
    if (this.miracleSystem) {
      Object.assign(mods, this.miracleSystem.getVirtueStatBonuses(virtues));
    }

    // Charity amplification (CCC 1827: charity animates all virtues)
    const charityLevel = virtues.charity || 0;
    if (charityLevel > 0) {
      const amplification = 1 + (charityLevel * 0.03); // 3% per charity level
      for (const key of Object.keys(mods)) {
        mods[key] = Math.floor(mods[key] * amplification);
      }
    }

    // Gift bonuses
    if (this.miracleSystem) {
      const gifts = this.miracleSystem.getUnlockedGifts(virtues);
      for (const gift of gifts) {
        if (gift.id === 'fortitude_gift') mods.survive_lethal = true;
        if (gift.id === 'knowledge') mods.reveal_all_weaknesses = true;
        if (gift.id === 'piety') mods.sacred_heal_bonus = 100;
        if (gift.id === 'fear_of_the_lord') mods.immune_fear_despair = true;
      }
    }

    return mods;
  }

  /**
   * Get virtue description for the menu screen.
   */
  getVirtueDisplay(virtueId) {
    const def = this._getVirtueDefinition(virtueId);
    if (!def) return { name: virtueId, type: '?', definition: '' };

    return {
      name: virtueId,
      latin: def.latin,
      type: def.type,
      definition: def.definition,
      ccc: def.ccc,
      gameplay: def.gameplay,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// ACCUSER AI — Spiritual Combat
// ═══════════════════════════════════════════════════════════════

/**
 * The Accuser's combat behavior. He is not a monster — he is a spiritual
 * adversary (CCC 391-395). His attacks target the soul, not the body.
 * He cannot be killed, only rebuked and outlasted.
 */
export class AccuserAI {
  constructor() {
    this.strategies = {};
    this.attacks = [];
    this.loaded = false;
  }

  async load(basePath = '') {
    try {
      const resp = await fetch(`${basePath}data/theology/ontology.json`);
      const data = await resp.json();
      const accuser = data.the_accuser || {};
      this.strategies = accuser.strategies_per_era || {};
      this.attacks = accuser.combat_mechanics?.accuser_attacks_are_spiritual || [];
      this.loaded = true;
    } catch (err) {
      console.warn('Ontology data not found:', err.message);
    }
  }

  /**
   * Get the Accuser's strategy for the current era.
   */
  getStrategy(bookId) {
    return this.strategies[bookId] || { strategy: 'despair', counter_virtue: 'hope' };
  }

  /**
   * Select an attack based on the current strategy and player virtues.
   * The Accuser targets the player's weakest virtue.
   */
  selectAttack(bookId, playerVirtues) {
    const strategy = this.getStrategy(bookId);
    const preferredAttacks = this.attacks.filter(a => {
      // Map strategy to attack type
      if (strategy.strategy === 'despair' && a.effect === 'despair_status') return true;
      if (strategy.strategy === 'fear' && a.effect === 'fear_status') return true;
      if (strategy.strategy === 'deception' && a.effect === 'confusion_status') return true;
      if (strategy.strategy === 'righteous_anger' && a.effect === 'berserk_status') return true;
      if (strategy.strategy === 'forgetting' && a.effect === 'forget_status') return true;
      return false;
    });

    if (preferredAttacks.length > 0) return preferredAttacks[0];

    // Fallback: attack the player's weakest virtue
    let weakest = 'hope';
    let weakestVal = 999;
    for (const [v, val] of Object.entries(playerVirtues)) {
      if (val < weakestVal) { weakest = v; weakestVal = val; }
    }

    // Find attack that this virtue counters
    const targetAttack = this.attacks.find(a => {
      const counterMap = {
        hope: 'despair_status',
        fortitude: 'fear_status',
        prudence: 'confusion_status',
        justice: 'berserk_status',
        faith: 'forget_status',
      };
      return a.effect === counterMap[weakest];
    });

    return targetAttack || this.attacks[0] || { name: 'Whisper', effect: 'despair_status' };
  }

  /**
   * Check if the player resists a spiritual attack.
   * Returns true if resisted.
   */
  checkResistance(attack, playerVirtues) {
    if (!attack.counter) return false;

    // Parse counter requirement: "hope >= 3"
    const match = attack.counter.match(/(\w+)\s*>=\s*(\d+)/);
    if (!match) return false;

    const virtue = match[1];
    const required = parseInt(match[2]);
    return (playerVirtues[virtue] || 0) >= required;
  }

  /**
   * Get the Accuser's taunt for the current moment.
   * Contextual spiritual warfare dialogue.
   */
  getTaunt(bookId, context) {
    const strategy = this.getStrategy(bookId);

    const taunts = {
      despair: {
        battle_start: "Another believer. Another body for the pyre.",
        player_damaged: "Your God watches this. He does nothing.",
        player_low_hp: "Pray louder. Perhaps He simply cannot hear you.",
        npc_death: "She died calling His name. He did not answer.",
      },
      fear: {
        battle_start: "The crowd is hungry. Can you hear them?",
        player_damaged: "Pain is honest. Your faith is not.",
        player_low_hp: "One word. Just deny Him. The pain stops.",
        npc_death: "They all break eventually.",
      },
      deception: {
        battle_start: "Let us reason together. I am very reasonable.",
        player_damaged: "You are so certain you are right. So was Arius.",
        player_low_hp: "Perhaps we simply disagree on one small word.",
        npc_death: "Truth is complicated. Are you sure you have it?",
      },
      righteous_anger: {
        battle_start: "Finally. A Christian with a sword. I have been waiting.",
        player_damaged: "Feels righteous, doesn't it? The violence.",
        player_low_hp: "Deus vult. Go on. Say it.",
        npc_death: "Killed in God's name. Well done.",
      },
      division: {
        battle_start: "The Church is already broken. I barely had to touch it.",
        player_damaged: "Which Church do you fight for? There are so many now.",
        player_low_hp: "Unity is a myth. Always was.",
        npc_death: "Christians killing Christians. My favorite century.",
      },
      forgetting: {
        battle_start: "What were the words again? The prayer? You almost remember.",
        player_damaged: "250 years. No priests. No sacraments. Just... habits.",
        player_low_hp: "You carry a cross you cannot explain to anyone.",
        npc_death: "The last one who remembered. Gone.",
      },
    };

    const eraSet = taunts[strategy.strategy] || taunts.despair;
    return eraSet[context] || eraSet.battle_start;
  }
}


// ═══════════════════════════════════════════════════════════════
// ECHO SYSTEM — Typological Parallels
// ═══════════════════════════════════════════════════════════════

/**
 * Detects typological parallels between eras and triggers
 * visual/mechanical echoes. CCC 128-130.
 */
export class EchoSystem {
  constructor() {
    this.parallels = [];
    this.completedBooks = [];
    this.saintRegistry = [];
    this.loaded = false;
  }

  async load(basePath = '') {
    try {
      const resp = await fetch(`${basePath}data/theology/ontology.json`);
      const data = await resp.json();
      this.parallels = data.typological_parallels?.parallels || [];
      this.saintSystem = data.communion_of_saints_system || {};
      this.loaded = true;
    } catch (err) {
      console.warn('Ontology data not found:', err.message);
    }
  }

  /**
   * Register a completed book and its saints.
   */
  registerCompletedBook(bookId, saints) {
    if (!this.completedBooks.includes(bookId)) {
      this.completedBooks.push(bookId);
    }
    if (saints) {
      for (const saint of saints) {
        if (!this.saintRegistry.find(s => s.id === saint.id)) {
          this.saintRegistry.push(saint);
        }
      }
    }
  }

  /**
   * Check if a game event triggers a typological echo.
   * Returns parallel info if found, null otherwise.
   */
  checkForEcho(currentBookId, eventId) {
    for (const parallel of this.parallels) {
      const instances = parallel.instances || [];
      const currentInstance = instances.find(i => i.book === currentBookId && i.event === eventId);

      if (currentInstance) {
        // Find earlier instances from completed books
        const priorInstances = instances.filter(i =>
          this.completedBooks.includes(i.book) && i.book !== currentBookId
        );

        if (priorInstances.length > 0) {
          return {
            parallelType: parallel.type,
            theology: parallel.theology,
            currentInstance,
            priorInstances,
            echoIntensity: Math.min(priorInstances.length, 3), // 1-3 scale
          };
        }
      }
    }

    return null;
  }

  /**
   * Get available saints for the Cloud of Witnesses miracle.
   */
  getAvailableSaints() {
    return this.saintRegistry;
  }

  /**
   * Calculate Cloud of Witnesses buff power.
   * More saints = more power. CCC 957: communion with the dead strengthens the living.
   */
  calculateWitnessBuff() {
    let totalPower = 0;

    for (const saint of this.saintRegistry) {
      const virtueBonus = saint.intercession_bonus || {};
      totalPower += 2; // Base per saint
      // Additional power based on how they lived
      if (saint.virtue_embodied) totalPower += 1;
    }

    return {
      allStats: Math.floor(totalPower * 0.5),
      duration: 3,
      saintCount: this.saintRegistry.length,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// SCRIPTURE OVERLAY SCENE (Phaser)
// ═══════════════════════════════════════════════════════════════

/**
 * A lightweight overlay scene that displays scripture at key moments.
 * Can be launched from any other scene.
 *
 * Display modes:
 *   'moment'    — Bottom overlay, white text, reference right-aligned
 *   'loading'   — Centered, italic serif, gold on dark
 *   'battle'    — Brief center flash, larger text, gold
 *   'milestone' — Top toast with gold border and virtue icon
 *   'death'     — Full screen dark, centered, gentle pulse
 */
export class ScriptureOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ScriptureOverlay' });
  }

  init(data) {
    this.verse = data.verse;         // { text, reference }
    this.mode = data.mode || 'moment';
    this.onComplete = data.onComplete;
    this.autoClose = data.autoClose !== false;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    switch (this.mode) {
      case 'loading':
        this._displayLoading(w, h);
        break;
      case 'battle':
        this._displayBattle(w, h);
        break;
      case 'milestone':
        this._displayMilestone(w, h);
        break;
      case 'death':
        this._displayDeath(w, h);
        break;
      default:
        this._displayMoment(w, h);
        break;
    }
  }

  _displayMoment(w, h) {
    // Bottom overlay, fade in/hold/out
    const boxH = 60;
    const boxY = h - boxH - 10;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f0e17, 0.85);
    bg.fillRect(10, boxY, w - 20, boxH);
    bg.lineStyle(1, 0xc9a959, 0.3);
    bg.strokeRect(10, boxY, w - 20, boxH);

    const text = this.add.text(w / 2, boxY + 18, `"${this.verse.text}"`, {
      fontSize: '12px', color: '#e8e0d8', fontFamily: '"Times New Roman", serif',
      fontStyle: 'italic', wordWrap: { width: w - 60 }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(0);

    const ref = this.add.text(w - 25, boxY + boxH - 12, `— ${this.verse.reference}`, {
      fontSize: '10px', color: '#c9a959', fontFamily: '"Times New Roman", serif',
    }).setOrigin(1, 1).setAlpha(0);

    // Fade in, hold, fade out
    this.tweens.add({
      targets: [text, ref, bg],
      alpha: { from: 0, to: 1 },
      duration: 1000,
      hold: 4000,
      yoyo: true,
      onComplete: () => this._close(),
    });
  }

  _displayLoading(w, h) {
    // Full screen dark, centered gold text
    const bg = this.add.graphics();
    bg.fillStyle(0x0f0e17, 1);
    bg.fillRect(0, 0, w, h);

    const maxWidth = w * 0.75;
    const text = this.add.text(w / 2, h * 0.4, `"${this.verse.text}"`, {
      fontSize: '14px', color: '#c9a959', fontFamily: '"Times New Roman", serif',
      fontStyle: 'italic', wordWrap: { width: maxWidth },
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    const ref = this.add.text(w / 2, h * 0.6, `— ${this.verse.reference}`, {
      fontSize: '11px', color: '#7a6852', fontFamily: '"Times New Roman", serif',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [text, ref],
      alpha: { from: 0, to: 1 },
      duration: 2000,
      hold: 3000,
      yoyo: true,
      onComplete: () => this._close(),
    });
  }

  _displayBattle(w, h) {
    // Brief center flash, gold, no reference
    const text = this.add.text(w / 2, h * 0.3, this.verse.text, {
      fontSize: '16px', color: '#ffd700', fontFamily: '"Times New Roman", serif',
      fontStyle: 'bold', wordWrap: { width: w * 0.8 }, align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: { from: 0, to: 1 },
      duration: 500,
      hold: 2000,
      yoyo: true,
      ease: 'Sine.InOut',
      onComplete: () => this._close(),
    });
  }

  _displayMilestone(w, h) {
    // Top toast with gold border
    const boxW = w * 0.8;
    const boxH = 50;
    const boxX = (w - boxW) / 2;
    const boxY = 10;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f0e17, 0.92);
    bg.fillRect(boxX, boxY, boxW, boxH);
    bg.lineStyle(2, 0xc9a959, 0.6);
    bg.strokeRect(boxX, boxY, boxW, boxH);

    const text = this.add.text(w / 2, boxY + 15, `"${this.verse.text}"`, {
      fontSize: '11px', color: '#e8e0d8', fontFamily: '"Times New Roman", serif',
      fontStyle: 'italic', wordWrap: { width: boxW - 30 }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(0);

    const ref = this.add.text(w / 2, boxY + boxH - 8, this.verse.reference, {
      fontSize: '9px', color: '#c9a959', fontFamily: '"Times New Roman", serif',
    }).setOrigin(0.5, 1).setAlpha(0);

    this.tweens.add({
      targets: [bg, text, ref],
      alpha: { from: 0, to: 1 },
      duration: 800,
      hold: 3000,
      yoyo: true,
      onComplete: () => this._close(),
    });
  }

  _displayDeath(w, h) {
    // Full screen, centered, gentle pulse, wait for input
    const bg = this.add.graphics();
    bg.fillStyle(0x0f0e17, 0.9);
    bg.fillRect(0, 0, w, h);

    const cross = this.add.text(w / 2, h * 0.25, '✝', {
      fontSize: '36px', color: '#c9a959', fontFamily: 'serif',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: cross, alpha: { from: 0.3, to: 1 },
      duration: 2000, yoyo: true, repeat: -1,
    });

    const text = this.add.text(w / 2, h * 0.45, `"${this.verse.text}"`, {
      fontSize: '14px', color: '#e8e0d8', fontFamily: '"Times New Roman", serif',
      fontStyle: 'italic', wordWrap: { width: w * 0.7 },
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    const ref = this.add.text(w / 2, h * 0.65, `— ${this.verse.reference}`, {
      fontSize: '11px', color: '#7a6852', fontFamily: '"Times New Roman", serif',
    }).setOrigin(0.5).setAlpha(0);

    const prompt = this.add.text(w / 2, h * 0.85, '▸ continue', {
      fontSize: '12px', color: '#c9a959', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [text, ref], alpha: 1, duration: 2000,
    });
    this.tweens.add({
      targets: prompt, alpha: { from: 0, to: 0.6 },
      delay: 3000, duration: 1000, yoyo: true, repeat: -1,
    });

    // Wait for input
    this.autoClose = false;
    this.input.on('pointerdown', () => this._close());
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this._close());
    }
  }

  _close() {
    if (this.onComplete) this.onComplete();
    this.scene.stop();
  }
}


// ═══════════════════════════════════════════════════════════════
// THEOLOGY MANAGER — Master Integration
// ═══════════════════════════════════════════════════════════════

/**
 * Single entry point for all theology systems.
 * Created once, shared across scenes via registry.
 */
export class TheologyManager {
  constructor() {
    this.scripture = new ScriptureEngine();
    this.miracles = new MiracleSystem();
    this.virtueEngine = null;  // Needs miracleSystem, set after load
    this.accuser = new AccuserAI();
    this.echoes = new EchoSystem();
    this.loaded = false;
  }

  async load(basePath = '') {
    await Promise.all([
      this.scripture.load(basePath),
      this.miracles.load(basePath),
      this.accuser.load(basePath),
      this.echoes.load(basePath),
    ]);

    this.virtueEngine = new VirtueEngine(this.miracles);
    this.loaded = true;
  }

  /**
   * Trigger a narrative moment — checks for scripture, echoes, and sacramental graces.
   * @returns {object} All triggered effects for the moment
   */
  triggerMoment(momentId, bookId, scene) {
    const result = {
      verses: [],
      echo: null,
      sacramentalGrace: null,
    };

    // Scripture
    result.verses = this.scripture.getVersesForMoment(momentId);

    // Typological echo
    result.echo = this.echoes.checkForEcho(bookId, momentId);

    // Sacramental grace
    result.sacramentalGrace = this.miracles.checkSacramentalGrace(momentId);

    // Auto-display first verse if scene provided
    if (result.verses.length > 0 && scene) {
      const verse = result.verses[0];
      scene.scene.launch('ScriptureOverlay', {
        verse: { text: verse.text, reference: verse.reference },
        mode: 'moment',
      });
    }

    return result;
  }

  /**
   * Display a scripture verse on the death screen.
   */
  showDeathScreen(scene) {
    const verse = this.scripture.getDeathScreenVerse();
    if (verse && scene) {
      scene.scene.launch('ScriptureOverlay', {
        verse: { text: verse.text, reference: verse.reference },
        mode: 'death',
      });
    }
  }

  /**
   * Display a loading screen verse.
   */
  showLoadingVerse(bookId, act, scene) {
    const verse = this.scripture.getLoadingScreenVerse(bookId, act);
    if (verse && scene) {
      scene.scene.launch('ScriptureOverlay', {
        verse: { text: verse.text, reference: verse.reference },
        mode: 'loading',
        onComplete: () => {},
      });
    }
  }

  /**
   * Handle a virtue milestone — shows scripture and description.
   */
  handleVirtueMilestone(milestone, scene) {
    const verse = this.scripture.getVerseForVirtueMilestone(milestone.virtue, milestone.level);
    if (verse && scene) {
      scene.scene.launch('ScriptureOverlay', {
        verse: { text: verse.text, reference: verse.reference },
        mode: 'milestone',
      });
    }
  }
}
