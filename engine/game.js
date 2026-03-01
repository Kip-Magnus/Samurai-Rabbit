/**
 * SAMURAI USAGI — THE UNIVERSAL ENGINE
 * =====================================
 * A data-driven Phaser 3 JRPG runtime.
 * Reads JSON from data/books/book-XX/ and renders a playable game.
 * Zero era-specific code. All content from data.
 *
 * Scenes: Boot → Title → World ↔ Battle
 *                              ↔ Dialogue (overlay)
 *                              ↔ Menu (overlay)
 *
 * Implements Visual DNA Parts 6-7:
 *   Part 6: Battle Scene Composition (FF6 layout, choreography)
 *   Part 7: Dialogue System (typewriter, portraits, expressions)
 */

import { SpriteFactory, getEraPalette, buildRamp, hexToRGB, ANIMATION_BIBLE } from './sprites.js';
import { EffectsManager } from './effects.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const GAME_W = 480;
const GAME_H = 320;
const TILE = 16;
const SPRITE_SCALE = 3;
const MOVE_SPEED = 120;
const TYPEWRITER_SPEED = 30;   // 30ms per character
const PUNCTUATION_PAUSE = 80;  // 80ms pause on periods/em-dashes

const UI_COLORS = {
  bg: 0x0f0e17,
  bgAlpha: 0.92,
  text: '#e8e0d8',
  textHex: 0xe8e0d8,
  gold: '#c9a959',
  goldHex: 0xc9a959,
  holy: '#ffd700',
  holyHex: 0xffd700,
  blood: '#8b0000',
  bloodHex: 0x8b0000,
  accuser: '#9a6aaa',
  dark: '#0f0e17',
};

// ═══════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════

class GameState {
  constructor() {
    this.bookData = null;
    this.currentBookId = 'book-00';
    this.currentAreaId = null;
    this.act = 1;
    this.player = {
      name: 'Usagi', level: 1, xp: 0,
      hp: 35, maxHp: 35, mp: 10, maxMp: 10,
      atk: 4, def: 5, spd: 6, spr: 8,
      x: 5, y: 5, direction: 'down',
    };
    this.virtues = {
      faith: 0, hope: 0, charity: 0,
      prudence: 0, justice: 0, fortitude: 0, temperance: 0,
    };
    this.inventory = [];
    this.flags = {};
    this.dialoguesSeen = new Set();
    this.choicesMade = {};
    this.stepsUntilEncounter = 20;
  }

  setFlag(key, val) { this.flags[key] = val; }
  getFlag(key) { return this.flags[key]; }
  addItem(item) { this.inventory.push({ ...item, quantity: item.quantity || 1 }); }
  hasItem(id) { return this.inventory.some(i => i.id === id); }
  removeItem(id) {
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx >= 0) this.inventory.splice(idx, 1);
  }

  applyVirtue(effects) {
    if (!effects) return;
    for (const [v, amt] of Object.entries(effects)) {
      if (this.virtues[v] !== undefined) this.virtues[v] = Math.max(0, this.virtues[v] + amt);
    }
  }

  applyFlags(effects) {
    if (!effects) return;
    for (const [k, v] of Object.entries(effects)) this.flags[k] = v;
  }

  toSaveData() {
    return {
      bookId: this.currentBookId, areaId: this.currentAreaId, act: this.act,
      player: { ...this.player }, virtues: { ...this.virtues },
      inventory: [...this.inventory], flags: { ...this.flags },
      dialoguesSeen: [...this.dialoguesSeen], choicesMade: { ...this.choicesMade },
    };
  }

  loadSaveData(data) {
    if (!data) return;
    this.currentBookId = data.bookId || 'book-00';
    this.currentAreaId = data.areaId;
    this.act = data.act || 1;
    Object.assign(this.player, data.player || {});
    Object.assign(this.virtues, data.virtues || {});
    this.inventory = data.inventory || [];
    this.flags = data.flags || {};
    this.dialoguesSeen = new Set(data.dialoguesSeen || []);
    this.choicesMade = data.choicesMade || {};
  }
}

// ═══════════════════════════════════════════════════════════════
// DATA LOADER
// ═══════════════════════════════════════════════════════════════

class DataLoader {
  constructor(basePath = '') { this.basePath = basePath; this.cache = {}; }

  async loadBook(bookId) {
    const dir = `${this.basePath}data/books/${bookId}`;
    const files = ['book', 'characters', 'enemies', 'dialogue', 'items', 'areas'];
    const results = {};

    for (const file of files) {
      try {
        const resp = await fetch(`${dir}/${file}.json`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        results[file] = await resp.json();
      } catch (err) {
        console.warn(`Could not load ${file}.json for ${bookId}:`, err.message);
        results[file] = null;
      }
    }

    // Index by ID for fast lookup
    const indexById = (arr) => {
      const map = {};
      if (!arr) return map;
      if (Array.isArray(arr)) {
        for (const item of arr) map[item.id] = item;
      } else if (typeof arr === 'object') {
        // Handle category-based objects like items.json
        for (const key of Object.keys(arr)) {
          if (key.startsWith('_')) continue;
          const val = arr[key];
          if (Array.isArray(val)) {
            for (const item of val) {
              if (item && item.id) map[item.id] = item;
            }
          }
        }
      }
      return map;
    };

    results.charactersById = indexById(results.characters);
    results.itemsById = indexById(results.items);
    results.enemiesById = indexById(results.enemies);
    results.areasById = indexById(results.areas);
    results.dialogueById = indexById(results.dialogue);

    this.cache[bookId] = results;
    return results;
  }

  getBook(bookId) { return this.cache[bookId] || null; }
}

// ═══════════════════════════════════════════════════════════════
// SAVE SYSTEM
// ═══════════════════════════════════════════════════════════════

class SaveSystem {
  static KEY = 'samurai_usagi_save';
  static save(state) {
    try { localStorage.setItem(SaveSystem.KEY, JSON.stringify(state.toSaveData())); return true; }
    catch (e) { console.warn('Save failed:', e); return false; }
  }
  static load() {
    try { const r = localStorage.getItem(SaveSystem.KEY); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  static hasSave() { return localStorage.getItem(SaveSystem.KEY) !== null; }
  static deleteSave() { localStorage.removeItem(SaveSystem.KEY); }
}

// ═══════════════════════════════════════════════════════════════
// COMBAT ENGINE
// ═══════════════════════════════════════════════════════════════

class CombatEngine {
  constructor(state, bookData) {
    this.state = state;
    this.bookData = bookData;
    this.enemies = [];
    this.turnOrder = [];
    this.currentTurn = 0;
    this.isPlayerTurn = true;
    this.battleLog = [];
    this.onBattleEnd = null;
  }

  startBattle(enemyIds) {
    this.enemies = enemyIds.map(id => {
      const tmpl = this.bookData.enemiesById[id];
      if (!tmpl) return null;
      const stats = {};
      for (const [stat, range] of Object.entries(tmpl.stats)) {
        stats[stat] = Array.isArray(range)
          ? range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1))
          : range;
      }
      return {
        id, name: tmpl.name, ...stats, maxHp: stats.hp,
        behavior: tmpl.behavior, weakness: tmpl.weakness || [],
        resistance: tmpl.resistance || [], drops: tmpl.drops,
        alive: true,
      };
    }).filter(Boolean);

    // Build turn order by speed
    this.turnOrder = this._buildTurnOrder();
    this.currentTurn = 0;
    this.isPlayerTurn = true;
    this.battleLog = [];
    return this.enemies;
  }

  _buildTurnOrder() {
    const units = [
      { type: 'player', name: this.state.player.name, spd: this.state.player.spd },
      ...this.enemies.filter(e => e.alive).map((e, i) => ({ type: 'enemy', index: i, name: e.name, spd: e.spd })),
    ];
    units.sort((a, b) => b.spd - a.spd);
    return units;
  }

  // Player actions
  playerAttack(targetIndex) {
    const enemy = this.enemies[targetIndex];
    if (!enemy || !enemy.alive) return null;

    const p = this.state.player;
    const baseDmg = p.atk + Math.floor(Math.random() * 4);
    const defense = enemy.def || 0;
    const damage = Math.max(1, baseDmg - Math.floor(defense / 2));
    const isCrit = Math.random() < 0.1;
    const finalDmg = isCrit ? Math.floor(damage * 1.5) : damage;

    enemy.hp = Math.max(0, enemy.hp - finalDmg);
    if (enemy.hp <= 0) enemy.alive = false;

    const result = { action: 'attack', target: enemy.name, damage: finalDmg, crit: isCrit, killed: !enemy.alive };
    this.battleLog.push(result);
    return result;
  }

