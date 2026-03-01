/**
 * SAMURAI USAGI — TUTORIAL SYSTEM
 * ==================================
 * Teaches gameplay through narrative, not pop-ups.
 *
 * Design philosophy:
 *   - Never break immersion
 *   - Obaa-chan IS the tutorial
 *   - Each mechanic is taught by encountering it naturally
 *   - Hints are subtle HUD indicators, not modal windows
 *   - Player learns by doing, not reading
 *
 * Tutorial flow (first 10 minutes):
 *   1. Opening dialogue → teaches dialogue + choices
 *   2. Walk to outskirts → teaches movement
 *   3. First encounter → teaches combat basics
 *   4. Low HP after fight → teaches items
 *   5. Find chapel → teaches save points
 *   6. Receive cross → teaches equipment
 *   7. Return to Obaa-chan → teaches NPC re-interaction
 *   8. First miracle available → teaches prayer system
 *   9. Virtue screen hint → teaches virtue system
 *  10. Act transition → teaches story progression
 */


// ═══════════════════════════════════════════════════════════════
// TUTORIAL STATE
// ═══════════════════════════════════════════════════════════════

export class TutorialManager {
  constructor(events) {
    this.events = events;
    this.completed = new Set();
    this.active = true;
    this.hints = [];
    this.currentHint = null;
    this.hintTimer = 0;
    this.stepQueue = [];
  }

  /**
   * Check if a tutorial step should trigger based on game state.
   * Called by the game loop every frame.
   */
  check(context) {
    if (!this.active) return;

    const steps = TUTORIAL_STEPS;
    for (const step of steps) {
      if (this.completed.has(step.id)) continue;
      if (this._evalTrigger(step.trigger, context)) {
        this._fire(step, context);
        this.completed.add(step.id);
      }
    }
  }

  _evalTrigger(trigger, ctx) {
    if (!trigger) return false;

    if (trigger.onGameStart && ctx.battleCount === 0 && !ctx.flags?.tutorial_started) return true;
    if (trigger.onFirstMove && ctx.flags?.tutorial_started && !ctx.flags?.tutorial_moved) return true;
    if (trigger.onFirstEncounter && ctx.battleCount === 1 && !ctx.flags?.tutorial_first_battle) return true;
    if (trigger.onLowHP && ctx.player?.hp < ctx.player?.maxHp * 0.5 && !ctx.flags?.tutorial_items) return true;
    if (trigger.onSavePoint && ctx.flags?.reached_save_point && !ctx.flags?.tutorial_save) return true;
    if (trigger.onEquipment && ctx.flags?.received_cross && !ctx.flags?.tutorial_equip) return true;
    if (trigger.onMiracleAvailable && (ctx.virtues?.faith || 0) >= 1 && ctx.battleCount >= 2 && !ctx.flags?.tutorial_miracle) return true;
    if (trigger.onVirtueGain && ctx.flags?.tutorial_first_battle && !ctx.flags?.tutorial_virtues) return true;
    if (trigger.onAreaTransition && ctx.flags?.tutorial_moved && !ctx.flags?.tutorial_areas) return true;
    if (trigger.onTrader && ctx.flags?.tutorial_areas && !ctx.flags?.tutorial_trade) return true;
    if (trigger.flag && ctx.flags?.[trigger.flag]) return true;

    return false;
  }

  _fire(step, context) {
    if (step.type === 'dialogue') {
      this.events?.emit('tutorial_dialogue', { lines: step.lines });
    } else if (step.type === 'hint') {
      this.showHint(step.text, step.duration || 5);
    } else if (step.type === 'flag') {
      this.events?.emit('set_flag', { id: step.flag, value: true });
    }

    // Always set associated flags
    if (step.setsFlag) {
      this.events?.emit('set_flag', { id: step.setsFlag, value: true });
    }
  }

  /**
   * Show a non-intrusive hint at the top of the screen.
   */
  showHint(text, duration = 4) {
    this.currentHint = { text, age: 0, duration };
  }

  update(dt) {
    if (this.currentHint) {
      this.currentHint.age += dt;
      if (this.currentHint.age >= this.currentHint.duration) {
        this.currentHint = null;
      }
    }
  }

