/**
 * SAMURAI USAGI — EQUIPMENT ENGINE
 * ==================================
 * Equipment slots, quality grades, blessings, scapulars, religious orders.
 *
 * Design: Usagi is a persecuted farmer, not a fantasy hero.
 * Items are scavenged, gifted, consecrated, or hand-made.
 * The quality system reflects the reality of poverty under persecution.
 * Blessings transform ordinary objects into sacred tools — CCC 1667-1679.
 */

// ═══════════════════════════════════════════════════════════════
// QUALITY GRADES
// ═══════════════════════════════════════════════════════════════

const QUALITY_GRADES = [
  { id: 0, name: 'Broken',               prefix: 'Broken',        mult: 0.30, durMult: 0.25 },
  { id: 1, name: 'Chipped',              prefix: 'Chipped',       mult: 0.50, durMult: 0.50 },
  { id: 2, name: 'Rusted',               prefix: 'Rusted',        mult: 0.65, durMult: 0.60 },
  { id: 3, name: 'Worn',                 prefix: 'Worn',          mult: 0.80, durMult: 0.75 },
  { id: 4, name: 'Standard',             prefix: '',              mult: 1.00, durMult: 1.00 },
  { id: 5, name: 'Well-Made',            prefix: 'Well-Made',     mult: 1.20, durMult: 1.25 },
  { id: 6, name: 'Master-Forged',        prefix: 'Master-Forged', mult: 1.45, durMult: 1.50 },
  { id: 7, name: 'Artificer Masterwork', prefix: 'Artificer',     mult: 1.75, durMult: 2.00 },
];

const BLESSING_TIERS = {
  holy_water_blessing: 1,
  priest_blessing: 1,
  miracle_blessing: 2,
  devotion_grace: 2,
  chrism_anointing: 3,
};

const SLOTS = ['weapon', 'garment', 'head', 'accessory', 'relic'];


// ═══════════════════════════════════════════════════════════════
// EQUIPMENT ITEM — Instance of an equipped/inventory item
// ═══════════════════════════════════════════════════════════════

export class EquipmentItem {
  constructor(template, quality = 4) {
    this.id = template.id;
    this.templateId = template.id;
    this.name = template.name;
    this.slot = template.slot;
    this.type = template.type;
    this.rarity = template.rarity || 'common';
    this.baseStats = { ...(template.base_stats || {}) };
    this.quality = quality;
    this.description = template.description || '';
    this.scaling = template.scaling || null;
    this.canDrop = template.canDrop !== false;
    this.canSell = template.canSell !== false;
    this.special = template.special || null;
    this.passive = template.passive || null;
    this.passiveDescription = template.passive_description || null;
    this.canBeBlessed = template.can_be_blessed !== false;

    // Blessing state
    this.blessed = false;
    this.blessingId = null;
    this.blessingName = null;
    this.blessingBonus = {};
    this.blessingTier = 0;
    this.blessingVisual = null;

    // Devotion grace tracking
    this.devotionGraceEligible = template.devotion_grace_eligible || false;
    this.devotionGraceText = template.devotion_grace_text || null;
    this.devotionGraceBonus = template.devotion_grace_bonus || null;
    this.battlesEquipped = 0;
    this.hasDevotionGrace = false;

    // Durability (optional system — can be toggled)
    this.durability = 100;
    this.maxDurability = 100;
  }

  /** Get the display name with quality prefix and blessing */
  get displayName() {
    const grade = QUALITY_GRADES[this.quality] || QUALITY_GRADES[4];
    const prefix = grade.prefix ? `${grade.prefix} ` : '';
    const blessPrefix = this.blessingName ? `${this.blessingName} ` : (this.blessed ? 'Blessed ' : '');
    return `${blessPrefix}${prefix}${this.name}`.trim();
  }

  /** Calculate effective stats with quality scaling */
  get effectiveStats() {
    const grade = QUALITY_GRADES[this.quality] || QUALITY_GRADES[4];
    const stats = {};

    for (const [stat, value] of Object.entries(this.baseStats)) {
      if (typeof value === 'number') {
        // Combat stats scale with quality
        if (['atk', 'def', 'spd', 'spr'].includes(stat)) {
          stats[stat] = Math.max(0, Math.round(value * grade.mult));
        } else {
          // Non-scaling stats (hp_bonus, mp_regen, crit_bonus, etc.)
          stats[stat] = value;
        }
      }
    }

    // Add blessing bonuses
    if (this.blessed && this.blessingBonus) {
      for (const [stat, value] of Object.entries(this.blessingBonus)) {
        if (typeof value === 'number') {
          stats[stat] = (stats[stat] || 0) + value;
        }
      }
    }

    // Add devotion grace bonuses
    if (this.hasDevotionGrace && this.devotionGraceBonus) {
      for (const [stat, value] of Object.entries(this.devotionGraceBonus)) {
        if (typeof value === 'number') {
          stats[stat] = (stats[stat] || 0) + value;
        }
      }
    }

    return stats;
  }

  /** Serialize for save data */
  toJSON() {
    return {
      templateId: this.templateId, quality: this.quality,
      blessed: this.blessed, blessingId: this.blessingId,
      blessingName: this.blessingName, blessingBonus: this.blessingBonus,
      blessingTier: this.blessingTier, blessingVisual: this.blessingVisual,
      battlesEquipped: this.battlesEquipped, hasDevotionGrace: this.hasDevotionGrace,
      durability: this.durability,
    };
  }

  /** Restore from save data */
  static fromSave(saveData, template) {
    const item = new EquipmentItem(template, saveData.quality);
    item.blessed = saveData.blessed || false;
    item.blessingId = saveData.blessingId || null;
    item.blessingName = saveData.blessingName || null;
    item.blessingBonus = saveData.blessingBonus || {};
    item.blessingTier = saveData.blessingTier || 0;
    item.blessingVisual = saveData.blessingVisual || null;
    item.battlesEquipped = saveData.battlesEquipped || 0;
    item.hasDevotionGrace = saveData.hasDevotionGrace || false;
    item.durability = saveData.durability || 100;
    return item;
  }
}


// ═══════════════════════════════════════════════════════════════
// EQUIPMENT MANAGER — Slots, equip/unequip, stat totals
// ═══════════════════════════════════════════════════════════════

export class EquipmentManager {
  constructor(state) {
    this.state = state;
    this.equipped = {
      weapon: null,
      garment: null,
      head: null,
      accessory: null,
      relic: null,
    };
    this.inventory = [];    // EquipmentItem[]
    this.consumables = [];  // { id, name, quantity, effect, ... }[]
    this.materials = [];    // { id, name, quantity, ... }[]
    this.keyItems = [];     // { id, name, ... }[]
    this.loreItems = [];    // { id, name, read, ... }[]

    this.templates = {};    // Item templates by id
  }

  /** Load item templates from the items.json catalog */
  loadTemplates(itemsData) {
    for (const item of itemsData) {
      if (item.id) {
        this.templates[item.id] = item;
      }
    }
  }

  /** Create an equipment item instance from template */
  createItem(templateId, quality) {
    const tmpl = this.templates[templateId];
    if (!tmpl || tmpl.class !== 'equipment') return null;

    const q = quality !== undefined ? quality :
      (tmpl.starting_quality || tmpl.quality_range?.[0] || 4);
    return new EquipmentItem(tmpl, q);
  }

