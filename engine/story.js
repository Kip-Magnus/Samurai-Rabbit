/**
 * SAMURAI USAGI — STORY ENGINE
 * ==============================
 * Branching dialogue, act transitions, cutscenes, narrative flow.
 *
 * Design: Every dialogue line can branch based on:
 *   - flags (story progress markers)
 *   - virtues (theological + cardinal)
 *   - vocation (laity vs. religious orders)
 *   - inventory (has specific item?)
 *   - battle count, kill count
 *   - difficulty mode
 *   - random (for flavor variation)
 *
 * Cutscenes are scripted sequences of:
 *   - dialogue lines
 *   - screen transitions (fade, iris, wipe)
 *   - music changes
 *   - flag sets
 *   - virtue changes
 *   - item grants
 *   - battle triggers
 *   - camera moves (future)
 *
 * Act structure follows the Plot Bible rhythm:
 *   Arrival → Immersion → Complication → Dark Moment → Intercession → Resolution
 */


// ═══════════════════════════════════════════════════════════════
// DIALOGUE TREE — Conditional branching conversation
// ═══════════════════════════════════════════════════════════════

export class DialogueTree {
  constructor(dialogueData) {
    this.nodes = {};      // id → node
    this.triggers = [];   // proximity/flag-based triggers

    if (dialogueData) this._index(dialogueData);
  }

  _index(data) {
    // data can be: { conversations: [...], triggers: [...] }
    // or just an array of conversations
    const convos = data.conversations || data;
    if (Array.isArray(convos)) {
      for (const c of convos) {
        if (c.id) this.nodes[c.id] = c;
      }
    }
    if (data.triggers) this.triggers = data.triggers;
  }

  /**
   * Get the dialogue lines for an NPC in the current context.
   * Evaluates conditions and returns the best-matching conversation.
   */
  getDialogue(npcId, context) {
    // Find all conversations for this NPC
    const candidates = Object.values(this.nodes).filter(n =>
      n.npc === npcId || n.id?.startsWith(npcId + '_')
    );

    if (candidates.length === 0) return null;

    // Filter by conditions and pick highest priority
    const valid = candidates
      .filter(c => this._evalConditions(c.conditions, context))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (valid.length === 0) return null;

    const convo = valid[0];

    // Build dialogue lines, evaluating per-line conditions
    return this._buildLines(convo, context);
  }

  /**
   * Get a specific conversation by ID.
   */
  getById(id) {
    return this.nodes[id] || null;
  }

  /**
   * Build the line array for a conversation, handling branches.
   */
  _buildLines(convo, context) {
    if (!convo.lines) return [];

    const result = [];
    for (const line of convo.lines) {
      // Skip lines whose conditions aren't met
      if (line.conditions && !this._evalConditions(line.conditions, context)) continue;

      const built = {
        speaker: line.speaker || convo.speaker || convo.npc,
        text: this._interpolate(line.text, context),
        portrait: line.portrait || convo.portrait,
        emotion: line.emotion || 'neutral',
        speakerColor: line.speakerColor || null,
      };

      // Choices
      if (line.choices) {
        built.choices = line.choices
          .filter(ch => !ch.conditions || this._evalConditions(ch.conditions, context))
          .map(ch => ({
            label: ch.label,
            virtue: ch.virtue || null,
            flag: ch.flag || null,
            next: ch.next || null,
            onChoice: ch.onChoice || null,
            consequence: ch.consequence || null,
          }));
      }

      // Side effects
      if (line.setFlag) built._setFlag = line.setFlag;
      if (line.grantItem) built._grantItem = line.grantItem;
      if (line.virtueChange) built._virtueChange = line.virtueChange;
      if (line.triggerBattle) built._triggerBattle = line.triggerBattle;
      if (line.triggerCutscene) built._triggerCutscene = line.triggerCutscene;

      result.push(built);
    }

    // Conversation-level side effects
    if (convo.onComplete) {
      result.push({ _onComplete: convo.onComplete });
    }

    return result;
  }

