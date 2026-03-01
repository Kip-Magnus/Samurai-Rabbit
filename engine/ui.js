/**
 * SAMURAI USAGI — UI SYSTEM
 * ===========================
 * Complete JRPG menu framework.
 * Canvas-rendered, pixel-perfect, touch+keyboard navigable.
 *
 * Architecture:
 *   UIManager (root)
 *     ├── MenuSystem (pause menu with tabs)
 *     │   ├── EquipmentScreen
 *     │   ├── InventoryScreen
 *     │   ├── VirtueScreen
 *     │   ├── MiracleScreen
 *     │   ├── StatusScreen
 *     │   └── SaveScreen
 *     ├── DialogueBox (typewriter text, portraits, choices)
 *     ├── TradeScreen (NPC barter interface)
 *     ├── VocationScreen (permanent order choice)
 *     ├── TransitionManager (fade, wipe, iris)
 *     └── NotificationStack (floating toasts)
 *
 * All coordinates are in native 320×240 space.
 * The canvas is scaled by the display system.
 */

const W = 320;
const H = 240;
const FONT_SM = '7px monospace';
const FONT_MD = '8px monospace';
const FONT_LG = '10px monospace';
const FONT_XL = '12px monospace';

// ── Color Palette ──────────────────────────────────────────
const C = {
  bg:       '#0f0e17',
  bgPanel:  '#151420',
  bgDark:   '#0a0912',
  border:   '#c9a95944',
  borderHi: '#c9a959',
  gold:     '#c9a959',
  holy:     '#ffd700',
  text:     '#e8dcc8',
  dim:      '#8a8078',
  green:    '#55aa55',
  red:      '#cc3333',
  blue:     '#6495ed',
  purple:   '#9955cc',
  fire:     '#ff4500',
  white:    '#f5f0e8',
  black:    '#000000',
  selectBg: '#c9a95922',
  hpGreen:  '#4a7c59',
  hpYellow: '#ccaa33',
  hpRed:    '#cc3333',
};

const QUALITY_COLORS = ['#5c4d3c','#7a6852','#8b5e3c','#a0784c','#e8dcc8','#c9a959','#d4af37','#ffd700'];
const QUALITY_NAMES = ['Broken','Chipped','Rusted','Worn','Standard','Well-Made','Master-Forged','Artificer'];


// ═══════════════════════════════════════════════════════════════
// UI MANAGER — Root coordinator
// ═══════════════════════════════════════════════════════════════

export class UIManager {
  constructor(canvas, gameState, events) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = gameState;
    this.events = events;

    this.menu = new MenuSystem(this);
    this.dialogue = new DialogueBox(this);
    this.trade = new TradeScreen(this);
    this.vocation = new VocationScreen(this);
    this.transitions = new TransitionManager(this);
    this.notifications = new NotificationStack(this);

    this.activeScreen = null;  // 'menu','dialogue','trade','vocation', null
    this.inputLocked = false;
  }

  // ── Update & Render ──────────────────────────────────────

  update(dt) {
    this.transitions.update(dt);
    this.notifications.update(dt);
    if (this.dialogue.active) this.dialogue.update(dt);
  }

  render() {
    const ctx = this.ctx;

    // Transition overlay (always on top of game, under UI)
    // Screen-specific rendering
    if (this.activeScreen === 'menu') this.menu.render(ctx);
    else if (this.activeScreen === 'dialogue') this.dialogue.render(ctx);
    else if (this.activeScreen === 'trade') this.trade.render(ctx);
    else if (this.activeScreen === 'vocation') this.vocation.render(ctx);

    // Always-on-top layers
    this.notifications.render(ctx);
    this.transitions.render(ctx);
  }

  // ── Input ────────────────────────────────────────────────

  handleInput(key) {
    if (this.inputLocked) return;
    if (this.transitions.active) return;

    if (this.activeScreen === 'menu') return this.menu.handleInput(key);
    if (this.activeScreen === 'dialogue') return this.dialogue.handleInput(key);
    if (this.activeScreen === 'trade') return this.trade.handleInput(key);
    if (this.activeScreen === 'vocation') return this.vocation.handleInput(key);
    return false; // not consumed
  }

  // ── Screen Management ────────────────────────────────────

  openMenu()     { this.activeScreen = 'menu'; this.menu.open(); }
  closeMenu()    { this.activeScreen = null; this.menu.close(); }

  openDialogue(lines, options) {
    this.activeScreen = 'dialogue';
    this.dialogue.start(lines, options);
  }
  closeDialogue() {
    this.dialogue.close();
    this.activeScreen = null;
  }

  openTrade(trader) { this.activeScreen = 'trade'; this.trade.open(trader); }
  closeTrade()      { this.activeScreen = null; }

  openVocation(orders) { this.activeScreen = 'vocation'; this.vocation.open(orders); }
  closeVocation()      { this.activeScreen = null; }

  notify(text, color = C.gold, duration = 2.5) {
    this.notifications.add(text, color, duration);
  }

  // ── Transitions ──────────────────────────────────────────

  fadeOut(duration = 0.5, color = C.black) {
    return this.transitions.start('fade_out', duration, color);
  }
  fadeIn(duration = 0.5, color = C.black) {
    return this.transitions.start('fade_in', duration, color);
  }
  irisOut(cx, cy, duration = 0.6) {
    return this.transitions.start('iris_out', duration, C.black, { cx, cy });
  }
  irisIn(cx, cy, duration = 0.6) {
    return this.transitions.start('iris_in', duration, C.black, { cx, cy });
  }
  wipe(direction = 'left', duration = 0.4) {
    return this.transitions.start('wipe', duration, C.black, { direction });
  }
}


