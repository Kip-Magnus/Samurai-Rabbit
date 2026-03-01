/**
 * SAMURAI USAGI — BATTLE UI SCENE
 * =================================
 * Pixel-art combat interface in the tradition of FF6/Chrono Trigger.
 *
 * Layout (320×240 native):
 *   ┌─────────────────────────────────┐
 *   │  Enemy area (sprites + HP)      │  Top 60%
 *   │  Status icons float above       │
 *   ├─────────────────────────────────┤
 *   │  Player stats bar               │  Player HP/MP/Status
 *   ├─────────────────────────────────┤
 *   │  Action menu / Dialogue         │  Bottom 25%
 *   └─────────────────────────────────┘
 */

const NATIVE_W = 320;
const NATIVE_H = 240;
const UI_FONT = '8px monospace';
const UI_FONT_LG = '10px monospace';

// Status effect icon definitions (pixel art in code)
const STATUS_ICONS = {
  poison:    { symbol: '☠', color: '#4a5a3a', bgColor: '#2a3a1a' },
  burn:      { symbol: '🔥', color: '#ff4500', bgColor: '#5a1500' },
  despair:   { symbol: '💧', color: '#4466aa', bgColor: '#1a1a3d' },
  fear:      { symbol: '😨', color: '#9955cc', bgColor: '#3d1f6d' },
  confusion: { symbol: '❓', color: '#aa66cc', bgColor: '#4a2a6a' },
  slow:      { symbol: '🐌', color: '#8a7a5a', bgColor: '#3a3020' },
  stun:      { symbol: '⚡', color: '#ffd700', bgColor: '#5a4a00' },
  regen:     { symbol: '💚', color: '#55cc55', bgColor: '#1a4a1a' },
  spr_up:    { symbol: '⬆', color: '#6495ed', bgColor: '#1a2a5a' },
  def_up:    { symbol: '🛡', color: '#c9a959', bgColor: '#4a3a1a' },
  invulnerable: { symbol: '✦', color: '#ffd700', bgColor: '#5a4a00' },
};


// ═══════════════════════════════════════════════════════════════
// BATTLE UI RENDERER — Canvas-based, no Phaser dependency
// ═══════════════════════════════════════════════════════════════

export class BattleUI {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = Math.min(canvas.width / NATIVE_W, canvas.height / NATIVE_H);

    // State
    this.playerState = null;
    this.enemies = [];
    this.menuState = 'main';  // main, prayer, item, target
    this.menuIndex = 0;
    this.subMenuItems = [];
    this.subMenuIndex = 0;
    this.turnCount = 0;
    this.battleLog = [];
    this.damageNumbers = [];  // { x, y, text, color, age }
    this.dialogueText = null;
    this.dialogueSpeaker = null;
    this.moralChoice = null;
    this.bossPhase = 0;
    this.bossMaxPhases = 1;
    this.isAccuserFight = false;
    this.accuserSurvivalTurns = 0;
    this.accuserMaxTurns = 8;