  /**
   * Evaluate a conditions object against game context.
   */
  _evalConditions(conditions, ctx) {
    if (!conditions) return true;

    // Flag checks
    if (conditions.flags) {
      for (const [flag, expected] of Object.entries(conditions.flags)) {
        const has = !!ctx.flags?.[flag];
        if (expected === true && !has) return false;
        if (expected === false && has) return false;
      }
    }

    // Act check
    if (conditions.act !== undefined) {
      if (ctx.currentAct !== conditions.act) return false;
    }
    if (conditions.minAct !== undefined) {
      if ((ctx.currentAct || 1) < conditions.minAct) return false;
    }
    if (conditions.maxAct !== undefined) {
      if ((ctx.currentAct || 1) > conditions.maxAct) return false;
    }

    // Virtue checks
    if (conditions.virtues) {
      for (const [virtue, req] of Object.entries(conditions.virtues)) {
        if (typeof req === 'number' && (ctx.virtues?.[virtue] || 0) < req) return false;
        if (typeof req === 'object') {
          if (req.min !== undefined && (ctx.virtues?.[virtue] || 0) < req.min) return false;
          if (req.max !== undefined && (ctx.virtues?.[virtue] || 0) > req.max) return false;
        }
      }
    }

    // Vocation check
    if (conditions.vocation !== undefined) {
      if (ctx.vocation !== conditions.vocation) return false;
    }

    // Item check
    if (conditions.hasItem) {
      const items = Array.isArray(conditions.hasItem) ? conditions.hasItem : [conditions.hasItem];
      for (const itemId of items) {
        if (!ctx.inventory?.some(i => i.id === itemId)) return false;
      }
    }

    // Battle count
    if (conditions.minBattles !== undefined) {
      if ((ctx.battleCount || 0) < conditions.minBattles) return false;
    }

    // Kill count (pacifist check)
    if (conditions.maxKills !== undefined) {
      if ((ctx.killCount || 0) > conditions.maxKills) return false;
    }

    // Difficulty
    if (conditions.difficulty) {
      if (ctx.difficulty !== conditions.difficulty) return false;
    }

    // Random chance
    if (conditions.chance !== undefined) {
      if (Math.random() > conditions.chance) return false;
    }

    return true;
  }

  /**
   * Interpolate text variables: {playerName}, {virtue:faith}, etc.
   */
  _interpolate(text, ctx) {
    if (!text) return '';
    return text
      .replace(/{playerName}/g, ctx.player?.name || 'Usagi')
      .replace(/{level}/g, ctx.player?.level || 1)
      .replace(/{virtue:(\w+)}/g, (_, v) => (ctx.virtues?.[v] || 0).toFixed(0))
      .replace(/{flag:(\w+)}/g, (_, f) => ctx.flags?.[f] ? 'true' : 'false')
      .replace(/{area}/g, ctx.currentArea || '?')
      .replace(/{difficulty}/g, ctx.difficulty || 'disciple');
  }
}


// ═══════════════════════════════════════════════════════════════
// CUTSCENE ENGINE — Scripted sequences
// ═══════════════════════════════════════════════════════════════

export class CutsceneEngine {
  constructor(events, uiManager) {
    this.events = events;
    this.ui = uiManager;
    this.active = false;
    this.steps = [];
    this.stepIndex = 0;
    this.waitingForInput = false;
    this._resolve = null;
  }

  /**
   * Play a cutscene. Returns a promise that resolves when complete.
   * @param {Array} steps - Array of cutscene step objects
   */
  async play(steps) {
    this.active = true;
    this.steps = steps;
    this.stepIndex = 0;

    for (let i = 0; i < steps.length; i++) {
      this.stepIndex = i;
      await this._executeStep(steps[i]);
    }

    this.active = false;
  }