// ═══════════════════════════════════════════════════════════════
// MENU SYSTEM — Tabbed pause menu
// ═══════════════════════════════════════════════════════════════

class MenuSystem {
  constructor(ui) {
    this.ui = ui;
    this.tabs = ['Equipment','Items','Virtues','Miracles','Status','Save'];
    this.tabIndex = 0;
    this.listIndex = 0;
    this.subMode = null;    // null, 'equip_slot', 'equip_pick', 'item_use', 'save_slot'
    this.slotIndex = 0;
    this.confirmAction = null;
  }

  open() { this.tabIndex = 0; this.listIndex = 0; this.subMode = null; }
  close() { this.subMode = null; }

  handleInput(key) {
    if (this.confirmAction) return this._handleConfirm(key);

    switch (key) {
      case 'left':  this.tabIndex = Math.max(0, this.tabIndex - 1); this.listIndex = 0; this.subMode = null; break;
      case 'right': this.tabIndex = Math.min(this.tabs.length - 1, this.tabIndex + 1); this.listIndex = 0; this.subMode = null; break;
      case 'up':    this.listIndex = Math.max(0, this.listIndex - 1); break;
      case 'down':  this.listIndex++; break;
      case 'confirm': this._handleSelect(); break;
      case 'cancel': this._handleBack(); break;
    }
    return true;
  }

  _handleSelect() {
    const tab = this.tabs[this.tabIndex];

    if (tab === 'Equipment') {
      if (!this.subMode) {
        this.subMode = 'equip_slot';
        this.slotIndex = this.listIndex;
      } else if (this.subMode === 'equip_slot') {
        this.subMode = 'equip_pick';
        this.listIndex = 0;
      } else if (this.subMode === 'equip_pick') {
        this._equipFromList();
      }
    } else if (tab === 'Items') {
      this._useItem();
    } else if (tab === 'Save') {
      this._saveToSlot();
    }
  }

  _handleBack() {
    if (this.subMode === 'equip_pick') { this.subMode = 'equip_slot'; return; }
    if (this.subMode) { this.subMode = null; return; }
    this.ui.closeMenu();
  }

  _handleConfirm(key) {
    if (key === 'confirm') { this.confirmAction?.onConfirm(); this.confirmAction = null; }
    else if (key === 'cancel') { this.confirmAction = null; }
    return true;
  }

  _equipFromList() {
    if (this.ui.events) {
      this.ui.events.emit('equip_item', { slotIndex: this.slotIndex, inventoryIndex: this.listIndex });
    }
    this.subMode = 'equip_slot';
  }

  _useItem() {
    if (this.ui.events) {
      this.ui.events.emit('use_item_field', { inventoryIndex: this.listIndex });
    }
  }

  _saveToSlot() {
    if (this.ui.events) {
      this.ui.events.emit('save_game', { slot: this.listIndex });
      this.ui.notify('💾 Saved!', C.gold);
    }
  }

  // ── Rendering ────────────────────────────────────────────

  render(ctx) {
    // Full-screen dark overlay
    ctx.fillStyle = C.bg + 'f0';
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = C.bgPanel;
    ctx.fillRect(0, 0, W, 16);
    ctx.fillStyle = C.border;
    ctx.fillRect(0, 16, W, 1);

    // Tabs
    const tabW = W / this.tabs.length;
    for (let i = 0; i < this.tabs.length; i++) {
      const active = i === this.tabIndex;
      ctx.fillStyle = active ? C.gold : C.dim;
      ctx.font = FONT_MD;
      ctx.textAlign = 'center';
      ctx.fillText(this.tabs[i], tabW * i + tabW / 2, 11);
      if (active) {
        ctx.fillStyle = C.gold;
        ctx.fillRect(tabW * i + 4, 14, tabW - 8, 1);
      }
    }
    ctx.textAlign = 'left';

    // Content area
    const contentY = 20;
    const tab = this.tabs[this.tabIndex];

    switch (tab) {
      case 'Equipment': this._renderEquipment(ctx, contentY); break;
      case 'Items':     this._renderItems(ctx, contentY); break;
      case 'Virtues':   this._renderVirtues(ctx, contentY); break;
      case 'Miracles':  this._renderMiracles(ctx, contentY); break;
      case 'Status':    this._renderStatus(ctx, contentY); break;
      case 'Save':      this._renderSave(ctx, contentY); break;
    }

    // Close hint
    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    ctx.fillText('ESC to close', 4, H - 4);

    // Confirmation dialog
    if (this.confirmAction) this._renderConfirm(ctx);
  }