  /**
   * Render hint overlay.
   */
  render(ctx) {
    if (!this.currentHint) return;

    const h = this.currentHint;
    const alpha = Math.min(1, h.age / 0.3) * Math.min(1, (h.duration - h.age) / 0.5);

    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = '#0f0e17';
    ctx.fillRect(0, 20, 320, 18);
    ctx.fillStyle = '#c9a95966';
    ctx.fillRect(0, 38, 320, 1);

    ctx.fillStyle = '#c9a959';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(h.text, 160, 32);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  /**
   * Mark all tutorials complete (for returning players).
   */
  skipAll() {
    this.active = false;
  }

  /**
   * Serialize for save.
   */
  toJSON() {
    return { completed: [...this.completed], active: this.active };
  }

  static fromSave(data, events) {
    const t = new TutorialManager(events);
    if (data) {
      t.completed = new Set(data.completed || []);
      t.active = data.active !== false;
    }
    return t;
  }
}


// ═══════════════════════════════════════════════════════════════
// TUTORIAL STEPS — Ordered sequence of lessons
// ═══════════════════════════════════════════════════════════════

const TUTORIAL_STEPS = [
  // 1. Game start — opening dialogue handles this
  {
    id: 'tutorial_start',
    trigger: { onGameStart: true },
    type: 'flag',
    setsFlag: 'tutorial_started',
  },

  // 2. Movement
  {
    id: 'tutorial_movement',
    trigger: { onFirstMove: true },
    type: 'hint',
    text: 'Arrow keys or swipe to move. Walk to the village outskirts (east).',
    duration: 6,
    setsFlag: 'tutorial_moved',
  },

  // 3. Area transition
  {
    id: 'tutorial_areas',
    trigger: { onAreaTransition: true },
    type: 'hint',
    text: 'You can travel between areas through the paths at the edges.',
    duration: 5,
    setsFlag: 'tutorial_areas',
  },

  // 4. First battle
  {
    id: 'tutorial_combat',
    trigger: { onFirstEncounter: true },
    type: 'dialogue',
    setsFlag: 'tutorial_first_battle',
    lines: [
      {
        speaker: 'Tutorial',
        text: 'COMBAT: Choose actions each turn. Attack deals physical damage. Pray uses miracles (costs MP). Guard halves damage taken. Items heal or cure.',
        emotion: 'neutral',
      },
      {
        speaker: 'Tutorial',
        text: 'TIP: Spiritual enemies (glowing purple) resist physical attacks but are weak to holy damage from Pray.',
        emotion: 'neutral',
      },
    ],
  },

  // 5. Low HP — items
  {
    id: 'tutorial_items',
    trigger: { onLowHP: true },
    type: 'hint',
    text: 'Low HP! Use ⚗ Item in battle, or open Menu (ESC/☰) to use items.',
    duration: 6,
    setsFlag: 'tutorial_items',
  },

  // 6. Save point
  {
    id: 'tutorial_save',
    trigger: { onSavePoint: true },
    type: 'hint',
    text: '💾 Save Point! Walk over the golden cross to save your progress.',
    duration: 5,
    setsFlag: 'tutorial_save',
  },

  // 7. Equipment
  {
    id: 'tutorial_equipment',
    trigger: { onEquipment: true },
    type: 'dialogue',
    setsFlag: 'tutorial_equip',
    lines: [
      {
        speaker: 'Tutorial',
        text: "New equipment! Open Menu → Equipment to equip items. Each has a quality grade that affects stats.",
        emotion: 'neutral',
      },
      {
        speaker: 'Tutorial',
        text: "Obaa-chan's Cross detects hidden items. Relics have unique passive abilities.",
        emotion: 'neutral',
      },
    ],
  },

  // 8. Miracles
  {
    id: 'tutorial_miracles',
    trigger: { onMiracleAvailable: true },
    type: 'dialogue',
    setsFlag: 'tutorial_miracle',
    lines: [
      {
        speaker: 'Tutorial',
        text: 'MIRACLES: Your virtues unlock prayers. In battle, choose Pray to use them. They cost MP.',
        emotion: 'neutral',
      },
      {
        speaker: 'Tutorial',
        text: 'Lux Aeterna deals holy damage. Ave Maria heals. Scutum Fidei raises defense. Higher virtue = stronger miracles.',
        emotion: 'neutral',
      },
    ],
  },

  // 9. Virtues
  {
    id: 'tutorial_virtues',
    trigger: { onVirtueGain: true },
    type: 'hint',
    text: 'Virtue gained! Open Menu → Virtues to see your spiritual growth. Virtues unlock miracles and resist status effects.',
    duration: 7,
    setsFlag: 'tutorial_virtues',
  },

  // 10. Trading
  {
    id: 'tutorial_trade',
    trigger: { onTrader: true },
    type: 'hint',
    text: "Stand near an NPC to interact. Traders exchange materials and gold — not shops.",
    duration: 5,
    setsFlag: 'tutorial_trade',
  },
];


// ═══════════════════════════════════════════════════════════════
// ONBOARDING CUTSCENE — The very first thing the player sees
// ═══════════════════════════════════════════════════════════════

export const OPENING_CUTSCENE = [
  { type: 'fade_in', duration: 0, color: '#000000' },
  { type: 'wait', duration: 0.5 },
  { type: 'dialogue', speaker: '', text: 'Shimabara Peninsula, Japan.', emotion: 'neutral' },
  { type: 'dialogue', speaker: '', text: '1587 A.D. — The year Toyotomi Hideyoshi orders the expulsion of all Christian missionaries.' },
  { type: 'dialogue', speaker: '', text: 'In a small fishing village on the coast, the faithful worship in secret.' },
  { type: 'dialogue', speaker: '', text: 'They call themselves kakure kirishitan — hidden Christians.' },
  { type: 'wait', duration: 0.5 },
  { type: 'fade_in', duration: 1.5 },
  { type: 'music', mood: 'exploration' },
  { type: 'dialogue', speaker: 'Obaa-chan', text: '{playerName}! Wake up, child. The rice will not tend itself.', portrait: 'O', emotion: 'warm' },
  { type: 'dialogue', speaker: 'Obaa-chan', text: 'Before you go to the fields... come see me at the chapel today. There is something I must give you.', portrait: 'O', emotion: 'serious' },
  { type: 'dialogue', speaker: 'Obaa-chan', text: 'Something I have kept hidden for many years. It is time.', portrait: 'O', emotion: 'mysterious' },
];


// ═══════════════════════════════════════════════════════════════
// NEW GAME + RETURNING PLAYER
// ═══════════════════════════════════════════════════════════════

export function shouldShowTutorial(saveData) {
  // Show tutorial for new games, skip for returning players
  if (!saveData) return true;
  if (saveData.battleCount > 5) return false;
  if (saveData.flags?.tutorial_equip) return false;
  return true;
}