  async _executeStep(step) {
    switch (step.type) {
      case 'dialogue':
        return this._stepDialogue(step);
      case 'fade_out':
        return this.ui?.fadeOut(step.duration || 0.5, step.color);
      case 'fade_in':
        return this.ui?.fadeIn(step.duration || 0.5, step.color);
      case 'iris_out':
        return this.ui?.irisOut(step.cx, step.cy, step.duration || 0.6);
      case 'iris_in':
        return this.ui?.irisIn(step.cx, step.cy, step.duration || 0.6);
      case 'wipe':
        return this.ui?.wipe(step.direction, step.duration || 0.4);
      case 'music':
        this.events?.emit('change_music', { mood: step.mood });
        return;
      case 'sfx':
        this.events?.emit('play_sfx', { id: step.id });
        return;
      case 'wait':
        return new Promise(r => setTimeout(r, (step.duration || 1) * 1000));
      case 'set_flag':
        this.events?.emit('set_flag', step.flag);
        return;
      case 'set_flags':
        for (const flag of step.flags) this.events?.emit('set_flag', flag);
        return;
      case 'virtue_change':
        this.events?.emit('virtue_change', step.changes);
        return;
      case 'grant_item':
        this.events?.emit('grant_item', { id: step.itemId, quantity: step.quantity || 1, quality: step.quality });
        if (this.ui) this.ui.notify(`Obtained: ${step.itemName || step.itemId}`);
        return;
      case 'heal':
        this.events?.emit('full_heal', {});
        return;
      case 'battle':
        return new Promise(resolve => {
          this.events?.emit('battle_start', { enemies: step.enemies, options: step.options || {} });
          this.events?.once?.('battle_ended', () => resolve());
        });
      case 'transition':
        this.events?.emit('area_transition', { targetArea: step.area, direction: step.direction });
        return new Promise(r => setTimeout(r, 500));
      case 'advance_act':
        this.events?.emit('advance_act', { act: step.act });
        return;
      case 'notify':
        if (this.ui) this.ui.notify(step.text, step.color);
        return new Promise(r => setTimeout(r, 1000));
      case 'choice':
        return this._stepChoice(step);
    }
  }

  _stepDialogue(step) {
    return new Promise(resolve => {
      const lines = Array.isArray(step.lines) ? step.lines : [{ speaker: step.speaker, text: step.text, portrait: step.portrait, emotion: step.emotion }];
      this.ui?.openDialogue(lines, { onComplete: resolve });
    });
  }

  _stepChoice(step) {
    return new Promise(resolve => {
      const lines = [{
        speaker: step.speaker || '',
        text: step.prompt || '',
        choices: step.options.map(opt => ({
          label: opt.label,
          virtue: opt.virtue || null,
          flag: opt.flag || null,
          onChoice: (choice) => {
            if (opt.consequence) this.events?.emit('consequence', opt.consequence);
            resolve(opt);
          },
        })),
      }];
      this.ui?.openDialogue(lines, { onComplete: () => resolve(null) });
    });
  }
}


// ═══════════════════════════════════════════════════════════════
// ACT MANAGER — Story progression
// ═══════════════════════════════════════════════════════════════

export class ActManager {
  constructor(bookData, events) {
    this.bookData = bookData;
    this.events = events;
    this.currentAct = 1;
    this.actHistory = [];
  }

  /**
   * Check if the player can advance to the next act.
   */
  canAdvance(context) {
    const acts = this.bookData?.acts || [];
    const current = acts.find(a => a.act === this.currentAct);
    if (!current?.advance_conditions) return false;

    const conds = current.advance_conditions;
    if (conds.flags) {
      for (const flag of conds.flags) {
        if (!context.flags?.[flag]) return false;
      }
    }
    if (conds.minLevel && (context.player?.level || 1) < conds.minLevel) return false;
    if (conds.minVirtue) {
      const total = Object.values(context.virtues || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
      if (total < conds.minVirtue) return false;
    }
    return true;
  }

  /**
   * Advance to the next act. Returns the act transition cutscene.
   */
  advance(context) {
    const acts = this.bookData?.acts || [];
    const nextActNum = this.currentAct + 1;
    const nextAct = acts.find(a => a.act === nextActNum);

    if (!nextAct) return null;

    this.actHistory.push(this.currentAct);
    this.currentAct = nextActNum;

    this.events?.emit('act_changed', { act: nextActNum, data: nextAct });

    return nextAct.transition_cutscene || null;
  }

  /**
   * Get current act data.
   */
  getCurrentAct() {
    const acts = this.bookData?.acts || [];
    return acts.find(a => a.act === this.currentAct) || null;
  }
}


// ═══════════════════════════════════════════════════════════════
// TRIGGER SYSTEM — Proximity and flag-based story triggers
// ═══════════════════════════════════════════════════════════════

export class TriggerSystem {
  constructor(events) {
    this.events = events;
    this.triggers = [];
    this.fired = new Set();  // One-shot triggers that have already fired
  }

  /**
   * Register triggers from area data.
   */
  loadAreaTriggers(triggers) {
    this.triggers = triggers || [];
  }