  _renderEquipment(ctx, y) {
    const s = this.ui.state;
    const slots = ['weapon', 'garment', 'head', 'accessory', 'relic'];
    const slotNames = ['Weapon', 'Garment', 'Head', 'Accessory', 'Relic'];

    if (this.subMode === 'equip_pick') {
      // Show equipment in inventory for the selected slot
      ctx.fillStyle = C.gold;
      ctx.font = FONT_MD;
      ctx.fillText(`Select ${slotNames[this.slotIndex]}:`, 8, y + 10);

      const slotType = slots[this.slotIndex];
      const available = (s.inventory || []).filter((item, i) => {
        const t = s._itemDB?.[item.id];
        return t && t.type === slotType;
      });

      if (available.length === 0) {
        ctx.fillStyle = C.dim;
        ctx.fillText('No items available for this slot', 16, y + 24);
      }

      this.listIndex = Math.min(this.listIndex, Math.max(0, available.length - 1));

      for (let i = 0; i < available.length; i++) {
        const item = available[i];
        const iy = y + 20 + i * 14;
        const sel = i === this.listIndex;

        if (sel) { ctx.fillStyle = C.selectBg; ctx.fillRect(4, iy - 2, W - 8, 13); }
        ctx.fillStyle = sel ? C.gold : C.dim;
        ctx.font = FONT_MD;
        ctx.fillText(sel ? '▸' : ' ', 6, iy + 8);
        ctx.fillStyle = QUALITY_COLORS[item.quality || 4];
        ctx.fillText(this._itemDisplayName(item), 16, iy + 8);
      }
      return;
    }

    // Equipment slots
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const item = s.equipment?.[slot];
      const sy = y + 4 + i * 28;
      const sel = (!this.subMode && i === this.listIndex) || (this.subMode === 'equip_slot' && i === this.slotIndex);

      // Slot background
      if (sel) { ctx.fillStyle = C.selectBg; ctx.fillRect(4, sy - 2, W - 8, 26); }

      // Slot label
      ctx.fillStyle = C.dim;
      ctx.font = FONT_SM;
      ctx.fillText(slotNames[i].toUpperCase(), 8, sy + 7);

      // Item name
      if (item) {
        ctx.fillStyle = QUALITY_COLORS[item.quality || 4];
        if (item.blessed) ctx.shadowColor = C.gold, ctx.shadowBlur = 3;
        ctx.font = FONT_MD;
        ctx.fillText(this._itemDisplayName(item), 8, sy + 18);
        ctx.shadowBlur = 0;

        // Stats
        const t = s._itemDB?.[item.id];
        if (t?.base) {
          ctx.fillStyle = C.green;
          ctx.font = FONT_SM;
          const stats = Object.entries(t.base)
            .filter(([k]) => ['atk','def','spd','spr'].includes(k))
            .map(([k, v]) => `${k.toUpperCase()}${v > 0 ? '+' : ''}${v}`)
            .join(' ');
          ctx.fillText(stats, 180, sy + 18);
        }
      } else {
        ctx.fillStyle = C.dim;
        ctx.font = FONT_MD;
        ctx.fillText('(empty)', 8, sy + 18);
      }

      // Selection arrow
      if (sel) { ctx.fillStyle = C.gold; ctx.font = FONT_MD; ctx.fillText('▸', 2, sy + 12); }
    }

    this.listIndex = Math.min(this.listIndex, slots.length - 1);

