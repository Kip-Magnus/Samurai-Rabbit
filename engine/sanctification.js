/**
 * SAMURAI USAGI — THE SANCTIFICATION ENGINE
 * ============================================
 *
 * THE CORE INSIGHT:
 *   As Usagi grows in holiness, the game itself transforms.
 *   A low-holiness player fights soldiers with a katana.
 *   A high-holiness player kneels in prayer while Saint Michael
 *   materializes in luminous splendor to shatter a demon.
 *
 *   Same battle. Same enemy. Completely different experience.
 *   The game you play depends on WHO YOU HAVE BECOME.
 *
 * THREE SYSTEMS:
 *
 *   1. HOLINESS PERCEPTION
 *      - Total holiness score = logarithmic(sum of 7 virtues + SPR/10)
 *      - Logarithmic scaling: early mercy matters most, late mercy still matters
 *      - Book soft caps prevent outpacing the story
 *      - As holiness rises, the world transforms visually:
 *        Phase 0 (0-14):  Material — soldiers, beasts, bandits
 *        Phase 1 (15-29): Veil Thinning — shadows behind enemies, whispers
 *        Phase 2 (30-49): Dual Sight — see the demon AND the human simultaneously
 *        Phase 3 (50-74): Spiritual Sight — demons fully visible, human shells fade
 *        Phase 4 (75+):   Transfigured Vision — the spiritual plane dominates,
 *                         angels visible, the Accuser's true form revealed
 *
 *   2. SAINT INTERCESSION COMBAT
 *      - At Holiness Phase 2+, Usagi can PRAY instead of ATTACK
 *      - Praying calls a Saint based on the situation, Usagi's virtues,
 *        and the enemy type
 *      - The Saint materializes and fights — Usagi becomes the prayer support
 *      - Each Saint has unique visual design, moveset, and personality
 *      - Boss battles at Phase 3+ become cinematic: Usagi kneels,
 *        light fills the screen, and a Saint descends
 *
 *   3. HOLINESS vs MARTIAL DUAL TREE
 *      - Every player implicitly walks one of two paths:
 *        MARTIAL: high ATK, weapon skills, direct combat
 *        SANCTIFIED: high SPR, virtue skills, saint intercession
 *      - The game doesn't force a choice — it reads your play style
 *      - A balanced player gets a mix of both
 *      - A pure martial player never sees saints fight (but CAN at endgame)
 *      - A pure holiness player barely swings a sword after Book III
 */


// ═══════════════════════════════════════════════════════════════
// HOLINESS SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// HOLINESS PROGRESSION CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Book soft caps for holiness.
 * Holiness ABOVE the cap for the current book gets severely diminished.
 * This ensures the holiness arc matches the story arc.
 *
 * A player showing mercy at every opportunity will roughly track:
 *   Book 0: holiness ~5-10   (material, just starting)
 *   Book 1: holiness ~10-15  (approaching Phase 1)
 *   Book 2: holiness ~15-20  (Phase 1 — veil thinning)
 *   Book 3: holiness ~20-28  (deep Phase 1, approaching Phase 2)
 *   Book 4: holiness ~28-35  (Phase 2 — dual sight)
 *   Book 5: holiness ~35-45  (deep Phase 2, approaching Phase 3)
 *   Book 6: holiness ~45-55  (Phase 3 — spiritual sight)
 *   Book 7: holiness ~55-65  (deep Phase 3)
 *   Book 8: holiness ~65-80  (Phase 4 — transfigured)
 *   Final:  holiness ~80-100 (full transfiguration)
 *
 * A mixed player (some mercy, some killing) tracks ~60% of this.
 * A no-mercy player stays in Phase 0-1 the entire game.
 */
const BOOK_HOLINESS_SOFT_CAPS = {
  'book-00': 12,   // You're just a farmer. Holiness barely budges.
  'book-01': 18,   // Rome. The seed is planted.
  'book-02': 25,   // Desert. Growth through prayer and trial.
  'book-03': 32,   // Siege. Faith tested under fire.
  'book-04': 40,   // Mongol storm. Suffering deepens.
  'book-05': 50,   // Hidden church. The longest patience.
  'book-06': 58,   // Lepanto. Prayer in battle.
  'book-07': 68,   // Terror. Martyrdom confronted.
  'book-08': 82,   // The camps. Where holiness costs everything.
  'final_book': 100, // No cap. This is the end.
};

/**
 * Virtue diminishing returns per individual virtue.
 * Each virtue has a soft cap per book — growth slows beyond it.
 * Prevents stacking one virtue (e.g., all charity) to game holiness.
 *
 * Virtue points beyond the book cap are worth 40% of normal.
 * This encourages balanced virtue growth across all 7 virtues.
 */
const VIRTUE_SOFT_CAPS_PER_BOOK = {
  'book-00': 3,    // Max ~3 in any single virtue before diminishing
  'book-01': 5,
  'book-02': 8,
  'book-03': 11,
  'book-04': 14,
  'book-05': 18,
  'book-06': 22,
  'book-07': 27,
  'book-08': 33,
  'final_book': 50,
};

export class SanctificationEngine {
  constructor(events) {
    this.events = events;
    this.currentPhase = 0;
    this.saintAffinities = {};     // saint_id → affinity_score (built by play choices)
    this.intercessionsUsed = 0;
    this.saintEncounters = {};     // saint_id → { times_called, damage_dealt, battles_won }
    this.demonsBanished = 0;
    this.prayerTurnsTotal = 0;     // Total turns spent praying instead of attacking
  }

  /**
   * Calculate total holiness from virtues and SPR.
   * This is THE number that drives the entire transformation.
   */
  /**
   * Calculate holiness score.
   *
   * DESIGN PHILOSOPHY:
   *   Holiness is not a stat you grind. It's a journey across 10 books.
   *   Raw virtue points grow through mercy, prayer, moral choices, and story.
   *   But holiness uses LOGARITHMIC SCALING — each point of virtue matters
   *   more when you have little, less when you have much.
   *   This means:
   *     - Early mercies feel impactful (you go from 0 → visible growth)
   *     - Mid-game mercies still matter but don't catapult you
   *     - Late-game holiness requires sustained commitment, not cheese
   *
   *   Additionally, there are BOOK SOFT CAPS:
   *     - Holiness above the current book's cap gives diminishing returns
   *     - You CAN exceed the cap, but it gets exponentially harder
   *     - This ensures the holiness arc matches the story arc
   *     - A mercy player in Book 2 will feel growth but won't be
   *       Transfigured until the story has earned it
   *
   * FORMULA:
   *   rawHoliness = sum(7 virtues) + SPR/10
   *   scaledHoliness = 30 * ln(1 + rawHoliness / 12)
   *   bookCap applies soft diminishing above threshold
   *
   * PROGRESSION TARGETS (all-mercy player with prayer/story virtue):
   *   Raw ~10 by Book 2  → scaled ~17 → Phase 1
   *   Raw ~30 by Book 4  → scaled ~32 → Phase 2
   *   Raw ~70 by Book 6  → scaled ~52 → Phase 3
   *   Raw ~130 by Book 8 → scaled ~73 → approaching Phase 4
   *   Raw ~170 by Final  → scaled ~81 → Phase 4
   *
   * RESULT: Holiness 0-100 scale matching 10-book arc
   *   Phase 1 (Veil Thinning):    holiness >= 15   (~Book 2-3)
   *   Phase 2 (Dual Sight):       holiness >= 30   (~Book 4-5)
   *   Phase 3 (Spiritual Sight):  holiness >= 50   (~Book 6-7)
   *   Phase 4 (Transfigured):     holiness >= 75   (~Book 8-9)
   *
   * A player who shows mercy at every opportunity across 10 books
   * reaches Phase 4 in Book 8-9. A player who sometimes shows mercy
   * reaches Phase 2-3. A player who never shows mercy stays Phase 0-1.
   */
  calculateHoliness(virtues, spr, currentBook) {
    const virtueTotal = Object.values(virtues || {}).reduce((a, b) => a + b, 0);
    const rawHoliness = virtueTotal + (spr || 0) / 10;

    // Logarithmic scaling: steep early growth, flattens later
    // At raw 10:  scaled ~17 (Phase 1 territory)
    // At raw 30:  scaled ~32 (Phase 2 territory)
    // At raw 70:  scaled ~52 (Phase 3 territory)
    // At raw 130: scaled ~73 (approaching Phase 4)
    // At raw 170: scaled ~81 (Phase 4 territory)
    let scaledHoliness = 30 * Math.log(1 + rawHoliness / 12);

    // Book soft cap: above the cap, gains are halved
    // This prevents rushing but doesn't hard-block
    if (currentBook !== undefined) {
      const bookCap = BOOK_HOLINESS_SOFT_CAPS[currentBook] || 100;
      if (scaledHoliness > bookCap) {
        const excess = scaledHoliness - bookCap;
        scaledHoliness = bookCap + excess * 0.3; // Only 30% of excess counts
      }
    }

    return Math.floor(scaledHoliness);
  }

  /**
   * Get the current perception phase based on holiness.
   *
   * Thresholds scaled for 10-book arc:
   *   Phase 1:  15 — first glimmers around Book 2-3
   *   Phase 2:  30 — dual sight around Book 4-5
   *   Phase 3:  50 — spiritual sight around Book 6-7
   *   Phase 4:  75 — transfigured around Book 8-9
   */
  getPerceptionPhase(holiness) {
    if (holiness >= 75) return 4;  // Transfigured Vision (~Book 8-9)
    if (holiness >= 50) return 3;  // Spiritual Sight    (~Book 6-7)
    if (holiness >= 30) return 2;  // Dual Sight         (~Book 4-5)
    if (holiness >= 15) return 1;  // Veil Thinning      (~Book 2-3)
    return 0;                       // Material
  }

  /**
   * Update perception phase. Emits events when thresholds are crossed.
   * This is called every time virtues or SPR change.
   */
  updatePerception(virtues, spr) {
    const holiness = this.calculateHoliness(virtues, spr);
    const newPhase = this.getPerceptionPhase(holiness);

    if (newPhase !== this.currentPhase) {
      const oldPhase = this.currentPhase;
      this.currentPhase = newPhase;

      this.events?.emit('perception_shift', {
        oldPhase,
        newPhase,
        holiness,
        cutscene: PERCEPTION_SHIFT_CUTSCENES[newPhase],
      });

      // First time reaching a phase is a significant story moment
      this.events?.emit('holiness_milestone', {
        phase: newPhase,
        phaseName: PERCEPTION_PHASES[newPhase].name,
        description: PERCEPTION_PHASES[newPhase].description,
      });
    }

    return { holiness, phase: newPhase };
  }

  /**
   * Transform an enemy based on current perception phase.
   * The same enemy data becomes completely different at different phases.
   */
  perceiveEnemy(enemyData, phase) {
    if (!enemyData) return enemyData;
    phase = phase ?? this.currentPhase;

    // Spiritual enemies are always perceived as-is
    if (enemyData.species === 'spiritual') return enemyData;

    // Material enemies transform at higher phases
    const demonForm = enemyData.demon_form || null;
    if (!demonForm) return enemyData; // No demon form defined — stays material

    switch (phase) {
      case 0: // Material — see the soldier, not the demon
        return { ...enemyData, perceived_as: 'material' };

      case 1: // Veil Thinning — shadows and whispers
        return {
          ...enemyData,
          perceived_as: 'veil_thin',
          visual_overlay: {
            shadow_behind: true,
            shadow_color: demonForm.palette?.[0] || '#1a0a2e',
            shadow_opacity: 0.3,
            whisper_text: demonForm.whisper || '...',
          },
        };

      case 2: // Dual Sight — see both simultaneously
        return {
          ...enemyData,
          perceived_as: 'dual_sight',
          visual_overlay: {
            demon_ghost: true,
            demon_sprite: demonForm.sprite,
            demon_opacity: 0.5,
            demon_name_visible: true,
            material_opacity: 0.7,
          },
          dual_name: `${enemyData.name} [${demonForm.name}]`,
        };

      case 3: // Spiritual Sight — demon dominates, human fades
        return {
          ...demonForm,
          perceived_as: 'spiritual_sight',
          original_material: enemyData.name,
          visual_overlay: {
            material_ghost: true,
            material_opacity: 0.2,
            demon_opacity: 1.0,
          },
          // Demon stats override material stats
          stats: demonForm.stats || enemyData.stats,
          weaknesses: demonForm.weaknesses || ['holy'],
        };

      case 4: // Transfigured Vision — pure spiritual plane
        return {
          ...demonForm,
          perceived_as: 'transfigured',
          visual_overlay: {
            spiritual_plane: true,
            golden_light_ambient: true,
            material_invisible: true,
          },
          stats: demonForm.stats,
          weaknesses: demonForm.weaknesses || ['holy'],
          true_name_visible: true,
        };
    }

    return enemyData;
  }