  /**
   * Check triggers against current position and context.
   * Called every player movement step.
   */
  check(playerX, playerY, context) {
    const results = [];

    for (const trigger of this.triggers) {
      // Skip already-fired one-shots
      if (trigger.once && this.fired.has(trigger.id)) continue;

      // Position check
      if (trigger.x !== undefined && trigger.y !== undefined) {
        if (playerX !== trigger.x || playerY !== trigger.y) continue;
      }
      if (trigger.radius) {
        const dx = playerX - (trigger.x || 0);
        const dy = playerY - (trigger.y || 0);
        if (Math.sqrt(dx * dx + dy * dy) > trigger.radius) continue;
      }

      // Condition check
      if (trigger.conditions) {
        if (trigger.conditions.flags) {
          let pass = true;
          for (const [f, v] of Object.entries(trigger.conditions.flags)) {
            if (!!context.flags?.[f] !== v) { pass = false; break; }
          }
          if (!pass) continue;
        }
        if (trigger.conditions.act && context.currentAct !== trigger.conditions.act) continue;
        if (trigger.conditions.minAct && (context.currentAct || 1) < trigger.conditions.minAct) continue;
      }

      // Fire!
      if (trigger.once) this.fired.add(trigger.id);
      results.push(trigger);
    }

    return results;
  }