  playerPrayer(skillId) {
    // Miracle/prayer skills
    const p = this.state.player;
    // Simple healing prayer for now
    const healAmt = Math.floor(p.spr * 1.5 + Math.random() * 5);
    const capped = Math.min(healAmt, Math.floor(p.maxHp * 0.4)); // Visual DNA: healing never exceeds 40% max HP
    p.hp = Math.min(p.maxHp, p.hp + capped);
    p.mp = Math.max(0, p.mp - 5);

    const result = { action: 'prayer', heal: capped, mpCost: 5 };
    this.battleLog.push(result);
    return result;
  }

  playerGuard() {
    const result = { action: 'guard', defBoost: 2 };
    this.battleLog.push(result);
    return result;
  }

  playerUseItem(itemId) {
    const item = this.state.inventory.find(i => i.id === itemId);
    if (!item) return null;

    const p = this.state.player;
    let result = { action: 'item', itemName: item.name };

    if (item.effect === 'heal') {
      const heal = Math.min(item.power || 20, Math.floor(p.maxHp * 0.4));
      p.hp = Math.min(p.maxHp, p.hp + heal);
      result.heal = heal;
    }

    this.state.removeItem(itemId);
    this.battleLog.push(result);
    return result;
  }

  // Enemy turn
  processEnemyTurn(enemyIndex) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy || !enemy.alive) return null;

    // AI behavior from schema
    const patterns = (enemy.behavior && enemy.behavior.patterns) || [{ action: 'attack', weight: 100 }];
    const action = this._weightedChoice(patterns, enemy);

    const p = this.state.player;
    if (action.action === 'attack') {
      const baseDmg = enemy.atk + Math.floor(Math.random() * 3);
      const defense = p.def;
      const damage = Math.max(1, baseDmg - Math.floor(defense / 2));
      p.hp = Math.max(0, p.hp - damage);

      const result = { action: 'enemy_attack', attacker: enemy.name, damage, playerDead: p.hp <= 0 };
      this.battleLog.push(result);
      return result;
    }

    // Default: basic attack
    const damage = Math.max(1, enemy.atk - Math.floor(p.def / 2));
    p.hp = Math.max(0, p.hp - damage);
    return { action: 'enemy_attack', attacker: enemy.name, damage, playerDead: p.hp <= 0 };
  }

  _weightedChoice(patterns, enemy) {
    // Filter by conditions
    const valid = patterns.filter(p => {
      if (!p.condition) return true;
      if (p.condition === 'hp < 50%') return enemy.hp < enemy.maxHp * 0.5;
      if (p.condition === 'alone') return this.enemies.filter(e => e.alive).length <= 1;
      return true;
    });

    const totalWeight = valid.reduce((s, p) => s + p.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const p of valid) {
      roll -= p.weight;
      if (roll <= 0) return p;
    }
    return valid[0] || { action: 'attack' };
  }

  isBattleOver() {
    if (this.state.player.hp <= 0) return 'defeat';
    if (this.enemies.every(e => !e.alive)) return 'victory';
    return null;
  }

  calculateRewards() {
    let xp = 0, gold = 0;
    const items = [];
    for (const enemy of this.enemies) {
      if (enemy.drops) {
        const [xpMin, xpMax] = enemy.drops.xp || [5, 10];
        xp += xpMin + Math.floor(Math.random() * (xpMax - xpMin + 1));
        const [gMin, gMax] = enemy.drops.gold || [3, 8];
        gold += gMin + Math.floor(Math.random() * (gMax - gMin + 1));
        if (enemy.drops.items) {
          for (const drop of enemy.drops.items) {
            if (Math.random() < drop.chance) items.push(drop.id);
          }
        }
      }
    }
    return { xp, gold, items };
  }
}

// ═══════════════════════════════════════════════════════════════
// VIRTUE SYSTEM
// ═══════════════════════════════════════════════════════════════

class VirtueSystem {
  static getTotal(virtues) {
    return Object.values(virtues).reduce((s, v) => s + v, 0);
  }

  static getHighest(virtues) {
    let max = 0, name = 'faith';
    for (const [k, v] of Object.entries(virtues)) {
      if (v > max) { max = v; name = k; }
    }
    return { name, value: max };
  }