    // Total stats
    const statsY = y + 4 + slots.length * 28 + 4;
    ctx.fillStyle = C.border;
    ctx.fillRect(4, statsY, W - 8, 1);
    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    const p = s.player || {};
    ctx.fillText(`ATK ${p.atk || 0}  DEF ${p.def || 0}  SPD ${p.spd || 0}  SPR ${p.spr || 0}`, 8, statsY + 10);
    ctx.fillText(`HP ${p.hp || 0}/${p.maxHp || 0}  MP ${p.mp || 0}/${p.maxMp || 0}  Gold ${p.gold || 0}`, 8, statsY + 20);
  }

  _renderItems(ctx, y) {
    const s = this.ui.state;
    const consumables = (s.inventory || []).filter(i => i.type === 'consumable' || i.type === 'sacramental');

    if (consumables.length === 0) {
      ctx.fillStyle = C.dim;
      ctx.font = FONT_MD;
      ctx.fillText('No items', 8, y + 14);
      return;
    }

    this.listIndex = Math.min(this.listIndex, consumables.length - 1);

    for (let i = 0; i < consumables.length && i < 14; i++) {
      const item = consumables[i];
      const iy = y + 4 + i * 14;
      const sel = i === this.listIndex;

      if (sel) { ctx.fillStyle = C.selectBg; ctx.fillRect(4, iy - 2, W - 8, 13); }
      ctx.fillStyle = sel ? C.white : C.text;
      ctx.font = FONT_MD;
      ctx.fillText(sel ? '▸' : ' ', 6, iy + 8);
      ctx.fillText(item.name || item.id, 16, iy + 8);

      if (item.quantity > 1) {
        ctx.fillStyle = C.dim;
        ctx.fillText(`×${item.quantity}`, 200, iy + 8);
      }
    }

    // Item description
    const sel = consumables[this.listIndex];
    if (sel) {
      const descY = H - 40;
      ctx.fillStyle = C.bgDark;
      ctx.fillRect(4, descY, W - 8, 36);
      ctx.fillStyle = C.border;
      ctx.fillRect(4, descY, W - 8, 1);
      ctx.fillStyle = C.dim;
      ctx.font = FONT_SM;
      const desc = s._itemDB?.[sel.id]?.desc || '';
      ctx.fillText(desc.substring(0, 50), 8, descY + 12);
      if (desc.length > 50) ctx.fillText(desc.substring(50, 100), 8, descY + 22);
    }
  }

  _renderVirtues(ctx, y) {
    const v = this.ui.state.virtues || {};
    const virtues = ['faith','hope','charity','prudence','justice','fortitude','temperance'];
    const theological = ['faith','hope','charity'];

    ctx.fillStyle = C.gold;
    ctx.font = FONT_MD;
    ctx.fillText('THEOLOGICAL VIRTUES', 8, y + 10);

    let vy = y + 16;
    for (const virt of virtues) {
      if (virt === 'prudence') {
        vy += 6;
        ctx.fillStyle = C.gold;
        ctx.font = FONT_MD;
        ctx.fillText('CARDINAL VIRTUES', 8, vy + 10);
        vy += 14;
      }

      const val = v[virt] || 0;
      const barW = 100;
      const maxVal = 10;

      ctx.fillStyle = C.text;
      ctx.font = FONT_MD;
      ctx.fillText(virt.charAt(0).toUpperCase() + virt.slice(1), 8, vy + 8);

      // Bar
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(100, vy + 2, barW, 6);
      ctx.fillStyle = theological.includes(virt) ? C.holy : C.gold;
      ctx.fillRect(100, vy + 2, barW * Math.min(1, val / maxVal), 6);

      // Value
      ctx.fillStyle = C.dim;
      ctx.font = FONT_SM;
      ctx.fillText(typeof val === 'number' ? val.toFixed(1) : String(val), 206, vy + 8);

      vy += 14;
    }

    // Total
    const total = Object.values(v).reduce((s, n) => s + (typeof n === 'number' ? n : 0), 0);
    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    ctx.fillText(`Total Virtue: ${total.toFixed(1)}`, 8, vy + 10);
  }

  _renderMiracles(ctx, y) {
    const miracles = this.ui.state.knownMiracles || [];
    const v = this.ui.state.virtues || {};

    if (miracles.length === 0) {
      ctx.fillStyle = C.dim;
      ctx.font = FONT_MD;
      ctx.fillText('No miracles learned yet', 8, y + 14);
      return;
    }

    this.listIndex = Math.min(this.listIndex, miracles.length - 1);

    for (let i = 0; i < miracles.length && i < 10; i++) {
      const m = miracles[i];
      const my = y + 4 + i * 16;
      const sel = i === this.listIndex;

      if (sel) { ctx.fillStyle = C.selectBg; ctx.fillRect(4, my - 2, W - 8, 15); }

      // Name
      ctx.fillStyle = sel ? C.holy : C.text;
      ctx.font = FONT_MD;
      ctx.fillText(m.name || m.id, 8, my + 8);

      // MP cost
      ctx.fillStyle = C.blue;
      ctx.font = FONT_SM;
      ctx.fillText(`${m.mp_cost || m.mp || '?'}MP`, 180, my + 8);

      // Virtue requirement
      ctx.fillStyle = (v[m.virtue] || 0) >= (m.req || 0) ? C.green : C.red;
      ctx.fillText(`${m.virtue} ≥${m.req || 0}`, 220, my + 8);
    }

    // Description
    const sel = miracles[this.listIndex];
    if (sel) {
      ctx.fillStyle = C.bgDark;
      ctx.fillRect(4, H - 30, W - 8, 26);
      ctx.fillStyle = C.dim;
      ctx.font = FONT_SM;
      ctx.fillText(sel.desc || sel.description || '', 8, H - 18);
    }
  }

  _renderStatus(ctx, y) {
    const p = this.ui.state.player || {};
    const v = this.ui.state.virtues || {};

    ctx.fillStyle = C.gold;
    ctx.font = FONT_LG;
    ctx.fillText(`${p.name || 'Usagi'}  Lv ${p.level || 1}`, 8, y + 12);

    // HP/MP bars
    const barY = y + 18;
    this._drawBar(ctx, 'HP', p.hp || 0, p.maxHp || 35, 8, barY, 120);
    this._drawBar(ctx, 'MP', p.mp || 0, p.maxMp || 10, 8, barY + 14, 120, C.blue);

    // XP bar
    const xpNeeded = this.ui.state.xpTable?.[p.level] || 100;
    this._drawBar(ctx, 'XP', p.xp || 0, xpNeeded, 8, barY + 28, 120, C.purple);

    // Stats
    const statsY = barY + 46;
    const stats = [
      ['ATK', p.atk || 0], ['DEF', p.def || 0],
      ['SPD', p.spd || 0], ['SPR', p.spr || 0],
    ];
    for (let i = 0; i < stats.length; i++) {
      const [label, val] = stats[i];
      const sx = 8 + (i % 2) * 80;
      const sy = statsY + Math.floor(i / 2) * 12;
      ctx.fillStyle = C.dim; ctx.font = FONT_SM; ctx.fillText(label, sx, sy);
      ctx.fillStyle = C.text; ctx.fillText(String(val), sx + 30, sy);
    }

    // Game stats
    const gameY = statsY + 36;
    ctx.fillStyle = C.border;
    ctx.fillRect(4, gameY - 4, W - 8, 1);
    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    ctx.fillText(`Gold: ${p.gold || 0}`, 8, gameY + 8);
    ctx.fillText(`Battles: ${this.ui.state.battleCount || 0}`, 8, gameY + 18);
    ctx.fillText(`Kills: ${this.ui.state.killCount || 0}`, 100, gameY + 18);
    ctx.fillText(`Difficulty: ${this.ui.state.difficulty || 'disciple'}`, 8, gameY + 28);
    ctx.fillText(`Area: ${this.ui.state.currentArea || '?'}`, 8, gameY + 38);

    // Vocation
    const voc = this.ui.state.vocation;
    if (voc) {
      ctx.fillStyle = C.gold;
      ctx.fillText(`Vocation: ${voc}`, 8, gameY + 48);
    }
  }

  _renderSave(ctx, y) {
    const slots = [0, 1, 2];
    ctx.fillStyle = C.gold;
    ctx.font = FONT_MD;
    ctx.fillText('SAVE / LOAD', 8, y + 10);

    this.listIndex = Math.min(this.listIndex, 5); // 3 save + 3 load

    const labels = ['💾 Save Slot 1', '💾 Save Slot 2', '💾 Save Slot 3', '📂 Load Slot 1', '📂 Load Slot 2', '📂 Load Slot 3'];
    for (let i = 0; i < labels.length; i++) {
      const sy = y + 20 + i * 16;
      const sel = i === this.listIndex;

      if (sel) { ctx.fillStyle = C.selectBg; ctx.fillRect(4, sy - 2, W - 8, 15); }
      ctx.fillStyle = sel ? C.white : C.text;
      ctx.font = FONT_MD;
      ctx.fillText(sel ? '▸ ' + labels[i] : '  ' + labels[i], 8, sy + 9);
    }
  }

  _drawBar(ctx, label, current, max, x, y, w, color = null) {
    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    ctx.fillText(label, x, y + 7);

    const barX = x + 20;
    const pct = Math.max(0, Math.min(1, current / Math.max(1, max)));

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX, y + 1, w, 6);

    if (!color) color = pct > 0.5 ? C.hpGreen : pct > 0.25 ? C.hpYellow : C.hpRed;
    ctx.fillStyle = color;
    ctx.fillRect(barX, y + 1, w * pct, 6);

    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    ctx.fillText(`${current}/${max}`, barX + w + 4, y + 7);
  }

  _itemDisplayName(item) {
    if (!item) return '(empty)';
    const q = (item.quality !== undefined && item.quality !== 4) ? QUALITY_NAMES[item.quality] + ' ' : '';
    const b = item.blessingName ? item.blessingName + ' ' : item.blessed ? 'Blessed ' : '';
    return `${b}${q}${item.name || item.id}`;
  }

  _renderConfirm(ctx) {
    const w = 200, h = 60;
    const x = (W - w) / 2, y = (H - h) / 2;

    ctx.fillStyle = C.bgDark;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.borderHi;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = C.text;
    ctx.font = FONT_MD;
    ctx.textAlign = 'center';
    ctx.fillText(this.confirmAction.text || 'Confirm?', W / 2, y + 20);
    ctx.fillStyle = C.gold;
    ctx.fillText('[Enter] Yes    [Esc] No', W / 2, y + 40);
    ctx.textAlign = 'left';
  }
}