  /**
   * Reset triggers for a new area.
   */
  reset() {
    // Keep fired set (persists across areas for one-shot triggers)
    this.triggers = [];
  }
}


// ═══════════════════════════════════════════════════════════════
// BOOK ZERO STORY — Complete narrative flow
// ═══════════════════════════════════════════════════════════════

export const BOOK_ZERO_ACTS = {
  acts: [
    {
      act: 1,
      title: 'The Hidden Faith',
      subtitle: 'Kurosaki Village, 1587',
      description: 'A quiet morning in the village. Obaa-chan has asked you to meet her at the chapel.',
      areas_available: ['kurosaki_village', 'village_outskirts', 'coastal_path'],
      advance_conditions: {
        flags: ['visited_chapel', 'spoke_obaa_chan_act1', 'received_cross'],
      },
      transition_cutscene: [
        { type: 'fade_out', duration: 1 },
        { type: 'dialogue', speaker: 'Narrator', text: 'That night, the wind carries smoke from the south. The Shimabara road is burning.' },
        { type: 'set_flag', flag: { id: 'act2_begin', value: true } },
        { type: 'music', mood: 'tension' },
        { type: 'fade_in', duration: 1 },
        { type: 'advance_act', act: 2 },
      ],
    },
    {
      act: 2,
      title: 'The Persecution',
      subtitle: 'Fear and faithfulness',
      description: 'Soldiers have been spotted on the coastal road. The hidden Christians must decide what to do.',
      areas_available: ['kurosaki_village', 'village_outskirts', 'bamboo_forest', 'hidden_chapel', 'coastal_path'],
      advance_conditions: {
        flags: ['spoke_father_tomas', 'discovered_hidden_chapel', 'soldiers_sighted'],
      },
      transition_cutscene: [
        { type: 'fade_out', duration: 0.5 },
        { type: 'dialogue', speaker: 'Villager', text: 'The chapel! They found the chapel! It is burning!' },
        { type: 'sfx', id: 'accuser' },
        { type: 'music', mood: 'tension' },
        { type: 'fade_in', duration: 0.5 },
        { type: 'advance_act', act: 3 },
      ],
    },
    {
      act: 3,
      title: 'The Burning',
      subtitle: 'Fire and choice',
      description: 'The chapel burns. Obaa-chan is inside. Captain Hideki hunts for the hidden Christians.',
      areas_available: ['kurosaki_village', 'bamboo_forest', 'burning_chapel', 'hidden_chapel', 'coastal_path'],
      advance_conditions: {
        flags: ['chapel_fire_survived', 'obaa_chan_saved_or_lost', 'beat_captain_hideki'],
      },
      transition_cutscene: [
        { type: 'fade_out', duration: 1.5 },
        { type: 'dialogue', speaker: 'Narrator', text: 'The ashes cool. The village is changed forever. But the cross remains warm in your hands.' },
        { type: 'dialogue', speaker: 'Narrator', text: 'The mountain calls. Something waits at the summit — something that has been waiting for a very long time.' },
        { type: 'music', mood: 'sorrow' },
        { type: 'wait', duration: 2 },
        { type: 'fade_in', duration: 1 },
        { type: 'advance_act', act: 4 },
      ],
    },
    {
      act: 4,
      title: 'The Calling',
      subtitle: 'The mountain. The Accuser. The choice.',
      description: 'Alone on the mountain, Usagi faces the Accuser — and hears the voice of the Messenger.',
      areas_available: ['mountain_path', 'mountain_summit'],
      advance_conditions: {
        flags: ['beat_the_accuser_b00', 'received_pilgrims_blade'],
      },
      transition_cutscene: [
        { type: 'fade_out', duration: 2 },
        { type: 'music', mood: 'sacred' },
        { type: 'dialogue', speaker: 'The Messenger', text: 'You have been chosen. Not because you are strong, but because you said yes.' },
        { type: 'dialogue', speaker: 'The Messenger', text: 'The prayers of the faithful echo across centuries. Someone must answer them.' },
        { type: 'grant_item', itemId: 'pilgrims_blade', quality: 5, itemName: "Pilgrim's Blade" },
        { type: 'dialogue', speaker: 'The Messenger', text: 'Take up this blade. It was forged from the prayers of a grandmother who never stopped believing.' },
        { type: 'dialogue', speaker: 'Usagi', text: '...Where am I going?' },
        { type: 'dialogue', speaker: 'The Messenger', text: 'Rome. 64 A.D. The fire is already burning. The faithful need you.' },
        { type: 'iris_out', cx: 160, cy: 120, duration: 1.5 },
        { type: 'wait', duration: 1 },
        { type: 'notify', text: 'BOOK ZERO — COMPLETE' },
        { type: 'set_flag', flag: { id: 'book_00_complete', value: true } },
      ],
    },
  ],
};


// ═══════════════════════════════════════════════════════════════
// BOOK ZERO DIALOGUE — Key NPC conversations
// ═══════════════════════════════════════════════════════════════

export const BOOK_ZERO_DIALOGUE = {
  conversations: [
    // ── ACT 1: Obaa-chan ──
    {
      id: 'obaa_chan_act1_greeting',
      npc: 'obaa_chan',
      conditions: { act: 1, flags: { spoke_obaa_chan_act1: false } },
      priority: 10,
      speaker: 'Obaa-chan',
      portrait: 'O',
      lines: [
        { speaker: 'Obaa-chan', text: 'Good morning, little one. Did you say your prayers?', emotion: 'warm' },
        { speaker: 'Usagi', text: 'Yes, Obaa-chan. Three times, like you taught me.' },
        { speaker: 'Obaa-chan', text: 'Good. Listen... I need you to go to the chapel today. There is something I have been keeping for you.', emotion: 'serious' },
        { speaker: 'Obaa-chan', text: "Take the path through the outskirts. Don't let anyone see you go east.", emotion: 'worried' },
        { speaker: 'Obaa-chan', text: "And {playerName}... if you see soldiers on the road, hide. Don't be brave. Be alive.", emotion: 'stern' },
        {
          speaker: 'Usagi', text: "What's at the chapel?",
          choices: [
            { label: '"I understand. I will be careful."', virtue: { prudence: 0.5 }, flag: { id: 'spoke_obaa_chan_act1', value: true } },
            { label: '"Why do we have to hide our faith?"', virtue: { justice: 0.5 }, flag: { id: 'spoke_obaa_chan_act1', value: true } },
          ],
        },
        { speaker: 'Obaa-chan', text: 'Something that has been waiting for you since before you were born.', emotion: 'mysterious' },
        { setFlag: { id: 'spoke_obaa_chan_act1', value: true } },
      ],
    },
    {
      id: 'obaa_chan_act1_return',
      npc: 'obaa_chan',
      conditions: { act: 1, flags: { spoke_obaa_chan_act1: true, received_cross: false } },
      priority: 5,
      speaker: 'Obaa-chan',
      portrait: 'O',
      lines: [
        { speaker: 'Obaa-chan', text: 'Go to the chapel, child. Through the forest, east of the outskirts. Hurry.' },
      ],
    },
    {
      id: 'obaa_chan_act1_after_cross',
      npc: 'obaa_chan',
      conditions: { act: 1, flags: { received_cross: true } },
      priority: 8,
      speaker: 'Obaa-chan',
      portrait: 'O',
      lines: [
        { speaker: 'Obaa-chan', text: 'You found it. I can feel its warmth from here.', emotion: 'relieved' },
        { speaker: 'Obaa-chan', text: 'That cross has been in our family since the first missionaries came. It has... special properties.', emotion: 'serious' },
        { speaker: 'Obaa-chan', text: 'When you hold it, you can sense things that are hidden. Sacred things. Dangerous things.' },
        { speaker: 'Obaa-chan', text: 'Guard it with your life, {playerName}. It cannot be replaced.' },
      ],
    },

    // ── ACT 1: Ichiro ──
    {
      id: 'ichiro_act1',
      npc: 'ichiro',
      conditions: { act: 1 },
      priority: 5,
      speaker: 'Ichiro',
      portrait: 'I',
      lines: [
        { speaker: 'Ichiro', text: "Morning, Usagi. Heading out? There's wild boar in the outskirts again.", emotion: 'casual' },
        { speaker: 'Ichiro', text: "I've got supplies if you need anything. Nothing fancy — we're not exactly merchants out here.", emotion: 'friendly' },
      ],
    },

    // ── ACT 2: Father Tomas ──
    {
      id: 'father_tomas_act2',
      npc: 'father_tomas',
      conditions: { act: 2, flags: { spoke_father_tomas: false } },
      priority: 10,
      speaker: 'Father Tomas',
      portrait: 'T',
      lines: [
        { speaker: 'Father Tomas', text: '{playerName}. I was hoping you would come.', emotion: 'grave' },
        { speaker: 'Father Tomas', text: 'Soldiers have been spotted on the coastal road. They are searching for Christians.', emotion: 'worried' },
        { speaker: 'Father Tomas', text: 'I have hidden the sacraments. But the chapel... they may find it.', emotion: 'afraid' },
        {
          speaker: 'Father Tomas', text: 'What should we do?',
          choices: [
            { label: '"We should warn the others and hide."', virtue: { prudence: 1 }, flag: { id: 'chose_hide', value: true } },
            { label: '"We should stand and defend our faith."', virtue: { fortitude: 1 }, flag: { id: 'chose_defend', value: true } },
            { label: '"Let us pray. God will guide us."', virtue: { faith: 1 }, flag: { id: 'chose_pray', value: true } },
          ],
        },
        { speaker: 'Father Tomas', text: 'Yes... I think you are right. May God protect us all.', setFlag: { id: 'spoke_father_tomas', value: true } },
      ],
    },

    // ── ACT 2: Hidden Chapel discovery ──
    {
      id: 'hidden_chapel_discovery',
      npc: 'kakure_elder',
      conditions: { act: 2, flags: { discovered_hidden_chapel: false } },
      priority: 10,
      speaker: 'Kakure Elder',
      portrait: 'E',
      lines: [
        { speaker: 'Kakure Elder', text: 'You found us. The cross led you, as it always does.', emotion: 'calm' },
        { speaker: 'Kakure Elder', text: 'This is the true chapel — hidden beneath the bamboo for three generations.', emotion: 'reverent' },
        { speaker: 'Kakure Elder', text: "Here, the Blessed Sacrament is kept. Here, the faith endures.", emotion: 'solemn' },
        { speaker: 'Kakure Elder', text: "Take some holy water, child. You will need it where you are going.", emotion: 'prophetic' },
        { setFlag: { id: 'discovered_hidden_chapel', value: true } },
        { grantItem: { id: 'holy_water_vial', quantity: 3 } },
      ],
    },

    // ── ACT 3: Burning Chapel ──
    {
      id: 'burning_chapel_obaa',
      npc: 'obaa_chan',
      conditions: { act: 3, flags: { obaa_chan_saved_or_lost: false } },
      priority: 20,
      speaker: 'Obaa-chan',
      portrait: 'O',
      lines: [
        { speaker: 'Obaa-chan', text: '{playerName}! You came...', emotion: 'weak' },
        { speaker: 'Obaa-chan', text: 'The soldiers... they set the fire. I could not leave. The Blessed Sacrament was here...', emotion: 'pained' },
        { speaker: 'Obaa-chan', text: 'I saved the Host. I consumed it before the fire reached the altar. It is safe inside me now.', emotion: 'peaceful' },
        {
          speaker: 'Obaa-chan', text: 'Listen to me, child. This is important.',
          choices: [
            { label: '"We need to get you out of here!"', virtue: { charity: 1 }, consequence: { attempt_rescue: true } },
            { label: '"Tell me what you need to tell me."', virtue: { temperance: 0.5 } },
          ],
        },
        { speaker: 'Obaa-chan', text: 'The cross you carry... it is more than it seems. It has been waiting for someone worthy.', emotion: 'urgent' },
        { speaker: 'Obaa-chan', text: 'When the time comes — and it will come — go to the mountain. The summit. Alone.', emotion: 'prophetic' },
        { speaker: 'Obaa-chan', text: 'Something will meet you there. Something that has been praying for you across centuries.', emotion: 'transcendent' },
        { speaker: 'Obaa-chan', text: 'I love you, {playerName}. I have always been proud of you.', emotion: 'love' },
        { setFlag: { id: 'obaa_chan_saved_or_lost', value: true } },
        { virtueChange: { faith: 1, hope: 1, charity: 0.5 } },
      ],
    },

    // ── ACT 4: The Messenger ──
    {
      id: 'messenger_summit',
      npc: 'the_messenger',
      conditions: { act: 4, flags: { beat_the_accuser_b00: true } },
      priority: 20,
      speaker: 'The Messenger',
      portrait: 'M',
      speakerColor: '#ffd700',
      lines: [
        { speaker: 'The Messenger', text: 'You endured. That is rarer than you know.', emotion: 'gentle' },
        { speaker: 'Usagi', text: 'Who... what are you?' },
        { speaker: 'The Messenger', text: "I am a messenger. Nothing more. The message is what matters.", emotion: 'luminous' },
        { speaker: 'The Messenger', text: "The prayers of the faithful echo across time. Your grandmother's prayer among them.", emotion: 'reverent' },
        { speaker: 'The Messenger', text: "She prayed every night that God would send someone to protect the faithful in their darkest hours.", emotion: 'warm' },
        { speaker: 'The Messenger', text: "God's answer is you.", emotion: 'solemn' },
        { speaker: 'Usagi', text: "I'm just a farmer. I grow rice. I'm not..." },
        { speaker: 'The Messenger', text: "Peter was a fisherman. David was a shepherd. God does not call the qualified. He qualifies the called.", emotion: 'firm' },
        {
          speaker: 'The Messenger', text: 'Will you answer?',
          choices: [
            { label: '"Yes. I will go."', virtue: { faith: 2, hope: 1 }, flag: { id: 'accepted_calling', value: true } },
            { label: '"I am afraid. But... yes."', virtue: { fortitude: 2, hope: 1 }, flag: { id: 'accepted_calling_afraid', value: true } },
          ],
        },
        { speaker: 'The Messenger', text: "Then take this blade. It was forged from your grandmother's prayers.", emotion: 'gift' },
        { grantItem: { id: 'pilgrims_blade', quality: 5 } },
        { setFlag: { id: 'received_pilgrims_blade', value: true } },
        { speaker: 'The Messenger', text: "Rome. 64 A.D. The faithful are being burned alive. They need you now.", emotion: 'urgent' },
      ],
    },

    // ── Accuser pre-fight ──
    {
      id: 'accuser_summit_prefight',
      npc: 'the_accuser',
      conditions: { act: 4, flags: { beat_the_accuser_b00: false } },
      priority: 20,
      speaker: 'The Accuser',
      portrait: 'A',
      speakerColor: '#cc3333',
      lines: [
        { speaker: '???', text: "You came. I knew you would.", emotion: 'calm' },
        { speaker: '???', text: "Your grandmother prayed so hard. Every night. For years.", emotion: 'sympathetic' },
        { speaker: '???', text: "And God let the soldiers come anyway. He let the chapel burn. He let her suffer.", emotion: 'insinuating' },
        { speaker: 'The Accuser', text: "What kind of God does that, little rabbit?", emotion: 'gentle_menace' },
        { speaker: 'Usagi', text: 'Who are you?' },
        { speaker: 'The Accuser', text: "I am the one who asks the questions no one else will ask. I am the Accuser.", emotion: 'reveal' },
        { speaker: 'The Accuser', text: "And my question for you is simple: Why bother?", emotion: 'piercing' },
        { triggerBattle: { enemies: ['the_accuser'], options: { boss: true, isAccuser: true } } },
      ],
    },
  ],
};