  // Virtues modify combat: faith boosts holy damage, fortitude boosts defense, etc.
  static getCombatModifiers(virtues) {
    return {
      holyDamageBonus: Math.floor((virtues.faith || 0) * 1.5),
      defenseBonus: Math.floor((virtues.fortitude || 0) * 0.5),
      healingBonus: Math.floor((virtues.charity || 0) * 1.0),
      speedBonus: Math.floor((virtues.prudence || 0) * 0.3),
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// BOOT SCENE
// ═══════════════════════════════════════════════════════════════

class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  init(data) {
    this.onReady = data.onReady;
    this.onError = data.onError;
    this.gameState = data.gameState;
    this.dataLoader = data.dataLoader;
  }

  async create() {
    try {
      // Load Book Zero data
      const bookData = await this.dataLoader.loadBook(this.gameState.currentBookId);
      this.gameState.bookData = bookData;

      // Initialize sprite factory and generate sprites for all characters
      const spriteFactory = new SpriteFactory(this);
      const eraPalette = getEraPalette(this.gameState.currentBookId);

      if (bookData.characters) {
        for (const char of bookData.characters) {
          spriteFactory.generateCharacterSprites(char, eraPalette);
        }
      }

      // Generate era tileset
      spriteFactory.generateTileset(eraPalette, this.gameState.currentBookId);

      // Store references for other scenes
      this.registry.set('gameState', this.gameState);
      this.registry.set('dataLoader', this.dataLoader);
      this.registry.set('spriteFactory', spriteFactory);
      this.registry.set('eraPalette', eraPalette);

      if (this.onReady) this.onReady();

      // Transition to title
      this.scene.start('TitleScene');

    } catch (err) {
      console.error('Boot error:', err);
      if (this.onError) this.onError(err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TITLE SCENE
// ═══════════════════════════════════════════════════════════════

class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const state = this.registry.get('gameState');
    const palette = this.registry.get('eraPalette');

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(UI_COLORS.bg);
    bg.fillRect(0, 0, w, h);

    // Atmospheric particles
    const effects = new EffectsManager(this);
    effects.init();
    effects.particles.createEffect('dust_motes', palette, { count: 12 });

    // Title cross
    const crossY = h * 0.25;
    const cross = this.add.text(w / 2, crossY, '✝', {
      fontSize: '48px', color: UI_COLORS.gold, fontFamily: 'serif',
    }).setOrigin(0.5);

    // Pulsing glow on cross
    this.tweens.add({
      targets: cross, alpha: { from: 0.4, to: 1 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    // Title text
    this.add.text(w / 2, h * 0.42, 'SAMURAI USAGI', {
      fontSize: '28px', color: UI_COLORS.gold, fontFamily: '"Times New Roman", serif',
      letterSpacing: 6,
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.50, 'The Pilgrim\'s Blade', {
      fontSize: '16px', color: UI_COLORS.text, fontFamily: '"Times New Roman", serif',
      letterSpacing: 2, fontStyle: 'italic',
    }).setOrigin(0.5);

    // Book subtitle
    const bookData = state.bookData;
    if (bookData && bookData.book) {
      this.add.text(w / 2, h * 0.60, bookData.book.subtitle || '', {
        fontSize: '12px', color: '#7a6852', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // Menu options
    const menuY = h * 0.72;
    const options = [];

    const newGameText = this.add.text(w / 2, menuY, '► New Game', {
      fontSize: '16px', color: UI_COLORS.text, fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    options.push(newGameText);

    if (SaveSystem.hasSave()) {
      const contText = this.add.text(w / 2, menuY + 30, '► Continue', {
        fontSize: '16px', color: UI_COLORS.text, fontFamily: '"Courier New", monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      options.push(contText);

      contText.on('pointerover', () => contText.setColor(UI_COLORS.gold));
      contText.on('pointerout', () => contText.setColor(UI_COLORS.text));
      contText.on('pointerdown', () => {
        const saveData = SaveSystem.load();
        state.loadSaveData(saveData);
        this._startGame();
      });
    }

    newGameText.on('pointerover', () => newGameText.setColor(UI_COLORS.gold));
    newGameText.on('pointerout', () => newGameText.setColor(UI_COLORS.text));
    newGameText.on('pointerdown', () => {
      SaveSystem.deleteSave();
      this._startGame();
    });

    // Update particles
    this.effectsRef = effects;
  }

  _startGame() {
    const state = this.registry.get('gameState');
    // Set initial area from act 1
    if (state.bookData && state.bookData.book && state.bookData.book.acts) {
      const act1 = state.bookData.book.acts.find(a => a.id === state.act);
      if (act1 && act1.areas && act1.areas.length > 0) {
        state.currentAreaId = act1.areas[0];
      }
    }
    if (!state.currentAreaId && state.bookData && state.bookData.areas && state.bookData.areas.length > 0) {
      state.currentAreaId = state.bookData.areas[0].id;
    }

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('WorldScene');
    });
  }

  update(time, delta) {
    if (this.effectsRef) this.effectsRef.update(time, delta);
  }
}

// ═══════════════════════════════════════════════════════════════
// WORLD SCENE — Exploration, NPC interaction, area transitions
// ═══════════════════════════════════════════════════════════════

class WorldScene extends Phaser.Scene {
  constructor() { super({ key: 'WorldScene' }); }

  create() {
    const state = this.registry.get('gameState');
    const palette = this.registry.get('eraPalette');
    const spriteFactory = this.registry.get('spriteFactory');

    // Effects
    this.effects = new EffectsManager(this);
    this.effects.init();

    // Load current area
    const areaData = state.bookData.areasById[state.currentAreaId];
    if (!areaData) {
      console.error('No area data for:', state.currentAreaId);
      return;
    }

    // Setup atmosphere from area data
    this.effects.setupArea(areaData, palette);

    // Build procedural tilemap
    this._buildTilemap(areaData, palette);

    // Create player sprite
    this._createPlayer(state, spriteFactory);

    // Create NPCs
    this.npcs = [];
    if (areaData.npcs) {
      for (const npcId of areaData.npcs) {
        const npcData = state.bookData.charactersById[npcId];
        if (npcData) this._createNPC(npcData, spriteFactory, areaData);
      }
    }

    // Touch / keyboard input
    this._setupInput();

    // Camera
    this.cameras.main.setBounds(0, 0,
      (areaData.dimensions?.width || 20) * TILE * SPRITE_SCALE,
      (areaData.dimensions?.height || 15) * TILE * SPRITE_SCALE
    );
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
    this.cameras.main.fadeIn(333);

    // Interaction zone
    this.canInteract = true;
    this.interactionCooldown = 0;

    // Area name toast
    this._showAreaName(areaData.name);
  }

  _buildTilemap(areaData, palette) {
    const mapW = areaData.dimensions?.width || 20;
    const mapH = areaData.dimensions?.height || 15;
    const tileScale = SPRITE_SCALE;
    const scaledTile = TILE * tileScale;

    const gfx = this.add.graphics();
    gfx.setDepth(-50);

    // Generate ground tiles procedurally from palette
    const groundRamp = buildRamp(palette.dominant || '#4a7c59');
    const pathColor = palette.path || '#8b7355';

    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const x = tx * scaledTile;
        const y = ty * scaledTile;

        // Simple procedural terrain
        const seed = tx * 7 + ty * 13 + tx * ty;
        const isPath = (ty === Math.floor(mapH / 2) || tx === Math.floor(mapW / 2));
        const isEdge = (tx === 0 || ty === 0 || tx === mapW - 1 || ty === mapH - 1);

        if (isPath) {
          const rgb = hexToRGB(pathColor);
          gfx.fillStyle(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b));
        } else if (isEdge) {
          const rgb = hexToRGB(groundRamp[0]);
          gfx.fillStyle(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b));
        } else {
          // Varied grass
          const variant = seed % 3;
          const rgb = hexToRGB(groundRamp[variant === 0 ? 1 : variant === 1 ? 2 : 3]);
          gfx.fillStyle(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b));
        }

        gfx.fillRect(x, y, scaledTile, scaledTile);

        // Grass blades in foreground (Visual DNA: 3-4 blade shapes, sub-pixel highlight shift)
        if (!isPath && !isEdge && seed % 4 === 0) {
          const bladeRGB = hexToRGB(groundRamp[0]);
          gfx.fillStyle(Phaser.Display.Color.GetColor(bladeRGB.r, bladeRGB.g, bladeRGB.b), 0.6);
          const bx = x + (seed % 12) + 4;
          const by = y + (seed % 8) + 4;
          gfx.fillRect(bx, by, tileScale, 4 * tileScale);
        }
      }
    }
  }

  _createPlayer(state, spriteFactory) {
    const scaledTile = TILE * SPRITE_SCALE;
    const x = state.player.x * scaledTile + scaledTile / 2;
    const y = state.player.y * scaledTile + scaledTile / 2;

    const textureKey = spriteFactory.getOverworldKey('usagi');
    if (this.textures.exists(textureKey)) {
      this.playerSprite = this.add.sprite(x, y, textureKey, 0);
      this.playerSprite.setScale(SPRITE_SCALE);
      this.playerSprite.setDepth(100);

      // Start idle animation
      const idleKey = `usagi_idle_${state.player.direction}`;
      if (this.anims.exists(idleKey)) {
        this.playerSprite.play(idleKey);
      }
    } else {
      // Fallback: colored rectangle
      this.playerSprite = this.add.rectangle(x, y, 16 * SPRITE_SCALE, 24 * SPRITE_SCALE, 0xa0784c);
      this.playerSprite.setDepth(100);
    }

    this.playerMoving = false;
    this.moveTarget = null;
  }

  _createNPC(npcData, spriteFactory, areaData) {
    const scaledTile = TILE * SPRITE_SCALE;
    const mapW = areaData.dimensions?.width || 20;

    // Position NPC pseudo-randomly in the area
    const hash = npcData.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const nx = (3 + (hash % (mapW - 6))) * scaledTile + scaledTile / 2;
    const ny = (3 + ((hash * 7) % ((areaData.dimensions?.height || 15) - 6))) * scaledTile + scaledTile / 2;

    const textureKey = spriteFactory.getOverworldKey(npcData.id);
    let sprite;

    if (this.textures.exists(textureKey)) {
      sprite = this.add.sprite(nx, ny, textureKey, 0);
      sprite.setScale(SPRITE_SCALE);
      sprite.setDepth(90);

      const idleKey = `${npcData.id}_idle_down`;
      if (this.anims.exists(idleKey)) sprite.play(idleKey);
    } else {
      // Fallback
      const furColor = npcData.appearance?.furColor || '#cccccc';
      const rgb = hexToRGB(furColor);
      sprite = this.add.rectangle(nx, ny, 16 * SPRITE_SCALE, 24 * SPRITE_SCALE,
        Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b));
      sprite.setDepth(90);
    }

    // NPC name label
    this.add.text(nx, ny - 40, npcData.name, {
      fontSize: '10px', color: UI_COLORS.gold, fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(91);

    // Interaction zone
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => this._interactWithNPC(npcData));

    this.npcs.push({ sprite, data: npcData });
  }

  _setupInput() {
    // Keyboard
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      });
    }

    // Touch d-pad (bottom-left of screen)
    this.touchDir = null;
    this._createTouchDPad();

    // Menu button (top-right)
    const menuBtn = this.add.text(this.scale.width - 10, 10, '☰', {
      fontSize: '24px', color: UI_COLORS.gold, fontFamily: 'serif',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(10000).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this._openMenu());
  }

  _createTouchDPad() {
    const gfx = this.add.graphics();
    gfx.setScrollFactor(0);
    gfx.setDepth(10000);
    gfx.setAlpha(0.3);

    const cx = 70;
    const cy = this.scale.height - 70;
    const size = 30;
    const gap = 5;

    // D-pad background
    gfx.fillStyle(0xffffff, 0.1);
    gfx.fillCircle(cx, cy, 55);

    // Direction buttons
    const dirs = [
      { dir: 'up', x: cx, y: cy - size - gap },
      { dir: 'down', x: cx, y: cy + size + gap },
      { dir: 'left', x: cx - size - gap, y: cy },
      { dir: 'right', x: cx + size + gap, y: cy },
    ];

    for (const d of dirs) {
      const btn = this.add.rectangle(d.x, d.y, size, size, 0xc9a959, 0.3)
        .setScrollFactor(0).setDepth(10001).setInteractive();

      const arrows = { up: '▲', down: '▼', left: '◄', right: '►' };
      this.add.text(d.x, d.y, arrows[d.dir], {
        fontSize: '14px', color: '#c9a959',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10002).setAlpha(0.5);

      btn.on('pointerdown', () => { this.touchDir = d.dir; });
      btn.on('pointerup', () => { if (this.touchDir === d.dir) this.touchDir = null; });
      btn.on('pointerout', () => { if (this.touchDir === d.dir) this.touchDir = null; });
    }

    // Action button (bottom-right)
    const actionBtn = this.add.circle(this.scale.width - 60, this.scale.height - 60, 25, 0xffd700, 0.3)
      .setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true });
    this.add.text(this.scale.width - 60, this.scale.height - 60, 'A', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10002).setAlpha(0.6);

    actionBtn.on('pointerdown', () => this._tryInteract());
  }

  _showAreaName(name) {
    const text = this.add.text(this.scale.width / 2, 20, name, {
      fontSize: '14px', color: UI_COLORS.gold, fontFamily: '"Times New Roman", serif',
      letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9500).setAlpha(0);

    this.tweens.add({
      targets: text, alpha: { from: 0, to: 1 }, duration: 500,
      hold: 2000,
      yoyo: true, onComplete: () => text.destroy(),
    });
  }

  _tryInteract() {
    if (!this.canInteract) return;

    const state = this.registry.get('gameState');
    const scaledTile = TILE * SPRITE_SCALE;
    const interactDist = scaledTile * 1.5;

    // Find nearest NPC
    let nearest = null;
    let nearestDist = Infinity;

    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.playerSprite.x, this.playerSprite.y,
        npc.sprite.x, npc.sprite.y
      );
      if (dist < interactDist && dist < nearestDist) {
        nearest = npc;
        nearestDist = dist;
      }
    }

    if (nearest) this._interactWithNPC(nearest.data);
  }

  _interactWithNPC(npcData) {
    if (!this.canInteract) return;
    this.canInteract = false;

    const state = this.registry.get('gameState');

    // Find dialogue for this NPC in current act
    let dialogueTree = null;
    if (state.bookData.dialogue) {
      dialogueTree = state.bookData.dialogue.find(d =>
        d.trigger && d.trigger.includes(npcData.id) && (!d.act || d.act === state.act)
      );
      // Fallback: any dialogue referencing this character as speaker
      if (!dialogueTree) {
        dialogueTree = state.bookData.dialogue.find(d =>
          d.nodes && d.nodes[0] && d.nodes[0].speaker === npcData.id
        );
      }
    }

    if (dialogueTree) {
      this.scene.launch('DialogueScene', {
        dialogue: dialogueTree,
        onComplete: () => {
          this.canInteract = true;
          this.scene.stop('DialogueScene');
        },
      });
    } else {
      // Generic greeting
      this.scene.launch('DialogueScene', {
        dialogue: {
          id: `generic_${npcData.id}`,
          nodes: [{
            id: 'start', speaker: npcData.id,
            portrait: 'neutral',
            text: npcData.personality?.speechStyle
              ? `(${npcData.name} regards you quietly.)`
              : `Hello, traveler.`,
            next: null,
          }],
        },
        onComplete: () => {
          this.canInteract = true;
          this.scene.stop('DialogueScene');
        },
      });
    }
  }

  _openMenu() {
    this.scene.launch('MenuScene');
  }

  update(time, delta) {
    if (!this.playerSprite) return;

    const state = this.registry.get('gameState');

    // Movement
    let dx = 0, dy = 0;
    let direction = state.player.direction;

    // Keyboard input
    if (this.cursors) {
      if (this.cursors.up.isDown || (this.wasd && this.wasd.w.isDown)) { dy = -1; direction = 'up'; }
      else if (this.cursors.down.isDown || (this.wasd && this.wasd.s.isDown)) { dy = 1; direction = 'down'; }
      if (this.cursors.left.isDown || (this.wasd && this.wasd.a.isDown)) { dx = -1; direction = 'left'; }
      else if (this.cursors.right.isDown || (this.wasd && this.wasd.d.isDown)) { dx = 1; direction = 'right'; }
    }

    // Touch d-pad
    if (this.touchDir) {
      direction = this.touchDir;
      switch (this.touchDir) {
        case 'up': dy = -1; break;
        case 'down': dy = 1; break;
        case 'left': dx = -1; break;
        case 'right': dx = 1; break;
      }
    }

    // Keyboard interact
    if (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.space)) {
      this._tryInteract();
    }
    if (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.esc)) {
      this._openMenu();
    }

    // Apply movement
    const speed = MOVE_SPEED * SPRITE_SCALE * (delta / 1000);
    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      // Normalize diagonal
      if (dx !== 0 && dy !== 0) {
        const norm = 1 / Math.sqrt(2);
        dx *= norm;
        dy *= norm;
      }

      this.playerSprite.x += dx * speed;
      this.playerSprite.y += dy * speed;
      state.player.direction = direction;

      // Play walk animation
      const walkKey = `usagi_walk_${direction}`;
      if (this.anims.exists(walkKey) && this.playerSprite.anims) {
        if (!this.playerSprite.anims.isPlaying || this.playerSprite.anims.currentAnim?.key !== walkKey) {
          this.playerSprite.play(walkKey);
        }
      }

      // Update grid position
      const scaledTile = TILE * SPRITE_SCALE;
      state.player.x = Math.floor(this.playerSprite.x / scaledTile);
      state.player.y = Math.floor(this.playerSprite.y / scaledTile);

    } else {
      // Idle animation
      const idleKey = `usagi_idle_${state.player.direction}`;
      if (this.anims.exists(idleKey) && this.playerSprite.anims) {
        if (!this.playerSprite.anims.isPlaying || !this.playerSprite.anims.currentAnim?.key.includes('idle')) {
          this.playerSprite.play(idleKey);
        }
      }
    }

    // Update effects
    this.effects.update(time, delta);
  }
}

// ═══════════════════════════════════════════════════════════════
// DIALOGUE SCENE (Overlay) — Visual DNA Part 7
// ═══════════════════════════════════════════════════════════════

/**
 * FF6 dialogue box, refined:
 *   Background: #0f0e17 at 94% opacity
 *   Border: 1px era gold at 40% opacity
 *   Portrait: 48×48 left-aligned, 2px gold border
 *   Name: Era gold, serif, 14px, letter-spacing 2px
 *   Text: #e8e0d8, 16-18px, line-height 1.65
 *   Typewriter: 30ms per char, 80ms pause on periods/em-dashes
 *   Continue: ▸ bottom-right, gentle pulse
 *   Max 3 lines visible
 */
class DialogueScene extends Phaser.Scene {
  constructor() { super({ key: 'DialogueScene' }); }