  /**
   * Determine which saint responds to a prayer in combat.
   * Based on: enemy type, Usagi's highest virtues, book/era, player affinity.
   */
  determineSaintIntercession(enemyData, virtues, currentBook, bossType) {
    const candidates = [];

    for (const saint of Object.values(SAINTS)) {
      let score = 0;

      // Virtue affinity — saint responds to their associated virtue
      for (const virtue of saint.associated_virtues) {
        score += (virtues[virtue] || 0) * 3;
      }

      // Enemy type match — certain saints specialize against certain demons
      if (saint.strong_against) {
        for (const type of saint.strong_against) {
          if (enemyData.demon_type === type || enemyData.tier === type) {
            score += 20;
          }
        }
      }

      // Era affinity — saints from the same era respond more readily
      if (saint.era_affinity?.includes(currentBook)) {
        score += 10;
      }

      // Player affinity (built by prayer choices and vocation)
      score += (this.saintAffinities[saint.id] || 0);

      // Boss tier match
      if (bossType === 'major' && saint.boss_tier === 'major') score += 15;
      if (bossType === 'accuser' && saint.boss_tier === 'accuser') score += 25;
      if (bossType === 'satan' && saint.id === 'blessed_virgin_mary') score += 100;

      // Minimum holiness requirement
      const holiness = this.calculateHoliness(virtues, 0);
      if (holiness < (saint.min_holiness || 0)) continue;

      candidates.push({ saint, score });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Return the top candidate (or null if no one responds)
    return candidates.length > 0 ? candidates[0].saint : null;
  }

  /**
   * Execute a saint intercession turn in combat.
   * Usagi prays. The saint acts.
   */
  /**
   * Begin a saint intercession.
   * This does NOT execute an attack. It begins PRAYER.
   * The saint materializes over multiple prayer turns.
   * The demon withers as the saint becomes more present.
   */
  executeIntercession(saint, enemyData, playerStats, virtues) {
    this.intercessionsUsed++;

    // Track affinity
    this.saintAffinities[saint.id] = (this.saintAffinities[saint.id] || 0) + 1;

    // Track encounters
    if (!this.saintEncounters[saint.id]) {
      this.saintEncounters[saint.id] = { times_called: 0, battles_won: 0 };
    }
    this.saintEncounters[saint.id].times_called++;

    const holiness = this.calculateHoliness(virtues, playerStats.spr);

    return {
      type: 'saint_intercession_begin',
      saint: saint,
      usagi_state: 'kneeling_prayer',
      materialization: 0,
      prayerTurns: 0,
      holiness,

      // The saint does not "enter combat." The saint ARRIVES.
      // And by arriving, the battle is already decided.
      // The only question is how long Usagi must pray.
      entrance: saint.visual?.entrance || 'light_gathers_above',
      description: `Usagi kneels. He closes his eyes. He prays. And in the space where prayer meets heaven, ${saint.name} begins to form — faint at first, like a candle seen through fog. But even this faint light makes the demon flinch.`,
    };
  }


  // ─────────────────────────────────────────────────────────────
  // THE WITHERING LIGHT SYSTEM
  // ─────────────────────────────────────────────────────────────
  //
  // Saints do not "fight" demons. That implies equals.
  // A saint arrives and the demon WITHERS. It cannot attack.
  // It cannot defend. It burns in the light the way darkness
  // burns in a candle — not by force, but by nature.
  //
  // A single candle is enough to fill a room.
  // A single saint is enough to shatter a legion.
  //
  // The drama of boss battles is NOT "can the saint win?"
  // The answer is always yes. Always. Without exception.
  //
  // The drama is: "Will Usagi pray long enough and deeply
  // enough for the saint to fully materialize?"
  //
  // The PLAYER's job is to pray. To hold faith under fire.
  // To endure the demon's attacks on HIM while the saint
  // gathers light. The saint does not take damage. Cannot
  // take damage. The light of God admits no wound.
  //
  // When the saint is fully present, the demon withers.
  // Not in a fight. In a revelation.
  // ─────────────────────────────────────────────────────────────

  /**
   * Calculate how fully a saint has materialized.
   * Materialization = 0.0 (faint glow) to 1.0 (fully present).
   * Each prayer turn by Usagi increases materialization.
   * The saint's power is proportional to materialization.
   */
  calculateMaterialization(saint, prayerTurns, virtues, holiness) {
    // Base rate: how many prayer turns to fully materialize
    const baseRate = saint.materialization_rate || 0.25; // 4 turns default
    const virtueBonus = Object.values(virtues || {}).reduce((a, b) => a + b, 0) * 0.005;
    const holinessBonus = holiness * 0.005;
    const affinityBonus = (this.saintAffinities[saint.id] || 0) * 0.01;

    const ratePerTurn = Math.min(0.5, baseRate + virtueBonus + holinessBonus + affinityBonus);
    const materialization = Math.min(1.0, prayerTurns * ratePerTurn);

    return materialization;
  }

  /**
   * Calculate the withering effect on a demon.
   * At full materialization, the demon takes catastrophic holy damage per turn
   * and CANNOT act — stunned, blinded, burning in light it cannot comprehend.
   *
   * Below full materialization, partial effects:
   *   0.0-0.2: Faint glow. Demon takes 2% max HP per turn. Still attacks Usagi.
   *   0.2-0.5: Saint visible. Demon takes 8% max HP. ATK reduced by 50%.
   *   0.5-0.8: Saint radiant. Demon takes 15% max HP. Cannot attack. Writhes.
   *   0.8-1.0: Saint fully present. Demon takes 25% max HP. Withering. Screaming.
   *   1.0:     Full presence. Demon is FINISHED. Cinematic destruction.
   */
  calculateWitheringEffect(materialization, enemyData) {
    const maxHP = enemyData.stats?.hp || enemyData.hp || 100;
    const isSatan = enemyData.id === 'bf_satan' || enemyData.demon_type === 'satan';

    // Satan requires higher thresholds (BVM only, and more prayer)
    const thresholds = isSatan
      ? { glow: 0.3, visible: 0.5, radiant: 0.7, full: 0.9, finished: 1.0 }
      : { glow: 0.1, visible: 0.25, radiant: 0.5, full: 0.8, finished: 1.0 };

    if (materialization >= thresholds.finished) {
      return {
        phase: 'finished',
        damage_per_turn_pct: 1.0,  // 100% — it's over
        enemy_can_act: false,
        enemy_status: 'dissolving_in_light',
        description: 'The light is total. The demon does not fight. It unravels.',
        cinematic_finish: true,
      };
    }
    if (materialization >= thresholds.full) {
      return {
        phase: 'withering',
        damage_per_turn_pct: 0.25,
        enemy_can_act: false,
        enemy_status: 'withering_screaming',
        description: 'The saint is fully present. The demon cannot look at the light. It is burning from the inside. It screams — not in anger but in recognition of what it rejected.',
        visual: { enemy_opacity: 0.3, burn_particles: true, light_cracks_on_body: true },
      };
    }
    if (materialization >= thresholds.radiant) {
      return {
        phase: 'radiant',
        damage_per_turn_pct: 0.15,
        enemy_can_act: false,
        enemy_status: 'writhing_in_light',
        description: 'The saint blazes. The demon recoils. It tries to attack but its limbs will not obey. The light is not a weapon — it is a truth, and the demon is a lie.',
        visual: { enemy_opacity: 0.5, recoil_animation: true, saint_glow_intensify: true },
      };
    }
    if (materialization >= thresholds.visible) {
      return {
        phase: 'visible',
        damage_per_turn_pct: 0.08,
        enemy_can_act: true,
        enemy_atk_mult: 0.5,  // Weakened
        enemy_status: 'weakened_by_presence',
        description: 'The saint is taking form. The demon\'s attacks falter — each swing loses conviction. The light makes its hatred feel small.',
        visual: { enemy_opacity: 0.7, flicker: true, saint_forming: true },
      };
    }
    if (materialization >= thresholds.glow) {
      return {
        phase: 'glow',
        damage_per_turn_pct: 0.02,
        enemy_can_act: true,
        enemy_atk_mult: 0.9,  // Slightly weakened
        enemy_status: 'uneasy',
        description: 'A faint glow where the saint is forming. The demon hesitates. Something is coming and it knows.',
        visual: { faint_glow_behind_usagi: true, enemy_glance_nervous: true },
      };
    }

    // Below glow threshold — prayer has begun but no visible effect yet
    return {
      phase: 'prayer_only',
      damage_per_turn_pct: 0,
      enemy_can_act: true,
      enemy_atk_mult: 1.0,
      enemy_status: 'unaffected',
      description: 'Usagi prays. Nothing visible happens yet. The demon attacks freely. But prayer is never wasted.',
    };
  }

  /**
   * Saints do not take damage. Ever.
   * This is not a gameplay balance choice. This is theology.
   * The light of God admits no wound. Demons cannot harm what is holy.
   * Their attacks pass through the saint like wind through sunlight.
   *
   * If a demon "attacks" a saint, the attack visually dissolves
   * before reaching them, and the demon recoils in pain from
   * the attempted contact.
   */
  resolveDemonAttackOnSaint(saint, attackData) {
    return {
      damage_to_saint: 0,
      always_zero: true,
      reason: 'The light admits no wound.',
      visual: {
        attack_dissolves: true,
        dissolve_distance: 10,  // pixels from saint where attack evaporates
        demon_recoil: true,
        demon_self_damage_pct: 0.02,  // Demon hurts ITSELF by touching the light
        particle_burst: 'golden_sparks_where_attack_dissolved',
      },
      message_options: [
        'The blow dissolves before it touches the light.',
        'The darkness reaches for the saint and burns.',
        'Its claws pass through the light like shadow through a candle flame.',
        'It strikes — and the strike unravels, thread by thread, into nothing.',
        'The demon screams. Not because it was struck. Because it tried to strike and couldn\'t.',
        'Light does not fight darkness. It simply IS, and darkness is not.',
      ],
    };
  }

  /**
   * Process a full prayer turn in combat.
   * Usagi kneels. The saint gathers light. The demon withers.
   * This is the core loop of high-holiness combat.
   */
  processPrayerTurn(saint, prayerTurnCount, enemyData, virtues, holiness) {
    this.prayerTurnsTotal++;

    const materialization = this.calculateMaterialization(saint, prayerTurnCount, virtues, holiness);
    const withering = this.calculateWitheringEffect(materialization, enemyData);

    // Calculate actual damage this turn
    const maxHP = enemyData.stats?.hp || enemyData.hp || 100;
    const damage = Math.round(maxHP * withering.damage_per_turn_pct);

    return {
      type: 'prayer_turn',
      saint: saint.id,
      materialization,
      materialization_pct: Math.round(materialization * 100),
      withering_phase: withering.phase,
      damage_to_enemy: damage,
      enemy_can_act: withering.enemy_can_act,
      enemy_atk_mult: withering.enemy_atk_mult || 1.0,
      cinematic_finish: withering.cinematic_finish || false,
      description: withering.description,
      visual: withering.visual || {},

      // Usagi's state during prayer
      usagi: {
        pose: 'kneeling_prayer',
        immune_spiritual_damage: materialization > 0.5,  // Saint shields Usagi once radiant
        damage_reduction: Math.min(0.8, materialization * 0.8),  // Up to 80% damage reduction
        description: materialization > 0.5
          ? 'Usagi kneels in prayer. The saint\'s light shields him.'
          : 'Usagi kneels in prayer. He is vulnerable — but faithful.',
      },
    };
  }

  /**
   * Generate the cinematic finish sequence when materialization hits 1.0.
   * Each saint has a unique finish. The demon does not fight back.
   * It withers. It dissolves. It remembers what it once was — and weeps.
   */
  generateCinematicFinish(saint, enemyData) {
    const finish = SAINT_CINEMATIC_FINISHES[saint.id];
    if (!finish) {
      // Default finish
      return {
        steps: [
          { type: 'letterbox', size: 40 },
          { type: 'screen_effect', effect: 'light_fills_screen', duration: 2000 },
          { type: 'dialogue', speaker: null, lines: [
            `${saint.name} is fully present.`,
            'The light is total.',
            'The demon does not fight. It cannot. It simply... ends.',
          ]},
          { type: 'enemy_dissolve', duration: 3000, effect: 'burns_away_in_golden_light' },
          { type: 'fade_in', duration: 1000 },
        ],
      };
    }
    return finish;
  }

  /**
   * Get the combat mode for a given holiness level.
   */
  getCombatMode(holiness, martialSkillCount, holinessSkillCount) {
    const ratio = holinessSkillCount / Math.max(1, martialSkillCount + holinessSkillCount);

    if (holiness >= 75 && ratio > 0.6) return 'fully_sanctified';
    if (holiness >= 50 && ratio > 0.4) return 'prayer_warrior';
    if (holiness >= 30) return 'dual_combat';
    if (holiness >= 15) return 'awakening';
    return 'martial';
  }

  // ─────────────────────────────────────────────────────────────
  // THE MERCY SYSTEM
  // ─────────────────────────────────────────────────────────────
  //
  // Mercy is the fastest path to holiness.
  //
  // When Usagi spares an enemy, he grows. Not in power — in virtue.
  // The sword makes you stronger. Mercy makes you holier.
  // Both have value. But only one transforms the game.
  //
  // Every mercy-available enemy presents a choice:
  //   KILL: Full XP, full gold, martial alignment. Practical.
  //   SPARE: Reduced XP, no gold, but VIRTUE GROWTH.
  //     Charity always grows. Other virtues depend on context.
  //
  // The harder the enemy is to spare, the greater the growth.
  // Sparing a rat gives nothing. Sparing the man who burned
  // your chapel? That changes the shape of your soul.
  //
  // Mercy is NEVER the easy path. It costs XP, gold, and
  // sometimes safety (spared enemies may return). But it is
  // the path that leads to saints fighting at your side.
  //
  // A player who never shows mercy will reach Level 100
  // as a powerful warrior who fights alone.
  // A player who always shows mercy will reach Level 60
  // with saints at their back and demons withering in light.
  //
  // Both are valid. Both reach the ending. But the endings
  // are different games.
  // ─────────────────────────────────────────────────────────────

  /**
   * Initialize mercy tracking (called from constructor).
   */
  initMercyTracking() {
    this.mercyStats = {
      totalMerciesGiven: 0,
      totalMerciesRefused: 0,
      merciesByBook: {},        // { 'book-00': 3, 'book-01': 1 }
      merciesByType: {},        // { 'spare_soldier': 2, 'forgive_betrayer': 1 }
      mercyChain: 0,            // Consecutive mercies without killing mercy-available enemy
      longestMercyChain: 0,
      enemiesSpared: [],        // IDs of spared enemies (for callbacks)
      enemiesKilled: [],        // IDs of killed mercy-available enemies
      totalVirtueFromMercy: 0,  // Running total of virtue gained through mercy
      reputation: 'unknown',    // Evolves: unknown → rumored → known → legendary
    };
  }

  /**
   * Calculate virtue rewards for showing mercy to an enemy.
   *
   * @param {object} enemyData - The enemy being spared
   * @param {object} currentVirtues - Player's current virtues
   * @param {string} currentBook - Current book ID
   * @param {object} battleContext - How the battle went (turns, damage taken, etc.)
   * @returns {object} Virtue changes and narrative results
   */
  calculateMercyReward(enemyData, currentVirtues, currentBook, battleContext = {}) {
    const tier = enemyData.tier;
    const species = enemyData.species;
    const hasDemonForm = !!enemyData.demon_form;
    const mercyType = this._classifyMercyType(enemyData);
    const chain = this.mercyStats.mercyChain;

    // ── BASE VIRTUE REWARDS BY TIER ──
    // Harder enemies = more virtue growth.
    // These are calibrated so that a player who shows mercy at every
    // opportunity (~36 mercies across 10 books) and actively prays/
    // uses blessings will reach Phase 3-4 by the endgame.
    const tierRewards = {
      1:          { charity: 0.5, base_total: 0.8 },
      2:          { charity: 0.8, base_total: 1.5 },
      3:          { charity: 1.5, base_total: 2.5 },
      'mini_boss': { charity: 3.0, base_total: 5.0 },
      'boss':     { charity: 4.0, base_total: 8.0 },
    };
    const base = tierRewards[tier] || tierRewards[2];

    // ── CONTEXTUAL VIRTUE REWARDS ──
    // Different mercy situations grow different virtues
    const virtueGains = { charity: base.charity };

    switch (mercyType) {
      case 'spare_soldier':
        // Sparing someone who was just following orders
        virtueGains.justice = base.base_total * 0.4;
        virtueGains.prudence = base.base_total * 0.3;
        break;

      case 'forgive_betrayer':
        // Forgiving someone who betrayed Christians — the hardest mercy
        virtueGains.charity = base.charity * 2.0;  // Double charity
        virtueGains.faith = base.base_total * 0.5;
        virtueGains.hope = base.base_total * 0.3;
        break;

      case 'protect_innocent':
        // Sparing a child, a confused civilian, a frightened animal
        virtueGains.charity = base.charity * 1.5;
        virtueGains.justice = base.base_total * 0.5;
        break;

      case 'honor_worthy_opponent':
        // Sparing a worthy enemy who fought with honor
        virtueGains.justice = base.base_total * 0.5;
        virtueGains.fortitude = base.base_total * 0.3;
        virtueGains.temperance = base.base_total * 0.3;
        break;

      case 'pity_the_broken':
        // Showing mercy to someone destroyed by the system (kapo, apostate, informer)
        virtueGains.charity = base.charity * 1.8;
        virtueGains.hope = base.base_total * 0.5;
        break;

      case 'refuse_revenge':
        // Sparing someone who directly harmed you or your community
        virtueGains.charity = base.charity * 2.5;  // Highest charity multiplier
        virtueGains.fortitude = base.base_total * 0.5;
        virtueGains.temperance = base.base_total * 0.4;
        break;

      case 'free_the_enslaved':
        // Freeing rather than fighting a slave, chained ghost, possessed person
        virtueGains.justice = base.base_total * 0.6;
        virtueGains.charity = base.charity * 1.5;
        virtueGains.hope = base.base_total * 0.3;
        break;

      case 'pray_for_enemy':
        // Praying for a spiritual enemy rather than fighting it
        virtueGains.faith = base.base_total * 0.6;
        virtueGains.hope = base.base_total * 0.4;
        virtueGains.charity = base.charity * 1.3;
        break;

      default:
        // Generic mercy — still grows charity
        virtueGains.prudence = base.base_total * 0.2;
        break;
    }

    // ── MERCY CHAIN BONUS ──
    // Consecutive mercies compound. Showing mercy repeatedly is harder than once.
    if (chain > 0) {
      const chainMultiplier = 1 + Math.min(0.5, chain * 0.1); // Up to 1.5x at 5+ chain
      for (const v in virtueGains) {
        virtueGains[v] = Math.round(virtueGains[v] * chainMultiplier * 100) / 100;
      }
    }

    // ── DEMON OVERLAY BONUS ──
    // If the enemy has a demon form, mercy is especially powerful.
    // You're not just sparing the human — you're rejecting the demon's logic.
    if (hasDemonForm) {
      virtueGains.faith = (virtueGains.faith || 0) + 0.3;
      // The demon's whisper is answered with mercy. That weakens it.
    }

    // ── DIFFICULTY BONUS ──
    // If Usagi took a lot of damage before choosing mercy, virtue gains increase.
    // It's easy to show mercy from a position of power. Hard when you're bleeding.
    if (battleContext.usagiHpPercent !== undefined && battleContext.usagiHpPercent < 0.3) {
      // Usagi showed mercy while nearly dead — exceptional fortitude
      virtueGains.fortitude = (virtueGains.fortitude || 0) + 0.5;
      virtueGains.charity = virtueGains.charity * 1.3;
    }

    // ── CALCULATE TOTALS (with diminishing returns) ──
    // If any single virtue is already above the book's soft cap,
    // further gains to THAT virtue are reduced to 40%.
    // This prevents stacking charity to max holiness.
    const bookVirtueCap = VIRTUE_SOFT_CAPS_PER_BOOK[currentBook] || 50;
    const roundedGains = {};
    for (const [k, v] of Object.entries(virtueGains)) {
      let gain = v;
      const currentLevel = (currentVirtues[k] || 0);
      if (currentLevel >= bookVirtueCap) {
        // Above cap: only 40% of gains apply
        gain = v * 0.4;
      } else if (currentLevel + v > bookVirtueCap) {
        // Partially above cap: full gains up to cap, 40% after
        const underCap = bookVirtueCap - currentLevel;
        const overCap = v - underCap;
        gain = underCap + overCap * 0.4;
      }
      roundedGains[k] = Math.round(gain * 100) / 100;
    }

    const totalVirtueGain = Object.values(roundedGains).reduce((a, b) => a + b, 0);

    return {
      virtueGains: roundedGains,
      totalVirtueGain: Math.round(totalVirtueGain * 100) / 100,
      mercyType,
      chainBonus: chain > 0,
      chainLength: chain + 1,
      demonRejected: hasDemonForm,
      xpPenalty: this._calculateMercyXpCost(enemyData),
      goldPenalty: enemyData.gold || 0,  // No gold from spared enemies
      narrative: this._getMercyNarrative(mercyType, enemyData, roundedGains),
    };
  }

  /**
   * Execute mercy — apply virtue gains, update tracking, trigger consequences.
   *
   * @param {object} enemyData - The spared enemy
   * @param {object} mercyResult - Output from calculateMercyReward
   * @param {function} applyVirtue - Callback to apply virtue changes to game state
   * @param {string} currentBook - Current book ID
   */
  executeMercy(enemyData, mercyResult, applyVirtue, currentBook) {
    // Apply virtue gains
    if (applyVirtue) {
      applyVirtue(mercyResult.virtueGains);
    }

    // Update tracking
    this.mercyStats.totalMerciesGiven++;
    this.mercyStats.mercyChain++;
    this.mercyStats.longestMercyChain = Math.max(
      this.mercyStats.longestMercyChain,
      this.mercyStats.mercyChain
    );
    this.mercyStats.totalVirtueFromMercy += mercyResult.totalVirtueGain;
    this.mercyStats.enemiesSpared.push(enemyData.id);

    // Track by book
    this.mercyStats.merciesByBook[currentBook] =
      (this.mercyStats.merciesByBook[currentBook] || 0) + 1;

    // Track by type
    this.mercyStats.merciesByType[mercyResult.mercyType] =
      (this.mercyStats.merciesByType[mercyResult.mercyType] || 0) + 1;

    // Update holiness alignment
    this.holinessActions = (this.holinessActions || 0) + 2; // Mercy counts double for alignment

    // Update reputation
    this._updateMercyReputation();

    // Emit events
    return {
      type: 'mercy_executed',
      enemy: enemyData.id,
      enemyName: enemyData.name,
      virtueGains: mercyResult.virtueGains,
      totalGain: mercyResult.totalVirtueGain,
      mercyChain: this.mercyStats.mercyChain,
      reputation: this.mercyStats.reputation,
      demonRejected: mercyResult.demonRejected,
      narrative: mercyResult.narrative,

      // Consequences
      consequences: this._getMercyConsequences(enemyData, currentBook),

      // Perception update hint (caller should recalculate)
      recalculatePerception: true,
    };
  }

  /**
   * Record a kill of a mercy-available enemy.
   * Breaks mercy chain. No virtue gain. Full XP and gold.
   */
  recordMercyRefused(enemyData, currentBook) {
    this.mercyStats.totalMerciesRefused++;
    this.mercyStats.mercyChain = 0; // Chain broken
    this.mercyStats.enemiesKilled.push(enemyData.id);

    // Martial alignment
    this.martialActions = (this.martialActions || 0) + 1;

    // Some kills of mercy-available enemies reduce virtues slightly
    const wasInnocent = ['protect_innocent', 'free_the_enslaved'].includes(
      this._classifyMercyType(enemyData)
    );

    return {
      type: 'mercy_refused',
      enemy: enemyData.id,
      chainBroken: true,
      virtueLoss: wasInnocent
        ? { charity: -0.3, justice: -0.2 }
        : null,
      narrative: wasInnocent
        ? `${enemyData.name} falls. Something in Usagi's chest tightens.`
        : `${enemyData.name} falls. The sword did what swords do.`,
    };
  }

  /**
   * Classify what kind of mercy this would be, based on enemy data.
   */
  _classifyMercyType(enemyData) {
    const id = enemyData.id || '';
    const desc = (enemyData.description || '').toLowerCase();
    const species = enemyData.species;
    const tier = enemyData.tier;

    // Check for explicit mercy_type tag
    if (enemyData.mercy_type) return enemyData.mercy_type;

    // Check for children / innocents
    if (desc.includes('child') || desc.includes('boy') || desc.includes('twelve') ||
        desc.includes('fourteen') || desc.includes('too young') || enemyData.mercy_required) {
      return 'protect_innocent';
    }

    // Check for betrayers / informers / apostates
    if (desc.includes('betray') || desc.includes('inform') || desc.includes('apostate') ||
        desc.includes('broke') || desc.includes('stepped on') || id.includes('traitor') ||
        id.includes('informer') || id.includes('apostate')) {
      return 'forgive_betrayer';
    }

    // Check for enslaved / chained / ghost seeking release
    if (desc.includes('slave') || desc.includes('chain') || desc.includes('freed') ||
        desc.includes('ghost') || desc.includes('unchain') || id.includes('slave') ||
        id.includes('ghost') || id.includes('drowned')) {
      return 'free_the_enslaved';
    }

    // Check for honorable opponents
    if (desc.includes('honor') || desc.includes('worthy') || desc.includes('duel') ||
        desc.includes('scholar') || desc.includes('mercy_available')) {
      return 'honor_worthy_opponent';
    }

    // Check for broken / pitiable enemies
    if (desc.includes('weep') || desc.includes('piti') || desc.includes('tragic') ||
        desc.includes('doesn\'t want') || desc.includes('broken') ||
        id.includes('kapo') || id.includes('broken')) {
      return 'pity_the_broken';
    }

    // Check for those who harmed you directly
    if (desc.includes('burn') || desc.includes('persecuti') || desc.includes('kill') ||
        desc.includes('killed christians') || id.includes('butcher') || id.includes('inquisitor')) {
      return 'refuse_revenge';
    }

    // Check for spiritual enemies
    if (species === 'spiritual') {
      return 'pray_for_enemy';
    }

    // Check for soldiers following orders
    if (desc.includes('order') || desc.includes('duty') || desc.includes('uniform') ||
        id.includes('soldier') || id.includes('ashigaru') || id.includes('legionary')) {
      return 'spare_soldier';
    }

    // Animals
    if (species === 'beast') {
      return 'protect_innocent';
    }

    // Default
    return 'spare_soldier';
  }

  /**
   * Calculate XP cost for showing mercy.
   * You get reduced XP for sparing an enemy.
   * The cost is the price of holiness.
   */
  _calculateMercyXpCost(enemyData) {
    const fullXP = enemyData.xp || 0;
    // You get 40% XP for sparing (acknowledged the encounter, showed restraint)
    // Mercy chain 3+ gives 50% XP (reputation makes mercy easier)
    // Mercy chain 5+ gives 60% XP
    const chain = this.mercyStats.mercyChain;
    let retainPct = 0.4;
    if (chain >= 5) retainPct = 0.6;
    else if (chain >= 3) retainPct = 0.5;

    return {
      fullXP,
      mercyXP: Math.round(fullXP * retainPct),
      xpLost: Math.round(fullXP * (1 - retainPct)),
      retainPercent: retainPct,
    };
  }

  /**
   * Update mercy reputation based on total mercies given.
   */
  _updateMercyReputation() {
    const total = this.mercyStats.totalMerciesGiven;
    if (total >= 50) this.mercyStats.reputation = 'legendary';      // "The Merciful One"
    else if (total >= 25) this.mercyStats.reputation = 'renowned';   // Known across eras
    else if (total >= 10) this.mercyStats.reputation = 'known';      // Enemies have heard
    else if (total >= 3) this.mercyStats.reputation = 'rumored';     // Whispers
    else this.mercyStats.reputation = 'unknown';
  }

  /**
   * Get narrative text for a mercy action.
   */
  _getMercyNarrative(mercyType, enemyData, virtueGains) {
    const name = enemyData.name;
    const highestVirtue = Object.entries(virtueGains)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'charity';

    const narratives = {
      spare_soldier: [
        `${name} lowers their weapon. Usagi lowers his. Something passes between them that is not words.`,
        `"Go," Usagi says. ${name} hesitates — then goes. One less death today.`,
        `${name} expected death. Received mercy. The confusion on their face is a kind of sermon.`,
      ],
      forgive_betrayer: [
        `${name} cannot meet Usagi's eyes. "I know," Usagi says quietly. "I forgive you." The words cost more than any sword stroke.`,
        `Forgiving a betrayer is not forgetting. It is choosing to carry the wound without passing it on.`,
        `${name} weeps. Not because of the mercy — because they didn't deserve it. That's what makes it mercy.`,
      ],
      protect_innocent: [
        `Usagi steps between ${name} and harm. Some fights are won by not fighting.`,
        `${name} is afraid. Usagi kneels to their level. "You're safe." Two words. Entire kingdoms are built on less.`,
        `Not every battle is against an enemy. Some battles are FOR someone.`,
      ],
      honor_worthy_opponent: [
        `${name} fought well. Usagi acknowledges it with a bow. The sword is sheathed. Honor answers honor.`,
        `"You fight for what you believe," Usagi says. "So do I. We don't have to kill each other to prove it."`,
        `Two warriors stand. Neither strikes. The silence between them holds more truth than any battle.`,
      ],
      pity_the_broken: [
        `${name} is already broken. Usagi's sword would only break what's left. Mercy here is not strength — it's recognition.`,
        `"You've suffered enough," Usagi says. ${name} stares. No one has said that to them in a very long time.`,
        `Pity is not weakness. Pity requires seeing another's pain clearly. That takes courage.`,
      ],
      refuse_revenge: [
        `Every fiber of Usagi's body screams to strike. He doesn't. The scream fades. What replaces it is quieter and infinitely stronger.`,
        `${name} burned the chapel. Killed the faithful. Usagi could take revenge and no one would blame him. He chooses otherwise. The choice reshapes the world.`,
        `Revenge is a circle. Mercy is a door. Usagi walks through it.`,
      ],
      free_the_enslaved: [
        `Chains break. ${name} stares at their hands as if seeing them for the first time.`,
        `"You're free." The words are simple. The meaning is not. Freedom costs — and Usagi pays.`,
        `${name} was bound. Now unbound. The act of freeing changes both the freed and the one who frees.`,
      ],
      pray_for_enemy: [
        `Usagi kneels. Not to fight — to pray. For the enemy. The enemy does not understand. That's why it works.`,
        `Prayer for an enemy is the sharpest weapon. Not because it hurts them — because it heals them.`,
        `Light enters where it is invited. Usagi's prayer is the invitation.`,
      ],
    };

    const options = narratives[mercyType] || narratives.spare_soldier;
    const text = options[Math.floor(Math.random() * options.length)];

    // Add virtue growth notification
    const virtueLines = Object.entries(virtueGains)
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`)
      .join(' | ');

    return {
      text,
      virtueDisplay: virtueLines,
      highestVirtue,
    };
  }

  /**
   * Determine consequences of showing mercy.
   * Spared enemies may return later — as allies, as enemies, or as witnesses.
   */
  _getMercyConsequences(enemyData, currentBook) {
    const consequences = [];
    const outcome = enemyData.mercy_outcome;

    if (outcome) {
      consequences.push({ type: 'scripted', outcome, trigger: 'later_in_book' });
    }

    // Reputation consequence
    if (this.mercyStats.reputation === 'known' || this.mercyStats.reputation === 'renowned' ||
        this.mercyStats.reputation === 'legendary') {
      consequences.push({
        type: 'reputation_effect',
        effect: 'Some enemies may hesitate or surrender before fighting.',
        mechanic: 'mercy_available_enemies_may_auto_surrender',
      });
    }

    // Chain consequence
    if (this.mercyStats.mercyChain >= 5) {
      consequences.push({
        type: 'mercy_chain_effect',
        effect: 'Usagi\'s consistent mercy radiates outward. Nearby enemies take a morale penalty.',
        mechanic: 'enemy_atk_debuff_5pct_in_next_battle',
      });
    }

    // Demon overlay consequence
    if (enemyData.demon_form) {
      consequences.push({
        type: 'demon_rejected',
        demon: enemyData.demon_form.name,
        whisper: enemyData.demon_form.whisper,
        effect: `The ${enemyData.demon_form.name}'s whisper — "${enemyData.demon_form.whisper}" — is answered with mercy. The whisper loses power. Future encounters with ${enemyData.demon_form.name} deal 10% less spiritual damage.`,
        mechanic: 'demon_type_weakened_10pct',
      });
    }

    return consequences;
  }

  // ─────────────────────────────────────────────────────────────
  // MERCY REPUTATION EFFECTS
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if an enemy auto-surrenders based on Usagi's mercy reputation.
   * Called at battle start for mercy-available enemies.
   */
  checkMercyReputation(enemyData) {
    if (!enemyData.mercy_available) return null;
    const rep = this.mercyStats.reputation;

    // Base chance of auto-surrender by reputation
    let surrenderChance = 0;
    if (rep === 'legendary') surrenderChance = 0.30;
    else if (rep === 'renowned') surrenderChance = 0.15;
    else if (rep === 'known') surrenderChance = 0.05;

    // Mini-bosses never auto-surrender
    if (enemyData.tier === 'mini_boss' || enemyData.tier === 'boss') surrenderChance = 0;

    if (surrenderChance > 0 && Math.random() < surrenderChance) {
      return {
        type: 'auto_surrender',
        narrative: this._getAutoSurrenderNarrative(enemyData),
        // Still get mercy rewards but at 70% value
        mercyMultiplier: 0.7,
      };
    }
    return null;
  }

  _getAutoSurrenderNarrative(enemyData) {
    const templates = [
      `${enemyData.name} looks at Usagi. Recognition flickers. "You're the one they talk about. The one who spares." Weapons lower.`,
      `${enemyData.name} hesitates at Usagi's approach. "I've heard... stories. That you don't kill." A pause. "Is it true?"`,
      `Before the first blow, ${enemyData.name} drops their weapon. "I won't fight you. I've heard what you do for those who surrender."`,
      `${enemyData.name}'s hands shake. Not from fear of death — from hope of mercy. They've heard the rumors.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // ─────────────────────────────────────────────────────────────
  // MERCY MILESTONES
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if a mercy milestone has been reached.
   * Milestones trigger special events, dialogue, and permanent bonuses.
   */
  checkMercyMilestones() {
    const total = this.mercyStats.totalMerciesGiven;
    const milestones = [];

    if (total === 1) {
      milestones.push({
        id: 'first_mercy',
        title: 'First Mercy',
        description: 'Usagi chose not to kill for the first time.',
        reward: { spr: 1 },
        dialogue: 'The Messenger appears briefly. Says nothing. Smiles.',
      });
    }
    if (total === 5) {
      milestones.push({
        id: 'merciful_heart',
        title: 'Merciful Heart',
        description: 'Five enemies spared. The pattern is becoming a practice.',
        reward: { spr: 2, charity: 0.5 },
        dialogue: '"Blessed are the merciful," the Messenger says, "for they shall obtain mercy."',
      });
    }
    if (total === 10) {
      milestones.push({
        id: 'known_for_mercy',
        title: 'Known For Mercy',
        description: 'Enemies have heard of the warrior who spares. Some will hesitate.',
        reward: { spr: 3, charity: 1.0 },
        unlock: 'mercy_reputation_system',
        dialogue: '"Your name precedes you now," the Messenger says. "Not as a killer. As something more confusing."',
      });
    }
    if (total === 25) {
      milestones.push({
        id: 'mercy_renowned',
        title: 'The Merciful One',
        description: 'Twenty-five mercies. Usagi\'s reputation crosses eras.',
        reward: { spr: 5, charity: 2.0, hope: 1.0 },
        unlock: 'saint_joseph_affinity_bonus',
        dialogue: '"Saint Joseph was called the Terror of Demons," the Messenger says. "Not because he fought them. Because he was gentle, and gentleness terrifies what is cruel."',
      });
    }
    if (total === 50) {
      milestones.push({
        id: 'mercy_legendary',
        title: 'Legendary Mercy',
        description: 'Fifty mercies. Usagi has become the sermon he once heard.',
        reward: { spr: 10, all_virtues: 1.0 },
        unlock: 'mercy_perception_bonus',
        dialogue: '"Do you know what you\'ve been doing?" the Messenger asks. "You\'ve been proving that the Cross works. Not as a weapon. As a door."',
      });
    }

    // Chain milestones
    if (this.mercyStats.mercyChain === 10) {
      milestones.push({
        id: 'mercy_chain_10',
        title: 'Unbroken Mercy',
        description: 'Ten consecutive mercies without killing a surrendering enemy.',
        reward: { charity: 1.5, temperance: 1.0 },
        dialogue: 'Usagi\'s sword is clean. Not from disuse — from discipline.',
      });
    }

    // Forgiveness milestone
    const betrayersForgiven = this.mercyStats.merciesByType['forgive_betrayer'] || 0;
    if (betrayersForgiven === 3) {
      milestones.push({
        id: 'forgiver_of_betrayers',
        title: 'Seventy Times Seven',
        description: 'Three betrayers forgiven. The hardest mercy of all.',
        reward: { charity: 2.0, faith: 1.0 },
        dialogue: '"Peter asked how many times to forgive," the Messenger says. "The answer was not a number. It was a way of life."',
      });
    }

    return milestones;
  }

  // ─────────────────────────────────────────────────────────────
  // OTHER VIRTUE SOURCES (complement mercy)
  // ─────────────────────────────────────────────────────────────
  //
  // Mercy is the FASTEST path but not the ONLY path.
  // These passive/active sources ensure that a dedicated
  // player can reach high holiness even without perfect mercy.
  //
  // Combined with mercy, these target ~150-170 raw virtue
  // for a fully devoted player across 10 books.
  // ─────────────────────────────────────────────────────────────

  /**
   * Calculate virtue gained from using prayer in combat.
   * Every prayer turn grows faith and hope slightly.
   * This rewards players who choose to pray instead of attack.
   */
  calculatePrayerVirtue(prayerTurns, currentBook) {
    // Each prayer turn gives a small faith/hope bump
    // Diminishing per-battle: first 3 turns count fully, after that 50%
    const effective = Math.min(prayerTurns, 3) + Math.max(0, prayerTurns - 3) * 0.5;
    return {
      faith: Math.round(effective * 0.15 * 100) / 100,
      hope: Math.round(effective * 0.10 * 100) / 100,
    };
  }

  /**
   * Calculate virtue from using a blessing/miracle in combat.
   * Using holy abilities grows the associated virtue.
   */
  calculateBlessingVirtue(miracleId, miracleData) {
    const category = miracleData?.category || 'faith';
    return {
      [category]: 0.2, // Small bump to the associated virtue
    };
  }

  /**
   * Virtue from story events — moral choices, key scenes.
   * These are the BIG virtue jumps, defined per story beat.
   * Approximately 5-8 raw virtue per book from story alone.
   *
   * Example per-book virtue from story (for all-virtue player):
   *   Book 0: +3 (refusing fumi-e, protecting the chapel)
   *   Book 1: +4 (choosing martyrdom path, helping slaves)
   *   Book 2: +5 (desert prayer vigil, standing with Athanasius)
   *   Book 3: +5 (defending the innocent, showing mercy in siege)
   *   Book 4: +4 (sacrifice for villagers, standing against horde)
   *   Book 5: +6 (sustaining hidden faith, the fumi-e choice)
   *   Book 6: +5 (fighting for the enslaved, prayer at Lepanto)
   *   Book 7: +6 (hiding priests, choosing non-violence)
   *   Book 8: +8 (Kolbe's sacrifice echo, forgiving guards)
   *   Final:  +5 (final choices, Accuser confrontation)
   *
   * Total from story: ~51 raw virtue (for all-virtue choices)
   */
  STORY_VIRTUE_PER_BOOK = {
    'book-00': { faith: 1.0, hope: 0.5, charity: 0.5, fortitude: 1.0 },
    'book-01': { faith: 1.0, hope: 0.5, charity: 1.5, fortitude: 1.0 },
    'book-02': { faith: 2.0, hope: 1.0, charity: 1.0, prudence: 1.0 },
    'book-03': { charity: 2.0, justice: 1.5, fortitude: 1.5 },
    'book-04': { fortitude: 2.0, hope: 1.0, faith: 1.0 },
    'book-05': { faith: 2.5, hope: 1.5, temperance: 1.0, prudence: 1.0 },
    'book-06': { fortitude: 2.0, charity: 1.5, hope: 1.5 },
    'book-07': { charity: 2.0, faith: 1.5, fortitude: 1.5, temperance: 1.0 },
    'book-08': { charity: 3.0, faith: 2.0, hope: 2.0, fortitude: 1.0 },
    'final_book': { faith: 2.0, hope: 1.5, charity: 1.5 },
  };

  /**
   * Virtue from confession scenes (1 per book if player finds the priest/hermit).
   * Confession doesn't ADD virtue — it REDISTRIBUTES it.
   * Takes virtue from your HIGHEST and adds it to your LOWEST.
   * This helps players who've been lopsided (all charity, no justice).
   * Net effect: +0.5 to lowest virtue, encouraging balanced growth.
   */
  calculateConfessionVirtue(currentVirtues) {
    const entries = Object.entries(currentVirtues).filter(([k, v]) => v !== undefined);
    if (entries.length < 2) return {};
    entries.sort((a, b) => a[1] - b[1]);
    const lowest = entries[0];
    return {
      [lowest[0]]: 0.5,  // Bump the weakest virtue
    };
  }

  /**
   * Serialize for save.
   */
  toJSON() {
    return {
      phase: this.currentPhase,
      affinities: this.saintAffinities,
      intercessions: this.intercessionsUsed,
      encounters: this.saintEncounters,
      banished: this.demonsBanished,
      prayerTurns: this.prayerTurnsTotal,
    };
  }

  static fromSave(data, events) {
    const engine = new SanctificationEngine(events);
    if (data) {
      engine.currentPhase = data.phase || 0;
      engine.saintAffinities = data.affinities || {};
      engine.intercessionsUsed = data.intercessions || 0;
      engine.saintEncounters = data.encounters || {};
      engine.demonsBanished = data.banished || 0;
      engine.prayerTurnsTotal = data.prayerTurns || 0;
    }
    return engine;
  }
}


// ═══════════════════════════════════════════════════════════════
// PERCEPTION PHASES — How the World Transforms
// ═══════════════════════════════════════════════════════════════

export const PERCEPTION_PHASES = {
  0: {
    name: 'Material Vision',
    description: 'The world as everyone sees it. Soldiers are soldiers. Beasts are beasts.',
    world_effects: {
      palette_shift: 'none',
      particle_overlay: 'none',
      enemy_rendering: 'standard',
      ambient_sound: 'normal',
    },
    combat_options: ['attack', 'guard', 'item', 'pray'],
    pray_effect: 'Pray restores MP and may trigger a minor miracle.',
  },
  1: {
    name: 'Veil Thinning',
    description: 'Shadows that should not move. Whispers in languages that were never spoken. The world is not what it seems.',
    world_effects: {
      palette_shift: 'subtle_desaturate',
      particle_overlay: 'shadow_wisps',
      enemy_rendering: 'shadow_flicker_behind',
      ambient_sound: 'distant_whispers',
      exploration_hint: 'Usagi sometimes pauses and looks over his shoulder.',
    },
    combat_options: ['attack', 'guard', 'item', 'pray'],
    pray_effect: 'Pray may reveal the enemy\'s true nature for 1 turn (shows demon stats).',
  },
  2: {
    name: 'Dual Sight',
    description: 'Two worlds layered on top of each other. The soldier AND the demon that rides him. Both real. Both present.',
    world_effects: {
      palette_shift: 'spiritual_overlay_at_30pct',
      particle_overlay: 'golden_motes_near_sacred',
      enemy_rendering: 'ghost_demon_behind_material',
      ambient_sound: 'harmonic_undertone',
      exploration_hint: 'Sacred sites glow faintly. Hidden crosses pulse with warmth.',
    },
    combat_options: ['attack', 'guard', 'item', 'pray', 'intercede'],
    intercede_description: 'Call upon the saints. A saint may answer based on your virtues.',
    pray_effect: 'Pray can trigger Saint Intercession against appropriate enemies.',
  },
  3: {
    name: 'Spiritual Sight',
    description: 'The veil is gone. The demons are fully visible — grotesque, ancient, hateful. The humans they inhabit are ghostly afterimages. You see the war as it truly is.',
    world_effects: {
      palette_shift: 'spiritual_dominant',
      particle_overlay: 'constant_spiritual_particles',
      enemy_rendering: 'demon_primary_material_ghost',
      ambient_sound: 'angelic_harmonics_faint',
      exploration_hint: 'Guardian angels visible at the edges of vision. Sacred sites blaze with light.',
    },
    combat_options: ['attack', 'guard', 'item', 'pray', 'intercede'],
    intercede_description: 'Saints respond reliably. Boss battles trigger cinematic intercessions.',
    pray_effect: 'Deep prayer. Saints materialize with full power. Usagi enters prayer posture.',
  },
  4: {
    name: 'Transfigured Vision',
    description: 'The material world is a shadow. The spiritual plane is the reality. Angels walk beside you. The light of grace is visible as actual light. The Accuser\'s true form — vast, ancient, terrible — is fully revealed.',
    world_effects: {
      palette_shift: 'transfigured_golden_light',
      particle_overlay: 'constant_holy_particles_angelic_presences',
      enemy_rendering: 'pure_spiritual_plane',
      ambient_sound: 'choir_of_creation',
      exploration_hint: 'Usagi walks in two worlds simultaneously. NPCs seem to shine from within — their souls are visible.',
    },
    combat_options: ['pray', 'intercede', 'guard', 'item'],
    note: 'ATTACK is still available but renamed to "Righteous Strike" and deals holy damage based on SPR.',
    intercede_description: 'Saints descend in glory. Every major battle is a cinematic event. The Blessed Virgin herself answers against the greatest threats.',
    pray_effect: 'Usagi\'s prayer IS the weapon. The saints ARE the army. He has become what his grandmother prayed for.',
  },
};


// ═══════════════════════════════════════════════════════════════
// PERCEPTION SHIFT CUTSCENES
// ═══════════════════════════════════════════════════════════════

export const PERCEPTION_SHIFT_CUTSCENES = {
  1: {
    id: 'perception_shift_1',
    trigger: 'first_time_phase_1',
    steps: [
      { type: 'screen_effect', effect: 'subtle_shake', duration: 500 },
      { type: 'dialogue', speaker: null, lines: [
        'Something shifts behind your eyes.',
        'The soldier in front of you casts a shadow that is not his own.',
        'It moves when he doesn\'t. It has too many limbs.',
        'You blink. It\'s gone. But you know it was there.',
      ]},
      { type: 'notify', text: 'The Veil thins. You begin to see.', color: '#c9a959' },
    ],
  },
  2: {
    id: 'perception_shift_2',
    trigger: 'first_time_phase_2',
    steps: [
      { type: 'screen_effect', effect: 'veil_tear', duration: 1500 },
      { type: 'fade_out', duration: 500, color: '#ffffff' },
      { type: 'dialogue', speaker: null, lines: [
        'The world cracks open.',
        'Behind every soldier — a shape. Dark. Ancient. Hungry.',
        'Behind every wall — light. Faint but real. Prayers that someone said a hundred years ago, still echoing.',
        'You see both worlds at once. It is beautiful and terrifying.',
      ]},
      { type: 'dialogue', speaker: 'The Messenger', lines: [
        'Now you see as the saints see.',
        'The battle was never against flesh and blood.',
        'When you pray in battle now, the saints will hear you. And they will answer.',
      ]},
      { type: 'fade_in', duration: 1000 },
      { type: 'notify', text: 'DUAL SIGHT — Saint Intercession unlocked in combat.', color: '#ffd700' },
    ],
  },
  3: {
    id: 'perception_shift_3',
    trigger: 'first_time_phase_3',
    steps: [
      { type: 'screen_effect', effect: 'veil_shatter', duration: 2000 },
      { type: 'letterbox', size: 30 },
      { type: 'dialogue', speaker: null, lines: [
        'The veil is gone.',
        'The demons are... everywhere. Behind every cruelty. Inside every lie. Woven into the fabric of human suffering like thread through cloth.',
        'They are grotesque. They are ancient. Some are vast — as large as cities. Some are small — parasites on the human soul.',
        'And against them — light. Points of light where someone prays. Rivers of light where a saint has walked. A sun of light above every church where the Eucharist is kept.',
        'The war is real. It has always been real. You just couldn\'t see it before.',
      ]},
      { type: 'fade_in', duration: 1500 },
      { type: 'notify', text: 'SPIRITUAL SIGHT — The veil is gone. You see the true war.', color: '#ffd700' },
    ],
  },
  4: {
    id: 'perception_shift_4',
    trigger: 'first_time_phase_4',
    steps: [
      { type: 'screen_effect', effect: 'transfiguration', duration: 3000 },
      { type: 'music', mood: 'choir_of_creation' },
      { type: 'letterbox', size: 40 },
      { type: 'dialogue', speaker: null, lines: [
        'The material world fades to shadow.',
        'What remains is... light.',
        'Not light as humans understand it. Something deeper. The light that was before the sun was made. The light that said "Let there be" and there was.',
        'In this light, everything is visible. Every prayer ever prayed. Every act of love. Every sacrifice. They hang in the air like stars.',
        'And among them, walking, flying, standing guard — the saints. The angels. The communion of the faithful across all of time.',
        'You are not alone. You were never alone.',
      ]},
      { type: 'dialogue', speaker: 'The Messenger', lines: [
        'This is what your grandmother saw when she prayed.',
        'This is what the martyrs saw when the fire took them.',
        'This is reality, {playerName}. Everything else was the dream.',
      ]},
      { type: 'fade_in', duration: 2000 },
      { type: 'notify', text: 'TRANSFIGURED VISION — You see as the saints see. The battle is theirs now.', color: '#ffd700' },
    ],
  },
};


// ═══════════════════════════════════════════════════════════════
// THE SAINTS — Intercessors in Combat
// ═══════════════════════════════════════════════════════════════

export const SAINTS = {

  // ─── THE HOLY FAMILY ──────────────────────────────────────

  blessed_virgin_mary: {
    id: 'blessed_virgin_mary',
    name: 'The Blessed Virgin Mary',
    title: 'Star of the Sea, Queen of Heaven, Our Lady of Mount Carmel',
    min_holiness: 40,
    boss_tier: 'accuser',
    associated_virtues: ['faith', 'hope', 'charity'],
    strong_against: ['pride', 'satan', 'accuser', 'despair'],
    holy_multiplier: 3.0,
    heal_multiplier: 2.5,
    base_power: 200,
    era_affinity: ['book-06'], // Lepanto — Our Lady of the Rosary

    visual: {
      description: 'She appears as in the Immaculate Conception paintings — standing on a crescent moon, robed in white and blue, twelve stars circling her head like a crown of light. Her mantle is the blue of deep ocean. She is barefoot. She is young — younger than you expected. She is smiling with a gentleness that makes demons scream.',
      height: 64,   // Twice normal sprite height
      palette: ['#ffffff', '#4169e1', '#ffd700', '#f5f0e8', '#c9a959', '#87ceeb'],
      glow: { color: '#ffffff', intensity: 1.0, radius: 80, pulse: true },
      animation: 'floating_gentle_sway_stars_orbiting',
      particles: 'rose_petals_falling_white_light_rays',
      entrance: 'descends_from_above_on_crescent_moon_stars_forming_around_head',
    },

    abilities: [
      {
        id: 'bvm_fiat',
        name: 'Fiat — "Let It Be Done"',
        type: 'presence',
        description: 'The word that changed everything. She does not attack. She speaks the word she spoke to the angel, and the word fills the battlefield with light so total that the demon cannot exist in the same space. It does not die. It simply cannot be where she is.',
        effect: { materialization_boost: 0.5 },
        condition: 'vs_boss',
        cinematic: true,
        animation: 'mary_whispers_fiat_light_expands_from_her_in_a_perfect_sphere_everything_dark_dissolves',
        theology: 'Luke 1:38 — "Be it done to me according to your word." Not a weapon. An obedience so total it remakes reality.',
      },
      {
        id: 'bvm_mantle',
        name: 'Mantle of Protection',
        type: 'shielding',
        description: 'Her blue mantle extends to cover Usagi. While under the mantle, no harm can reach him — physical or spiritual. He is hidden in her, and she is hidden in God.',
        effect: { type: 'absolute_shield', target: 'usagi', duration: 'while_present' },
        condition: 'usagi_in_danger',
        animation: 'blue_mantle_unfurls_gently_covers_usagi_soft_warmth_demons_attacks_dissolve_yards_away',
      },
      {
        id: 'bvm_magnificat',
        name: 'The Magnificat',
        type: 'presence',
        description: '"He has scattered the proud in the imagination of their hearts." She sings. The song is quiet — barely a whisper. But the quiet words unmake the demon from the inside out. Its pride, its hatred, its ancient grudge — all of it collapses under the weight of a lullaby.',
        effect: { materialization_instant: true },
        condition: 'vs_demon',
        cinematic: true,
        animation: 'mary_sings_softly_the_demon_stops_its_form_cracks_light_pours_through_cracks_it_dissolves_not_in_agony_but_in_the_recognition_of_something_it_lost',
      },
      {
        id: 'bvm_crush_serpent',
        name: 'She Shall Crush His Head',
        type: 'presence',
        description: 'Genesis 3:15. The prophecy fulfilled. Against Satan and ONLY Satan. She does not fight him. She does not even look angry. She looks at him with sorrow — the sorrow of a mother who watches a child choose destruction. She places her foot on the serpent. Not in violence. In pity. And the pity is what breaks him — because pity requires love, and love requires God, and God is everything he rejected.',
        effect: { instant_finish: true, target: 'satan_only' },
        condition: 'vs_satan',
        cinematic: true,
        animation: 'mary_descends_on_crescent_moon_looks_at_satan_with_infinite_sorrow_he_cannot_meet_her_eyes_she_places_foot_gently_on_serpent_head_no_force_no_violence_just_presence_screen_goes_white_slowly',
        theology: 'Genesis 3:15, Revelation 12:1 — The Woman clothed with the Sun. The battle was decided in a garden. It ends here.',
        final_battle_only: true,
      },
    ],
  },

  saint_joseph: {
    id: 'saint_joseph',
    name: 'Saint Joseph',
    title: 'Terror of Demons, Protector of the Church, Patron of Workers',
    min_holiness: 20,
    boss_tier: 'sub_boss',
    associated_virtues: ['justice', 'temperance', 'fortitude'],
    strong_against: ['temptation', 'sloth', 'fear'],
    holy_multiplier: 1.8,
    heal_multiplier: 1.5,
    base_power: 140,
    era_affinity: ['book-00', 'book-08'], // Protector of families

    visual: {
      description: 'A carpenter. Broad-shouldered, calloused hands, quiet eyes. He carries a staff of flowering wood — the staff that bloomed to show he was chosen. His robes are brown and simple. He does not glow as brightly as the others. He does not need to. His strength is in his silence and his steady hands.',
      height: 48,
      palette: ['#8b6914', '#654321', '#f5f0e8', '#90ee90', '#ffd700'],
      glow: { color: '#ffd700', intensity: 0.4, radius: 30, pulse: false },
      animation: 'standing_firm_staff_planted_flowers_bloom_at_base',
      particles: 'sawdust_motes_occasional_lily_petal',
      entrance: 'walks_in_from_side_plants_staff_flowers_bloom_instant',
    },

    abilities: [
      {
        id: 'joseph_shield',
        name: 'The Protector\'s Shield',
        type: 'shielding',
        description: 'Joseph steps between Usagi and the enemy. Not with a weapon. With his body. With the authority of a father protecting his child. No attack can pass him. Not because he blocks it — because the attack simply will not touch what he shelters.',
        effect: { type: 'absolute_shield', target: 'usagi', duration: 'while_present' },
        animation: 'joseph_steps_forward_plants_staff_quietly_stands_between_usagi_and_demon_attacks_dissolve_before_reaching_him',
      },
      {
        id: 'joseph_terror',
        name: 'Terror of Demons',
        type: 'presence',
        description: 'Joseph looks at the demon. That is all. He looks. His gaze is steady, calm, unsurprised. He has seen worse. He protected the Christ Child from Herod. He fled through Egypt in the night. This demon is nothing compared to that darkness, and his calm says so. The demon flees — not from power, but from a purity it cannot comprehend.',
        effect: { force_flee: 'all_non_boss_demons', materialization_boost: 0.3 },
        condition: 'vs_demon',
        cinematic: true,
        animation: 'joseph_turns_head_slowly_to_look_at_demon_no_flash_no_spectacle_just_his_eyes_demon_recoils_then_flees',
        theology: 'Joseph\'s title "Terror of Demons" — his purity and silent obedience make him devastating against evil. He never speaks in scripture. He never needs to.',
      },
      {
        id: 'joseph_flowering_staff',
        name: 'The Flowering Staff',
        type: 'presence',
        description: 'The staff blooms. Lilies where there was dead wood. Life where there was death. The demon watches flowers grow from nothing and understands — in a single terrible moment — that creation is still happening, that God is still making things new, and that it chose to be old. It withers.',
        effect: { materialization_boost: 0.4, heal_usagi_pct: 0.3 },
        animation: 'joseph_plants_staff_lilies_bloom_green_light_spreads_demon_watches_and_crumbles',
      },
    ],
  },

  // ─── THE ARCHANGELS ───────────────────────────────────────

  saint_michael: {
    id: 'saint_michael',
    name: 'Saint Michael the Archangel',
    title: 'Captain of the Heavenly Host, Defender of the Faith',
    min_holiness: 25,
    boss_tier: 'major',
    associated_virtues: ['fortitude', 'justice'],
    strong_against: ['pride', 'wrath', 'demon_commander', 'legion'],
    holy_multiplier: 2.5,
    heal_multiplier: 0.5,
    base_power: 180,
    era_affinity: ['book-01', 'book-03', 'book-04'], // Rome, Crusades, Liegnitz

    visual: {
      description: 'Not gentle. Not soft. A warrior of absolute ferocity wrapped in absolute obedience. Armor of hammered light — not metal, light itself shaped into plates and mail. Six wings: two shield his face, two shield his feet, two carry him through dimensions. His sword is not a weapon — it is a sentence. When it falls, it does not cut. It judges. His face is beautiful the way a thunderstorm is beautiful.',
      height: 72,  // Largest saint sprite
      palette: ['#ffd700', '#ffffff', '#c0c0c0', '#4169e1', '#ff4500'],
      glow: { color: '#ffd700', intensity: 0.9, radius: 100, pulse: true },
      animation: 'hovering_wings_beating_slow_sword_ready_armor_of_light_shifting',
      particles: 'feathers_of_light_sparks_from_sword_holy_fire_ambient',
      entrance: 'crashes_down_from_above_impact_crater_of_light_wings_unfurl_sword_ignites',
    },

    abilities: [
      {
        id: 'michael_sword',
        name: 'Sword of Judgment',
        type: 'presence',
        description: 'Michael draws the sword. He does not swing it. He does not need to. The sword is not a weapon — it is a sentence. The demon sees the blade and understands that it has already been judged. The verdict was rendered before time began. The sword merely announces it. The demon comes apart like a lie told in the presence of truth.',
        effect: { materialization_boost: 0.5 },
        condition: 'default',
        cinematic: true,
        animation: 'michael_draws_sword_of_light_holds_it_still_light_radiates_from_blade_demon_stares_at_it_and_begins_to_unravel_no_swing_no_strike_just_the_presence_of_justice',
      },
      {
        id: 'michael_who_is_like_god',
        name: '"Who Is Like God?"',
        type: 'presence',
        description: 'Michael speaks his name. Not a shout — a statement. A question that is also an answer. "Who is like God?" No one. Nothing. The demon hears the question and knows the answer and the answer is its annihilation. Every buff, every shield, every illusion the demon has constructed — all of it collapses, because all of it was built on the lie that something could rival God.',
        effect: { strip_all_buffs: true, materialization_instant: true },
        condition: 'vs_boss',
        cinematic: true,
        animation: 'michael_speaks_name_calmly_golden_shockwave_from_his_voice_not_loud_barely_a_whisper_but_illusions_shatter_like_glass_demon_stands_naked_and_small',
        theology: '"Michael" means "Who is like God?" — a rhetorical challenge. The answer demolishes every pretension of the enemy.',
      },
      {
        id: 'michael_heaven_host',
        name: 'Host of Heaven',
        type: 'presence',
        description: 'Michael is not alone. He was never alone. Behind him — rank upon rank of angels. They do not attack. They do not need to. They sing. One note. One chord of perfect harmony. And the chord is the sound of creation being loved into existence. The demon, which exists only by rejecting love, cannot survive the sound.',
        effect: { materialization_instant: true, all_enemies_withered: true },
        condition: 'vs_legion',
        cinematic: true,
        animation: 'sky_opens_not_tearing_but_blooming_ranks_of_light_visible_one_note_sung_in_perfect_unity_demon_dissolves_not_in_pain_but_in_the_presence_of_what_it_abandoned',
      },
    ],
  },

  saint_raphael: {
    id: 'saint_raphael',
    name: 'Saint Raphael the Archangel',
    title: 'God\'s Healing, Companion of Travelers',
    min_holiness: 15,
    boss_tier: 'sub_boss',
    associated_virtues: ['charity', 'hope'],
    strong_against: ['disease', 'poison', 'blindness', 'despair'],
    holy_multiplier: 1.2,
    heal_multiplier: 3.0,
    base_power: 120,
    era_affinity: ['book-02', 'book-05'], // Desert, Journey

    visual: {
      description: 'He looks like a young man — the way he appeared to Tobias. Simple traveling clothes, a walking staff, a warm smile. But his eyes hold the light of a thousand healings. When he touches the wounded, green-gold light flows from his hands like water. He carries a fish — the sign by which Tobias knew him.',
      height: 48,
      palette: ['#90ee90', '#ffd700', '#f5f0e8', '#4169e1', '#8fbc8f'],
      glow: { color: '#90ee90', intensity: 0.5, radius: 50, pulse: true },
      animation: 'walking_beside_usagi_staff_in_hand_golden_green_trail',
      particles: 'healing_motes_green_gold_gentle_drift',
      entrance: 'appears_walking_from_behind_as_if_he_was_always_there_smiles',
    },

    abilities: [
      {
        id: 'raphael_heal',
        name: 'God Heals',
        type: 'presence',
        description: 'Raphael kneels beside Usagi. His hands glow green-gold, the color of new leaves in sunlight. He does not "cast" a heal — he is near, and nearness to the holy restores what is broken. Wounds close. Poison fades. Despair lifts like fog in morning. This is what the name Raphael means: God heals.',
        effect: { type: 'full_heal', cure_all: true, mp_restore_full: true },
        condition: 'usagi_in_danger',
        cinematic: true,
        animation: 'raphael_kneels_beside_usagi_hands_glow_green_gold_not_touching_just_near_warmth_radiates_wounds_close_like_flowers_blooming_backwards',
      },
      {
        id: 'raphael_bind',
        name: 'Binding of Asmodeus',
        type: 'presence',
        description: 'Raphael gestures — one hand, palm out, as if saying "stop." Golden chains materialize. Not around the demon — from inside it. The chains were always there. The demon chained itself when it chose evil. Raphael merely makes the chains visible. The demon cannot move. Not because it is bound. Because it was always bound. It just didn\'t know.',
        effect: { type: 'absolute_bind', duration: 'until_materialized' },
        condition: 'vs_demon',
        animation: 'raphael_raises_one_hand_gently_golden_chains_emerge_from_inside_demon_it_looks_down_in_horror_at_chains_that_were_always_there',
        theology: 'Tobit 8:3 — Raphael bound Asmodeus. Not by force. By the authority of the one who sent him.',
      },
      {
        id: 'raphael_companion',
        name: 'Traveling Companion',
        type: 'shielding',
        description: 'Raphael walks beside Usagi for the remainder of the battle. While he is near, Usagi heals each turn, all stats increase, and the demon\'s attacks weaken — not because Raphael blocks them, but because his presence reminds the demon how small it is.',
        effect: { type: 'companion', heal_per_turn: 0.15, stat_bonus: 3, enemy_atk_reduction: 0.3 },
        animation: 'raphael_falls_into_step_beside_usagi_warmth_connects_them_demon_shrinks_slightly',
      },
    ],
  },

  saint_gabriel: {
    id: 'saint_gabriel',
    name: 'Saint Gabriel the Archangel',
    title: 'Messenger of God, Strength of God',
    min_holiness: 20,
    boss_tier: 'sub_boss',
    associated_virtues: ['faith', 'prudence'],
    strong_against: ['deception', 'confusion', 'illusion', 'heresy'],
    holy_multiplier: 2.0,
    heal_multiplier: 1.0,
    base_power: 150,
    era_affinity: ['book-02', 'book-06'], // Nicaea, Lepanto

    visual: {
      description: 'He carries a lily and a trumpet. The lily is white as first snow. The trumpet is gold as the first sunrise. His robes are white and gold, and his face is the face of every announcement — birth, death, judgment, mercy. He is the voice. When he speaks, reality listens.',
      height: 56,
      palette: ['#ffffff', '#ffd700', '#f5f0e8', '#ffe4b5', '#87ceeb'],
      glow: { color: '#ffd700', intensity: 0.7, radius: 60, pulse: false },
      animation: 'floating_trumpet_raised_lily_in_other_hand_robes_flowing',
      particles: 'musical_notes_of_light_lily_petals_trumpet_sound_waves',
      entrance: 'trumpet_blast_from_above_descends_on_beam_of_light_robes_billowing',
    },

    abilities: [
      {
        id: 'gabriel_trumpet',
        name: 'The Trumpet of Truth',
        type: 'presence',
        description: 'Gabriel raises the trumpet. He does not blow it — not yet. The demon sees the trumpet and knows what it means. It means announcement. Judgment. The end of pretending. Every illusion, every disguise, every comfortable lie the demon has wrapped around itself peels away like dead skin, and what is underneath is small and afraid and nothing.',
        effect: { strip_all_illusions: true, materialization_boost: 0.4 },
        condition: 'vs_deception',
        cinematic: true,
        animation: 'gabriel_raises_trumpet_does_not_blow_the_anticipation_alone_causes_illusions_to_crack_and_shatter_demon_revealed_as_it_truly_is_small_and_shaking',
      },
      {
        id: 'gabriel_annunciation',
        name: '"Be Not Afraid"',
        type: 'shielding',
        description: 'Gabriel speaks the words he spoke to Mary, to Zechariah, to Daniel. "Be not afraid." The words are not a suggestion. They are a command backed by the full authority of the One who sent him. Fear dissolves. Despair lifts. Confusion clears. And the demon, whose entire arsenal depends on fear, finds itself disarmed.',
        effect: { cure_all_spiritual_status: true, immune_fear_despair: true },
        condition: 'usagi_feared',
        animation: 'gabriel_speaks_three_words_softly_be_not_afraid_words_appear_in_golden_light_fear_evaporates_like_dew_demon_staggers_its_weapons_useless',
      },
      {
        id: 'gabriel_word',
        name: 'The Word Made Light',
        type: 'presence',
        description: 'Gabriel speaks a single word in the language of heaven. Not a word humans know. A word that IS the thing it describes. The word enters the demon and the demon recognizes it — it is the truth about itself that it has spent eternity denying. The truth unmakes it.',
        effect: { materialization_boost: 0.5 },
        condition: 'default',
        animation: 'gabriel_speaks_one_word_no_sound_humans_can_hear_but_the_demon_hears_and_its_face_changes_recognition_then_horror_then_dissolution',
      },
    ],
  },

  // ─── THE GREAT SAINTS ─────────────────────────────────────

  saint_francis_de_sales: {
    id: 'saint_francis_de_sales',
    name: 'Saint Francis de Sales',
    title: 'Doctor of the Church, Gentleman Saint, Patron of Writers',
    min_holiness: 20,
    boss_tier: 'sub_boss',
    associated_virtues: ['charity', 'prudence', 'temperance'],
    strong_against: ['heresy', 'calvinism', 'despair', 'wrath'],
    holy_multiplier: 1.5,
    heal_multiplier: 2.0,
    base_power: 130,
    era_affinity: ['book-07'], // France — the Reformation era

    visual: {
      description: 'A bishop in simple robes — not the extravagant vestments, but the worn cassock of a man who walked mountain passes to bring the faith back to the Chablais. His face is kind but not soft. His eyes see through pretense with devastating gentleness. He carries a quill that writes in light and a heart — his own heart — visible through his chest, wrapped in thorns and crowned with a cross. When he smiles, hardened sinners weep.',
      height: 48,
      palette: ['#800080', '#ffd700', '#f5f0e8', '#ff69b4', '#4b0082'],
      glow: { color: '#ff69b4', intensity: 0.4, radius: 40, pulse: true },
      animation: 'standing_gentle_hand_extended_quill_writing_in_air_heart_glowing',
      particles: 'written_words_of_light_floating_upward_heart_glow_pulses',
      entrance: 'walks_in_quietly_bows_slightly_to_usagi_begins_writing_in_light',
    },

    abilities: [
      {
        id: 'fds_gentle_word',
        name: 'A Spoonful of Honey',
        type: 'presence',
        description: '"You catch more flies with a spoonful of honey than a barrel of vinegar." Francis walks toward the enemy. Not with a weapon. With an open hand and a gentle smile. He speaks to the human underneath the demon — speaks to the person they were before the darkness took them. And the human hears. And remembers. And the demon, which depended on the human forgetting, begins to dissolve.',
        effect: { convert_if_human: true, materialization_boost: 0.3 },
        condition: 'vs_human',
        cinematic: true,
        animation: 'francis_walks_calmly_toward_enemy_speaks_gently_the_demon_form_flickers_the_human_underneath_looks_up_weapons_lower_knees_bend_tears',
      },
      {
        id: 'fds_introduction',
        name: 'Introduction to the Devout Life',
        type: 'presence',
        description: 'His greatest work, manifest in light. Pages of golden text spiral outward — not arguments, but invitations. Each page that touches the demon burns it, not with fire but with kindness. The demon has no defense against kindness. It was built to resist hatred. Love is the weapon it never prepared for.',
        effect: { materialization_boost: 0.4, virtue_buff_all: 2 },
        animation: 'francis_opens_invisible_book_pages_of_golden_light_spiral_outward_each_page_that_touches_demon_makes_it_smaller_not_in_size_but_in_significance',
      },
      {
        id: 'fds_live_jesus',
        name: '"Live, Jesus!"',
        type: 'presence',
        description: 'His motto. His prayer. His final word on his deathbed. He says it once, quietly, and the name of Christ fills the space. The demon cannot exist where that name is spoken with love. Not because the name is a weapon. Because the name is a reality, and the demon is a fiction.',
        effect: { materialization_boost: 0.5, heal_usagi_pct: 0.3 },
        condition: 'vs_demon',
        cinematic: true,
        animation: 'francis_whispers_live_jesus_the_words_glow_and_expand_filling_battlefield_demon_tries_to_speak_cannot_its_voice_is_drowned_in_the_name_it_fades',
      },
    ],
  },

  saint_albert_the_great: {
    id: 'saint_albert_the_great',
    name: 'Saint Albert the Great',
    title: 'Doctor Universalis, Patron of Scientists',
    min_holiness: 25,
    boss_tier: 'sub_boss',
    associated_virtues: ['prudence', 'justice', 'faith'],
    strong_against: ['ignorance', 'gnosticism', 'deception', 'heresy'],
    holy_multiplier: 2.0,
    heal_multiplier: 1.0,
    base_power: 145,
    era_affinity: ['book-02', 'book-03', 'book-04'], // Scholastic era

    visual: {
      description: 'A Dominican friar massive in intellect and stature. White habit, black cloak. He carries an enormous book that is also a weapon — the Summa of all knowledge, natural and supernatural. His eyes contain constellations. When he opens the book, diagrams of creation unfold — the movements of planets, the structure of crystals, the anatomy of angels. He proved that faith and reason are not enemies. His proof is himself.',
      height: 52,
      palette: ['#ffffff', '#000000', '#ffd700', '#4169e1', '#c0c0c0'],
      glow: { color: '#4169e1', intensity: 0.5, radius: 50, pulse: false },
      animation: 'standing_book_open_diagrams_floating_around_him_constellations_in_eyes',
      particles: 'geometric_light_forms_orbiting_star_charts_formula_fragments',
      entrance: 'opens_book_reality_reshapes_around_him_diagrams_of_creation_spiral_outward',
    },

    abilities: [
      {
        id: 'albert_analysis',
        name: 'Universal Knowledge',
        type: 'presence',
        description: 'Albert opens the book. Not to attack — to understand. He reads the demon the way he read the stars, the crystals, the anatomy of birds. He names every part of it — its origin, its nature, its weakness, its lie. The demon has never been fully seen before. It has always hidden behind mystery and fear. Albert removes the mystery. Without mystery, the demon is just... sad.',
        effect: { reveal_all: true, materialization_boost: 0.3, demon_def_zero: true },
        condition: 'default',
        animation: 'albert_opens_book_diagrams_of_the_demon_unfold_in_light_labeling_every_part_of_it_the_demon_tries_to_hide_but_knowledge_finds_every_shadow',
      },
      {
        id: 'albert_summa',
        name: 'Summa Scientiarum',
        type: 'presence',
        description: 'The sum of all knowledge. Albert closes the book and the book becomes a point of light — every truth he ever discovered compressed into a single radiance. The light is not hot. It is not bright in the way fire is bright. It is simply TRUE. And truth is the one thing a lie cannot survive.',
        effect: { materialization_boost: 0.5 },
        condition: 'vs_boss',
        cinematic: true,
        animation: 'albert_closes_book_it_compresses_into_a_point_of_pure_white_light_he_holds_it_in_his_palm_the_demon_looks_at_the_light_and_sees_itself_as_it_truly_is_it_cannot_bear_what_it_sees',
      },
      {
        id: 'albert_creation_diagram',
        name: 'Diagram of Creation',
        type: 'presence',
        description: 'Albert draws in the air — the diagram of creation. The orbits of planets. The growth of crystals. The spiral of a shell. The geometry of beauty. The demon stands inside the diagram and recognizes that everything around it was made with love, that the universe is a gift, and that it is the only thing in creation that refused the gift. The recognition is unbearable.',
        effect: { immobilize: true, materialization_boost: 0.3 },
        condition: 'vs_demon',
        animation: 'albert_draws_in_light_geometric_beauty_spirals_around_demon_stars_and_shells_and_crystals_the_demon_stands_still_transfixed_by_the_beauty_of_what_it_abandoned',
      },
    ],
  },

  saint_francis_assisi: {
    id: 'saint_francis_assisi',
    name: 'Saint Francis of Assisi',
    title: 'Il Poverello, Bearer of the Stigmata, Brother of All Creation',
    min_holiness: 30,
    boss_tier: 'major',
    associated_virtues: ['charity', 'hope', 'temperance'],
    strong_against: ['greed', 'pride', 'wrath', 'violence'],
    holy_multiplier: 1.0,
    heal_multiplier: 3.0,
    base_power: 100,
    era_affinity: ['book-03'], // Crusades — Francis met the Sultan

    visual: {
      description: 'Barefoot. Brown robe with a rope belt. He is small, thin, scarred from fasting. His hands bleed from the stigmata — wounds that glow with golden light. Birds perch on his shoulders. A wolf sits at his feet. He looks at demons not with fury but with something worse: pity. He does not attack. He never attacks. He loves, and love is the most devastating force in creation.',
      height: 40,  // Smaller than other saints
      palette: ['#8b4513', '#ffd700', '#90ee90', '#ff6347', '#f5f0e8'],
      glow: { color: '#ffd700', intensity: 0.6, radius: 70, pulse: true },
      animation: 'standing_barefoot_hands_open_stigmata_glowing_birds_on_shoulders_wolf_at_feet',
      particles: 'golden_blood_drops_from_stigmata_birds_circling_flowers_blooming_at_feet',
      entrance: 'walks_in_barefoot_flowers_bloom_where_he_steps_animals_gather_behind_him',
    },

    abilities: [
      {
        id: 'francis_peace',
        name: 'Brother, Let Me Tell You About God',
        type: 'presence',
        description: 'Francis walks toward the enemy. Barefoot. Hands open. Stigmata glowing faintly. He does not fight. He talks. To the demon, he says: "Brother. I know what you were. I know what you lost. I am sorry." The demon — which has been hated for millennia, feared, cursed, fought — has never been pitied. The pity breaks something inside it. Not its body. Its conviction that it is beyond love.',
        effect: { convert_human: true, stun_demon: true, materialization_boost: 0.3 },
        condition: 'default',
        cinematic: true,
        animation: 'francis_walks_barefoot_toward_enemy_hands_open_stigmata_glowing_speaks_gently_demon_stops_stares_tries_to_attack_cannot_something_in_its_face_changes',
      },
      {
        id: 'francis_stigmata',
        name: 'The Stigmata',
        type: 'presence',
        description: 'Francis opens his hands. The wounds glow — not with power, but with love accepted. Love that said yes to suffering. The light from the wounds is small. A candle. Less than a candle. But the demon, which is made of every "no" ever spoken to God, cannot bear even this smallest "yes." The light of one wound, freely accepted, is enough to fill the battlefield. The demon does not die. It weeps. And in weeping, it begins to dissolve.',
        effect: { materialization_instant: true },
        condition: 'vs_boss',
        cinematic: true,
        animation: 'francis_opens_his_hands_small_golden_light_from_five_wounds_barely_visible_a_candle_in_a_cathedral_but_the_demon_recoils_as_if_from_the_sun_because_it_is_not_the_size_of_the_light_it_is_the_nature_of_the_light_the_demon_weeps_and_dissolves',
        theology: 'The stigmata are not weapons. They are wounds accepted in love. A single candle of God\'s light is enough to blot out the most fearsome of foes — because darkness has no substance. It is only the absence of light.',
      },
      {
        id: 'francis_canticle',
        name: 'Canticle of the Sun',
        type: 'presence',
        description: '"Be praised, my Lord, through all your creatures." Francis sings. Softly. Off-key, probably — he was never a great singer. But the song calls creation itself to witness. Flowers bloom at his feet. Birds land on his shoulders. A wolf sits at his side. The sun brightens. And the demon, which is against creation, finds itself surrounded by everything it hates — not as enemies, but as evidence that God\'s world is beautiful and the demon\'s rejection of it was wrong.',
        effect: { full_heal_usagi: true, cure_all: true, materialization_boost: 0.4 },
        condition: 'usagi_in_danger',
        cinematic: true,
        animation: 'francis_sings_quietly_flowers_bloom_birds_gather_sun_brightens_the_demon_watches_creation_celebrate_and_knows_it_chose_wrong_it_diminishes_not_destroyed_but_made_irrelevant_by_joy',
      },
    ],
  },
};


// ═══════════════════════════════════════════════════════════════
// THE DEMONIC HIERARCHY — Sub-Bosses and Major Bosses
// ═══════════════════════════════════════════════════════════════

export const DEMON_HIERARCHY = {

  // ─── MINOR DEMONS (visible at Phase 1+) ───────────────────
  minor: {
    description: 'Parasites. They ride human hosts — soldiers, bandits, persecutors. At Phase 0, you see only the human. At Phase 1+, you see the shadow behind them.',
    types: [
      {
        id: 'imp_of_wrath',
        name: 'Imp of Wrath',
        demon_type: 'wrath',
        whisper: 'Strike them. They deserve it.',
        visual: { species: 'demon_minor', palette: ['#8b0000', '#ff4500', '#1a0a0a'], height: 20 },
        stats: { hp: 30, atk: 12, def: 3, spd: 8, spr: 2 },
        weaknesses: ['holy', 'charity'],
        abilities: ['incite_rage', 'fury_swipe'],
        appears_behind: ['soldiers', 'bandits', 'zealots'],
      },
      {
        id: 'imp_of_greed',
        name: 'Imp of Greed',
        demon_type: 'greed',
        whisper: 'Take it. No one will know.',
        visual: { species: 'demon_minor', palette: ['#228b22', '#ffd700', '#1a1a0a'], height: 18 },
        stats: { hp: 25, atk: 6, def: 8, spd: 5, spr: 2 },
        weaknesses: ['holy', 'temperance'],
        abilities: ['gold_drain', 'item_steal'],
        appears_behind: ['traders_corrupted', 'tax_collectors', 'thieves'],
      },
      {
        id: 'imp_of_fear',
        name: 'Imp of Fear',
        demon_type: 'fear',
        whisper: 'Run. You cannot win.',
        visual: { species: 'demon_minor', palette: ['#4a4a7a', '#0a0a2e', '#666666'], height: 24 },
        stats: { hp: 20, atk: 8, def: 4, spd: 10, spr: 5 },
        weaknesses: ['holy', 'fortitude'],
        abilities: ['inflict_fear', 'shadow_strike', 'whisper_despair'],
        appears_behind: ['cowards', 'fleeing_civilians', 'traitors'],
      },
      {
        id: 'imp_of_pride',
        name: 'Imp of Pride',
        demon_type: 'pride',
        whisper: 'You are better than them. Why bow?',
        visual: { species: 'demon_minor', palette: ['#ffd700', '#800080', '#1a0a2e'], height: 22, crown: true },
        stats: { hp: 35, atk: 10, def: 6, spd: 6, spr: 8 },
        weaknesses: ['holy', 'charity'],
        abilities: ['pride_shield', 'mock_prayer', 'virtue_drain'],
        appears_behind: ['commanders', 'nobles', 'corrupt_clergy'],
      },
      {
        id: 'shade_of_despair',
        name: 'Shade of Despair',
        demon_type: 'despair',
        whisper: 'It doesn\'t matter. Nothing matters. Stop trying.',
        visual: { species: 'demon_minor', palette: ['#2a2a2a', '#1a1a1a', '#444444'], height: 30, formless: true },
        stats: { hp: 40, atk: 5, def: 2, spd: 3, spr: 12 },
        weaknesses: ['holy', 'hope'],
        abilities: ['drain_hope', 'weight_of_emptiness', 'silence_prayer'],
        appears_behind: ['broken_priests', 'apostates', 'the_despairing'],
      },
    ],
  },

  // ─── SUB-BOSSES (one per book, visible at Phase 2+) ──────
  sub_bosses: {
    description: 'Lieutenants of hell. Each one commands a legion of minor demons. Each one embodies a specific heresy or sin that threatens the era. Defeating them does not kill them — it banishes them for a generation.',
    bosses: [
      {
        id: 'asmodeus',
        name: 'Asmodeus',
        title: 'Prince of Lust and Deception',
        book: 'book-00',
        demon_type: 'deception',
        theme: 'Disguise — appears as a beautiful youth who offers Usagi "freedom" from his calling.',
        visual: {
          description: 'At first, breathtakingly beautiful — golden-skinned, symmetrical, radiating warmth. As the fight progresses and holy damage is dealt, the beauty peels away like paint, revealing something with too many eyes and a mouth full of needles.',
          height: 56,
          palette: ['#ffd700', '#ff69b4', '#8b0000', '#1a0a0a', '#0a0a1a'],
          phases: [
            { hp_pct: '100-60', form: 'beautiful_youth', palette_shift: 'warm_golden' },
            { hp_pct: '60-30', form: 'cracking_beauty', palette_shift: 'gold_bleeding_to_red' },
            { hp_pct: '30-0', form: 'true_form_many_eyes', palette_shift: 'dark_red_black' },
          ],
        },
        stats: { hp: 300, atk: 18, def: 12, spd: 14, spr: 10 },
        weaknesses: ['holy', 'truth'],
        resistances: ['physical', 'deception'],
        abilities: [
          { id: 'allure', name: 'Allure', effect: 'inflict confusion + charm', desc: 'Target attacks allies for 2 turns.' },
          { id: 'mirror_form', name: 'Mirror Form', effect: 'copies Usagi appearance', desc: 'Allies cannot distinguish attacker.' },
          { id: 'promise', name: 'False Promise', effect: 'offers to end battle — if accepted, all virtues -2', desc: 'The easy way out.' },
          { id: 'true_reveal', name: 'True Form (Phase 3)', effect: 'ATK doubles, loses deception abilities, gains brutal physical', desc: 'The mask is off.' },
        ],
        saint_counter: 'saint_raphael',  // Raphael bound Asmodeus in the Book of Tobit
        defeat_cutscene: 'Raphael appears and binds Asmodeus with golden chains, as he did for Tobias. "I bound you once. I bind you again. In the name of the Most High."',
      },
      {
        id: 'azazel',
        name: 'Azazel',
        title: 'Corruptor of Knowledge, Fallen Teacher',
        book: 'book-01',
        demon_type: 'heresy',
        theme: 'Gnosticism — the demon behind Demas\'s teaching that the body doesn\'t matter.',
        visual: {
          description: 'An enormous figure in a scholar\'s robe that trails into smoke. He has six arms, each holding a different text — all corrupted, all nearly-true. His head is a library on fire. Books burn eternally in his wake. He teaches lies wrapped in truth, which is the most dangerous weapon in hell.',
          height: 64,
          palette: ['#4b0082', '#ffd700', '#ff4500', '#1a1a3d', '#000000'],
        },
        stats: { hp: 450, atk: 22, def: 15, spd: 10, spr: 18 },
        weaknesses: ['holy', 'truth', 'faith'],
        abilities: [
          { id: 'heretic_word', name: 'Heretic\'s Word', effect: '2× spiritual damage + confuse', desc: 'A truth twisted just enough to wound.' },
          { id: 'false_light', name: 'False Light', effect: 'mimics holy damage against allies', desc: 'Even the light can be counterfeited.' },
          { id: 'gnosis_trap', name: 'Gnosis Trap', effect: 'seals miracles for 3 turns', desc: '"Knowledge" that blocks prayer.' },
        ],
        saint_counter: 'saint_albert_the_great',
        defeat_cutscene: 'Albert opens his book. Every truth Azazel corrupted appears in its original form. The light of uncorrupted knowledge burns Azazel like acid. "Truth is not your weapon. It is mine."',
      },
      {
        id: 'belial',
        name: 'Belial',
        title: 'Prince of Worthlessness, Whisperer of Acedia',
        book: 'book-04',
        demon_type: 'despair',
        theme: 'The Mongol Storm — the temptation to stop caring, to let numbness win.',
        visual: {
          description: 'He has no form. He IS formlessness. A grey fog with a voice. Where he passes, color drains. Grass dies. Music stops. He doesn\'t attack — he simply makes everything feel pointless. His greatest weapon is the sentence: "Why bother?"',
          height: 80,
          palette: ['#808080', '#696969', '#555555', '#3a3a3a', '#1a1a1a'],
          formless: true,
        },
        stats: { hp: 600, atk: 10, def: 20, spd: 5, spr: 25 },
        weaknesses: ['holy', 'hope', 'joy'],
        resistances: ['physical', 'dark'],
        abilities: [
          { id: 'why_bother', name: '"Why Bother?"', effect: 'ATK/SPR -30% for 3 turns', desc: 'The most dangerous question.' },
          { id: 'grey_fog', name: 'Grey Fog', effect: 'all damage reduced by 50% (both sides)', desc: 'Nothing matters — not even this fight.' },
          { id: 'drain_meaning', name: 'Drain Meaning', effect: 'reduces all virtues by 0.5 per turn', desc: 'He erodes what you are.' },
          { id: 'empty_sky', name: 'The Empty Sky', effect: 'seals all miracles for 2 turns + despair', desc: '"God has left. Accept it."' },
        ],
        saint_counter: 'saint_francis_assisi',
        defeat_cutscene: 'Francis begins to sing the Canticle of the Sun. Color returns. The grey fog screams — not in pain but in recognition that joy exists and it cannot be extinguished. "Be praised, my Lord, through Brother Sun." The fog dissolves.',
      },
    ],
  },

  // ─── MAJOR BOSSES (one per 2-3 books, visible at Phase 3+) ─
  major_bosses: {
    description: 'The generals of hell. Ancient, powerful, each one responsible for a specific era of persecution. They are named in scripture and tradition. They do not flee when banished — they are diminished.',
    bosses: [
      {
        id: 'abaddon',
        name: 'Abaddon',
        title: 'The Destroyer, Angel of the Abyss',
        books: ['book-01', 'book-03'],
        demon_type: 'destruction',
        theme: 'The rage that destroys everything — Rome\'s persecution, the Crusades\' violence.',
        visual: {
          description: 'A locust the size of a cathedral. Crown of iron. Face of a man twisted in permanent agony. Wings that sound like chariots of war. Revelation 9:11 made flesh. He is destruction itself — not chaos, not evil per se, but the systematic annihilation of everything beautiful.',
          height: 96,
          palette: ['#1a0a0a', '#8b0000', '#ff4500', '#ffd700', '#4a0000'],
          multi_phase: true,
        },
        phases: [
          { id: 'locust', hp_pct: '100-50', form: 'Locust King', abilities: ['locust_swarm', 'iron_crown_slam', 'wings_of_war'] },
          { id: 'destroyer', hp_pct: '50-0', form: 'The Destroyer Unbound', abilities: ['annihilation_wave', 'abyss_gate', 'despair_scream'] },
        ],
        stats: { hp: 1500, atk: 40, def: 30, spd: 15, spr: 20 },
        saint_counter: 'saint_michael',
        defeat_cinematic: {
          description: 'Michael descends in full armor of light. Six wings unfurl. The sword of judgment ignites. Abaddon charges. They clash midair — shockwave shatters the battlefield. Michael\'s sword cuts through Abaddon\'s crown. "You were never a king. You were always a slave." Abaddon falls.',
          duration: 15000,
          phases: ['approach', 'clash', 'sword_vs_crown', 'judgment', 'fall'],
        },
      },
      {
        id: 'legion',
        name: 'Legion',
        title: '"We Are Many"',
        books: ['book-05', 'book-06'],
        demon_type: 'legion',
        theme: 'The hidden church, the divided church — demons that multiply and overwhelm.',
        visual: {
          description: 'Not one demon but thousands wearing one body like a suit. The body shifts — now a man, now a woman, now a child, now a beast. Thousands of voices speak simultaneously. Each face that surfaces screams for help before being pulled back under.',
          height: 72,
          palette: ['#2a0a2a', '#5a1a5a', '#8b008b', '#ff00ff', '#ffffff'],
          shifting_form: true,
        },
        phases: [
          { id: 'one_body', hp_pct: '100-70', form: 'Single Form', note: 'Appears as one powerful demon' },
          { id: 'splitting', hp_pct: '70-40', form: 'Splitting', note: 'Splits into 3 copies, each weaker' },
          { id: 'swarm', hp_pct: '40-0', form: 'The Swarm', note: 'Hundreds of tiny demons, must be defeated with AoE/holy' },
        ],
        stats: { hp: 2000, atk: 35, def: 20, spd: 20, spr: 15 },
        saint_counter: 'saint_michael',
      },
      {
        id: 'satan',
        name: 'Satan',
        title: 'The Adversary, Father of Lies, Prince of this World',
        books: ['final_book'],
        demon_type: 'satan',
        theme: 'The source. Every heresy, every persecution, every fumi-e. He is behind all of it.',
        visual: {
          description: 'He is not what you expected. He is beautiful — the most beautiful being ever created. Lucifer, the light-bearer. His beauty is a weapon. His logic is perfect. His compassion is convincing. And all of it is a lie. He appears first as the Senator, the Bishop, the Chaplain, the Magistrate — every face the Accuser has worn across every era. Then the faces peel away and what remains is an angel of light, weeping, who says: "I only wanted to be free." The final deception. Because freedom without God is the oldest prison.',
          height: 120,
          palette: ['#ffffff', '#ffd700', '#ff4500', '#8b0000', '#000000'],
          phases: [
            { id: 'all_faces', hp_pct: '100-75', form: 'Every Face', note: 'Cycles through all Accuser forms from all books. Each form uses that era\'s tactics.' },
            { id: 'angel_of_light', hp_pct: '75-50', form: 'Angel of Light', note: 'Beautiful, devastating. Uses corrupted holy damage. "I was the first to worship. I loved God more than any of you."' },
            { id: 'the_adversary', hp_pct: '50-25', form: 'The Adversary', note: 'Drops all pretense. Pure destructive power. The hatred of eternity concentrated.' },
            { id: 'the_serpent', hp_pct: '25-0', form: 'The Serpent', note: 'Genesis 3. The first tempter. Returns to where it began. "Did God really say...?"' },
          ],
        },
        stats: { hp: 9999, atk: 80, def: 50, spd: 30, spr: 60 },
        weaknesses: ['blessed_virgin', 'humility', 'obedience'],
        resistances: ['physical', 'all_non_holy'],
        saint_counter: 'blessed_virgin_mary',
        defeat_cinematic: {
          description: 'Usagi is on his knees. He has been praying for the entire battle. The saints have fought — Michael, Gabriel, Raphael, Joseph, Francis, Albert, Francis de Sales — all of them. But Satan stands. Then: light. Not from above. From below. From the earth itself. From every prayer ever prayed. From Obaa-chan\'s chapel. From the catacombs. From the desert. From the burning castle. From the guillotine. From the death camp. From every place where someone whispered "God help me" and meant it. Mary appears. Standing on the crescent moon. Stars for a crown. She looks at Satan, and for the first time in the entire game, he is afraid. Not of her power. Of her love. Because love is the one thing he cannot understand, cannot corrupt, cannot defeat. She places her foot on the serpent\'s head. Not in violence. In sorrow. "I pity you," she says. And it is the pity that breaks him. Because pity requires love, and love requires God, and God is everything Satan rejected. The screen goes white.',
          duration: 30000,
          phases: ['saints_fighting', 'saints_falling_back', 'prayer_gathering', 'mary_descent', 'confrontation', 'crushing', 'white_light'],
        },
      },
    ],
  },
};


// ═══════════════════════════════════════════════════════════════
// HOLINESS vs MARTIAL — DUAL PROGRESSION TREE
// ═══════════════════════════════════════════════════════════════

/**
 * The game tracks two hidden scores:
 *   MARTIAL ALIGNMENT: increased by physical attacks, weapon kills, martial skill use
 *   HOLINESS ALIGNMENT: increased by prayer turns, intercessions, virtue gains, mercy
 *
 * These are NOT mutually exclusive. A balanced player gets both.
 * But a heavily-weighted player gets dramatically different gameplay:
 *
 *   PURE MARTIAL (80%+ martial): Classic JRPG combat. Usagi fights directly.
 *     Saints never appear. Demons remain as shadows. The game is "normal."
 *     Harder bosses because no saint help. BUT: more weapon drops, higher ATK,
 *     martial ultimate abilities hit harder.
 *
 *   PURE HOLINESS (80%+ holiness): The game transforms. By mid-game,
 *     Usagi barely swings a sword. He prays. Saints fight. Boss battles are
 *     cinematic intercession events. The game is EASIER in combat but harder
 *     in virtue maintenance — sins and compromises cost more.
 *
 *   BALANCED (40-60% each): The "prayer warrior." Usagi fights AND prays.
 *     Can call saints in emergencies. Sees demons clearly. The intended
 *     experience for most players.
 */

export const ALIGNMENT_THRESHOLDS = {
  pure_martial:    { martial_pct: 0.80, label: 'Warrior of God', combat_style: 'direct_combat_enhanced' },
  martial_leaning: { martial_pct: 0.60, label: 'Soldier of Christ', combat_style: 'fight_with_prayer_support' },
  balanced:        { martial_pct: 0.40, label: 'Prayer Warrior', combat_style: 'dual_combat_saint_emergency' },
  holy_leaning:    { martial_pct: 0.25, label: 'Contemplative', combat_style: 'prayer_primary_fight_secondary' },
  pure_holiness:   { martial_pct: 0.10, label: 'Living Saint', combat_style: 'prayer_only_saints_fight' },
};

export const HOLINESS_SKILL_TREE = {
  name: 'Way of Sanctification',
  description: 'As Usagi grows in holiness, combat itself transforms. Weapons become secondary. Prayer becomes primary. The saints become the army.',

  branches: {
    perception: {
      name: 'Sight Beyond Sight',
      description: 'See the spiritual plane. See the demons. See the angels.',
      skills: [
        { id: 'hol_shadow_sense', name: 'Shadow Sense', desc: 'Faint shadows visible behind possessed enemies.', holiness_req: 5, passive: { enemy_reveal: 'shadow' } },
        { id: 'hol_veil_pierce', name: 'Pierce the Veil', desc: 'See demon forms at 50% opacity behind material enemies.', holiness_req: 12, requires: ['hol_shadow_sense'], passive: { enemy_reveal: 'dual' } },
        { id: 'hol_true_sight', name: 'True Sight', desc: 'See demons clearly. See angel guardians. See prayer trails.', holiness_req: 20, requires: ['hol_veil_pierce'], passive: { enemy_reveal: 'full', angel_visible: true } },
        { id: 'hol_transfigured_eye', name: 'Transfigured Eye', desc: 'The spiritual plane is primary. Material world is the shadow. See everything.', holiness_req: 35, requires: ['hol_true_sight'], passive: { enemy_reveal: 'transfigured', reality: 'spiritual_primary' } },
        { id: 'hol_beatific_vision', name: 'Beatific Vision', desc: 'See as God sees. All enemies, traps, secrets, and hidden paths revealed. All saint affinities +10.', holiness_req: 50, requires: ['hol_transfigured_eye'], passive: { reveal_all: true, saint_affinity_all: 10 } },
      ],
    },

    intercession: {
      name: 'Communion of Saints',
      description: 'Call upon the saints. They hear you. They answer.',
      skills: [
        { id: 'hol_whispered_prayer', name: 'Whispered Prayer', desc: 'Pray action has 15% chance to trigger a minor saint blessing (small heal or buff).', holiness_req: 10, effect: 'pray_minor_saint_15' },
        { id: 'hol_saint_call', name: 'Call the Saints', desc: 'Intercede command unlocked. Call a saint once per battle.', holiness_req: 15, requires: ['hol_whispered_prayer'], effect: 'intercession_1_per_battle' },
        { id: 'hol_faithful_prayer', name: 'Faithful Prayer', desc: 'Intercession usable twice per battle. Saints arrive faster (skip entrance animation).', holiness_req: 22, requires: ['hol_saint_call'], effect: 'intercession_2_per_battle' },
        { id: 'hol_fervent_prayer', name: 'Fervent Prayer', desc: 'Intercession usable every 3 turns. Saint power +25%.', holiness_req: 30, requires: ['hol_faithful_prayer'], effect: 'intercession_3_turns_power_25' },
        { id: 'hol_ceaseless_prayer', name: 'Ceaseless Prayer', desc: 'A saint is ALWAYS present in battle. They act every turn alongside Usagi.', holiness_req: 40, requires: ['hol_fervent_prayer'], effect: 'saint_permanent_companion' },
        { id: 'hol_heaven_gate', name: 'Gates of Heaven', desc: 'ULTIMATE: In boss battles, call ALL available saints simultaneously. One massive combined attack. Once per battle.', holiness_req: 50, requires: ['hol_ceaseless_prayer'], effect: { type: 'ultimate', all_saints: true, once_per_battle: true } },
      ],
    },

    transfiguration: {
      name: 'Transfiguration',
      description: 'Usagi himself is changed. The flesh becomes a vessel for something greater.',
      skills: [
        { id: 'hol_prayer_shield', name: 'Prayer Shield', desc: 'While praying, take 25% less damage.', holiness_req: 8, effect: 'pray_defense_25' },
        { id: 'hol_radiance', name: 'Radiance', desc: 'Usagi emits holy light. Weak demons take 5% max HP damage per turn just from his presence.', holiness_req: 18, requires: ['hol_prayer_shield'], effect: 'holy_aura_damage_5' },
        { id: 'hol_incorruptible', name: 'Incorruptible Body', desc: 'Immune to Poison, Disease, and physical status effects. The body is sanctified.', holiness_req: 25, requires: ['hol_radiance'], effect: 'immune_physical_status' },
        { id: 'hol_stigmata', name: 'Stigmata', desc: 'Usagi\'s hands glow with wounds of light. All attacks deal holy damage. When Usagi takes damage, 20% is reflected as holy.', holiness_req: 35, requires: ['hol_incorruptible'], effect: 'stigmata_holy_attacks_reflect_20' },
        { id: 'hol_glorified', name: 'Glorified Body', desc: 'Usagi glows permanently. +20% all stats. Saints materialize 50% stronger. The Accuser takes automatic damage from Usagi\'s presence.', holiness_req: 45, requires: ['hol_stigmata'], effect: 'glorified_20_all_saints_50' },
        { id: 'hol_theosis', name: 'Theosis — Union with God', desc: 'ULTIMATE: "Not I, but Christ in me." For the duration of one battle, Usagi\'s stats are replaced by divine stats (all 999). He cannot be killed. All attacks are one-hit holy kills. But after the battle, he is reduced to 1 HP. This is not power. It is surrender.', holiness_req: 50, requires: ['hol_glorified'], effect: { type: 'ultimate', divine_stats: true, invulnerable: true, aftermath_1hp: true, once_per_book: true } },
      ],
    },
  },
};


// ═══════════════════════════════════════════════════════════════
// COMBAT MODE TRANSFORMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * How the battle UI itself changes based on holiness phase:
 */
export const COMBAT_UI_BY_PHASE = {
  0: {
    // Standard JRPG
    menu: ['Attack', 'Guard', 'Item', 'Pray'],
    pray_label: 'Pray',
    pray_tooltip: 'Restore MP. May trigger minor miracle.',
    battle_bg: 'standard',
    usagi_pose: 'fighting_stance',
  },
  1: {
    // Veil thinning
    menu: ['Attack', 'Guard', 'Item', 'Pray'],
    pray_label: 'Pray',
    pray_tooltip: 'Restore MP. May reveal enemy true form.',
    battle_bg: 'shadow_wisps_overlay',
    usagi_pose: 'fighting_stance_alert',
  },
  2: {
    // Dual sight — intercession unlocked
    menu: ['Attack', 'Guard', 'Item', 'Pray', 'Intercede'],
    pray_label: 'Pray',
    pray_tooltip: 'Deep prayer. May trigger saint intercession.',
    intercede_label: 'Intercede',
    intercede_tooltip: 'Call upon the saints to fight on your behalf.',
    battle_bg: 'dual_plane_overlay',
    usagi_pose: 'combat_ready_cross_visible',
  },
  3: {
    // Spiritual sight — prayer dominant
    menu: ['Intercede', 'Pray', 'Guard', 'Item', 'Strike'],
    intercede_label: 'Intercede',
    intercede_tooltip: 'The saints hear you. Call them.',
    pray_label: 'Deep Prayer',
    pray_tooltip: 'Enter prayer posture. Saints fight at full power. You take reduced damage.',
    strike_label: 'Righteous Strike',
    strike_tooltip: 'SPR-based holy damage. You still have a blade — use it if you must.',
    battle_bg: 'spiritual_plane_dominant',
    usagi_pose: 'prayer_warrior_stance',
    note: 'Menu order changes: Intercede is first. Attack is last and renamed.',
  },
  4: {
    // Transfigured — Usagi is the prayer
    menu: ['Intercede', 'Deep Prayer', 'Guard', 'Item'],
    intercede_label: 'Call the Saints',
    intercede_tooltip: 'A saint descends in glory to fight on your behalf.',
    pray_label: 'Deep Prayer',
    pray_tooltip: 'Kneel in prayer. Saints fight at maximum power. You are shielded by grace.',
    battle_bg: 'pure_spiritual_plane_golden_light',
    usagi_pose: 'kneeling_prayer_halo_visible',
    note: 'No "Attack" option. Usagi does not fight. He prays. The saints are his army. The game has fully transformed.',
    special: 'Against Satan, the menu becomes: [Pray the Rosary, Offer Suffering, Intercede, Guard]. Each "Pray the Rosary" turn strengthens the saints. After enough turns, the Blessed Virgin appears.',
  },
};


// ═══════════════════════════════════════════════════════════════
// BOSS ENCOUNTER STRUCTURE
// ═══════════════════════════════════════════════════════════════

/**
 * Every book has sub-bosses and a major boss.
 * The experience changes COMPLETELY based on holiness:
 *
 * LOW HOLINESS: You fight the boss directly. It's a hard JRPG fight.
 *   You see a soldier/commander. You swing your sword. Classic.
 *
 * HIGH HOLINESS: You see the demon. You kneel and pray. A saint descends.
 *   The battle becomes a cinematic event. You watch, pray, and support.
 *   The saint fights with moves powered by God alone.
 *   It is spectacular. It is humbling. It is the point.
 *
 * The game's message: the greatest power is not yours.
 * The greatest battles are not won by your sword.
 * They are won by prayer — and by the communion of saints
 * who have been praying for you since before you were born.
 */
export const BOSS_ENCOUNTERS_PER_BOOK = {
  'book-00': {
    sub_bosses: ['asmodeus'],
    major_boss: null,  // Book Zero's "boss" is the Accuser survival fight
    accuser_form: 'himself',
  },
  'book-01': {
    sub_bosses: ['azazel'],
    major_boss: 'abaddon',
    accuser_form: 'senator_gaius_petronius',
  },
  'book-02': {
    sub_bosses: ['heresy_serpent'],
    major_boss: null,
    accuser_form: 'bishop_secundus',
  },
  'book-03': {
    sub_bosses: ['war_demon'],
    major_boss: 'abaddon',  // Returns in Crusades
    accuser_form: 'chaplain_of_war',
  },
  'book-04': {
    sub_bosses: ['belial'],
    major_boss: null,
    accuser_form: 'the_empty_sky',
  },
  'book-05': {
    sub_bosses: ['persecution_oni'],
    major_boss: 'legion',
    accuser_form: 'sympathetic_magistrate',
  },
  'book-06': {
    sub_bosses: ['division_spirit'],
    major_boss: 'legion',  // Returns — the divided church
    accuser_form: 'a_divided_church',
  },
  'book-07': {
    sub_bosses: ['reason_idol'],
    major_boss: 'moloch',
    accuser_form: 'citizen_danton',
  },
  'book-08': {
    sub_bosses: ['death_angel_corrupted'],
    major_boss: 'leviathan',
    accuser_form: 'the_silence',
  },
  'final_book': {
    sub_bosses: ['all_previous_sub_bosses_gauntlet'],
    major_boss: 'satan',
    accuser_form: 'all_forms_then_true_form',
  },
};


// ═══════════════════════════════════════════════════════════════
// SAINT CINEMATIC FINISHES
// ═══════════════════════════════════════════════════════════════
//
// When a saint reaches full materialization (1.0), the demon
// does not die in a fight. It WITHERS. Each saint has a unique
// finish that reflects who they are and how light unmakes darkness.
//
// The key: none of these are violent. None of them are "attacks."
// The demon simply cannot exist in the same space as holiness.
// A small candle is enough to fill a room with light.
// These saints are not small candles. They are bonfires.
// But even a single candle would be enough.
//
// ═══════════════════════════════════════════════════════════════

export const SAINT_CINEMATIC_FINISHES = {

  blessed_virgin_mary: {
    standard: {
      name: 'The Light of the Woman',
      duration: 12000,
      steps: [
        { type: 'letterbox', size: 50 },
        { type: 'music', track: 'ave_maria_orchestral', fade_in: 2000 },
        { type: 'dialogue', speaker: null, lines: [
          'She is fully present now.',
          'The crescent moon beneath her feet glows like a second sun.',
          'Twelve stars orbit her head — not fast, not slow. Eternal.',
          'She does not look at the demon with anger.',
          'She looks at it the way a mother looks at a sick child.',
        ]},
        { type: 'screen_effect', effect: 'light_intensifies_from_mary', duration: 3000 },
        { type: 'enemy_effect', effect: 'cannot_move_cannot_attack_cannot_speak', duration: 3000 },
        { type: 'dialogue', speaker: null, lines: [
          'The demon tries to speak. Its voice breaks.',
          'It tries to attack. Its claws dissolve inches from the light.',
          'It tries to flee. There is nowhere the light does not reach.',
          'It withers. Not in pain — in recognition.',
          'It recognizes what it rejected. And the recognition is unbearable.',
        ]},
        { type: 'enemy_dissolve', effect: 'dissolves_from_inside_out_light_through_cracks', duration: 4000 },
        { type: 'dialogue', speaker: 'The Blessed Virgin', lines: [
          '"Go in peace."',
        ]},
        { type: 'screen_effect', effect: 'gentle_fade_to_warm_white', duration: 2000 },
      ],
    },
    vs_satan: {
      name: 'She Shall Crush His Head',
      duration: 30000,
      steps: [
        { type: 'letterbox', size: 60 },
        { type: 'music', track: 'silence', duration: 3000 },
        { type: 'dialogue', speaker: null, lines: [
          'Usagi has been praying for the entire battle.',
          'His knees are bloody on the stone. His voice is hoarse.',
          'But he has not stopped. Not once.',
          'The saints have come and gone — Michael, Gabriel, Raphael, Joseph, Francis, Albert.',
          'Each one diminished Satan. None finished him.',
          'Because this was never their fight.',
        ]},
        { type: 'screen_effect', effect: 'absolute_silence', duration: 2000 },
        { type: 'dialogue', speaker: null, lines: [
          'Then: light.',
          'Not from above. Not from the saints.',
          'From below. From the earth.',
          'From every prayer ever prayed across two thousand years of history.',
          'From Obaa-chan\'s chapel. From the catacombs of Rome.',
          'From the desert. From the burning castle. From the guillotine blade\'s shadow.',
          'From the death camp. From the hidden church.',
          'From every place where someone whispered "God help me" and meant it.',
          'The prayers rise like light through water.',
        ]},
        { type: 'music', track: 'magnificat_full_choir', fade_in: 5000 },
        { type: 'screen_effect', effect: 'light_rising_from_ground', duration: 5000 },
        { type: 'dialogue', speaker: null, lines: [
          'And she appears.',
          'Standing on the crescent moon.',
          'White and blue. Twelve stars.',
          'Young — younger than you expected. Younger than Usagi.',
          'She is smiling. Not a warrior\'s smile. A mother\'s smile.',
          'The smile of someone who has already won and knows it.',
          'Who has ALWAYS known it.',
        ]},
        { type: 'screen_effect', effect: 'satan_recoils', duration: 2000 },
        { type: 'dialogue', speaker: null, lines: [
          'Satan sees her.',
          'For the first time in the entire game, he is afraid.',
          'Not of her power. He has faced power before.',
          'He is afraid of her love.',
          'Because love is the one thing he cannot understand.',
          'Cannot corrupt. Cannot argue with. Cannot defeat.',
          'He can fight warriors. He can break saints. He can outlast martyrs.',
          'But he cannot make love stop loving.',
        ]},
        { type: 'screen_effect', effect: 'mary_approaches_satan_slowly', duration: 4000 },
        { type: 'dialogue', speaker: 'Satan', lines: [
          '"Stay back."',
          'His voice breaks.',
          '"I was the first to worship. I loved God more than any of you."',
          '"I only wanted to be free."',
        ]},
        { type: 'dialogue', speaker: 'The Blessed Virgin', lines: [
          '"I know."',
          'Two words. Quiet. Bottomless with sorrow.',
          '"I know what you were. I know what you chose. I know what it cost you."',
          '"And I am sorry."',
        ]},
        { type: 'screen_effect', effect: 'satan_flinches_from_pity', duration: 2000 },
        { type: 'dialogue', speaker: null, lines: [
          'She places her foot on the serpent.',
          'Not in violence. Not in triumph.',
          'In pity.',
          'And the pity is what breaks him.',
          'Because pity requires love.',
          'And love requires God.',
          'And God is everything Satan rejected.',
          'And rejection is the only wound that never heals.',
        ]},
        { type: 'screen_effect', effect: 'slow_fade_to_pure_white', duration: 5000 },
        { type: 'dialogue', speaker: null, lines: [
          'The screen goes white.',
          'Not blinding. Not painful.',
          'Warm. Like sunlight through closed eyelids.',
          'Like being held.',
          'When the light fades, Satan is gone.',
          'Not destroyed. Not killed. There is no body.',
          'He is simply... absent.',
          'The way darkness is absent when someone lights a candle.',
          'He was never the opposite of God.',
          'He was only the absence of God.',
          'And now God is here.',
        ]},
      ],
    },
  },

  saint_joseph: {
    standard: {
      name: 'The Silent Protector',
      duration: 8000,
      steps: [
        { type: 'letterbox', size: 40 },
        { type: 'dialogue', speaker: null, lines: [
          'Joseph is fully present.',
          'He does not speak. He never speaks. Not once in all of Scripture.',
          'He simply stands between Usagi and the demon.',
          'The demon looks at Joseph and sees a carpenter.',
          'Just a carpenter. Calloused hands. Simple clothes.',
          'But behind the carpenter is every father who ever stood in a doorway',
          'between his child and the dark.',
          'The demon sees this and understands that it is facing something',
          'older than itself. Older than hell.',
          'It is facing a father\'s love. And a father\'s love does not negotiate.',
        ]},
        { type: 'screen_effect', effect: 'joseph_looks_at_demon_calmly', duration: 2000 },
        { type: 'enemy_dissolve', effect: 'demon_backs_away_shrinks_fades_like_shadow_at_dawn', duration: 3000 },
      ],
    },
  },

  saint_michael: {
    standard: {
      name: 'The Judgment',
      duration: 10000,
      steps: [
        { type: 'letterbox', size: 45 },
        { type: 'music', track: 'angelic_war_hymn', fade_in: 1000 },
        { type: 'dialogue', speaker: null, lines: [
          'Michael is fully present.',
          'Six wings. Armor of hammered light. The sword drawn and still.',
          'He does not swing it. He holds it upright — a cross of fire.',
          'The demon sees the sword and remembers.',
          'It remembers the first war. The first rebellion. The first fall.',
          'It remembers the moment it chose pride over obedience.',
          'And it remembers that Michael chose differently.',
          'The sword does not move. The demon comes apart anyway.',
          'Not cut. Not burned. Judged.',
          'Judgment is not violence. It is truth. And truth does not negotiate.',
        ]},
        { type: 'enemy_dissolve', effect: 'demon_unravels_like_thread_pulled_from_cloth', duration: 4000 },
      ],
    },
  },

  saint_raphael: {
    standard: {
      name: 'The Healing Presence',
      duration: 8000,
      steps: [
        { type: 'letterbox', size: 40 },
        { type: 'dialogue', speaker: null, lines: [
          'Raphael is fully present.',
          'He smiles at the demon. Not mockingly. Warmly.',
          'The warmth is worse than any sword.',
          'He extends his hand — the same hand that healed Tobit\'s blindness.',
          'Golden-green light flows from his palm.',
          'The light does not attack the demon. It heals the space around it.',
          'The air becomes clean. The shadows become bright. The cold becomes warm.',
          'And the demon, which can only exist in broken places,',
          'finds that there is nowhere broken left to stand.',
          'It fades. Not destroyed. Healed out of existence.',
        ]},
        { type: 'enemy_dissolve', effect: 'healed_away_like_wound_closing_green_gold_light', duration: 3000 },
      ],
    },
  },

  saint_gabriel: {
    standard: {
      name: 'The Announcement',
      duration: 8000,
      steps: [
        { type: 'letterbox', size: 40 },
        { type: 'dialogue', speaker: null, lines: [
          'Gabriel is fully present.',
          'He raises the trumpet.',
          'He blows one note.',
          'The note is not loud. It is clear. Perfectly clear.',
          'It is the sound of truth spoken without apology.',
          'Every lie the demon ever told — every illusion, every disguise,',
          'every false promise — all of it rings false against that one clear note.',
          'The demon\'s form shimmers, flickers, cracks.',
          'Beneath the cracks: nothing. There was never anything real.',
          'Only the lie. And the note has ended the lie.',
        ]},
        { type: 'enemy_dissolve', effect: 'cracks_of_light_then_shatters_like_stained_glass_but_there_is_nothing_behind_the_glass', duration: 3000 },
      ],
    },
  },

  saint_francis_de_sales: {
    standard: {
      name: 'The Gentle Word',
      duration: 8000,
      steps: [
        { type: 'letterbox', size: 40 },
        { type: 'dialogue', speaker: null, lines: [
          'Francis de Sales is fully present.',
          'He walks to the demon and sits down.',
          'Sits down. Cross-legged. Like a man settling in for a long conversation.',
          'The demon does not know what to do with this.',
          'It has been screamed at. Fought. Cursed. Exorcised.',
          'No one has ever just... sat with it.',
          '"Tell me," Francis says gently. "What did God do to you',
          'that made you so angry?"',
          'The demon opens its mouth to roar.',
          'What comes out is a sob.',
          'And in the sobbing, it dissolves.',
          'Not destroyed by power. Undone by gentleness.',
        ]},
        { type: 'enemy_dissolve', effect: 'dissolves_in_tears_of_light_quietly', duration: 3000 },
      ],
    },
  },

  saint_albert_the_great: {
    standard: {
      name: 'The Understanding',
      duration: 8000,
      steps: [
        { type: 'letterbox', size: 40 },
        { type: 'dialogue', speaker: null, lines: [
          'Albert is fully present.',
          'He opens the book one final time.',
          'The last page. The page that contains everything.',
          'On it: a diagram of the demon itself.',
          'Every lie it tells. Every fear it exploits. Every wound it hides.',
          'The demon sees itself fully understood for the first time.',
          'Not feared. Not hated. Understood.',
          'And the understanding is a light that leaves no shadow to hide in.',
          'It tries to close the book. Its hands pass through the pages.',
          'The truth cannot be unread.',
          'The demon fades — not burned, but illuminated out of existence.',
        ]},
        { type: 'enemy_dissolve', effect: 'becomes_transparent_as_if_truth_made_it_see_through_then_gone', duration: 3000 },
      ],
    },
  },

  saint_francis_assisi: {
    standard: {
      name: 'The Candle',
      duration: 10000,
      steps: [
        { type: 'letterbox', size: 45 },
        { type: 'music', track: 'canticle_of_the_sun_simple', fade_in: 2000 },
        { type: 'dialogue', speaker: null, lines: [
          'Francis is fully present.',
          'Barefoot. Brown robe. Hands bleeding light from the stigmata.',
          'He does not look at the demon.',
          'He looks at a flower growing from a crack in the stone.',
          'He kneels beside it. He touches it with one bleeding hand.',
          'The flower blooms.',
          'More flowers. From everywhere. From the stone, from the dirt,',
          'from the demon\'s own shadow. Flowers.',
          'The demon watches creation happen at the feet of a man',
          'who owns nothing, wants nothing, fears nothing.',
          'And it understands — in one terrible, luminous moment —',
          'that this barefoot beggar with bleeding hands',
          'is richer than all of hell.',
          'The light from one stigmata wound — one small wound,',
          'freely accepted, freely offered — is enough.',
          'A small candle of God\'s light.',
          'Enough to blot out the most fearsome of foes.',
          'Because darkness has no substance.',
          'It is only the absence of light.',
          'And the light is here now.',
        ]},
        { type: 'enemy_dissolve', effect: 'flowers_grow_through_demon_light_from_wounds_fills_every_shadow_it_dissolves_not_in_agony_but_in_the_presence_of_something_more_real_than_itself', duration: 5000 },
      ],
    },
  },
};


// ═══════════════════════════════════════════════════════════════
// THE WITHERING LIGHT DOCTRINE
// ═══════════════════════════════════════════════════════════════
//
// This is the theology that drives the entire system:
//
// Darkness is not a thing. It is the ABSENCE of a thing.
// You do not fight darkness. You light a candle.
// The candle does not "defeat" the darkness.
// The candle simply IS, and where it is, darkness is not.
//
// Demons are not God's opposite. God has no opposite.
// Demons are God's absence — creatures who chose to be
// where God is not. But God is everywhere. So they chose
// to be nowhere. And nowhere is very small and very dark
// and very cold.
//
// When a saint appears — when a single point of God's light
// enters the battlefield — the demon does not lose a fight.
// There IS no fight. The light simply occupies the space
// that the darkness occupied. And the darkness, which was
// never real, ceases to be.
//
// This is why the saints do not take damage.
// This is why their abilities are not "attacks."
// This is why the demons wither and dissolve and weep.
// This is why a barefoot beggar with bleeding hands
// can unmake a demon that has terrorized nations.
//
// Because the smallest candle — the faintest prayer —
// the quietest "yes" spoken to God —
// is enough.
//
// It was always enough.
//
// ═══════════════════════════════════════════════════════════════