// ═══════════════════════════════════════════════════════════════
// DIALOGUE BOX — Typewriter text, portraits, choices
// ═══════════════════════════════════════════════════════════════

export class DialogueBox {
  constructor(ui) {
    this.ui = ui;
    this.active = false;
    this.lines = [];       // [{speaker, text, portrait?, choices?, onChoice?, virtue?, flag?, emotion?}]
    this.lineIndex = 0;
    this.charIndex = 0;
    this.charTimer = 0;
    this.charsPerSecond = 30;
    this.choiceIndex = 0;
    this.waitingForChoice = false;
    this.onComplete = null;
    this._fullTextShown = false;
  }

  start(lines, options = {}) {
    this.lines = lines;
    this.lineIndex = 0;
    this.charIndex = 0;
    this.charTimer = 0;
    this._fullTextShown = false;
    this.waitingForChoice = false;
    this.onComplete = options.onComplete || null;
    this.active = true;
  }

  close() {
    this.active = false;
    this.lines = [];
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }

  update(dt) {
    if (!this.active || this._fullTextShown || this.waitingForChoice) return;

    const line = this.lines[this.lineIndex];
    if (!line) return;

    this.charTimer += dt;
    const charsToShow = Math.floor(this.charTimer * this.charsPerSecond);
    if (charsToShow > this.charIndex) {
      this.charIndex = Math.min(charsToShow, (line.text || '').length);
      if (this.charIndex >= (line.text || '').length) {
        this._fullTextShown = true;
        if (line.choices) {
          this.waitingForChoice = true;
          this.choiceIndex = 0;
        }
      }
    }
  }