  init(data) {
    this.dialogueData = data.dialogue;
    this.onComplete = data.onComplete;
    this.currentNodeId = 'start';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = false;
    this.fullText = '';
    this.displayedText = '';
    this.waitingForInput = false;
    this.choiceMode = false;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const state = this.registry.get('gameState');
    const spriteFactory = this.registry.get('spriteFactory');
    const palette = this.registry.get('eraPalette');

    // Dialogue box dimensions (bottom 30% of screen)
    const boxH = Math.floor(h * 0.30);
    const boxY = h - boxH;
    const boxPad = 12;
    const portraitSize = 48 * 2; // 48px displayed at 2x = 96

    // Semi-transparent background
    this.boxBg = this.add.graphics();
    this.boxBg.fillStyle(UI_COLORS.bg, UI_COLORS.bgAlpha);
    this.boxBg.fillRect(0, boxY, w, boxH);

    // Border: 1px era gold at 40%
    this.boxBg.lineStyle(1, UI_COLORS.goldHex, 0.4);
    this.boxBg.strokeRect(1, boxY + 1, w - 2, boxH - 2);

    // Portrait placeholder
    this.portraitBg = this.add.graphics();
    this.portraitX = boxPad + 4;
    this.portraitY = boxY + boxPad + 4;

    // Portrait border (2px gold)
    this.portraitBg.lineStyle(2, UI_COLORS.goldHex, 0.6);
    this.portraitBg.strokeRect(this.portraitX - 2, this.portraitY - 2, portraitSize + 4, portraitSize + 4);

    // Portrait sprite
    this.portraitSprite = null;

    // Speaker name
    const textX = this.portraitX + portraitSize + boxPad;
    this.nameText = this.add.text(textX, boxY + boxPad, '', {
      fontSize: '14px', color: UI_COLORS.gold,
      fontFamily: '"Times New Roman", serif',
      letterSpacing: 2,
    });

    // Dialogue text with line height 1.65
    this.dialogueText = this.add.text(textX, boxY + boxPad + 22, '', {
      fontSize: '16px', color: UI_COLORS.text,
      fontFamily: '"Courier New", monospace',
      wordWrap: { width: w - textX - boxPad - 10 },
      lineSpacing: 6,
    });

    // Continue indicator: ▸ bottom-right, gentle pulse
    this.continueIndicator = this.add.text(w - boxPad - 10, h - boxPad - 5, '▸', {
      fontSize: '16px', color: UI_COLORS.gold,
    }).setOrigin(1).setAlpha(0);

    this.tweens.add({
      targets: this.continueIndicator,
      alpha: { from: 0.3, to: 1 },
      duration: 600, yoyo: true, repeat: -1,
    });

    // Choice buttons container
    this.choiceButtons = [];

    // Click/tap to advance
    this.input.on('pointerdown', () => this._advance());
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this._advance());
      this.input.keyboard.on('keydown-ENTER', () => this._advance());
    }