    // Animation
    this.animFrame = 0;
    this.flashTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    // Callbacks
    this.onAction = null;  // (action, params) => void
  }

  // ── Update & Render ──────────────────────────────────────

  update(dt) {
    this.animFrame++;

    // Age damage numbers
    this.damageNumbers = this.damageNumbers
      .map(d => ({ ...d, age: d.age + dt, y: d.y - dt * 30 }))
      .filter(d => d.age < 1.5);

    // Flash timer
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
  }

  render() {
    const ctx = this.ctx;
    const s = this.scale;
    ctx.save();
    ctx.scale(s, s);

    // Shake effect
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    // Background
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);

    // Enemy area (top 55%)
    this._renderEnemies(ctx);

    // Divider
    ctx.fillStyle = '#c9a95944';
    ctx.fillRect(0, 140, NATIVE_W, 1);

    // Player stats bar
    this._renderPlayerBar(ctx);

    // Action menu / dialogue
    if (this.dialogueText) {
      this._renderDialogue(ctx);
    } else if (this.moralChoice) {
      this._renderMoralChoice(ctx);
    } else {
      this._renderMenu(ctx);
    }

    // Damage numbers (floating)
    this._renderDamageNumbers(ctx);

    // Flash overlay
    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 0.5})`;
      ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);
    }

    // Accuser survival counter
    if (this.isAccuserFight) {
      this._renderAccuserCounter(ctx);
    }

    // Boss phase indicator
    if (this.bossMaxPhases > 1) {
      this._renderBossPhase(ctx);
    }

    ctx.restore();
  }

  // ── Enemy Rendering ──────────────────────────────────────

  _renderEnemies(ctx) {
    if (this.enemies.length === 0) return;

    const spacing = NATIVE_W / (this.enemies.length + 1);

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const cx = spacing * (i + 1);
      const cy = 60;

      // Enemy sprite placeholder (colored rectangle with species hint)
      const isSpiritual = enemy.weaknesses?.includes('holy');
      const bodyColor = isSpiritual ? '#4a3a6a' : '#8b5e3c';
      const outlineColor = enemy.hp <= enemy.maxHp * 0.25 ? '#ff4500' : '#3a3a3a';

      ctx.fillStyle = outlineColor;
      ctx.fillRect(cx - 17, cy - 17, 34, 34);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(cx - 15, cy - 15, 30, 30);

      // Enemy name
      ctx.fillStyle = '#d4d4d4';
      ctx.font = UI_FONT;
      ctx.textAlign = 'center';
      ctx.fillText(enemy.name || 'Enemy', cx, cy - 22);

      // HP bar
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      const barW = 28;
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy + 20;

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpPct > 0.5 ? '#55aa55' : hpPct > 0.25 ? '#ccaa33' : '#cc3333';
      ctx.fillRect(barX, barY, barW * hpPct, barH);

      // Status effect icons above enemy
      this._renderStatusIcons(ctx, enemy.statusEffects || [], cx - 12, cy - 32, 'enemy');

      // Dead indicator
      if (enemy.hp <= 0) {
        ctx.fillStyle = '#cc333388';
        ctx.fillRect(cx - 15, cy - 15, 30, 30);
        ctx.fillStyle = '#ff4444';
        ctx.font = UI_FONT_LG;
        ctx.fillText('✕', cx, cy + 4);
      }
    }
    ctx.textAlign = 'left';
  }

  // ── Player Stats Bar ─────────────────────────────────────

  _renderPlayerBar(ctx) {
    if (!this.playerState) return;
    const p = this.playerState;
    const barY = 144;

    // Background
    ctx.fillStyle = '#0f0e17';
    ctx.fillRect(0, barY, NATIVE_W, 36);

    // Name & Level
    ctx.fillStyle = '#f5f0e8';
    ctx.font = UI_FONT_LG;
    ctx.fillText(`${p.name || 'Usagi'}  Lv${p.level || 1}`, 8, barY + 12);

    // HP bar
    const hpPct = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = '#888';
    ctx.font = UI_FONT;
    ctx.fillText('HP', 8, barY + 24);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(24, barY + 18, 80, 6);
    ctx.fillStyle = hpPct > 0.5 ? '#55aa55' : hpPct > 0.25 ? '#ccaa33' : '#cc3333';
    ctx.fillRect(24, barY + 18, 80 * hpPct, 6);
    ctx.fillStyle = '#d4d4d4';
    ctx.fillText(`${p.hp}/${p.maxHp}`, 108, barY + 24);

    // MP bar
    const mpPct = Math.max(0, p.mp / (p.maxMp || 10));
    ctx.fillStyle = '#888';
    ctx.fillText('MP', 8, barY + 33);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(24, barY + 27, 80, 6);
    ctx.fillStyle = '#6495ed';
    ctx.fillRect(24, barY + 27, 80 * mpPct, 6);
    ctx.fillStyle = '#d4d4d4';
    ctx.fillText(`${p.mp}/${p.maxMp || 10}`, 108, barY + 33);

    // Status effects on player
    this._renderStatusIcons(ctx, p.statusEffects || [], 160, barY + 4, 'player');

    // Guard indicator
    if (p.guarding) {
      ctx.fillStyle = '#c9a959';
      ctx.font = UI_FONT;
      ctx.fillText('⛊ GUARD', 250, barY + 12);
    }
  }

  // ── Status Effect Icons ──────────────────────────────────

  _renderStatusIcons(ctx, statusEffects, startX, startY, owner) {
    if (!statusEffects || statusEffects.length === 0) return;

    let x = startX;
    for (const status of statusEffects) {
      const icon = STATUS_ICONS[status.id] || { symbol: '?', color: '#aaa', bgColor: '#333' };

      // Icon background
      ctx.fillStyle = icon.bgColor;
      ctx.fillRect(x, startY, 14, 14);

      // Icon border (pulsing for dangerous effects)
      const dangerous = ['despair', 'fear', 'confusion', 'stun'].includes(status.id);
      if (dangerous && Math.floor(this.animFrame / 15) % 2 === 0) {
        ctx.strokeStyle = icon.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, startY, 14, 14);
      }

      // Icon symbol
      ctx.fillStyle = icon.color;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(icon.symbol, x + 7, startY + 11);

      // Duration number (bottom-right corner)
      if (status.duration !== undefined && status.duration > 0) {
        ctx.fillStyle = '#000000aa';
        ctx.fillRect(x + 8, startY + 8, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.font = '6px monospace';
        ctx.fillText(String(status.duration), x + 11, startY + 13);
      }

      ctx.textAlign = 'left';
      x += 16;
    }
  }

  // ── Action Menu ──────────────────────────────────────────

  _renderMenu(ctx) {
    const menuY = 182;
    ctx.fillStyle = '#0f0e17';
    ctx.fillRect(0, menuY, NATIVE_W, NATIVE_H - menuY);
    ctx.fillStyle = '#c9a95944';
    ctx.fillRect(0, menuY, NATIVE_W, 1);

    switch (this.menuState) {
      case 'main':
        this._renderMainMenu(ctx, menuY + 4);
        break;
      case 'prayer':
        this._renderSubMenu(ctx, menuY + 4, 'PRAY');
        break;
      case 'item':
        this._renderSubMenu(ctx, menuY + 4, 'ITEMS');
        break;
      case 'target':
        this._renderTargetSelect(ctx, menuY + 4);
        break;
    }

    // Battle log (right side)
    this._renderBattleLog(ctx, menuY + 4);
  }

  _renderMainMenu(ctx, y) {
    const actions = [
      { label: 'ATTACK', key: 'attack', icon: '⚔' },
      { label: 'PRAY',   key: 'prayer', icon: '✝' },
      { label: 'GUARD',  key: 'guard',  icon: '⛊' },
      { label: 'ITEM',   key: 'item',   icon: '⚗' },
      { label: 'FLEE',   key: 'flee',   icon: '→' },
    ];

    for (let i = 0; i < actions.length; i++) {
      const selected = i === this.menuIndex;
      const ax = 8;
      const ay = y + i * 11;

      if (selected) {
        ctx.fillStyle = '#c9a95933';
        ctx.fillRect(ax - 2, ay - 1, 70, 10);
        ctx.fillStyle = '#ffd700';
        ctx.font = UI_FONT;
        ctx.fillText('▸', ax, ay + 7);
      }

      ctx.fillStyle = selected ? '#f5f0e8' : '#888888';
      ctx.font = UI_FONT;
      ctx.fillText(`${actions[i].icon} ${actions[i].label}`, ax + 10, ay + 7);
    }
  }

  _renderSubMenu(ctx, y, title) {
    ctx.fillStyle = '#c9a959';
    ctx.font = UI_FONT;
    ctx.fillText(`◂ ${title}`, 8, y + 7);

    for (let i = 0; i < this.subMenuItems.length && i < 4; i++) {
      const item = this.subMenuItems[i];
      const selected = i === this.subMenuIndex;
      const ay = y + 12 + i * 10;

      if (selected) {
        ctx.fillStyle = '#c9a95933';
        ctx.fillRect(6, ay - 1, 120, 10);
        ctx.fillStyle = '#ffd700';
        ctx.fillText('▸', 8, ay + 7);
      }

      ctx.fillStyle = selected ? '#f5f0e8' : '#888888';
      ctx.fillText(item.label || item.name || item.id, 18, ay + 7);

      // MP cost or quantity
      if (item.mpCost) {
        ctx.fillStyle = '#6495ed';
        ctx.fillText(`${item.mpCost}MP`, 100, ay + 7);
      } else if (item.quantity) {
        ctx.fillStyle = '#888';
        ctx.fillText(`×${item.quantity}`, 100, ay + 7);
      }
    }
  }

  _renderTargetSelect(ctx, y) {
    ctx.fillStyle = '#c9a959';
    ctx.font = UI_FONT;
    ctx.fillText('SELECT TARGET', 8, y + 7);

    // Highlight selected enemy
    if (this.enemies.length > 0) {
      const spacing = NATIVE_W / (this.enemies.length + 1);
      const cx = spacing * (this.menuIndex + 1);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 18, 42, 36, 36);

      // Arrow above
      ctx.fillStyle = '#ffd700';
      ctx.font = UI_FONT_LG;
      ctx.textAlign = 'center';
      ctx.fillText('▾', cx, 40);
      ctx.textAlign = 'left';
    }
  }

  _renderBattleLog(ctx, y) {
    const logX = 140;
    ctx.fillStyle = '#666';
    ctx.font = '7px monospace';

    const visible = this.battleLog.slice(-5);
    for (let i = 0; i < visible.length; i++) {
      ctx.fillStyle = visible[i].color || '#666';
      ctx.fillText(visible[i].text.substring(0, 24), logX, y + 7 + i * 9);
    }
  }

  // ── Dialogue Overlay ─────────────────────────────────────

  _renderDialogue(ctx) {
    const y = 175;
    ctx.fillStyle = '#0f0e17ee';
    ctx.fillRect(4, y, NATIVE_W - 8, NATIVE_H - y - 4);
    ctx.strokeStyle = '#c9a95966';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, y, NATIVE_W - 8, NATIVE_H - y - 4);

    if (this.dialogueSpeaker) {
      ctx.fillStyle = '#cc3333';
      ctx.font = UI_FONT_LG;
      ctx.fillText(this.dialogueSpeaker, 12, y + 14);
    }

    ctx.fillStyle = '#d4d4d4';
    ctx.font = UI_FONT;
    // Word wrap
    const words = (this.dialogueText || '').split(' ');
    let line = '';
    let lineY = y + (this.dialogueSpeaker ? 26 : 14);
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > NATIVE_W - 24) {
        ctx.fillText(line.trim(), 12, lineY);
        line = word + ' ';
        lineY += 10;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), 12, lineY);

    // "Press to continue" indicator
    if (Math.floor(this.animFrame / 20) % 2 === 0) {
      ctx.fillStyle = '#c9a959';
      ctx.fillText('▾', NATIVE_W - 16, NATIVE_H - 8);
    }
  }

  // ── Moral Choice (Fumi-e) ────────────────────────────────

  _renderMoralChoice(ctx) {
    const y = 150;
    ctx.fillStyle = '#0f0e17ee';
    ctx.fillRect(4, y, NATIVE_W - 8, NATIVE_H - y - 4);
    ctx.strokeStyle = '#cc333388';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, y, NATIVE_W - 8, NATIVE_H - y - 4);

    // Prompt
    ctx.fillStyle = '#cc3333';
    ctx.font = UI_FONT_LG;
    ctx.fillText(this.moralChoice.prompt || 'What will you do?', 12, y + 16);

    // Choices
    for (let i = 0; i < this.moralChoice.options.length; i++) {
      const opt = this.moralChoice.options[i];
      const selected = i === this.menuIndex;
      const oy = y + 30 + i * 16;

      if (selected) {
        ctx.fillStyle = '#c9a95933';
        ctx.fillRect(8, oy - 2, NATIVE_W - 16, 14);
        ctx.fillStyle = '#ffd700';
        ctx.fillText('▸', 10, oy + 9);
      }

      ctx.fillStyle = selected ? '#f5f0e8' : '#888888';
      ctx.font = UI_FONT;
      ctx.fillText(opt.label, 22, oy + 9);

      // Show consequence hint if virtue is high enough
      if (opt.hint && this.playerState) {
        ctx.fillStyle = '#666';
        ctx.font = '7px monospace';
        ctx.fillText(opt.hint, 22, oy + 18);
      }
    }
  }

  // ── Accuser Counter ──────────────────────────────────────

  _renderAccuserCounter(ctx) {
    const turnsLeft = this.accuserMaxTurns - this.accuserSurvivalTurns;
    const cx = NATIVE_W / 2;

    // Background
    ctx.fillStyle = '#1a1a2ecc';
    ctx.fillRect(cx - 50, 2, 100, 14);

    // Label
    ctx.fillStyle = '#cc3333';
    ctx.font = UI_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(`ENDURE: ${turnsLeft} turns remain`, cx, 12);

    // Progress pips
    for (let i = 0; i < this.accuserMaxTurns; i++) {
      const px = cx - 36 + i * 9;
      ctx.fillStyle = i < this.accuserSurvivalTurns ? '#c9a959' : '#3a3a3a';
      ctx.fillRect(px, 14, 7, 3);
    }

    ctx.textAlign = 'left';
  }

  // ── Boss Phase ───────────────────────────────────────────

  _renderBossPhase(ctx) {
    ctx.fillStyle = '#1a1a2ecc';
    ctx.fillRect(NATIVE_W - 80, 2, 76, 12);
    ctx.fillStyle = '#cc3333';
    ctx.font = UI_FONT;
    ctx.fillText(`PHASE ${this.bossPhase + 1}/${this.bossMaxPhases}`, NATIVE_W - 76, 11);
  }

  // ── Damage Numbers ───────────────────────────────────────

  _renderDamageNumbers(ctx) {
    for (const d of this.damageNumbers) {
      const alpha = Math.max(0, 1 - d.age);
      ctx.fillStyle = d.color || '#ffffff';
      ctx.globalAlpha = alpha;
      ctx.font = d.critical ? '12px monospace' : UI_FONT_LG;
      ctx.textAlign = 'center';
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // ── Public API ───────────────────────────────────────────

  /** Set battle state */
  setBattleState(player, enemies, options = {}) {
    this.playerState = player;
    this.enemies = enemies;
    this.turnCount = 0;
    this.battleLog = [];
    this.damageNumbers = [];
    this.dialogueText = null;
    this.moralChoice = null;
    this.menuState = 'main';
    this.menuIndex = 0;

    if (options.isAccuser) {
      this.isAccuserFight = true;
      this.accuserSurvivalTurns = 0;
      this.accuserMaxTurns = options.survivalTurns || 8;
    }
    if (options.bossPhases) {
      this.bossMaxPhases = options.bossPhases;
      this.bossPhase = 0;
    }
  }

  /** Show damage number floating up from a position */
  showDamage(x, y, amount, options = {}) {
    this.damageNumbers.push({
      x, y, age: 0,
      text: options.heal ? `+${amount}` : options.miss ? 'MISS' : String(amount),
      color: options.heal ? '#55cc55' : options.holy ? '#ffd700' : options.critical ? '#ff4444' : '#ffffff',
      critical: options.critical || false,
    });
    if (!options.heal && !options.miss) {
      this.shakeTimer = 0.2;
      this.shakeIntensity = options.critical ? 6 : 3;
    }
  }

  /** Show enemy damage at their position */
  showEnemyDamage(enemyIndex, amount, options = {}) {
    const spacing = NATIVE_W / (this.enemies.length + 1);
    const cx = spacing * (enemyIndex + 1);
    this.showDamage(cx, 50, amount, options);
  }

  /** Show player damage */
  showPlayerDamage(amount, options = {}) {
    this.showDamage(60, 155, amount, options);
  }

  /** Show dialogue (Accuser whispers, boss taunts) */
  showDialogue(speaker, text, duration = 0) {
    this.dialogueSpeaker = speaker;
    this.dialogueText = text;
    if (duration > 0) {
      setTimeout(() => { this.dialogueText = null; this.dialogueSpeaker = null; }, duration);
    }
  }

  /** Dismiss dialogue */
  dismissDialogue() {
    this.dialogueText = null;
    this.dialogueSpeaker = null;
  }

  /** Show moral choice (fumi-e, forgiveness) */
  showMoralChoice(prompt, options) {
    this.moralChoice = { prompt, options };
    this.menuIndex = 0;
  }

  /** Add to battle log */
  log(text, color = '#888') {
    this.battleLog.push({ text, color, time: Date.now() });
    if (this.battleLog.length > 20) this.battleLog.shift();
  }

  /** Set boss phase */
  setBossPhase(phase) {
    this.bossPhase = phase;
    this.flashTimer = 0.5;
    this.log(`Phase ${phase + 1}!`, '#cc3333');
  }

  /** Increment Accuser survival counter */
  incrementAccuserTurn() {
    this.accuserSurvivalTurns++;
  }

  /** Open prayer submenu */
  openPrayerMenu(miracles) {
    this.menuState = 'prayer';
    this.subMenuItems = miracles.map(m => ({
      id: m.id, label: m.name, mpCost: m.mp_cost,
    }));
    this.subMenuIndex = 0;
  }

  /** Open item submenu */
  openItemMenu(items) {
    this.menuState = 'item';
    this.subMenuItems = items.map(i => ({
      id: i.id, label: i.name, quantity: i.quantity,
    }));
    this.subMenuIndex = 0;
  }

  /** Open target selection */
  openTargetSelect() {
    this.menuState = 'target';
    this.menuIndex = 0;
  }

  /** Return to main menu */
  returnToMainMenu() {
    this.menuState = 'main';
    this.menuIndex = 0;
  }

  /** Handle input */
  handleInput(key) {
    switch (key) {
      case 'up':
        if (this.menuState === 'main') this.menuIndex = Math.max(0, this.menuIndex - 1);
        else this.subMenuIndex = Math.max(0, this.subMenuIndex - 1);
        break;
      case 'down':
        if (this.menuState === 'main') this.menuIndex = Math.min(4, this.menuIndex + 1);
        else this.subMenuIndex = Math.min(this.subMenuItems.length - 1, this.subMenuIndex + 1);
        break;
      case 'left':
        if (this.menuState === 'target') this.menuIndex = Math.max(0, this.menuIndex - 1);
        break;
      case 'right':
        if (this.menuState === 'target') this.menuIndex = Math.min(this.enemies.length - 1, this.menuIndex + 1);
        break;
      case 'confirm':
        this._handleConfirm();
        break;
      case 'cancel':
        this._handleCancel();
        break;
    }
  }

  _handleConfirm() {
    if (this.dialogueText) {
      this.dismissDialogue();
      return;
    }

    if (this.moralChoice) {
      const choice = this.moralChoice.options[this.menuIndex];
      if (this.onAction) this.onAction('moral_choice', { choice });
      this.moralChoice = null;
      return;
    }

    switch (this.menuState) {
      case 'main': {
        const actions = ['attack', 'prayer', 'guard', 'item', 'flee'];
        const action = actions[this.menuIndex];
        if (action === 'attack') this.openTargetSelect();
        else if (action === 'prayer') {
          if (this.onAction) this.onAction('open_prayer_menu', {});
        }
        else if (action === 'item') {
          if (this.onAction) this.onAction('open_item_menu', {});
        }
        else if (this.onAction) this.onAction(action, {});
        break;
      }
      case 'prayer': {
        const miracle = this.subMenuItems[this.subMenuIndex];
        if (miracle && this.onAction) {
          this.openTargetSelect();
          this._pendingAction = { type: 'prayer', miracleId: miracle.id };
        }
        break;
      }
      case 'item': {
        const item = this.subMenuItems[this.subMenuIndex];
        if (item && this.onAction) this.onAction('use_item', { itemId: item.id });
        this.returnToMainMenu();
        break;
      }
      case 'target': {
        const targetIdx = this.menuIndex;
        if (this._pendingAction) {
          if (this.onAction) this.onAction(this._pendingAction.type, { ...this._pendingAction, targetIndex: targetIdx });
          this._pendingAction = null;
        } else {
          if (this.onAction) this.onAction('attack', { targetIndex: targetIdx });
        }
        this.returnToMainMenu();
        break;
      }
    }
  }

  _handleCancel() {
    if (this.menuState !== 'main') {
      this._pendingAction = null;
      this.returnToMainMenu();
    }
  }

  /** Flash the screen (for holy damage, critical hits) */
  flash(intensity = 0.5) {
    this.flashTimer = intensity;
  }

  /** Shake the screen (for hits) */
  shake(intensity = 4, duration = 0.3) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }
}