  handleInput(key) {
    if (!this.active) return false;

    if (this.waitingForChoice) {
      if (key === 'up') this.choiceIndex = Math.max(0, this.choiceIndex - 1);
      else if (key === 'down') {
        const line = this.lines[this.lineIndex];
        this.choiceIndex = Math.min((line.choices || []).length - 1, this.choiceIndex + 1);
      }
      else if (key === 'confirm') {
        const line = this.lines[this.lineIndex];
        const choice = line.choices?.[this.choiceIndex];
        if (choice?.onChoice) choice.onChoice(choice, this.choiceIndex);
        if (choice?.virtue && this.ui.events) {
          this.ui.events.emit('virtue_change', choice.virtue);
        }
        if (choice?.flag && this.ui.events) {
          this.ui.events.emit('set_flag', choice.flag);
        }
        // Branch to choice.next or advance
        if (choice?.next !== undefined) {
          this.lineIndex = choice.next;
        } else {
          this.lineIndex++;
        }
        this._advanceLine();
      }
      return true;
    }

    if (key === 'confirm' || key === 'cancel') {
      if (!this._fullTextShown) {
        // Show all text instantly
        const line = this.lines[this.lineIndex];
        this.charIndex = (line?.text || '').length;
        this._fullTextShown = true;
        if (line?.choices) { this.waitingForChoice = true; this.choiceIndex = 0; }
      } else {
        // Advance to next line
        this.lineIndex++;
        this._advanceLine();
      }
    }
    return true;
  }

  _advanceLine() {
    this.charIndex = 0;
    this.charTimer = 0;
    this._fullTextShown = false;
    this.waitingForChoice = false;

    if (this.lineIndex >= this.lines.length) {
      this.ui.closeDialogue();
    }
  }

  render(ctx) {
    if (!this.active) return;
    const line = this.lines[this.lineIndex];
    if (!line) return;

    const boxH = 72;
    const boxY = H - boxH - 4;
    const boxX = 4;
    const boxW = W - 8;

    // Box background
    ctx.fillStyle = C.bgDark + 'f0';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Portrait area (left side)
    let textX = boxX + 8;
    if (line.portrait) {
      ctx.fillStyle = C.bgPanel;
      ctx.fillRect(boxX + 4, boxY + 4, 40, 40);
      // Portrait placeholder
      ctx.fillStyle = line.emotion === 'angry' ? C.red : line.emotion === 'sad' ? C.blue : C.gold;
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(line.portrait.charAt(0).toUpperCase(), boxX + 24, boxY + 30);
      ctx.textAlign = 'left';
      textX = boxX + 52;
    }

    // Speaker name
    if (line.speaker) {
      ctx.fillStyle = line.speakerColor || C.gold;
      ctx.font = FONT_MD;
      ctx.fillText(line.speaker, textX, boxY + 12);
    }

    // Text with typewriter
    const text = (line.text || '').substring(0, this.charIndex);
    ctx.fillStyle = C.text;
    ctx.font = FONT_MD;

    // Word wrap
    const maxW = boxW - (textX - boxX) - 8;
    const words = text.split(' ');
    let lineText = '';
    let lineY = boxY + (line.speaker ? 24 : 14);
    for (const word of words) {
      const test = lineText + word + ' ';
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(lineText.trim(), textX, lineY);
        lineText = word + ' ';
        lineY += 10;
      } else {
        lineText = test;
      }
    }
    ctx.fillText(lineText.trim(), textX, lineY);