  /** Equip an item from inventory */
  equip(item) {
    if (!(item instanceof EquipmentItem)) return { success: false, reason: 'Not equipment' };
    const slot = item.slot;
    if (!SLOTS.includes(slot)) return { success: false, reason: 'Invalid slot' };

    // Unequip current item in that slot
    const previous = this.equipped[slot];
    if (previous) {
      this.inventory.push(previous);
    }

    // Remove from inventory
    const idx = this.inventory.indexOf(item);
    if (idx >= 0) this.inventory.splice(idx, 1);

    this.equipped[slot] = item;
    this._recalculateStats();

    return { success: true, previous, equipped: item };
  }

  /** Unequip an item, returning it to inventory */
  unequip(slot) {
    if (!this.equipped[slot]) return { success: false, reason: 'Nothing equipped' };

    const item = this.equipped[slot];
    this.equipped[slot] = null;
    this.inventory.push(item);
    this._recalculateStats();

    return { success: true, item };
  }

  /** Add a consumable to inventory */
  addConsumable(id, quantity = 1) {
    const tmpl = this.templates[id];
    if (!tmpl) return false;

    const existing = this.consumables.find(c => c.id === id);
    const maxStack = tmpl.stackMax || 20;

    if (existing) {
      existing.quantity = Math.min(maxStack, existing.quantity + quantity);
    } else {
      this.consumables.push({
        id, name: tmpl.name, quantity: Math.min(maxStack, quantity),
        effect: tmpl.effect, description: tmpl.description,
        rarity: tmpl.rarity, subtype: tmpl.subtype,
        sellPrice: tmpl.sellPrice, buyPrice: tmpl.buyPrice,
      });
    }
    return true;
  }

  /** Use a consumable */
  useConsumable(id, context = {}) {
    const item = this.consumables.find(c => c.id === id);
    if (!item || item.quantity <= 0) return null;

    const effect = item.effect;
    const result = { itemName: item.name, effects: [] };
    const p = this.state.player;

    // Handle different effect types
    if (effect.type === 'heal' || effect.heal) {
      const heal = effect.value || effect.heal || 0;
      const actual = Math.min(heal, p.maxHp - p.hp);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      result.effects.push({ type: 'heal', amount: actual });
    }

    if (effect.type === 'mp_restore' || effect.mp_restore || effect.healMp) {
      const mp = effect.value || effect.mp_restore || effect.healMp || 0;
      p.mp = Math.min(p.maxMp || 99, p.mp + mp);
      result.effects.push({ type: 'mp_restore', amount: mp });
    }

    if (effect.type === 'heal_and_mp') {
      p.hp = Math.min(p.maxHp, p.hp + (effect.hp || 0));
      p.mp = Math.min(p.maxMp || 99, p.mp + (effect.mp || 0));
      result.effects.push({ type: 'heal', amount: effect.hp });
      result.effects.push({ type: 'mp_restore', amount: effect.mp });
    }

    if (effect.type === 'cure_status' || effect.cureStatus) {
      const cures = effect.cures || effect.cureStatus || [];
      result.effects.push({ type: 'cure_status', cured: cures });
    }

    if (effect.type === 'flee_guaranteed') {
      result.effects.push({ type: 'flee', guaranteed: true });
    }

    if (effect.type === 'debuff_enemy') {
      result.effects.push({ type: 'debuff', status: effect.status, duration: effect.duration });
    }

    // Sacramental battle effects
    if (effect.battle_use) {
      result.effects.push({ type: 'sacramental', ...effect.battle_use });
    }

    item.quantity--;
    if (item.quantity <= 0) {
      this.consumables = this.consumables.filter(c => c.id !== id);
    }

    return result;
  }

  /** Add a material */
  addMaterial(id, quantity = 1) {
    const tmpl = this.templates[id];
    if (!tmpl) return false;
    const existing = this.materials.find(m => m.id === id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.materials.push({
        id, name: tmpl.name, quantity,
        trade_value: tmpl.trade_value, upgrade_use: tmpl.upgrade_use,
        description: tmpl.description,
      });
    }
    return true;
  }

  /** Add a key item */
  addKeyItem(id) {
    const tmpl = this.templates[id];
    if (!tmpl || this.keyItems.some(k => k.id === id)) return false;
    this.keyItems.push({ id, name: tmpl.name, description: tmpl.description, effect: tmpl.effect });
    return true;
  }

  /** Add a lore item and check for read bonus */
  addLoreItem(id) {
    const tmpl = this.templates[id];
    if (!tmpl || this.loreItems.some(l => l.id === id)) return false;
    this.loreItems.push({
      id, name: tmpl.name, description: tmpl.description,
      read: false, on_read_bonus: tmpl.on_read_bonus,
    });
    return true;
  }

  /** Read a lore item — grant one-time bonus */
  readLoreItem(id) {
    const item = this.loreItems.find(l => l.id === id);
    if (!item || item.read) return null;

    item.read = true;
    const result = { itemName: item.name, bonuses: [] };

    if (item.on_read_bonus) {
      const bonus = item.on_read_bonus;
      const virtues = this.state.virtues || {};
      for (const [stat, value] of Object.entries(bonus)) {
        if (stat === 'one_time') continue;
        if (['faith', 'hope', 'charity', 'prudence', 'justice', 'fortitude', 'temperance'].includes(stat)) {
          virtues[stat] = (virtues[stat] || 0) + value;
          result.bonuses.push({ type: 'virtue', virtue: stat, amount: value });
        } else if (stat === 'spr') {
          this.state.player.spr += value;
          result.bonuses.push({ type: 'stat', stat: 'spr', amount: value });
        }
      }
    }

    return result;
  }

  /** Recalculate player stats from base + equipment + virtues */
  _recalculateStats() {
    const p = this.state.player;
    const base = this.state.baseStats || {
      hp: p.maxHp, mp: p.maxMp || 10, atk: p.baseAtk || p.atk,
      def: p.baseDef || p.def, spd: p.baseSpd || p.spd, spr: p.baseSpr || p.spr,
    };

    // Store base stats on first calc
    if (!this.state.baseStats) {
      this.state.baseStats = { ...base };
    }

    // Sum equipment bonuses
    const equipBonus = { atk: 0, def: 0, spd: 0, spr: 0, hp_bonus: 0, mp_regen: 0 };

    for (const slot of SLOTS) {
      const item = this.equipped[slot];
      if (!item) continue;
      const stats = item.effectiveStats;
      for (const [stat, value] of Object.entries(stats)) {
        if (equipBonus.hasOwnProperty(stat)) {
          equipBonus[stat] += value;
        }
      }
    }

    // Apply virtue scaling from weapons
    if (this.equipped.weapon?.scaling) {
      const scaling = this.equipped.weapon.scaling;
      const virtueLevel = (this.state.virtues?.[scaling.virtue] || 0);
      // Parse scaling formula for the primary stat
      if (scaling.formula?.includes('atk')) {
        equipBonus.atk += Math.floor(virtueLevel * 1.5);
      }
      if (scaling.formula?.includes('spr')) {
        equipBonus.spr += Math.floor(virtueLevel * 1);
      }
    }

    // Set final stats
    p.atk = base.atk + equipBonus.atk;
    p.def = base.def + equipBonus.def;
    p.spd = base.spd + equipBonus.spd;
    p.spr = base.spr + equipBonus.spr;
    p.maxHp = base.hp + equipBonus.hp_bonus;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  }

