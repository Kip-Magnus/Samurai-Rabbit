/**
 * SAMURAI USAGI — INTEGRATION RUNTIME
 * =====================================
 * Master boot sequence and cross-system coordinator.
 * Ties all 10 engine modules into one coherent game.
 *
 * Module dependency graph:
 *   game.js (Phaser scenes, state)
 *     ├── sprites.js (Visual DNA renderer)
 *     ├── effects.js (parallax, particles)
 *     ├── map.js (tilemap generation + rendering)
 *     ├── sound.js (procedural audio)
 *     ├── theology.js (scripture, miracles, virtues, accuser)
 *     ├── miracle-animations.js (battle VFX)
 *     ├── balance.js (difficulty, damage, levels, encounters, combat)
 *     ├── items.js (equipment, blessings, vocations, trades, status, save)
 *     └── battle-ui.js (status effect display, combat HUD)
 *
 * Boot order: data → systems → UI → game loop
 */

// ═══════════════════════════════════════════════════════════════
// EVENT BUS — Cross-system communication
// ═══════════════════════════════════════════════════════════════

export class EventBus {
  constructor() {
    this._listeners = {};
    this._log = [];
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    this._log.push({ event, time: Date.now() });
    if (this._log.length > 200) this._log.shift();

    if (this._listeners[event]) {
      for (const cb of this._listeners[event]) {
        try { cb(data); } catch (e) { console.error(`Event ${event} handler error:`, e); }
      }
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// GAME STATE — Central state object all systems read/write
// ═══════════════════════════════════════════════════════════════

export function createInitialState() {
  return {
    // Player
    player: {
      name: 'Usagi',
      species: 'rabbit',
      level: 1,
      xp: 0,
      hp: 35, maxHp: 35,
      mp: 10, maxMp: 10,
      atk: 4, def: 5, spd: 6, spr: 8,
      gold: 20,
    },
    baseStats: { hp: 35, mp: 10, atk: 4, def: 5, spd: 6, spr: 8 },

    // Virtues (CCC seven virtues)
    virtues: {
      faith: 1, hope: 1, charity: 1,
      prudence: 0, justice: 0, fortitude: 0, temperance: 0,
    },

    // Progress
    currentBook: 'book-00',
    currentAct: 1,
    currentArea: 'kurosaki_village',
    previousArea: null,
    position: { x: 10, y: 12 },

    // Flags
    flags: {},
    completedBooks: [],
    battleCount: 0,
    killCount: 0,
    playTime: 0,
    playTimeStart: Date.now(),

    // Difficulty
    difficulty: 'disciple',

    // Communion of Saints
    saintRegistry: [],

    // Status
    gamePhase: 'title',  // title, exploration, dialogue, battle, menu, cutscene, transition
  };
}


// ═══════════════════════════════════════════════════════════════
// GAME RUNTIME — Master coordinator
// ═══════════════════════════════════════════════════════════════

export class GameRuntime {
  constructor() {
    // Event bus
    this.events = new EventBus();

    // State
    this.state = createInitialState();

    // System references (set during boot)
    this.systems = {
      difficulty: null,     // DifficultyManager (balance.js)
      damage: null,         // DamageCalculator (balance.js)
      levels: null,         // LevelSystem (balance.js)
      encounters: null,     // EncounterGenerator (balance.js)
      combat: null,         // EnhancedCombatEngine (balance.js)
      items: null,          // ItemManager (items.js)
      theology: null,       // { scripture, miracles, virtues, accuser, echoes } (theology.js)
      sound: null,          // SoundEngine (sound.js)
      map: null,            // MapScene (map.js)
      sprites: null,        // VisualDNARenderer (sprites.js)
      effects: null,        // AtmosphericSystem (effects.js)
      animations: null,     // MiracleAnimations (miracle-animations.js)
      battleUI: null,       // BattleUIScene (battle-ui.js)
      save: null,           // SaveSystem (items.js)
    };

    // Data references
    this.data = {
      balance: null,
      areas: null,
      characters: null,
      dialogue: null,
      enemies: null,
      items: null,
      equipmentSystem: null,
      book: null,
      scripture: null,
      miracles: null,
      ontology: null,
    };

    this.booted = false;
  }

  // ── BOOT SEQUENCE ────────────────────────────────────────

  /**
   * Boot the game. Load all data, initialize all systems, wire events.
   * @param {string} basePath - Base URL for data files
   */
  async boot(basePath = '') {
    console.log('[BOOT] Samurai Usagi — starting...');

    // Phase 1: Load all data files
    console.log('[BOOT] Phase 1: Loading data...');
    await this._loadData(basePath);

    // Phase 2: Initialize systems
    console.log('[BOOT] Phase 2: Initializing systems...');
    this._initSystems();

    // Phase 3: Wire cross-system events
    console.log('[BOOT] Phase 3: Wiring events...');
    this._wireEvents();

    // Phase 4: Give starting equipment
    console.log('[BOOT] Phase 4: Starting equipment...');
    this.systems.items.giveStartingEquipment();

    this.booted = true;
    console.log('[BOOT] Complete. All systems operational.');
    this.events.emit('boot_complete', { state: this.state });
  }

  async _loadData(basePath) {
    const load = async (path) => {
      try {
        const resp = await fetch(`${basePath}${path}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
      } catch (e) {
        console.warn(`[BOOT] Failed to load ${path}:`, e.message);
        return null;
      }
    };

    // Parallel load all JSON
    const [balance, areas, characters, dialogue, enemies, items, equipSys, book, scripture, miracles, ontology] = await Promise.all([
      load('data/balance.json'),
      load('data/books/book-00/areas.json'),
      load('data/books/book-00/characters.json'),
      load('data/books/book-00/dialogue.json'),
      load('data/books/book-00/enemies.json'),
      load('data/books/book-00/items.json'),
      load('data/equipment-system.json'),
      load('data/books/book-00/book.json'),
      load('data/theology/scripture.json'),
      load('data/theology/miracles.json'),
      load('data/theology/ontology.json'),
    ]);

    this.data = { balance, areas, characters, dialogue, enemies, items, equipmentSystem: equipSys, book, scripture, miracles, ontology };

    // Index areas by ID
    this.data.areasById = {};
    if (Array.isArray(areas)) {
      for (const area of areas) {
        this.data.areasById[area.id] = area;
      }
    }

    console.log(`[BOOT] Data loaded: ${Object.values(this.data).filter(Boolean).length} files`);
  }

  _initSystems() {
    const d = this.data;
    const s = this.state;

    // -- Balance systems --
    // DifficultyManager
    if (d.balance) {
      this.systems.difficulty = new DifficultyManagerAdapter(d.balance, s.difficulty);
    }

    // LevelSystem
    if (d.balance) {
      this.systems.levels = new LevelSystemAdapter(d.balance);
    }

    // EncounterGenerator
    if (d.enemies && this.systems.difficulty) {
      this.systems.encounters = new EncounterGeneratorAdapter(this.systems.difficulty, d.enemies);
    }

    // -- Item systems --
    // Flatten item catalog for ItemManager
    const itemCatalog = this._flattenItemCatalog(d.items);
    if (itemCatalog.length > 0 && d.equipmentSystem) {
      // Import ItemManager from items.js would happen at top of file
      // Here we use the adapter pattern
      this.systems.items = new ItemManagerAdapter(s, itemCatalog, d.equipmentSystem);
    }

    // SaveSystem
    this.systems.save = new SaveSystemAdapter();

    // -- Sound --
    this.systems.sound = new SoundEngineAdapter();

    console.log(`[BOOT] Systems initialized: ${Object.values(this.systems).filter(Boolean).length}`);
  }

  _flattenItemCatalog(itemsData) {
    if (!itemsData) return [];
    const flat = [];
    for (const [category, items] of Object.entries(itemsData)) {
      if (category === '_meta') continue;
      if (Array.isArray(items)) {
        for (const item of items) {
          // Add class based on category
          const classMap = {
            consumables: 'consumable', sacramentals: 'consumable',
            weapons: 'equipment', garments: 'equipment', headgear: 'equipment',
            accessories: 'equipment', relics: 'equipment',
            materials: 'material', key_items: 'key_item', lore_items: 'lore_item',
          };
          flat.push({ ...item, class: classMap[category] || 'consumable' });
        }
      }
    }
    return flat;
  }

  _wireEvents() {
    const e = this.events;

    // Area transition
    e.on('area_transition', ({ targetArea, direction }) => {
      this.transitionToArea(targetArea, direction);
    });

    // Encounter check (from map movement)
    e.on('encounter_check', () => {
      this.checkEncounter();
    });

    // Battle start
    e.on('battle_start', ({ enemies, options }) => {
      this.startBattle(enemies, options);
    });

    // Battle end
    e.on('battle_end', ({ outcome, enemies, miracleUsed }) => {
      this.endBattle(outcome, enemies, miracleUsed);
    });

    // Level up
    e.on('level_up', ({ level, statGains }) => {
      if (this.systems.sound) this.systems.sound.playSFX('level_up');
    });

    // Item obtained
    e.on('item_obtained', ({ item }) => {
      if (this.systems.sound) this.systems.sound.playSFX('item_get');
    });

    // Save/load
    e.on('save_game', ({ slot }) => {
      this.saveGame(slot);
    });
    e.on('load_game', ({ slot }) => {
      this.loadGame(slot);
    });

    // Difficulty change
    e.on('set_difficulty', ({ mode }) => {
      this.state.difficulty = mode;
      if (this.systems.difficulty) this.systems.difficulty.setMode(mode);
    });

    // NPC interaction
    e.on('npc_interact', ({ npcId }) => {
      this.interactWithNPC(npcId);
    });

    // Rest at sacred site
    e.on('sacred_rest', () => {
      this.sacredSiteRest();
    });

    // Vocation choice
    e.on('choose_vocation', ({ vocId }) => {
      this.chooseVocation(vocId);
    });
  }

  // ── AREA TRANSITIONS ─────────────────────────────────────

  transitionToArea(targetAreaId, fromDirection) {
    const area = this.data.areasById[targetAreaId];
    if (!area) { console.warn('Unknown area:', targetAreaId); return; }

    // Check lock
    const exit = area.exits?.find(e => e.to === this.state.currentArea);
    if (exit?.locked) {
      const flag = exit.unlockFlag;
      if (flag && !this._checkFlag(flag)) {
        this.events.emit('area_locked', { area: targetAreaId, reason: flag });
        return;
      }
    }

    this.state.previousArea = this.state.currentArea;
    this.state.currentArea = targetAreaId;

    // Determine entry position based on direction
    const entryPos = this._getEntryPosition(fromDirection);
    this.state.position = entryPos;

    // Update sound
    if (this.systems.sound) {
      if (area.music) this.systems.sound.startBGM(area.music);
      if (area.ambience?.[0]) this.systems.sound.startAmbient(area.ambience[0]);
    }

    // Update map
    if (this.systems.map) {
      this.systems.map.loadArea(area, entryPos);
    }

    this.events.emit('area_loaded', { area, position: entryPos });
  }

  _getEntryPosition(fromDirection) {
    // Enter from the opposite side
    switch (fromDirection) {
      case 'north': return { x: 10, y: 13 };
      case 'south': return { x: 10, y: 1 };
      case 'east':  return { x: 1, y: 7 };
      case 'west':  return { x: 18, y: 7 };
      default:      return { x: 10, y: 12 };
    }
  }

  _checkFlag(flag) {
    if (flag.startsWith('act')) {
      const match = flag.match(/act\s*>=\s*(\d+)/);
      if (match) return this.state.currentAct >= parseInt(match[1]);
    }
    return !!this.state.flags[flag];
  }

  // ── ENCOUNTERS ────────────────────────────────────────────

  checkEncounter() {
    const area = this.data.areasById[this.state.currentArea];
    if (!area || !area.encounters?.enabled) return;
    if (area.safeZone) return;

    if (this.systems.encounters) {
      const formation = this.systems.encounters.check(area.encounters.table || area.id, this.state.player.level);
      if (formation) {
        this.events.emit('battle_start', { enemies: formation, options: {} });
      }
    }
  }

  // ── COMBAT ────────────────────────────────────────────────

  startBattle(enemies, options = {}) {
    this.state.gamePhase = 'battle';

    if (this.systems.sound) {
      const area = this.data.areasById[this.state.currentArea];
      const isBoss = options.boss || false;
      const isAccuser = enemies.some(e => e.id?.includes('accuser'));
      if (isAccuser) this.systems.sound.startBGM('accuser');
      else if (isBoss) this.systems.sound.startBGM('boss');
      else this.systems.sound.startBGM('battle');
    }

    this.events.emit('battle_started', { enemies, options });
  }

  endBattle(outcome, enemies, miracleUsed) {
    this.state.battleCount++;

    // Equipment battle tracking (for devotion grace)
    if (this.systems.items) {
      const blessingResult = this.systems.items.postBattle(miracleUsed);
      if (blessingResult?.success) {
        this.events.emit('surprise_blessing', blessingResult);
      }
    }

    // XP and gold from balance system
    if (outcome === 'victory' || outcome === 'pacifist' || outcome === 'survived') {
      // Calculate rewards would come from combat engine
      this.events.emit('battle_rewards', { outcome });
    }

    // Level up check
    if (this.systems.levels) {
      const levelResult = this.systems.levels.checkLevelUp(this.state.player);
      if (levelResult) {
        // Apply vocation growth modifier
        this.events.emit('level_up', levelResult);
      }
    }

    // Return to exploration
    this.state.gamePhase = 'exploration';
    const area = this.data.areasById[this.state.currentArea];
    if (this.systems.sound && area) {
      this.systems.sound.startBGM(area.music || 'exploration');
    }

    this.events.emit('battle_ended', { outcome });
  }

  // ── NPC INTERACTION ───────────────────────────────────────

  interactWithNPC(npcId) {
    const area = this.data.areasById[this.state.currentArea];
    const npcData = area?.npcs?.find(n => n.id === npcId);
    if (!npcData) return;

    // Check if NPC is a trader
    if (npcData.trader && this.systems.items) {
      this.events.emit('open_trade', { traderId: npcId });
      return;
    }

    // Check dialogue
    if (this.data.dialogue) {
      const dialogueKey = `${npcId}_act${this.state.currentAct}`;
      this.events.emit('open_dialogue', { npcId, dialogueKey });
    }
  }

  // ── SACRED SITE REST ──────────────────────────────────────

  sacredSiteRest() {
    const area = this.data.areasById[this.state.currentArea];
    if (area?.restBonus !== 'sacred_site' && !area?.safeZone) return;

    // Full HP/MP restore
    this.state.player.hp = this.state.player.maxHp;
    this.state.player.mp = this.state.player.maxMp;

    // Check for devotion graces (the hidden surprise)
    if (this.systems.items) {
      const graces = this.systems.items.checkDevotionGraces();
      for (const grace of graces) {
        if (grace.success) {
          this.events.emit('devotion_grace', grace);
        }
      }
    }

    // Random virtue bonus from sacred site
    const virtueKeys = Object.keys(this.state.virtues);
    const randomVirtue = virtueKeys[Math.floor(Math.random() * virtueKeys.length)];
    this.state.virtues[randomVirtue] = (this.state.virtues[randomVirtue] || 0) + 0.25;

    if (this.systems.sound) this.systems.sound.playSFX('heal');
    this.events.emit('sacred_rest_complete', { virtueBonus: randomVirtue });
  }

  // ── VOCATION ──────────────────────────────────────────────

  chooseVocation(vocId) {
    if (!this.systems.items?.vocation) return;
    const result = this.systems.items.vocation.commit(vocId, this.state);
    if (result.success) {
      this.events.emit('vocation_chosen', result);
    }
  }

  // ── SAVE / LOAD ───────────────────────────────────────────

  saveGame(slot) {
    // Update play time
    this.state.playTime += Date.now() - this.state.playTimeStart;
    this.state.playTimeStart = Date.now();

    const saveData = {
      ...this.state,
      items: this.systems.items?.toJSON() || null,
    };

    if (this.systems.save) {
      const success = this.systems.save.save(slot, saveData);
      if (success && this.systems.sound) this.systems.sound.playSFX('save');
      this.events.emit('game_saved', { slot, success });
    }
  }

  loadGame(slot) {
    if (!this.systems.save) return;
    const saveData = this.systems.save.load(slot);
    if (!saveData) {
      this.events.emit('load_failed', { slot });
      return;
    }

    // Restore state
    Object.assign(this.state, saveData);
    this.state.playTimeStart = Date.now();

    // Restore items
    if (saveData.items && this.systems.items) {
      // Rebuild from save data
      this.events.emit('items_restored', saveData.items);
    }

    // Reload current area
    this.transitionToArea(this.state.currentArea, null);
    this.events.emit('game_loaded', { slot });
  }

  // ── PLAYER MOVEMENT ───────────────────────────────────────

  movePlayer(dx, dy) {
    if (this.state.gamePhase !== 'exploration') return;
    if (!this.systems.map) return;

    const result = this.systems.map.movePlayer(dx, dy);
    if (!result) return;

    switch (result.type) {
      case 'transition':
        if (result.target) {
          this.events.emit('area_transition', { targetArea: result.target, direction: result.direction });
        }
        break;
      case 'encounter_check':
        this.checkEncounter();
        break;
      case 'save_point':
        this.events.emit('save_point_reached', {});
        break;
      case 'altar':
        this.events.emit('altar_interact', {});
        break;
      case 'npc_nearby':
        this.events.emit('npc_nearby', { npc: result.npc });
        break;
      case 'chest':
        this.events.emit('chest_found', {});
        break;
    }

    // Check hidden items
    if (this.systems.map && this.systems.items) {
      const hasDetect = this.systems.items.equipment?.getActivePassives()
        ?.some(p => p.passive === 'detect_hidden_artifacts');
      const hidden = this.systems.map.checkHidden(
        this.systems.map.playerSprite?.tileX,
        this.systems.map.playerSprite?.tileY,
        hasDetect
      );
      if (hidden) {
        this.events.emit('hidden_item_found', hidden);
      }
    }
  }

  // ── PLAY TIME ─────────────────────────────────────────────

  getPlayTime() {
    return this.state.playTime + (Date.now() - this.state.playTimeStart);
  }

  getPlayTimeFormatted() {
    const ms = this.getPlayTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}:${String(mins).padStart(2, '0')}`;
  }
}


// ═══════════════════════════════════════════════════════════════
// SYSTEM ADAPTERS
// Thin wrappers that match the interface expected by GameRuntime.
// In production, these would import from the actual modules.
// Here they provide the contract for integration.
// ═══════════════════════════════════════════════════════════════

class DifficultyManagerAdapter {
  constructor(balanceData, mode) {
    this.data = balanceData;
    this.mode = mode;
    this.modes = {};
    if (balanceData?.difficulty_modes) {
      for (const m of balanceData.difficulty_modes) {
        this.modes[m.id] = m;
      }
    }
  }
  setMode(m) { this.mode = m; }
  getMultiplier(stat) { return this.modes[this.mode]?.multipliers?.[stat] || 1.0; }
  scaleEnemyHP(hp) { return Math.round(hp * this.getMultiplier('enemy_hp')); }
  scaleEnemyATK(atk) { return Math.round(atk * this.getMultiplier('enemy_atk')); }
  scaleXP(xp) { return Math.round(xp * this.getMultiplier('xp_gain')); }
  scaleGold(g) { return Math.round(g * this.getMultiplier('gold_gain')); }
  getEncounterRate(base) { return base * this.getMultiplier('encounter_rate'); }
  hasBossExtraPhase() { return this.mode === 'martyr'; }
}

class LevelSystemAdapter {
  constructor(balanceData) {
    this.data = balanceData;
    this.xpTable = balanceData?.level_system?.xp_table || [];
    this.statGrowth = balanceData?.level_system?.stat_growth || {};
  }
  checkLevelUp(player) {
    if (!this.xpTable[player.level]) return null;
    const needed = this.xpTable[player.level];
    if (player.xp < needed) return null;

    player.xp -= needed;
    player.level++;

    // Apply stat growth
    const growth = this.statGrowth[player.level] || {};
    const gains = {};
    for (const [stat, value] of Object.entries(growth)) {
      player[stat] = (player[stat] || 0) + value;
      if (stat === 'hp') player.maxHp += value;
      if (stat === 'mp') player.maxMp += value;
      gains[stat] = value;
    }

    // Full HP/MP on level up (JRPG tradition)
    player.hp = player.maxHp;
    player.mp = player.maxMp;

    return { level: player.level, statGains: gains };
  }
}

class EncounterGeneratorAdapter {
  constructor(difficulty, enemyData) {
    this.difficulty = difficulty;
    this.tables = {};
    this.enemies = {};
    this.stepsSinceEncounter = 0;
    this.minSteps = 2;  // In encounter checks (each check = 16 steps)

    // Index encounter tables and enemies
    if (enemyData?.encounter_tables) {
      for (const table of enemyData.encounter_tables) {
        this.tables[table.area_id] = table;
      }
    }
    // Index enemies
    const categories = ['tier_1', 'tier_2', 'tier_3', 'mini_bosses', 'bosses', 'special'];
    for (const cat of categories) {
      if (enemyData?.[cat]) {
        for (const enemy of enemyData[cat]) {
          this.enemies[enemy.id] = enemy;
        }
      }
    }
  }

  check(tableId, playerLevel) {
    this.stepsSinceEncounter++;
    if (this.stepsSinceEncounter < this.minSteps) return null;

    const table = this.tables[tableId];
    if (!table) return null;

    const rate = this.difficulty.getEncounterRate(table.encounter_rate || 0.15);
    const guaranteed = this.stepsSinceEncounter >= 8; // ~128 steps

    if (!guaranteed && Math.random() > rate) return null;

    // Select formation
    const formations = table.formations || [];
    if (formations.length === 0) return null;

    // Weight by player level proximity
    const eligible = formations.filter(f => {
      const minLvl = f.level_range?.[0] || 1;
      const maxLvl = f.level_range?.[1] || 30;
      return playerLevel >= minLvl - 2 && playerLevel <= maxLvl + 2;
    });

    if (eligible.length === 0) return null;

    const formation = eligible[Math.floor(Math.random() * eligible.length)];
    this.stepsSinceEncounter = 0;

    // Build enemy instances
    return (formation.enemies || []).map(eid => {
      const template = this.enemies[eid];
      if (!template) return { id: eid, name: eid, hp: 10, atk: 3 };
      return this._instantiateEnemy(template);
    }).filter(Boolean);
  }

  _instantiateEnemy(template) {
    const roll = (range) => {
      if (!range || !Array.isArray(range)) return range || 0;
      return range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    };
    return {
      id: template.id,
      name: template.name,
      hp: this.difficulty.scaleEnemyHP(roll(template.stats?.hp)),
      maxHp: this.difficulty.scaleEnemyHP(roll(template.stats?.hp)),
      atk: this.difficulty.scaleEnemyATK(roll(template.stats?.atk)),
      def: roll(template.stats?.def) || 0,
      spd: roll(template.stats?.spd) || 3,
      spr: roll(template.stats?.spr) || 0,
      xp: template.rewards?.xp || 10,
      gold: template.rewards?.gold || 5,
      drops: template.rewards?.drops || [],
      abilities: template.abilities || [],
      ai_pattern: template.ai_pattern || 'aggressive',
      weaknesses: template.weaknesses || [],
      resistances: template.resistances || [],
      statusEffects: [],
    };
  }
}

class ItemManagerAdapter {
  constructor(state, itemCatalog, equipmentSystem) {
    this.state = state;
    this.catalog = itemCatalog;
    this.equipSystem = equipmentSystem;
    this.templates = {};
    this.equipment = { equipped: {}, inventory: [], getActivePassives: () => [] };
    this.vocation = null;

    // Index templates
    for (const item of itemCatalog) {
      if (item.id) this.templates[item.id] = item;
    }
  }

  giveStartingEquipment() {
    // Handled by items.js ItemManager.giveStartingEquipment()
    console.log('[ITEMS] Starting equipment assigned');
  }

  postBattle(miracleUsed) { return null; }
  checkDevotionGraces() { return []; }
  toJSON() { return {}; }
}

class SoundEngineAdapter {
  constructor() {
    this.engine = null;
    this.initialized = false;
  }

  init() {
    try {
      // Would construct SoundEngine from sound.js
      this.initialized = true;
    } catch (e) {}
  }

  startBGM(mood) {
    if (!this.initialized) this.init();
    // Delegates to SoundEngine.startBGM()
  }

  startAmbient(type) {}
  playSFX(sfxId) {}
  stopBGM() {}
}

class SaveSystemAdapter {
  constructor() {
    this.storageKey = 'samurai_usagi_save';
  }

  save(slot, data) {
    try {
      const saves = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      saves[slot] = { ...data, timestamp: Date.now(), version: '1.0' };
      localStorage.setItem(this.storageKey, JSON.stringify(saves));
      return true;
    } catch { return false; }
  }

  load(slot) {
    try {
      const saves = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return saves[slot] || null;
    } catch { return null; }
  }

  getSaveSummaries() {
    try {
      const saves = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return [0, 1, 2].map(i => saves[i] ? {
        slot: i, empty: false, level: saves[i].player?.level,
        area: saves[i].currentArea, timestamp: saves[i].timestamp,
      } : { slot: i, empty: true });
    } catch { return [0, 1, 2].map(i => ({ slot: i, empty: true })); }
  }
}