    // Choices
    if (this.waitingForChoice && line.choices) {
      const choiceY = lineY + 12;
      for (let i = 0; i < line.choices.length; i++) {
        const choice = line.choices[i];
        const sel = i === this.choiceIndex;
        const cy = choiceY + i * 12;

        ctx.fillStyle = sel ? C.gold : C.dim;
        ctx.font = FONT_MD;
        ctx.fillText(sel ? '▸ ' + choice.label : '  ' + choice.label, textX, cy);
      }
    }

    // Continue indicator
    if (this._fullTextShown && !this.waitingForChoice) {
      ctx.fillStyle = C.gold;
      ctx.font = FONT_MD;
      ctx.fillText('▾', boxX + boxW - 12, boxY + boxH - 6);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// TRADE SCREEN
// ═══════════════════════════════════════════════════════════════

class TradeScreen {
  constructor(ui) {
    this.ui = ui;
    this.trader = null;
    this.listIndex = 0;
  }

  open(trader) {
    this.trader = trader;
    this.listIndex = 0;
  }

  handleInput(key) {
    if (!this.trader) return false;
    const trades = this.trader.trades || [];

    if (key === 'up') this.listIndex = Math.max(0, this.listIndex - 1);
    else if (key === 'down') this.listIndex = Math.min(trades.length - 1, this.listIndex + 1);
    else if (key === 'confirm') {
      if (this.ui.events) {
        this.ui.events.emit('execute_trade', { traderId: this.trader.id, tradeIndex: this.listIndex });
      }
    }
    else if (key === 'cancel') this.ui.closeTrade();
    return true;
  }

  render(ctx) {
    if (!this.trader) return;

    ctx.fillStyle = C.bg + 'f8';
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = C.gold;
    ctx.font = FONT_LG;
    ctx.fillText(this.trader.name || 'Trader', 8, 14);
    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    ctx.fillText(this.trader.greeting || '', 8, 26);

    // Trades
    const trades = this.trader.trades || [];
    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      const ty = 36 + i * 30;
      const sel = i === this.listIndex;

      if (sel) { ctx.fillStyle = C.selectBg; ctx.fillRect(4, ty - 2, W - 8, 28); }

      ctx.fillStyle = sel ? C.white : C.text;
      ctx.font = FONT_MD;
      ctx.fillText(t.name || 'Trade', 12, ty + 8);

      // Cost
      ctx.fillStyle = C.dim;
      ctx.font = FONT_SM;
      const cost = t.cost?.gold !== undefined ? `${t.cost.gold} gold` : 'Materials';
      ctx.fillText(cost, 12, ty + 18);

      // Description
      if (t.desc) {
        ctx.fillStyle = C.dim;
        ctx.font = FONT_SM;
        ctx.fillText(t.desc.substring(0, 40), 120, ty + 18);
      }
    }

    // Gold display
    ctx.fillStyle = C.gold;
    ctx.font = FONT_MD;
    ctx.fillText(`Gold: ${this.ui.state.player?.gold || 0}`, 8, H - 8);

    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    ctx.fillText('ESC to leave', W - 70, H - 8);
  }
}


// ═══════════════════════════════════════════════════════════════
// VOCATION SCREEN — Permanent order choice
// ═══════════════════════════════════════════════════════════════

class VocationScreen {
  constructor(ui) {
    this.ui = ui;
    this.orders = [];
    this.listIndex = 0;
    this.confirmed = false;
  }

  open(orders) {
    this.orders = [{ id: 'laity', name: 'Walk as a Pilgrim', desc: 'The path of the laity. Scapulars become available.' }, ...orders];
    this.listIndex = 0;
    this.confirmed = false;
  }

  handleInput(key) {
    if (this.confirmed) return false;

    if (key === 'up') this.listIndex = Math.max(0, this.listIndex - 1);
    else if (key === 'down') this.listIndex = Math.min(this.orders.length - 1, this.listIndex + 1);
    else if (key === 'confirm') {
      const order = this.orders[this.listIndex];
      if (this.ui.events) {
        this.ui.events.emit('choose_vocation', { vocId: order.id });
        this.confirmed = true;
        setTimeout(() => this.ui.closeVocation(), 2000);
      }
    }
    else if (key === 'cancel') this.ui.closeVocation();
    return true;
  }