  /** Get total equipment stats for display */
  getEquipmentTotals() {
    const totals = {};
    for (const slot of SLOTS) {
      const item = this.equipped[slot];
      if (!item) continue;
      const stats = item.effectiveStats;
      for (const [stat, value] of Object.entries(stats)) {
        totals[stat] = (totals[stat] || 0) + value;
      }
    }
    return totals;
  }

  /** Get all passives from equipped items */
  getActivePassives() {
    const passives = [];
    for (const slot of SLOTS) {
      const item = this.equipped[slot];
      if (!item) continue;

      if (item.passive) {
        passives.push({ source: item.displayName, passive: item.passive, description: item.passiveDescription });
      }
      if (item.special) {
        passives.push({ source: item.displayName, passive: item.special, description: null });
      }
      // Devotion grace passives
      if (item.hasDevotionGrace && item.devotionGraceBonus?.passive) {
        passives.push({ source: item.displayName, passive: item.devotionGraceBonus.passive, description: 'Grace from devotion' });
      }
    }
    return passives;
  }
}


// ═══════════════════════════════════════════════════════════════
// BLESSING SYSTEM
// ═══════════════════════════════════════════════════════════════

export class BlessingSystem {
  constructor(blessingData) {
    this.methods = {};
    this.miracleBlessings = {};

    if (blessingData?.blessing_methods) {
      for (const method of blessingData.blessing_methods) {
        this.methods[method.id] = method;
        if (method.miracle_blessings) {
          this.miracleBlessings = method.miracle_blessings;
        }
      }
    }
  }

  /**
   * Attempt to bless an equipment item.
   * @param {EquipmentItem} item
   * @param {string} methodId — blessing method
   * @param {object} context — { virtues, priestPresent, miracleUsed }
   * @returns {{ success, reason?, item }}
   */
  bless(item, methodId, context = {}) {
    if (!item.canBeBlessed) {
      return { success: false, reason: 'This item cannot be blessed.' };
    }

    const method = this.methods[methodId];
    if (!method) return { success: false, reason: 'Unknown blessing method.' };

    const newTier = BLESSING_TIERS[methodId] || 1;

    // Check if existing blessing is higher tier (can't downgrade)
    if (item.blessed && item.blessingTier >= newTier && methodId !== 'devotion_grace') {
      return { success: false, reason: `This item already has a stronger blessing (${item.blessingName}).` };
    }

    // Check requirements
    if (methodId === 'holy_water_blessing') {
      if ((context.virtues?.faith || 0) < 2) {
        return { success: false, reason: 'Requires faith level 2 to bless with holy water.' };
      }
    }

    if (methodId === 'chrism_anointing') {
      if (!context.priestPresent) {
        return { success: false, reason: 'Sacred Chrism must be applied by a priest.' };
      }
    }

    if (methodId === 'priest_blessing') {
      if (!context.priestPresent) {
        return { success: false, reason: 'A priest must perform this blessing.' };
      }
    }

    // Apply blessing
    item.blessed = true;
    item.blessingId = methodId;
    item.blessingTier = newTier;
    item.blessingBonus = { ...(method.stat_bonus || {}) };
    item.blessingVisual = method.visual || 'faint_gold_glow';
    item.blessingName = null; // Default: just "Blessed"

    return { success: true, item, message: this._blessingMessage(item, method) };
  }

  /**
   * Attempt miracle blessing — cast a miracle while item is equipped.
   * The player doesn't know this works until it happens.
   */
  tryMiracleBlessing(item, miracleId) {
    if (!item.canBeBlessed) return null;

    const miracleBlessing = this.miracleBlessings[miracleId];
    if (!miracleBlessing) return null;

    // Already has a tier 2+ blessing
    if (item.blessed && item.blessingTier >= 2) return null;

    // 20% chance per miracle cast (not guaranteed — grace is a gift)
    if (Math.random() > 0.20) return null;

    item.blessed = true;
    item.blessingId = 'miracle_blessing';
    item.blessingName = miracleBlessing.name;
    item.blessingTier = 2;
    item.blessingBonus = { ...(miracleBlessing.bonus || {}) };
    item.blessingVisual = miracleBlessing.visual || 'radiant_edge';

    return {
      success: true,
      item,
      surprise: true,
      message: `The ${item.name} shimmers. Something has changed. It is now ${item.displayName}.`,
    };
  }

  /**
   * Check for devotion grace — the hidden surprise.
   * Called when resting at a sacred site.
   * Requirements: item equipped 100+ battles, total virtue >= 15, 5% chance.
   */
  checkDevotionGrace(item, totalVirtue) {
    if (!item.devotionGraceEligible) return null;
    if (item.hasDevotionGrace) return null;
    if (item.battlesEquipped < 100) return null;
    if (totalVirtue < 15) return null;
    if (Math.random() > 0.05) return null;

    // Grace granted
    item.hasDevotionGrace = true;

    return {
      success: true,
      item,
      surprise: true,
      devotionGrace: true,
      message: item.devotionGraceText || `Something has changed about the ${item.name}. It feels... different. Warmer.`,
    };
  }

  /**
   * Increment battle counter for equipped items.
   * Called at the end of every battle.
   */
  recordBattle(equippedItems) {
    for (const item of Object.values(equippedItems)) {
      if (item) item.battlesEquipped++;
    }
  }