    // Store refs
    this.spriteFactory = spriteFactory;
    this.palette = palette;
    this.gameState = state;
    this.boxY = boxY;

    // Start first node
    this._showNode(this.currentNodeId);
  }

  _showNode(nodeId) {
    const nodes = this.dialogueData.nodes;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      this._endDialogue();
      return;
    }

    this.currentNode = node;

    // Set speaker name
    const speakerId = node.speaker;
    const state = this.gameState;
    const charData = state.bookData?.charactersById?.[speakerId];
    const speakerName = charData?.name || speakerId || '';
    this.nameText.setText(speakerName.toUpperCase());

    // Set portrait
    this._updatePortrait(speakerId, node.portrait || 'neutral');

    // Start typewriter
    this.fullText = node.text || '';
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.isTyping = true;
    this.waitingForInput = false;
    this.choiceMode = false;
    this.continueIndicator.setAlpha(0);

    // Clear old choices
    this._clearChoices();
  }

  _updatePortrait(charId, expression) {
    // Remove old portrait
    if (this.portraitSprite) {
      this.portraitSprite.destroy();
      this.portraitSprite = null;
    }

    if (!this.spriteFactory) return;

    const portraitKey = this.spriteFactory.getPortraitKey(charId);
    if (this.textures.exists(portraitKey)) {
      const frameIdx = this.spriteFactory.getExpressionFrame(charId, expression);
      this.portraitSprite = this.add.sprite(
        this.portraitX + 48, this.portraitY + 48,
        portraitKey, frameIdx
      ).setScale(2).setDepth(1);
    } else {
      // Fallback: colored square with initial
      const charData = this.gameState.bookData?.charactersById?.[charId];
      const furColor = charData?.appearance?.furColor || '#a0784c';
      const rgb = hexToRGB(furColor);
      const rect = this.add.rectangle(
        this.portraitX + 48, this.portraitY + 48,
        96, 96, Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b)
      );
      const initial = (charData?.name || charId || '?')[0].toUpperCase();
      this.add.text(this.portraitX + 48, this.portraitY + 48, initial, {
        fontSize: '32px', color: '#ffffff', fontFamily: 'serif',
      }).setOrigin(0.5);
      this.portraitSprite = rect;
    }
  }

  _advance() {
    if (this.choiceMode) return; // Choices handled by buttons

    if (this.isTyping) {
      // Skip to full text
      this.isTyping = false;
      this.displayedText = this.fullText;
      this.dialogueText.setText(this.displayedText);
      this.waitingForInput = true;
      this.continueIndicator.setAlpha(1);
      return;
    }

    if (this.waitingForInput) {
      const node = this.currentNode;

      // Apply effects
      if (node.effects) {
        for (const effect of node.effects) {
          switch (effect.type) {
            case 'setFlag':
              this.gameState.setFlag(effect.flag, effect.value);
              break;
            case 'giveItem':
              if (effect.item) {
                const itemData = this.gameState.bookData?.itemsById?.[effect.item];
                if (itemData) this.gameState.addItem(itemData);
              }
              break;
            case 'addVirtue':
              this.gameState.applyVirtue(effect.virtues || {});
              break;
          }
        }
      }

      // Check for choices
      if (node.choices && node.choices.length > 0) {
        this._showChoices(node.choices);
        return;
      }

      // Check for moral choice reference
      if (node.moralChoice) {
        const book = this.gameState.bookData?.book;
        if (book?.moralChoices) {
          const choice = book.moralChoices.find(c => c.id === node.moralChoice);
          if (choice) {
            this._showMoralChoice(choice);
            return;
          }
        }
      }

      // Next node
      if (node.next) {
        this._showNode(node.next);
      } else {
        this._endDialogue();
      }
    }
  }

  _showChoices(choices) {
    this.choiceMode = true;
    this.continueIndicator.setAlpha(0);
    this._clearChoices();

    const w = this.scale.width;
    const startY = this.boxY - (choices.length * 35) - 10;

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const y = startY + i * 35;

      // Choice background
      const bg = this.add.graphics();
      bg.fillStyle(UI_COLORS.bg, 0.9);
      bg.fillRect(w * 0.2, y, w * 0.6, 30);
      bg.lineStyle(1, UI_COLORS.goldHex, 0.3);
      bg.strokeRect(w * 0.2, y, w * 0.6, 30);

      // Choice text
      const text = this.add.text(w / 2, y + 15, `► ${choice.label}`, {
        fontSize: '14px', color: UI_COLORS.text,
        fontFamily: '"Courier New", monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      // Virtue hint
      if (choice.virtueEffect) {
        const virtueNames = Object.entries(choice.virtueEffect)
          .filter(([, v]) => v > 0)
          .map(([k]) => k);
        if (virtueNames.length > 0) {
          this.add.text(w * 0.75, y + 15, `[${virtueNames.join(', ')}]`, {
            fontSize: '10px', color: '#7a6852', fontFamily: 'monospace',
          }).setOrigin(0, 0.5);
        }
      }

      text.on('pointerover', () => text.setColor(UI_COLORS.gold));
      text.on('pointerout', () => text.setColor(UI_COLORS.text));
      text.on('pointerdown', () => this._selectChoice(choice));

      this.choiceButtons.push(bg, text);
    }
  }

  _showMoralChoice(moralChoice) {
    // Moral choices use the same UI but with the description as prompt
    this.dialogueText.setText(moralChoice.description);
    this._showChoices(moralChoice.options.map(opt => ({
      label: opt.label,
      virtueEffect: opt.virtueEffect,
      flagEffect: opt.flagEffect,
      next: null,
    })));
  }

  _selectChoice(choice) {
    this.choiceMode = false;
    this._clearChoices();

    // Apply virtue effects
    if (choice.virtueEffect) {
      this.gameState.applyVirtue(choice.virtueEffect);

      // Show virtue toast
      for (const [virtue, amount] of Object.entries(choice.virtueEffect)) {
        if (amount !== 0) this._showVirtueToast(virtue, amount);
      }
    }

    // Apply flag effects
    if (choice.flagEffect) {
      this.gameState.applyFlags(choice.flagEffect);
    }

    // Store choice
    if (this.currentNode?.moralChoice) {
      this.gameState.choicesMade[this.currentNode.moralChoice] = choice.label;
    }

    // Continue to next node
    if (choice.next) {
      this._showNode(choice.next);
    } else if (this.currentNode?.next) {
      this._showNode(this.currentNode.next);
    } else {
      this._endDialogue();
    }
  }

  _showVirtueToast(virtue, amount) {
    const sign = amount > 0 ? '+' : '';
    const color = amount > 0 ? UI_COLORS.gold : '#8b0000';
    const text = this.add.text(this.scale.width / 2, this.boxY - 30,
      `${virtue.toUpperCase()} ${sign}${amount}`, {
        fontSize: '14px', color, fontFamily: '"Times New Roman", serif',
        letterSpacing: 2,
      }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: { from: 0, to: 1 }, y: text.y - 20,
      duration: 800, hold: 1000, yoyo: true,
      onComplete: () => text.destroy(),
    });
  }

  _clearChoices() {
    for (const obj of this.choiceButtons) obj.destroy();
    this.choiceButtons = [];
  }

  _endDialogue() {
    // Mark dialogue as seen
    if (this.dialogueData?.id) {
      this.gameState.dialoguesSeen.add(this.dialogueData.id);
    }

    if (this.onComplete) this.onComplete();
  }

  update(time, delta) {
    // Typewriter effect
    if (this.isTyping && this.typewriterIndex < this.fullText.length) {
      this.typewriterTimer += delta;

      const currentChar = this.fullText[this.typewriterIndex];
      const isPunctuation = currentChar === '.' || currentChar === '—' || currentChar === '!' || currentChar === '?';
      const charDelay = isPunctuation ? PUNCTUATION_PAUSE : TYPEWRITER_SPEED;

      if (this.typewriterTimer >= charDelay) {
        this.typewriterTimer = 0;
        this.typewriterIndex++;
        this.displayedText = this.fullText.substring(0, this.typewriterIndex);
        this.dialogueText.setText(this.displayedText);
      }
    } else if (this.isTyping && this.typewriterIndex >= this.fullText.length) {
      this.isTyping = false;
      this.waitingForInput = true;
      this.continueIndicator.setAlpha(1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// BATTLE SCENE — Visual DNA Part 6
// ═══════════════════════════════════════════════════════════════

/**
 * FF6 Battle Layout:
 *   Enemies LEFT, staggered vertically
 *   Party RIGHT, staggered (CT-style)
 *   Background: era-specific parallax
 *   UI: bottom 30%, semi-transparent
 *   Commands: FIGHT, PRAYER, ITEM, GUARD, FLEE
 *
 * Choreography follows Visual DNA attack/prayer/damage/death sequences
 * with held impact frames, anticipation, and follow-through.
 */
class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleScene' }); }

  init(data) {
    this.enemyIds = data.enemyIds || ['falling_beam'];
    this.onBattleEnd = data.onBattleEnd;
    this.backgroundType = data.backgroundType || 'outdoor';
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const state = this.registry.get('gameState');
    const palette = this.registry.get('eraPalette');
    const spriteFactory = this.registry.get('spriteFactory');

    // Effects
    this.effects = new EffectsManager(this);
    this.effects.init();
    this.effects.setupBattle(palette, this.backgroundType);

    // Background
    this._drawBattleBackground(w, h, palette);

    // Combat engine
    this.combat = new CombatEngine(state, state.bookData);
    this.combat.startBattle(this.enemyIds);

    // Enemy sprites (LEFT side, staggered)
    this.enemySprites = [];
    const enemyStartX = w * 0.2;
    const enemyStartY = h * 0.25;

    for (let i = 0; i < this.combat.enemies.length; i++) {
      const enemy = this.combat.enemies[i];
      const ex = enemyStartX + (i % 2) * 40;
      const ey = enemyStartY + i * 60;

      const textureKey = spriteFactory.getBattleKey(enemy.id);
      let sprite;
      if (this.textures.exists(textureKey)) {
        sprite = this.add.sprite(ex, ey, textureKey, 0).setScale(SPRITE_SCALE).setDepth(50);
        sprite.setFlipX(true); // Enemies face right toward player
      } else {
        sprite = this.add.rectangle(ex, ey, 32 * SPRITE_SCALE, 48 * SPRITE_SCALE, 0x8b0000).setDepth(50);
      }

      // Enemy name
      this.add.text(ex, ey - 80, enemy.name, {
        fontSize: '10px', color: UI_COLORS.text, fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(51);

      // HP bar
      const hpBarBg = this.add.rectangle(ex, ey + 75, 60, 6, 0x1a1a2e).setDepth(51);
      const hpBar = this.add.rectangle(ex - 29, ey + 75, 58, 4, 0xc0392b).setOrigin(0, 0.5).setDepth(52);

      this.enemySprites.push({ sprite, hpBar, hpBarBg, enemy, x: ex, y: ey });
    }

    // Player sprite (RIGHT side)
    const playerX = w * 0.75;
    const playerY = h * 0.45;
    const playerTextureKey = spriteFactory.getBattleKey('usagi');

    if (this.textures.exists(playerTextureKey)) {
      this.playerBattleSprite = this.add.sprite(playerX, playerY, playerTextureKey, 0)
        .setScale(SPRITE_SCALE).setDepth(50);
      const idleKey = 'usagi_idle_battle';
      if (this.anims.exists(idleKey)) this.playerBattleSprite.play(idleKey);
    } else {
      this.playerBattleSprite = this.add.rectangle(playerX, playerY, 32 * SPRITE_SCALE, 48 * SPRITE_SCALE, 0xa0784c).setDepth(50);
    }

    // UI Panel (bottom 30%)
    this._createBattleUI(w, h, state, palette);

    // State
    this.battleState = 'player_choose'; // player_choose, player_animate, enemy_turn, enemy_animate, result
    this.selectedTarget = 0;
    this.animationQueue = [];

    // Camera fade in
    this.cameras.main.fadeIn(300);
  }

  _drawBattleBackground(w, h, palette) {
    const bg = this.add.graphics();
    bg.setDepth(-100);

    // Gradient background using era palette
    const topColor = hexToRGB(palette.sky || '#87ceeb');
    const botColor = hexToRGB(palette.dominant || '#4a7c59');
    const groundY = Math.floor(h * 0.65);

    for (let y = 0; y < groundY; y++) {
      const t = y / groundY;
      const r = Math.round(topColor.r * (1 - t) + botColor.r * t * 0.5);
      const g = Math.round(topColor.g * (1 - t) + botColor.g * t * 0.5);
      const b = Math.round(topColor.b * (1 - t) + botColor.b * t * 0.5);
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillRect(0, y, w, 1);
    }

    // Ground
    const groundRGB = hexToRGB(palette.dominant || '#4a7c59');
    bg.fillStyle(Phaser.Display.Color.GetColor(groundRGB.r, groundRGB.g, groundRGB.b));
    bg.fillRect(0, groundY, w, h - groundY);

    // Ground detail
    const darkRGB = hexToRGB(buildRamp(palette.dominant || '#4a7c59')[0]);
    bg.fillStyle(Phaser.Display.Color.GetColor(darkRGB.r, darkRGB.g, darkRGB.b), 0.3);
    for (let i = 0; i < 20; i++) {
      const gx = Math.random() * w;
      const gy = groundY + Math.random() * (h - groundY);
      bg.fillRect(gx, gy, 2 + Math.random() * 4, 1);
    }
  }

  _createBattleUI(w, h, state, palette) {
    const uiY = h * 0.70;
    const uiH = h - uiY;

    // UI background
    const uiBg = this.add.graphics();
    uiBg.setDepth(200);
    uiBg.fillStyle(UI_COLORS.bg, UI_COLORS.bgAlpha);
    uiBg.fillRect(0, uiY, w, uiH);
    uiBg.lineStyle(1, UI_COLORS.goldHex, 0.3);
    uiBg.strokeRect(0, uiY, w, uiH);

    // Player stats (left side)
    const statsX = 15;
    const statsY = uiY + 10;

    this.add.text(statsX, statsY, state.player.name, {
      fontSize: '14px', color: UI_COLORS.gold, fontFamily: '"Courier New", monospace',
    }).setDepth(210);

    // HP bar
    this.add.text(statsX, statsY + 20, 'HP', {
      fontSize: '10px', color: '#7a6852', fontFamily: 'monospace',
    }).setDepth(210);

    this.playerHPBarBg = this.add.rectangle(statsX + 25, statsY + 25, 120, 8, 0x1a1a2e).setOrigin(0, 0.5).setDepth(210);
    this.playerHPBar = this.add.rectangle(statsX + 26, statsY + 25, 118, 6, 0x4a7c59).setOrigin(0, 0.5).setDepth(211);

    this.playerHPText = this.add.text(statsX + 150, statsY + 20, `${state.player.hp}/${state.player.maxHp}`, {
      fontSize: '10px', color: UI_COLORS.text, fontFamily: 'monospace',
    }).setDepth(210);

    // MP bar
    this.add.text(statsX, statsY + 35, 'MP', {
      fontSize: '10px', color: '#7a6852', fontFamily: 'monospace',
    }).setDepth(210);

    this.playerMPBarBg = this.add.rectangle(statsX + 25, statsY + 40, 120, 8, 0x1a1a2e).setOrigin(0, 0.5).setDepth(210);
    this.playerMPBar = this.add.rectangle(statsX + 26, statsY + 40, 118, 6, 0x2b6ca3).setOrigin(0, 0.5).setDepth(211);

    // ATB bar (thin gold under name — Visual DNA spec)
    this.atbBar = this.add.rectangle(statsX, statsY + 52, 0, 3, UI_COLORS.goldHex).setOrigin(0, 0.5).setDepth(211);

    // Command buttons (right side)
    const cmdX = w * 0.55;
    const cmdY = uiY + 12;
    const commands = [
      { label: 'FIGHT', action: 'fight' },
      { label: 'PRAYER', action: 'prayer' },
      { label: 'ITEM', action: 'item' },
      { label: 'GUARD', action: 'guard' },
      { label: 'FLEE', action: 'flee' },
    ];

    this.commandButtons = [];
    const cols = 3;
    for (let i = 0; i < commands.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = cmdX + col * 65;
      const by = cmdY + row * 35;

      const bg = this.add.rectangle(bx + 27, by + 12, 60, 26, UI_COLORS.bg, 0.5).setDepth(210);
      bg.setStrokeStyle(1, UI_COLORS.goldHex, 0.3);

      const txt = this.add.text(bx + 27, by + 12, commands[i].label, {
        fontSize: '11px', color: UI_COLORS.text, fontFamily: '"Courier New", monospace',
      }).setOrigin(0.5).setDepth(211).setInteractive({ useHandCursor: true });

      txt.on('pointerover', () => txt.setColor(UI_COLORS.gold));
      txt.on('pointerout', () => txt.setColor(UI_COLORS.text));
      txt.on('pointerdown', () => this._executeCommand(commands[i].action));

      this.commandButtons.push({ bg, txt, action: commands[i].action });
    }

    // Battle log text
    this.battleLogText = this.add.text(w / 2, uiY - 20, '', {
      fontSize: '12px', color: UI_COLORS.text, fontFamily: 'monospace',
      backgroundColor: 'rgba(15,14,23,0.8)', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(300).setAlpha(0);
  }

  _executeCommand(action) {
    if (this.battleState !== 'player_choose') return;

    const state = this.registry.get('gameState');

    switch (action) {
      case 'fight': {
        // Find first alive enemy
        const targetIdx = this.combat.enemies.findIndex(e => e.alive);
        if (targetIdx < 0) return;

        this.battleState = 'player_animate';
        const result = this.combat.playerAttack(targetIdx);
        this._animatePlayerAttack(targetIdx, result);
        break;
      }

      case 'prayer': {
        if (state.player.mp < 5) {
          this._showBattleLog('Not enough MP!');
          return;
        }
        this.battleState = 'player_animate';
        const result = this.combat.playerPrayer();
        this._animatePrayer(result);
        break;
      }

      case 'guard': {
        this.battleState = 'player_animate';
        const result = this.combat.playerGuard();
        this._showBattleLog('Guarding...');
        this.time.delayedCall(500, () => this._endPlayerTurn());
        break;
      }

      case 'item': {
        // Simple: use first healing item
        const healItem = state.inventory.find(i => i.effect === 'heal');
        if (!healItem) {
          this._showBattleLog('No items!');
          return;
        }
        this.battleState = 'player_animate';
        const result = this.combat.playerUseItem(healItem.id);
        this._showBattleLog(`Used ${result.itemName}! +${result.heal} HP`);
        this._updateUI();
        this.time.delayedCall(800, () => this._endPlayerTurn());
        break;
      }

      case 'flee': {
        const fleeChance = 0.5;
        if (Math.random() < fleeChance) {
          this._showBattleLog('Escaped!');
          this.time.delayedCall(800, () => this._endBattle('flee'));
        } else {
          this._showBattleLog('Can\'t escape!');
          this.time.delayedCall(500, () => this._endPlayerTurn());
        }
        break;
      }
    }
  }

  /**
   * ATTACK ANIMATION CHOREOGRAPHY (Visual DNA Part 6):
   * 1. Step forward 8px (4 frames ease-out)
   * 2. Wind-up (2 frames)
   * 3. Dash toward enemy (3 frames fast)
   * 4. Strike + impact HELD 180ms
   * 5. Damage number rises (floaty)
   * 6. Enemy damage animation (flash + flinch)
   * 7. Return to position (4 frames ease-in)
   */
  _animatePlayerAttack(targetIdx, result) {
    const sprite = this.playerBattleSprite;
    const target = this.enemySprites[targetIdx];
    if (!target) { this._endPlayerTurn(); return; }

    const origX = sprite.x;
    const origY = sprite.y;

    // Play attack animation if available
    const atkKey = 'usagi_attack_katana';
    if (this.anims.exists(atkKey) && sprite.anims) {
      sprite.play(atkKey);
    }

    // 1-3. Step forward + dash toward enemy
    this.tweens.add({
      targets: sprite,
      x: target.x + 80,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        // 4. Impact — screen effects
        if (result.crit) {
          // CRITICAL: freeze 6 frames, white flash, 2x damage number, heavy shake
          this.effects.flashScreen('damage');
          this.effects.shakeCamera('heavy');
        } else {
          this.effects.shakeCamera('light');
        }

        // 5. Damage number rises from enemy (floaty)
        const dmgColor = result.crit ? UI_COLORS.gold : '#ffffff';
        const dmgSize = result.crit ? '24px' : '16px';
        const dmgText = this.add.text(target.x, target.y - 40, `${result.damage}`, {
          fontSize: dmgSize, color: dmgColor, fontFamily: 'monospace',
          fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(500);

        this.tweens.add({
          targets: dmgText,
          y: dmgText.y - 40,
          alpha: 0,
          duration: 1200,
          ease: 'Power1',
          onComplete: () => dmgText.destroy(),
        });

        // 6. Enemy flash + flinch
        if (target.sprite.setTint) {
          target.sprite.setTint(0xffffff);
          this.time.delayedCall(100, () => {
            if (target.sprite.clearTint) target.sprite.clearTint();
          });
        }

        // Flinch
        this.tweens.add({
          targets: target.sprite,
          x: target.x - 8,
          duration: 60,
          yoyo: true,
        });

        // Update HP bar
        this._updateEnemyHPBar(targetIdx);

        // Enemy death check
        if (result.killed) {
          // Death: flash 3x, collapse, fade
          this._animateEnemyDeath(targetIdx);
        }

        // 7. Return to position (impact hold 180ms first)
        this.time.delayedCall(result.crit ? 360 : 180, () => {
          this.tweens.add({
            targets: sprite,
            x: origX,
            duration: 250,
            ease: 'Power1',
            onComplete: () => {
              // Resume idle
              const idleKey = 'usagi_idle_battle';
              if (this.anims.exists(idleKey) && sprite.anims) sprite.play(idleKey);
              this._endPlayerTurn();
            },
          });
        });
      },
    });
  }

  /**
   * PRAYER ANIMATION (Visual DNA):
   * Hands raise, golden particles gather spiral, burst outward.
   */
  _animatePrayer(result) {
    const sprite = this.playerBattleSprite;
    const palette = this.registry.get('eraPalette');

    // Play prayer animation
    const prayKey = 'usagi_attack_prayer';
    if (this.anims.exists(prayKey) && sprite.anims) sprite.play(prayKey);

    // Holy motes gather
    this.effects.addHolyMotes(sprite.x, sprite.y, palette);

    // Holy flash after gather
    this.time.delayedCall(800, () => {
      this.effects.flashScreen('holy');
      this.effects.burstHolyMotes();

      // Heal number
      const healText = this.add.text(sprite.x, sprite.y - 50, `+${result.heal}`, {
        fontSize: '18px', color: UI_COLORS.holy, fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(500);

      this.tweens.add({
        targets: healText, y: healText.y - 30, alpha: 0,
        duration: 1000, onComplete: () => healText.destroy(),
      });

      this._updateUI();
    });

    this.time.delayedCall(1500, () => {
      const idleKey = 'usagi_idle_battle';
      if (this.anims.exists(idleKey) && sprite.anims) sprite.play(idleKey);
      this._endPlayerTurn();
    });
  }

  /**
   * ENEMY DEATH (Visual DNA):
   * Flash white 3 times (on/off 2 frames each), collapse, fade 8 frames.
   * XP/gold popup rises.
   */
  _animateEnemyDeath(targetIdx) {
    const target = this.enemySprites[targetIdx];
    if (!target) return;

    // Flash 3 times
    let flashCount = 0;
    const flashTimer = this.time.addEvent({
      delay: 67,  // ~2 frames
      callback: () => {
        flashCount++;
        if (flashCount % 2 === 1) {
          if (target.sprite.setTint) target.sprite.setTint(0xffffff);
        } else {
          if (target.sprite.clearTint) target.sprite.clearTint();
        }
        if (flashCount >= 6) {
          flashTimer.remove();
          // Fade to transparent over 8 frames
          this.tweens.add({
            targets: [target.sprite, target.hpBar, target.hpBarBg],
            alpha: 0,
            duration: 133,  // ~8 frames
          });
        }
      },
      loop: true,
    });
  }

  _updateEnemyHPBar(idx) {
    const es = this.enemySprites[idx];
    if (!es) return;
    const ratio = Math.max(0, es.enemy.hp / es.enemy.maxHp);
    es.hpBar.setScale(ratio, 1);
  }

  _updateUI() {
    const state = this.registry.get('gameState');
    const hpRatio = state.player.hp / state.player.maxHp;
    const mpRatio = state.player.mp / state.player.maxMp;

    if (this.playerHPBar) this.playerHPBar.setScale(hpRatio, 1);
    if (this.playerMPBar) this.playerMPBar.setScale(mpRatio, 1);
    if (this.playerHPText) this.playerHPText.setText(`${state.player.hp}/${state.player.maxHp}`);
  }

  _showBattleLog(msg) {
    this.battleLogText.setText(msg).setAlpha(1);
    this.tweens.add({
      targets: this.battleLogText, alpha: 0,
      delay: 1500, duration: 500,
    });
  }

  _endPlayerTurn() {
    // Check battle end
    const result = this.combat.isBattleOver();
    if (result) {
      this.time.delayedCall(500, () => this._endBattle(result));
      return;
    }

    // Enemy turn
    this.battleState = 'enemy_turn';
    this._processEnemyTurns();
  }

  _processEnemyTurns() {
    const aliveEnemies = this.combat.enemies.filter(e => e.alive);
    let delay = 0;

    for (let i = 0; i < this.combat.enemies.length; i++) {
      if (!this.combat.enemies[i].alive) continue;

      this.time.delayedCall(delay, () => {
        const result = this.combat.processEnemyTurn(i);
        if (result) {
          this._animateEnemyAttack(i, result);
        }
      });
      delay += 800;
    }

    // Return to player turn
    this.time.delayedCall(delay + 300, () => {
      const battleResult = this.combat.isBattleOver();
      if (battleResult) {
        this._endBattle(battleResult);
      } else {
        this.battleState = 'player_choose';
        this._updateUI();
      }
    });
  }

  _animateEnemyAttack(enemyIdx, result) {
    const es = this.enemySprites[enemyIdx];
    if (!es) return;

    // Enemy lunges forward briefly
    this.tweens.add({
      targets: es.sprite, x: es.x + 30,
      duration: 150, yoyo: true, ease: 'Power2',
    });

    // Player damage
    this.time.delayedCall(150, () => {
      this.effects.shakeCamera('light');

      // Flash player
      if (this.playerBattleSprite.setTint) {
        this.playerBattleSprite.setTint(0xff4444);
        this.time.delayedCall(100, () => {
          if (this.playerBattleSprite.clearTint) this.playerBattleSprite.clearTint();
        });
      }

      // Damage number
      const dmgText = this.add.text(this.playerBattleSprite.x, this.playerBattleSprite.y - 50,
        `${result.damage}`, {
          fontSize: '16px', color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(500);

      this.tweens.add({
        targets: dmgText, y: dmgText.y - 30, alpha: 0,
        duration: 1000, onComplete: () => dmgText.destroy(),
      });

      this._updateUI();
      this._showBattleLog(`${result.attacker} attacks! ${result.damage} damage`);
    });
  }

  _endBattle(result) {
    this.battleState = 'result';

    if (result === 'victory') {
      const rewards = this.combat.calculateRewards();
      const state = this.registry.get('gameState');
      state.player.xp += rewards.xp;

      this._showBattleLog(`Victory! +${rewards.xp} XP`);

      this.time.delayedCall(1500, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
          if (this.onBattleEnd) this.onBattleEnd('victory', rewards);
          this.scene.stop();
        });
      });

    } else if (result === 'defeat') {
      // Death fade to white then black (Visual DNA spec)
      this.effects.fadeScene('out', 'white', () => {
        this._showBattleLog('Defeated...');
        this.time.delayedCall(1500, () => {
          if (this.onBattleEnd) this.onBattleEnd('defeat');
          this.scene.stop();
        });
      });

    } else if (result === 'flee') {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => {
        if (this.onBattleEnd) this.onBattleEnd('flee');
        this.scene.stop();
      });
    }
  }

  update(time, delta) {
    this.effects.update(time, delta);

    // ATB bar fill animation
    if (this.atbBar && this.battleState === 'player_choose') {
      this.atbBar.width = 120; // Full when it's player's turn
    } else if (this.atbBar) {
      this.atbBar.width = 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// MENU SCENE (Overlay)
// ═══════════════════════════════════════════════════════════════

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const state = this.registry.get('gameState');

    // Darken overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, w, h);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);

    // Menu panel
    const panelW = w * 0.7;
    const panelH = h * 0.8;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(UI_COLORS.bg, 0.95);
    panel.fillRect(panelX, panelY, panelW, panelH);
    panel.lineStyle(1, UI_COLORS.goldHex, 0.4);
    panel.strokeRect(panelX, panelY, panelW, panelH);

    // Title
    this.add.text(w / 2, panelY + 15, '— STATUS —', {
      fontSize: '14px', color: UI_COLORS.gold, fontFamily: '"Times New Roman", serif',
      letterSpacing: 3,
    }).setOrigin(0.5);

    // Player info
    const p = state.player;
    const col1 = panelX + 20;
    const col2 = panelX + panelW / 2 + 10;
    let y = panelY + 40;

    const addLine = (x, text, color = UI_COLORS.text) => {
      this.add.text(x, y, text, {
        fontSize: '12px', color, fontFamily: '"Courier New", monospace',
      });
      y += 18;
    };

    addLine(col1, `${p.name}  Lv.${p.level}`, UI_COLORS.gold);
    addLine(col1, `HP: ${p.hp}/${p.maxHp}`);
    addLine(col1, `MP: ${p.mp}/${p.maxMp}`);
    addLine(col1, `ATK: ${p.atk}  DEF: ${p.def}`);
    addLine(col1, `SPD: ${p.spd}  SPR: ${p.spr}`);
    addLine(col1, `XP: ${p.xp}`);

    // Virtues
    y = panelY + 40;
    addLine(col2, '— VIRTUES —', UI_COLORS.gold);
    for (const [virtue, value] of Object.entries(state.virtues)) {
      if (value > 0) addLine(col2, `${virtue}: ${'■'.repeat(value)}${'□'.repeat(Math.max(0, 5 - value))}`, UI_COLORS.gold);
    }

    // Inventory
    y += 10;
    addLine(col2, '— ITEMS —', UI_COLORS.gold);
    if (state.inventory.length === 0) {
      addLine(col2, '(empty)', '#7a6852');
    } else {
      for (const item of state.inventory.slice(0, 5)) {
        addLine(col2, `• ${item.name}`);
      }
    }

    // Close / Save buttons
    const btnY = panelY + panelH - 35;

    const saveBtn = this.add.text(w / 2 - 50, btnY, '► SAVE', {
      fontSize: '12px', color: UI_COLORS.text, fontFamily: '"Courier New", monospace',
    }).setInteractive({ useHandCursor: true });
    saveBtn.on('pointerover', () => saveBtn.setColor(UI_COLORS.gold));
    saveBtn.on('pointerout', () => saveBtn.setColor(UI_COLORS.text));
    saveBtn.on('pointerdown', () => {
      SaveSystem.save(state);
      saveBtn.setText('✓ SAVED');
    });

    const closeBtn = this.add.text(w / 2 + 30, btnY, '► CLOSE', {
      fontSize: '12px', color: UI_COLORS.text, fontFamily: '"Courier New", monospace',
    }).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor(UI_COLORS.gold));
    closeBtn.on('pointerout', () => closeBtn.setColor(UI_COLORS.text));
    closeBtn.on('pointerdown', () => this.scene.stop());

    // ESC to close
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => this.scene.stop());
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GAME FACTORY — Create & Configure the Phaser Game
// ═══════════════════════════════════════════════════════════════

export function createGame(config = {}) {
  const gameState = new GameState();
  const dataLoader = new DataLoader(config.basePath || '');

  const phaserConfig = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    parent: config.parent || 'game-container',
    backgroundColor: '#0f0e17',
    pixelArt: true,           // Crisp pixel rendering
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      touch: { capture: true },
    },
    scene: [BootScene, TitleScene, WorldScene, BattleScene, DialogueScene, MenuScene],
  };

  const game = new Phaser.Game(phaserConfig);

  // Start boot scene with references
  game.scene.start('BootScene', {
    onReady: config.onReady,
    onError: config.onError,
    gameState,
    dataLoader,
  });

  return game;
}