  render(ctx) {
    ctx.fillStyle = C.bg + 'f8';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = C.holy;
    ctx.font = FONT_LG;
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE YOUR VOCATION', W / 2, 18);
    ctx.fillStyle = C.dim;
    ctx.font = FONT_SM;
    ctx.fillText('This choice is permanent and cannot be undone.', W / 2, 30);
    ctx.textAlign = 'left';

    if (this.confirmed) {
      ctx.fillStyle = C.holy;
      ctx.font = FONT_LG;
      ctx.textAlign = 'center';
      ctx.fillText('Your path is chosen.', W / 2, H / 2);
      ctx.textAlign = 'left';
      return;
    }

    for (let i = 0; i < this.orders.length; i++) {
      const o = this.orders[i];
      const oy = 40 + i * 36;
      const sel = i === this.listIndex;

      if (sel) { ctx.fillStyle = C.selectBg; ctx.fillRect(4, oy - 2, W - 8, 34); }

      ctx.fillStyle = sel ? C.holy : C.gold;
      ctx.font = FONT_LG;
      ctx.fillText(o.name, 16, oy + 10);

      ctx.fillStyle = sel ? C.text : C.dim;
      ctx.font = FONT_SM;
      ctx.fillText(o.desc || o.charism || '', 16, oy + 22);

      if (sel) {
        ctx.fillStyle = C.gold;
        ctx.font = FONT_MD;
        ctx.fillText('▸', 6, oy + 10);
      }
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// TRANSITION MANAGER — Fade, wipe, iris
// ═══════════════════════════════════════════════════════════════

class TransitionManager {
  constructor(ui) {
    this.ui = ui;
    this.active = false;
    this.type = null;
    this.duration = 0;
    this.timer = 0;
    this.color = C.black;
    this.params = {};
    this._resolve = null;
  }

  start(type, duration, color, params = {}) {
    this.type = type;
    this.duration = duration;
    this.timer = 0;
    this.color = color || C.black;
    this.params = params;
    this.active = true;

    return new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
      if (this._resolve) { this._resolve(); this._resolve = null; }
    }
  }

  render(ctx) {
    if (!this.active) return;
    const t = Math.min(1, this.timer / this.duration);

    switch (this.type) {
      case 'fade_out': {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = t;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        break;
      }
      case 'fade_in': {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 1 - t;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        break;
      }
      case 'iris_out': {
        const cx = this.params.cx || W / 2;
        const cy = this.params.cy || H / 2;
        const maxR = Math.sqrt(W * W + H * H) / 2;
        const r = maxR * (1 - t);

        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
        ctx.clip();
        ctx.clearRect(0, 0, W, H);
        ctx.restore();
        break;
      }
      case 'iris_in': {
        const cx = this.params.cx || W / 2;
        const cy = this.params.cy || H / 2;
        const maxR = Math.sqrt(W * W + H * H) / 2;
        const r = maxR * t;

        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.clearRect(0, 0, W, H);
        ctx.restore();
        break;
      }
      case 'wipe': {
        const dir = this.params.direction || 'left';
        ctx.fillStyle = this.color;
        if (dir === 'left') ctx.fillRect(0, 0, W * t, H);
        else if (dir === 'right') ctx.fillRect(W * (1 - t), 0, W * t, H);
        else if (dir === 'down') ctx.fillRect(0, 0, W, H * t);
        else if (dir === 'up') ctx.fillRect(0, H * (1 - t), W, H * t);
        break;
      }
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// NOTIFICATION STACK — Floating toasts
// ═══════════════════════════════════════════════════════════════

class NotificationStack {
  constructor(ui) {
    this.ui = ui;
    this.items = [];  // { text, color, age, duration }
  }

  add(text, color = C.gold, duration = 2.5) {
    this.items.push({ text, color, age: 0, duration });
    if (this.items.length > 5) this.items.shift();
  }

  update(dt) {
    for (const n of this.items) n.age += dt;
    this.items = this.items.filter(n => n.age < n.duration);
  }

  render(ctx) {
    for (let i = 0; i < this.items.length; i++) {
      const n = this.items[i];
      const fadeIn = Math.min(1, n.age / 0.3);
      const fadeOut = Math.max(0, 1 - (n.age - n.duration + 0.5) / 0.5);
      const alpha = Math.min(fadeIn, fadeOut);

      const y = H / 2 - 8 - i * 16;
      const textW = ctx.measureText ? 8 * n.text.length : 100;
      const boxW = textW + 16;
      const x = (W - boxW) / 2;

      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = C.bgDark;
      ctx.fillRect(x, y - 6, boxW, 14);
      ctx.strokeStyle = n.color + '88';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y - 6, boxW, 14);

      ctx.fillStyle = n.color;
      ctx.font = FONT_MD;
      ctx.textAlign = 'center';
      ctx.fillText(n.text, W / 2, y + 4);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }
}