  _blessingMessage(item, method) {
    switch (method.id) {
      case 'priest_blessing':
        return `The priest makes the Sign of the Cross over the ${item.name}. It is blessed.`;
      case 'holy_water_blessing':
        return `You sprinkle holy water on the ${item.name}, recalling your baptism. The water soaks in and the item glows faintly.`;
      case 'chrism_anointing':
        return `The priest anoints the ${item.name} with Sacred Chrism. The oil gleams gold, then sinks into the material. This is a rare and sacred blessing.`;
      default:
        return `The ${item.name} has been blessed.`;
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// UPGRADE SYSTEM — Quality improvements via materials/craftsmen
// ═══════════════════════════════════════════════════════════════

export class UpgradeSystem {
  constructor(templates) {
    this.templates = templates;
  }

  /**
   * Upgrade item quality using a material.
   * Whetstones raise quality by 1 (max Standard).
   * Craftsman NPCs can go higher.
   */
  upgradeWithMaterial(item, material) {
    if (!material.upgrade_use) return { success: false, reason: 'This material cannot be used for upgrades.' };

    const use = material.upgrade_use;

    // Quality boost
    if (use.quality_boost) {
      const maxQ = use.max_quality || 7;
      if (item.quality >= maxQ) {
        return { success: false, reason: `This item is already at ${QUALITY_GRADES[item.quality].name} quality.` };
      }
      item.quality = Math.min(maxQ, item.quality + use.quality_boost);
      return {
        success: true,
        message: `The ${item.name} is now ${QUALITY_GRADES[item.quality].name} quality.`,
        newQuality: item.quality,
      };
    }

    // Stat bonus
    if (use.bonus && use.slot === item.slot) {
      // Apply a small permanent bonus to base stats
      for (const [stat, value] of Object.entries(use.bonus)) {
        item.baseStats[stat] = (item.baseStats[stat] || 0) + value;
      }
      return {
        success: true,
        message: use.description || `The ${item.name} has been improved.`,
      };
    }

    return { success: false, reason: 'This material does not work with this item.' };
  }

  /**
   * NPC craftsman upgrade — raises quality up to their skill limit.
   * @param {EquipmentItem} item
   * @param {number} maxQuality — craftsman's skill ceiling
   * @param {number} cost — gold cost
   * @param {number} playerGold
   */
  craftsmanUpgrade(item, maxQuality, cost, playerGold) {
    if (item.quality >= maxQuality) {
      return { success: false, reason: `I cannot improve this further. It is already ${QUALITY_GRADES[item.quality].name}.` };
    }
    if (item.quality >= 7) {
      return { success: false, reason: 'This is an Artificer Masterwork. It cannot be improved by mortal hands.' };
    }
    if (playerGold < cost) {
      return { success: false, reason: 'Not enough gold.' };
    }

    const oldQuality = item.quality;
    item.quality = Math.min(maxQuality, item.quality + 1);

    return {
      success: true,
      cost,
      oldQuality,
      newQuality: item.quality,
      message: `The craftsman works carefully. The ${item.name} is now ${QUALITY_GRADES[item.quality].name}.`,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// VOCATION SYSTEM — Laity vs Religious Orders
// ═══════════════════════════════════════════════════════════════

export class VocationSystem {
  constructor(orderData) {
    this.orders = {};
    this.laityPath = null;
    this.vocation = null;       // null = not yet chosen, 'laity' or order id
    this.vocChosen = false;

    if (orderData?.orders) {
      for (const order of orderData.orders) {
        this.orders[order.id] = order;
      }
    }
    if (orderData?.laity_path) {
      this.laityPath = orderData.laity_path;
    }
  }

  /** Check if the player has committed to a vocation */
  get hasChosen() { return this.vocChosen; }

  /** Get current vocation data */
  get current() {
    if (!this.vocChosen) return null;
    if (this.vocation === 'laity') return this.laityPath;
    return this.orders[this.vocation] || null;
  }

  /** Get available orders for the choice screen */
  getAvailableOrders() {
    return Object.values(this.orders).map(o => ({
      id: o.id, name: o.name, latin: o.latin,
      charism: o.charism, abbreviation: o.abbreviation,
      description: o.vow_effect?.description,
      statChanges: o.vow_effect?.stat_changes,
    }));
  }

  /**
   * Commit to a vocation. PERMANENT. Cannot be undone.
   * @param {string} vocId — 'laity' or order id
   * @param {object} state — game state to modify
   * @returns {{ success, vocation, changes }}
   */
  commit(vocId, state) {
    if (this.vocChosen) {
      return { success: false, reason: 'You have already committed to a vocation. This path cannot be undone.' };
    }

    if (vocId === 'laity') {
      this.vocation = 'laity';
      this.vocChosen = true;
      return {
        success: true,
        vocation: this.laityPath,
        changes: { scapular_slot: true },
        message: 'You choose to walk as a pilgrim among the people. The scapular warms against your chest.',
      };
    }

    const order = this.orders[vocId];
    if (!order) return { success: false, reason: 'Unknown order.' };

    this.vocation = vocId;
    this.vocChosen = true;

    // Apply permanent stat changes
    const changes = order.vow_effect?.stat_changes || {};
    const p = state.player;

    for (const [stat, value] of Object.entries(changes)) {
      const numValue = parseInt(value) || 0;
      if (stat === 'all_stats') {
        for (const s of ['atk', 'def', 'spd', 'spr']) {
          p[s] = (p[s] || 0) + numValue;
          if (state.baseStats) state.baseStats[s] = (state.baseStats[s] || 0) + numValue;
        }
        p.maxHp = (p.maxHp || 35) + numValue * 2;
        p.maxMp = (p.maxMp || 10) + numValue;
      } else if (['atk', 'def', 'spd', 'spr'].includes(stat)) {
        p[stat] = (p[stat] || 0) + numValue;
        if (state.baseStats) state.baseStats[stat] = (state.baseStats[stat] || 0) + numValue;
      }
    }

    // Apply virtue changes
    const virtues = state.virtues || {};
    for (const [stat, value] of Object.entries(changes)) {
      if (['faith', 'hope', 'charity', 'prudence', 'justice', 'fortitude', 'temperance'].includes(stat)) {
        virtues[stat] = (virtues[stat] || 0) + (parseInt(value) || 0);
      }
    }

    // Set growth modifiers for future level-ups
    state.growthModifier = order.vow_effect?.growth_modifier || {};

    return {
      success: true,
      vocation: order,
      changes,
      message: `You take the vows of the ${order.name}. ${order.abbreviation}. This cannot be undone.`,
      orderRelic: order.unlocks?.relic,
      orderEquipment: order.unlocks?.equipment_line,
      orderMiracle: order.unlocks?.unique_miracle,
    };
  }

  /** Get order-specific relic item */
  getOrderRelic() {
    if (this.vocation === 'laity' || !this.vocChosen) return null;
    return this.current?.unlocks?.relic || null;
  }

  /** Get order-specific equipment catalog */
  getOrderEquipment() {
    if (this.vocation === 'laity' || !this.vocChosen) return [];
    return this.current?.unlocks?.equipment_line || [];
  }

  /** Get order-specific miracle */
  getOrderMiracle() {
    if (this.vocation === 'laity' || !this.vocChosen) return null;
    return this.current?.unlocks?.unique_miracle || null;
  }

  /** Get order-specific trade goods */
  getOrderTradeGoods() {
    if (this.vocation === 'laity') return ['civilian_goods'];
    if (!this.vocChosen) return [];
    return this.current?.unlocks?.traders?.trade_goods || [];
  }

  /** Check if an equipment piece is order-restricted */
  canEquip(item) {
    if (!item.order_restriction) return true;
    return item.order_restriction === this.vocation;
  }

  /** Check if laity path (for scapular slot access) */
  isLaity() { return this.vocation === 'laity'; }

  /** Serialize */
  toJSON() {
    return { vocation: this.vocation, vocChosen: this.vocChosen };
  }

  /** Restore */
  static fromSave(saveData, orderData) {
    const sys = new VocationSystem(orderData);
    sys.vocation = saveData.vocation;
    sys.vocChosen = saveData.vocChosen || false;
    return sys;
  }
}


// ═══════════════════════════════════════════════════════════════
// SCAPULAR MANAGER — Passive effects for laity path
// ═══════════════════════════════════════════════════════════════

export class ScapularManager {
  constructor() {
    this.deathSaveUsed = false;
  }

  /**
   * Process scapular passive effects during combat.
   * Called by the combat engine at relevant moments.
   */
  processCombatPassive(passiveId, context) {
    switch (passiveId) {
      case 'death_save_once_per_book':
        if (!this.deathSaveUsed && context.playerHp <= 0) {
          this.deathSaveUsed = true;
          context.playerHp = 1;
          return {
            triggered: true,
            message: 'The Brown Scapular glows blue. Our Lady\'s promise holds. You survive with 1 HP.',
            visual: 'marian_blue_flash',
          };
        }
        return { triggered: false };

      case 'passive_regen_1pct':
        const regen = Math.max(1, Math.floor(context.playerMaxHp * 0.01));
        return { triggered: true, heal: regen, message: null }; // Silent heal

      case 'immune_despair':
        if (context.statusInflicted === 'despair') {
          return {
            triggered: true,
            blocked: true,
            message: 'The Black Scapular absorbs the despair. Seven Sorrows, Seven Strengths.',
          };
        }
        return { triggered: false };

      case 'damage_reduction_when_low_hp':
        if (context.playerHp < context.playerMaxHp * 0.25) {
          return { triggered: true, damageReduction: 0.15 };
        }
        return { triggered: false };

      default:
        return { triggered: false };
    }
  }

  /** Reset per-book passives (call at the start of each book) */
  resetBook() {
    this.deathSaveUsed = false;
  }
}


// ═══════════════════════════════════════════════════════════════
// MASTER ITEM MANAGER — Integrates everything
// ═══════════════════════════════════════════════════════════════

export class ItemManager {
  constructor(state) {
    this.state = state;
    this.equipment = new EquipmentManager(state);
    this.blessings = null;
    this.upgrades = null;
    this.vocation = null;
    this.scapular = new ScapularManager();
    this.loaded = false;
  }

  /**
   * Load all item data.
   * @param {Array} itemsCatalog — items.json contents
   * @param {Object} equipmentSystem — equipment-system.json contents
   */
  load(itemsCatalog, equipmentSystem) {
    // Load templates
    this.equipment.loadTemplates(itemsCatalog);

    // Initialize blessing system
    this.blessings = new BlessingSystem(equipmentSystem?.blessing_system);

    // Initialize upgrade system
    this.upgrades = new UpgradeSystem(this.equipment.templates);

    // Initialize vocation system
    this.vocation = new VocationSystem(equipmentSystem?.religious_orders);

    this.loaded = true;
  }

  /** Give starting equipment to the player */
  giveStartingEquipment() {
    // Farmer's gear
    const sickle = this.equipment.createItem('farmers_sickle', 3);
    const kosode = this.equipment.createItem('farmers_kosode', 3);
    const hat = this.equipment.createItem('sedge_hat', 3);
    const sandals = this.equipment.createItem('straw_sandals', 3);

    if (sickle) { this.equipment.inventory.push(sickle); this.equipment.equip(sickle); }
    if (kosode) { this.equipment.inventory.push(kosode); this.equipment.equip(kosode); }
    if (hat) { this.equipment.inventory.push(hat); this.equipment.equip(hat); }
    if (sandals) { this.equipment.inventory.push(sandals); this.equipment.equip(sandals); }

    // Starting consumables
    this.equipment.addConsumable('rice_cake', 3);
    this.equipment.addConsumable('medicinal_herb', 2);
  }

  /** Award loot from enemy drops (called by combat engine) */
  processDrops(dropItems) {
    const results = [];
    for (const itemId of dropItems) {
      const tmpl = this.equipment.templates[itemId];
      if (!tmpl) continue;

      switch (tmpl.class) {
        case 'consumable':
        case 'sacramental':
          this.equipment.addConsumable(itemId);
          results.push({ id: itemId, name: tmpl.name, type: 'consumable' });
          break;
        case 'material':
          this.equipment.addMaterial(itemId);
          results.push({ id: itemId, name: tmpl.name, type: 'material' });
          break;
        case 'equipment': {
          const qRange = tmpl.quality_range || [3, 4];
          const q = qRange[0] + Math.floor(Math.random() * (qRange[1] - qRange[0] + 1));
          const item = this.equipment.createItem(itemId, q);
          if (item) {
            this.equipment.inventory.push(item);
            results.push({ id: itemId, name: item.displayName, type: 'equipment', quality: q });
          }
          break;
        }
        case 'key_item':
          this.equipment.addKeyItem(itemId);
          results.push({ id: itemId, name: tmpl.name, type: 'key_item' });
          break;
        case 'lore_item':
          this.equipment.addLoreItem(itemId);
          results.push({ id: itemId, name: tmpl.name, type: 'lore_item' });
          break;
      }
    }
    return results;
  }

  /**
   * Post-battle processing — record battles for devotion, check miracle blessings.
   * @param {string} miracleUsed — id of the last miracle cast in battle, if any
   */
  postBattle(miracleUsed) {
    // Record battle count for all equipped items
    this.blessings.recordBattle(this.equipment.equipped);

    // Check if miracle blessed any equipped item
    if (miracleUsed && this.blessings) {
      for (const item of Object.values(this.equipment.equipped)) {
        if (!item) continue;
        const result = this.blessings.tryMiracleBlessing(item, miracleUsed);
        if (result?.success) {
          return result; // Return surprise blessing event for UI
        }
      }
    }

    return null;
  }

  /**
   * Sacred site rest — check for devotion graces.
   */
  checkDevotionGraces() {
    const totalVirtue = Object.values(this.state.virtues || {}).reduce((s, v) => s + v, 0);
    const results = [];

    for (const item of Object.values(this.equipment.equipped)) {
      if (!item) continue;
      const result = this.blessings.checkDevotionGrace(item, totalVirtue);
      if (result?.success) {
        results.push(result);
      }
    }

    return results;
  }

  /** Full save */
  toJSON() {
    return {
      equipped: Object.fromEntries(
        SLOTS.map(s => [s, this.equipment.equipped[s]?.toJSON() || null])
      ),
      inventory: this.equipment.inventory.map(i => i.toJSON()),
      consumables: this.equipment.consumables,
      materials: this.equipment.materials,
      keyItems: this.equipment.keyItems,
      loreItems: this.equipment.loreItems,
      vocation: this.vocation?.toJSON(),
      scapularDeathSaveUsed: this.scapular.deathSaveUsed,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// TRADE SYSTEM — NPC barter (no shops, only specific NPCs)
// Merged from equipment.js
// ═══════════════════════════════════════════════════════════════

export class TradeSystem {
  constructor(equipmentManager) {
    this.manager = equipmentManager;
    this.traders = {};
  }

  /**
   * Register NPC traders. Each trader has specific offers,
   * available based on story flags and trust level.
   */
  registerTrader(traderId, config) {
    this.traders[traderId] = {
      id: traderId,
      name: config.name,
      species: config.species,
      location: config.location,
      trustLevel: config.trustLevel || 0,
      maxTrust: config.maxTrust || 3,
      trades: config.trades || [],
      dialogue: config.dialogue || {},
      vocationRestriction: config.vocationRestriction || null,
    };
  }

  /** Get available trades for a trader based on trust and flags */
  getAvailableTrades(traderId, playerEquipment, storyFlags = {}) {
    const trader = this.traders[traderId];
    if (!trader) return [];

    // Vocation restriction
    if (trader.vocationRestriction && playerEquipment.vocation !== trader.vocationRestriction) {
      return [];
    }

    return trader.trades.filter(trade => {
      // Trust level requirement
      if (trade.minTrust && trader.trustLevel < trade.minTrust) return false;
      // Story flag requirement
      if (trade.requiresFlag && !storyFlags[trade.requiresFlag]) return false;
      // One-time trades
      if (trade.oneTime && trade._completed) return false;
      return true;
    });
  }

  /**
   * Execute a trade.
   * Trades use materials/items/gold, NOT a shop interface.
   */
  executeTrade(traderId, tradeIndex, playerEquipment, playerGold) {
    const trader = this.traders[traderId];
    if (!trader) return { success: false, reason: 'Unknown trader' };

    const trade = trader.trades[tradeIndex];
    if (!trade) return { success: false, reason: 'Invalid trade' };

    // Check costs
    if (trade.costGold && playerGold.amount < trade.costGold) {
      return { success: false, reason: 'Not enough gold' };
    }

    if (trade.costItems) {
      for (const { id, quantity } of trade.costItems) {
        if (playerEquipment.getItemCount(id) < (quantity || 1)) {
          return { success: false, reason: `Need ${quantity || 1}x ${id}` };
        }
      }
    }

    // Pay costs
    if (trade.costGold) playerGold.amount -= trade.costGold;
    if (trade.costItems) {
      for (const { id, quantity } of trade.costItems) {
        playerEquipment.removeFromInventory(id, quantity || 1);
      }
    }

    // Grant rewards
    const received = [];
    if (trade.givesItem) {
      const quality = trade.givesQuality !== undefined ? trade.givesQuality : undefined;
      const instance = this.manager.createInstance(trade.givesItem, quality);
      if (instance) {
        playerEquipment.addToInventory(instance);
        received.push(instance);
      }
    }
    if (trade.givesItems) {
      for (const { id, quantity } of trade.givesItems) {
        playerEquipment.addToInventory(id, quantity || 1);
        received.push({ id, quantity: quantity || 1 });
      }
    }

    // Mark one-time trades
    if (trade.oneTime) trade._completed = true;

    // Trust change
    if (trade.trustGain) {
      trader.trustLevel = Math.min(trader.maxTrust, trader.trustLevel + trade.trustGain);
    }

    return { success: true, received, message: trade.successDialogue || 'Trade complete.' };
  }

  /** Upgrade equipment quality via a craftsman NPC */
  upgradeEquipment(traderId, itemInstance, playerGold) {
    const trader = this.traders[traderId];
    if (!trader) return { success: false, reason: 'Unknown craftsman' };

    if (!itemInstance || !itemInstance.baseStats) {
      return { success: false, reason: 'Cannot upgrade this item' };
    }

    const currentQuality = itemInstance.quality || 4;
    if (currentQuality >= 6) { // Max craftable is 6 (Master-Forged). Artificer cannot be made.
      return { success: false, reason: 'This item cannot be improved further by mortal hands.' };
    }

    // Cost: base_value * grade_diff * 1.5
    const baseValue = Object.values(itemInstance.baseStats).reduce((s, v) => s + Math.abs(v || 0), 0) * 5;
    const cost = Math.floor(baseValue * 1.5);

    if (playerGold.amount < cost) {
      return { success: false, reason: `Need ${cost} gold` };
    }

    playerGold.amount -= cost;
    itemInstance.quality = currentQuality + 1;

    const newGrade = getGrade(itemInstance.quality);
    return {
      success: true,
      newQuality: itemInstance.quality,
      newName: getDisplayName(itemInstance),
      message: `The craftsman works carefully. ${getDisplayName(itemInstance)} — ${newGrade.name} quality.`,
      cost,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// STATUS EFFECT PROCESSOR
// ═══════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════
// STATUS EFFECT PROCESSOR — Battle status tracking & resolution
// Merged from equipment.js
// ═══════════════════════════════════════════════════════════════

export class StatusEffectProcessor {
  constructor() {
    this.definitions = {
      poison:    { type: 'dot',    tick: 'hp_pct', value: 0.05, canKill: false, icon: '☠', color: '#4a5a3a' },
      burn:      { type: 'dot',    tick: 'hp_flat', value: 3, canKill: true, icon: '🔥', color: '#ff4500' },
      despair:   { type: 'debuff', stat: 'spr', amount: -3, healReduction: 0.5, icon: '💧', color: '#1a1a3d' },
      fear:      { type: 'debuff', stat: 'atk', amount: -3, fleeChance: 0.15, icon: '😨', color: '#3d1f6d' },
      confusion: { type: 'debuff', selfHitChance: 0.3, icon: '❓', color: '#6b3fa0' },
      slow:      { type: 'debuff', stat: 'spd', amount: -3, icon: '🐌', color: '#5c4d3c' },
      stun:      { type: 'skip',   icon: '⚡', color: '#ffd700' },
      berserk:   { type: 'debuff', stat: 'atk', amount: 3, forceAttack: true, icon: '😡', color: '#8b0000' },
      forget:    { type: 'block',  blocks: 'prayer', icon: '🌫', color: '#4a4a4a' },
      spr_down:  { type: 'debuff', stat: 'spr', amount: -3, icon: '⬇', color: '#6b3fa0' },
      atk_down:  { type: 'debuff', stat: 'atk', amount: -2, icon: '⬇', color: '#8b0000' },
      accuracy_down: { type: 'debuff', missChance: 0.3, icon: '🎯', color: '#4a4a4a' },
      all_stats_down: { type: 'debuff', allStats: true, amount: -1, icon: '⬇⬇', color: '#3d1f6d' },
      mp_drain:  { type: 'dot',    tick: 'mp_flat', value: 2, icon: '🔮', color: '#6b3fa0' },

      // Buffs
      invulnerable: { type: 'buff', immune: 'all_damage', icon: '🛡', color: '#ffd700' },
      spd_up:    { type: 'buff',   stat: 'spd', amount: 3, icon: '⬆', color: '#90ee90' },
      spr_up:    { type: 'buff',   stat: 'spr', amount: 4, icon: '⬆', color: '#6495ed' },
      def_up:    { type: 'buff',   stat: 'def', amount: 4, icon: '⬆', color: '#c9a959' },
      regen:     { type: 'hot',    tick: 'hp_pct', value: 0.05, icon: '💚', color: '#90ee90' },
      mp_regen:  { type: 'hot',    tick: 'mp_flat', value: 3, icon: '💙', color: '#6495ed' },
    };
  }

  /**
   * Apply a status effect to a target.
   * Checks resistance from virtues, equipment passives, and scapulars.
   */
  applyStatus(statusId, target, duration, options = {}) {
    const def = this.definitions[statusId];
    if (!def) return { applied: false, reason: 'Unknown status' };

    // Immunity checks
    const immunities = target.immunities || [];
    if (immunities.includes(statusId)) {
      return { applied: false, reason: `Immune to ${statusId}` };
    }

    // Equipment passive resistance
    const resistPct = target.statusResistPct || 0;
    if (resistPct > 0 && Math.random() < resistPct / 100) {
      return { applied: false, reason: `Resisted ${statusId}` };
    }

    // Apply
    const existing = (target.statusEffects || []).find(s => s.id === statusId);
    if (existing) {
      // Refresh duration
      existing.duration = Math.max(existing.duration, duration);
      return { applied: true, refreshed: true, statusId };
    }

    if (!target.statusEffects) target.statusEffects = [];
    target.statusEffects.push({
      id: statusId,
      duration,
      def,
      amount: options.amount || def.amount,
    });

    return { applied: true, statusId, duration };
  }

  /**
   * Process all status effects at end of turn.
   * Returns array of effect results for UI.
   */
  processTurnEnd(target) {
    if (!target.statusEffects || target.statusEffects.length === 0) return [];

    const results = [];

    for (const status of target.statusEffects) {
      const def = status.def || this.definitions[status.id];
      if (!def) continue;

      // DOT effects
      if (def.type === 'dot') {
        let dmg = 0;
        if (def.tick === 'hp_pct') dmg = Math.floor((target.maxHp || 100) * def.value);
        if (def.tick === 'hp_flat') dmg = def.value;
        if (def.tick === 'mp_flat') {
          target.mp = Math.max(0, (target.mp || 0) - def.value);
          results.push({ type: 'mp_drain', statusId: status.id, amount: def.value });
          status.duration--;
          continue;
        }

        if (!def.canKill && target.hp <= dmg) dmg = target.hp - 1;
        target.hp = Math.max(def.canKill ? 0 : 1, (target.hp || 0) - dmg);
        results.push({ type: 'dot', statusId: status.id, damage: dmg, hp: target.hp });
      }

      // HOT effects (healing over time)
      if (def.type === 'hot') {
        let heal = 0;
        if (def.tick === 'hp_pct') heal = Math.floor((target.maxHp || 100) * def.value);
        if (def.tick === 'mp_flat') {
          target.mp = Math.min(target.maxMp || 99, (target.mp || 0) + def.value);
          results.push({ type: 'mp_regen', statusId: status.id, amount: def.value });
          status.duration--;
          continue;
        }
        target.hp = Math.min(target.maxHp || 100, (target.hp || 0) + heal);
        results.push({ type: 'hot', statusId: status.id, heal, hp: target.hp });
      }

      status.duration--;
    }

    // Remove expired
    target.statusEffects = target.statusEffects.filter(s => s.duration > 0);

    return results;
  }

  /** Get stat modifiers from active statuses */
  getStatModifiers(target) {
    const mods = {};
    if (!target.statusEffects) return mods;

    for (const status of target.statusEffects) {
      const def = status.def || this.definitions[status.id];
      if (!def) continue;

      if (def.stat && def.amount) {
        mods[def.stat] = (mods[def.stat] || 0) + (status.amount || def.amount);
      }
      if (def.allStats && def.amount) {
        for (const s of ['atk', 'def', 'spd', 'spr']) {
          mods[s] = (mods[s] || 0) + (status.amount || def.amount);
        }
      }
    }

    return mods;
  }

  /** Check if target has a specific active status */
  hasStatus(target, statusId) {
    return (target.statusEffects || []).some(s => s.id === statusId);
  }

  /** Remove a specific status */
  removeStatus(target, statusId) {
    if (!target.statusEffects) return false;
    const idx = target.statusEffects.findIndex(s => s.id === statusId);
    if (idx >= 0) { target.statusEffects.splice(idx, 1); return true; }
    return false;
  }

  /** Remove all debuffs */
  cleanse(target) {
    if (!target.statusEffects) return [];
    const removed = target.statusEffects.filter(s => {
      const def = s.def || this.definitions[s.id];
      return def && (def.type === 'dot' || def.type === 'debuff' || def.type === 'skip' || def.type === 'block');
    });
    target.statusEffects = target.statusEffects.filter(s => {
      const def = s.def || this.definitions[s.id];
      return def && (def.type === 'buff' || def.type === 'hot');
    });
    return removed.map(s => s.id);
  }
}


// ═══════════════════════════════════════════════════════════════
// SAVE / LOAD SYSTEM
// ═══════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════
// SAVE / LOAD SYSTEM
// Merged from equipment.js
// ═══════════════════════════════════════════════════════════════

export class SaveSystem {
  constructor(storageKey = 'samurai_usagi_save') {
    this.storageKey = storageKey;
    this.maxSlots = 3;
  }

  /**
   * Save full game state to a slot.
   */
  save(slot, gameState) {
    if (slot < 0 || slot >= this.maxSlots) return false;

    const saveData = {
      version: '1.0',
      timestamp: Date.now(),
      slot,
      player: {
        name: gameState.player.name,
        level: gameState.player.level,
        xp: gameState.player.xp,
        hp: gameState.player.hp,
        maxHp: gameState.player.maxHp,
        mp: gameState.player.mp,
        maxMp: gameState.player.maxMp,
        atk: gameState.player.atk,
        def: gameState.player.def,
        spd: gameState.player.spd,
        spr: gameState.player.spr,
        gold: gameState.player.gold || 0,
      },
      virtues: { ...(gameState.virtues || {}) },
      equipment: gameState.equipment?.serialize() || null,
      flags: { ...(gameState.flags || {}) },
      book: gameState.currentBook || 'book-00',
      act: gameState.currentAct || 1,
      area: gameState.currentArea || 'village_outskirts',
      position: gameState.position || { x: 0, y: 0 },
      difficulty: gameState.difficulty || 'disciple',
      completedBooks: gameState.completedBooks || [],
      saintRegistry: gameState.saintRegistry || [],
      battleCount: gameState.battleCount || 0,
      playTime: gameState.playTime || 0,
    };

    try {
      const allSaves = this._loadAllSaves();
      allSaves[slot] = saveData;
      localStorage.setItem(this.storageKey, JSON.stringify(allSaves));
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      return false;
    }
  }

  /**
   * Load game state from a slot.
   */
  load(slot) {
    try {
      const allSaves = this._loadAllSaves();
      return allSaves[slot] || null;
    } catch (err) {
      console.error('Load failed:', err);
      return null;
    }
  }

  /**
   * Apply loaded data to the game state.
   */
  applyToState(saveData, gameState) {
    if (!saveData) return false;

    // Player stats
    Object.assign(gameState.player, saveData.player);

    // Virtues
    gameState.virtues = saveData.virtues || {};

    // Equipment
    if (saveData.equipment && gameState.equipment) {
      gameState.equipment.deserialize(saveData.equipment);
    }

    // Flags and progress
    gameState.flags = saveData.flags || {};
    gameState.currentBook = saveData.book;
    gameState.currentAct = saveData.act;
    gameState.currentArea = saveData.area;
    gameState.position = saveData.position;
    gameState.difficulty = saveData.difficulty;
    gameState.completedBooks = saveData.completedBooks || [];
    gameState.saintRegistry = saveData.saintRegistry || [];
    gameState.battleCount = saveData.battleCount || 0;
    gameState.playTime = saveData.playTime || 0;

    return true;
  }

  /** Get save slot summaries for the load screen */
  getSaveSummaries() {
    const allSaves = this._loadAllSaves();
    return Array.from({ length: this.maxSlots }, (_, i) => {
      const save = allSaves[i];
      if (!save) return { slot: i, empty: true };
      return {
        slot: i,
        empty: false,
        playerName: save.player.name,
        level: save.player.level,
        book: save.book,
        act: save.act,
        area: save.area,
        difficulty: save.difficulty,
        playTime: save.playTime,
        timestamp: save.timestamp,
      };
    });
  }

  /** Delete a save slot */
  deleteSave(slot) {
    const allSaves = this._loadAllSaves();
    delete allSaves[slot];
    localStorage.setItem(this.storageKey, JSON.stringify(allSaves));
  }

  _loadAllSaves() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch {
      return {};
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// BOOK ZERO NPC TRADERS
// ═══════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════
// BOOK ZERO NPC TRADERS
// Merged from equipment.js
// ═══════════════════════════════════════════════════════════════

export function registerBookZeroTraders(tradeSystem) {
  // Ichiro — the doubting friend. Trades practical goods.
  tradeSystem.registerTrader('ichiro', {
    name: 'Ichiro',
    species: 'rabbit',
    location: 'village_outskirts',
    trustLevel: 1,
    maxTrust: 3,
    trades: [
      {
        name: 'Wolf-skin Jacket',
        description: '"Two pelts. I'll make something warm. Don't ask why I know how."',
        costItems: [{ id: 'wolf_pelt', quantity: 2 }],
        givesItem: 'padded_jacket',
        givesQuality: 3,
        oneTime: true,
        successDialogue: 'Ichiro works silently for an hour. The jacket is rough but solid.',
      },
      {
        name: 'Bamboo Staff',
        description: '"Need a walking stick? I've got one that's hardened proper."',
        costGold: 15,
        givesItem: 'bamboo_staff',
        givesQuality: 3,
        successDialogue: '"It's good bamboo. Mountain-grown."',
      },
      {
        name: 'Herbs for Rice',
        description: '"I found herbs on the mountain. Trade for something I can eat."',
        costItems: [{ id: 'rice_ball', quantity: 3 }],
        givesItems: [{ id: 'medicinal_herb', quantity: 3 }],
        successDialogue: '"Fair trade. Stay alive out there."',
      },
      {
        name: 'Traveler's Pouch',
        description: '"My father's. It's seen more road than I ever will."',
        costGold: 20,
        givesItem: 'travelers_pouch',
        minTrust: 2,
        oneTime: true,
        trustGain: 1,
        successDialogue: '"Take it. He'd want it used."',
      },
      {
        name: 'Fox Charm',
        description: '"Found this near the shrine. Lucky, maybe. Or just a carving."',
        costItems: [{ id: 'iron_scraps', quantity: 3 }],
        givesItem: 'foxs_charm',
        minTrust: 2,
        oneTime: true,
        successDialogue: 'The fox's expression seems amused.',
      },
    ],
    dialogue: {
      greeting_trust0: '"What do you want?"',
      greeting_trust1: '"...You again. Fine. What do you need?"',
      greeting_trust2: '"I don't believe in your God. But I believe in you. What do you need?"',
      greeting_trust3: '"You're my friend, Usagi. Even if you're a fool. Let me help."',
    },
  });

  // Kakure Elder — hidden Christian. Trades sacred items.
  tradeSystem.registerTrader('kakure_elder', {
    name: 'Kakure Elder',
    species: 'rabbit',
    location: 'hidden_chapel',
    trustLevel: 0,
    maxTrust: 3,
    trades: [
      {
        name: 'Holy Water',
        description: 'The elder carefully pours from a clay jug. "Blessed by Father Tomas, before..."',
        costGold: 0,
        givesItems: [{ id: 'holy_water_vial', quantity: 1 }],
        oneTime: false,
        minTrust: 1,
        successDialogue: '"Use it wisely. There is no more to bless."',
      },
      {
        name: 'Prayer Veil',
        description: '"My daughter wore this during Mass. She is with God now. Perhaps it will help you pray."',
        costItems: [{ id: 'fine_cloth', quantity: 1 }],
        givesItem: 'prayer_veil',
        givesQuality: 4,
        oneTime: true,
        minTrust: 2,
        trustGain: 1,
        successDialogue: 'The elder's hands shake as he gives it to you.',
      },
      {
        name: 'Blessed Salt',
        description: '"Father Tomas blessed a bag of salt last Easter. For the homes. Take some."',
        costGold: 0,
        givesItems: [{ id: 'blessed_salt', quantity: 2 }],
        minTrust: 1,
        successDialogue: '"Spread it where you sleep. It helps."',
      },
      {
        name: 'Blessed Candle',
        description: '"Candlemas candle. The last one. I've been saving it for... I don't know what. Take it."',
        costItems: [{ id: 'camphor_wood', quantity: 2 }],
        givesItems: [{ id: 'blessed_candle', quantity: 1 }],
        oneTime: true,
        minTrust: 3,
        successDialogue: 'The candle flame, when lit, burns unusually steady. As if the wind respects it.',
      },
      {
        name: 'Kakure Prayer Scroll',
        description: '"The Orasho. Our prayers. Written down at last — too dangerous to keep, too precious to lose."',
        costGold: 0,
        givesItems: [{ id: 'kakure_prayer_scroll', quantity: 1 }],
        oneTime: true,
        minTrust: 3,
        requiresFlag: 'discovered_hidden_chapel',
        successDialogue: '"Read it. Remember us."',
      },
    ],
    dialogue: {
      greeting_trust0: 'The elder watches you silently. Trust must be earned.',
      greeting_trust1: '"You carry her cross. That means something. What do you need?"',
      greeting_trust2: '"Usagi-san. Welcome to what remains of the Church."',
      greeting_trust3: '"Child of God. What can this old man give you?"',
    },
  });

  // Mountain Craftsman — equipment upgrades
  tradeSystem.registerTrader('mountain_craftsman', {
    name: 'Old Tanaka',
    species: 'badger',
    location: 'mountain_path',
    trustLevel: 1,
    maxTrust: 2,
    trades: [
      {
        name: 'Sharpen Weapon',
        description: '"Let me see that. I can put an edge on it."',
        costGold: 20,
        costItems: [{ id: 'iron_scraps', quantity: 2 }],
        givesItem: null,
        special: 'upgrade_weapon',
        successDialogue: '"Better. Not perfect, but better."',
      },
      {
        name: 'Reinforce Garment',
        description: '"Cloth alone won't stop a blade. Let me add some stiffening."',
        costGold: 15,
        costItems: [{ id: 'fine_cloth', quantity: 1 }],
        givesItem: null,
        special: 'upgrade_garment',
        successDialogue: '"Won't make you a samurai. Might keep you alive."',
      },
      {
        name: 'Smelling Salts',
        description: '"I keep these for the mines. You look like you need them more."',
        costGold: 10,
        givesItems: [{ id: 'smelling_salts', quantity: 2 }],
        successDialogue: '"Don't sniff them for fun. Trust me."',
      },
    ],
    dialogue: {
      greeting_trust0: '"A customer? Out here? ...Fine. I can work."',
      greeting_trust1: '"Ah, the rabbit. Back again. What needs fixing?"',
      greeting_trust2: '"You remind me of my son. He was stubborn too. What do you need?"',
    },
  });
}
