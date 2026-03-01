# SAMURAI USAGI — THE GAME FACTORY
## *Build the Machine That Builds the Game*

---

## THE CORE IDEA

Stop building chapters by hand. Instead, build three things:

1. **THE SCHEMAS** — Rigid definitions of what every game entity must contain. A character has these fields. A weapon has these stats. A map has these layers. A dialogue tree has these branches. No exceptions.

2. **THE ENGINE** — A single Phaser runtime that can render ANY content conforming to the schemas. Build it once. Never touch it for content work again.

3. **THE PIPELINE** — A generation + validation system where you describe a chapter in plain English ("Book I: Rome, 64 AD, Nero's persecution, catacombs, gladiatorial arena") and the pipeline produces all JSON data files, validates them against schemas, runs visual regression tests, and outputs a playable chapter.

```
 YOU (creative direction)
  │
  ▼
 PROMPT TEMPLATE ──→ CLAUDE ──→ RAW JSON OUTPUT
                                      │
                                      ▼
                               VALIDATOR SCRIPT
                               (schema check, balance check,
                                completeness check)
                                      │
                              ┌───────┴───────┐
                              │               │
                           ✅ PASS         ❌ FAIL
                              │               │
                              ▼               ▼
                         data/books/     FIX & RETRY
                         book-XX/
                              │
                              ▼
                      PHASER ENGINE (unchanged)
                              │
                              ▼
                      PLAYABLE CHAPTER ON IPAD
```

---

## PART 1: THE SCHEMAS

Every entity in the game is defined by a strict JSON schema. If it doesn't match the schema, the validator rejects it. This is how you get consistency without manual tweaking.

---

### SCHEMA: CHARACTER

```json
{
  "$schema": "character.schema.json",
  "id": "obaa_chan",
  "name": "Obaa-chan",
  "fullName": "Maria Hana",
  "role": "npc_key",
  "species": "rabbit",
  "era": "book-00",

  "appearance": {
    "furColor": "#f5f0e8",
    "eyeColor": "#4a3728",
    "height": "small",
    "build": "frail",
    "distinguishing": "bent back, gnarled hands, hidden cross necklace",
    "outfit": {
      "base": "plain_kimono",
      "palette": ["#7a6852", "#5c4d3c", "#f5f0e8"],
      "accessories": ["wooden_cross_hidden", "prayer_beads"]
    }
  },

  "sprite": {
    "sheetId": "npc_book00_obaa",
    "frameWidth": 24,
    "frameHeight": 32,
    "animations": {
      "idle": { "frames": [0,1], "rate": 2 },
      "walk": { "frames": [2,3,4,5], "rate": 6 },
      "pray": { "frames": [6,7,8,7], "rate": 3 },
      "death": { "frames": [9,10,11,12], "rate": 2, "loop": false }
    }
  },

  "personality": {
    "archetype": "believer",
    "traits": ["fierce", "gentle", "unwavering", "maternal"],
    "speechStyle": "short sentences, proverbs, scripture echoes",
    "voiceTone": "warm_weathered"
  },

  "combatStats": null,

  "narrativeFlags": {
    "isMartyred": false,
    "hasBlessedPlayer": false,
    "crossGiven": false
  }
}
```

### SCHEMA: ENEMY

```json
{
  "$schema": "enemy.schema.json",
  "id": "roman_legionary",
  "name": "Roman Legionary",
  "era": "book-01",
  "tier": 1,

  "stats": {
    "hp": [28, 35],
    "atk": [8, 12],
    "def": [10, 14],
    "spd": [5, 7],
    "spr": [2, 4]
  },

  "weakness": ["holy"],
  "resistance": ["physical"],
  "immune": [],

  "behavior": {
    "ai": "aggressive",
    "patterns": [
      { "action": "attack", "weight": 60 },
      { "action": "shield_wall", "weight": 25, "condition": "hp < 50%" },
      { "action": "call_reinforcement", "weight": 15, "condition": "alone" }
    ]
  },

  "sprite": {
    "sheetId": "enemy_book01_legionary",
    "palette": ["#8b0000", "#c0c0c0", "#2b1d0e"],
    "frameWidth": 32,
    "frameHeight": 40
  },

  "drops": {
    "xp": [12, 18],
    "gold": [5, 15],
    "items": [
      { "id": "roman_gladius", "chance": 0.08 },
      { "id": "bread_ration", "chance": 0.25 }
    ]
  },

  "lore": "Soldiers of the Praetorian Guard, tasked with hunting Christians in the catacombs beneath Rome."
}
```

### SCHEMA: WEAPON

```json
{
  "$schema": "weapon.schema.json",
  "id": "pilgrims_blade",
  "name": "Blade of the Pilgrim",
  "type": "katana",
  "rarity": "unique",

  "baseStats": {
    "atk": 5,
    "spd": 2,
    "crit": 3
  },

  "scaling": {
    "virtue": "faith",
    "formula": "base + (faith * 1.5)",
    "description": "Grows stronger as Usagi's faith deepens"
  },

  "visual": {
    "blade": "#d4d4d4",
    "hilt": "#5c4d3c",
    "glow": null,
    "glowUnlock": "faith >= 5"
  },

  "lore": "A simple, unadorned blade given by The Messenger. It carries no inscription because its story is not yet written."
}
```

### SCHEMA: MAP / AREA

```json
{
  "$schema": "area.schema.json",
  "id": "kurosaki_village",
  "name": "Kurosaki Village",
  "era": "book-00",
  "act": 1,

  "dimensions": { "width": 40, "height": 30, "tileSize": 16 },

  "tileset": "tileset_japan_rural",
  "palette": {
    "primary": "#4a7c59",
    "secondary": "#c9a959",
    "accent": "#2b4570",
    "sky": "#87ceeb",
    "time": "morning"
  },

  "layers": [
    "ground",
    "terrain",
    "buildings",
    "decoration",
    "collision",
    "events"
  ],

  "music": "track_pastoral_japan",
  "ambience": ["birds", "water_stream", "wind_grass"],

  "encounters": {
    "enabled": false,
    "rate": 0,
    "table": []
  },

  "npcs": ["obaa_chan", "ichiro", "gennosuke", "setsuko", "miko"],
  "interactables": ["well", "rice_paddies", "hidden_chapel_entrance"],

  "exits": [
    { "to": "coastal_path", "x": 38, "y": 15, "direction": "east" },
    { "to": "mountain_trail", "x": 20, "y": 0, "direction": "north", "locked": true, "unlockFlag": "act >= 4" }
  ]
}
```

### SCHEMA: DIALOGUE TREE

```json
{
  "$schema": "dialogue.schema.json",
  "id": "obaa_garden_story",
  "era": "book-00",
  "act": 1,
  "trigger": "interact_obaa_garden",

  "nodes": [
    {
      "id": "start",
      "speaker": "obaa_chan",
      "portrait": "obaa_gentle",
      "text": "When I was young, there was a great church in Nagasaki. Built of stone, with a bell that rang across the harbor.",
      "next": "bell_story"
    },
    {
      "id": "bell_story",
      "speaker": "obaa_chan",
      "portrait": "obaa_remembering",
      "text": "They tore it down. The stones are in the seawall now. But the bell — they never found the bell. Someone hid it.",
      "next": "bell_end"
    },
    {
      "id": "bell_end",
      "speaker": "obaa_chan",
      "portrait": "obaa_smiling",
      "text": "I like to think it's still out there, under the earth, still ringing where no one can hear.",
      "effects": [
        { "type": "setFlag", "flag": "heard_bell_story", "value": true },
        { "type": "playSound", "sound": "distant_bell_faint" },
        { "type": "giveItem", "item": null }
      ],
      "next": null
    }
  ]
}
```

### SCHEMA: CHAPTER / BOOK

```json
{
  "$schema": "book.schema.json",
  "id": "book-00",
  "title": "The Calling",
  "subtitle": "Shimabara Peninsula, 1587",
  "era": "feudal_japan",
  "year": 1587,

  "palette": {
    "dominant": "#4a7c59",
    "accent": "#c9a959",
    "dark": "#1a1a2e",
    "blood": "#8b0000",
    "holy": "#ffd700",
    "sky": "#87ceeb",
    "night": "#0f0e17"
  },

  "music": {
    "exploration": "track_pastoral_japan",
    "tension": "track_taiko_dread",
    "battle": null,
    "boss": null,
    "cutscene_grief": "track_orasho_solo_voice",
    "cutscene_calling": "track_choir_resolute"
  },

  "acts": [
    {
      "id": 1,
      "title": "A Farmer's Morning",
      "tone": "warm",
      "areas": ["kurosaki_village", "coastal_path", "rice_paddies"],
      "combatEnabled": false,
      "keyEvents": ["morning_chores", "obaa_garden_story", "hidden_chapel_mass"]
    },
    {
      "id": 2,
      "title": "The Shadow Falls",
      "tone": "dread",
      "areas": ["kurosaki_village"],
      "combatEnabled": false,
      "keyEvents": ["soldiers_arrive", "chapel_debate", "last_mass"]
    },
    {
      "id": 3,
      "title": "The Fumi-e",
      "tone": "grief",
      "areas": ["kurosaki_village", "burning_chapel"],
      "combatEnabled": true,
      "combatType": "environmental",
      "keyEvents": ["fumi_e_ceremony", "obaa_martyrdom", "escape_fire"]
    },
    {
      "id": 4,
      "title": "The Mountain",
      "tone": "desolation_to_awe",
      "areas": ["mountain_trail", "mountain_summit"],
      "combatEnabled": false,
      "keyEvents": ["the_climb", "accusers_voice", "the_calling", "portal_to_rome"]
    }
  ],

  "characters": ["usagi", "obaa_chan", "father_tomas", "ichiro", "captain_mori", "gennosuke", "setsuko", "miko", "the_messenger"],
  "enemies": ["falling_beam", "smoke_cloud"],
  "items": ["obaas_cross", "pilgrims_blade", "breviary_page", "mikos_flower"],

  "moralChoices": [
    {
      "id": "chapel_stance",
      "act": 2,
      "description": "Who does Usagi stand beside during the debate?",
      "options": [
        { "label": "Stand with Obaa-chan", "virtueEffect": { "faith": 1 }, "flagEffect": { "ichiro_trust": -1 } },
        { "label": "Stand with Ichiro", "virtueEffect": {}, "flagEffect": { "ichiro_trust": 1 } },
        { "label": "Stand with Setsuko", "virtueEffect": { "charity": 1 }, "flagEffect": { "setsuko_trust": 1 } },
        { "label": "Stand with Father Tomas", "virtueEffect": { "prudence": 1 }, "flagEffect": {} }
      ]
    },
    {
      "id": "fumi_e",
      "act": 3,
      "description": "The fumi-e is at Usagi's feet.",
      "options": [
        { "label": "Refuse", "virtueEffect": { "fortitude": 2, "faith": 2 }, "flagEffect": { "stepped_on_fumie": false } },
        { "label": "Step on it", "virtueEffect": { "faith": -1, "hope": 1 }, "flagEffect": { "stepped_on_fumie": true } }
      ]
    },
    {
      "id": "mountain_voice",
      "act": 4,
      "description": "The Accuser speaks in Usagi's grief.",
      "options": [
        { "label": "Defiance through faith", "virtueEffect": { "faith": 2 } },
        { "label": "Honest vulnerability", "virtueEffect": { "hope": 1 } },
        { "label": "Silence (30s timeout)", "virtueEffect": { "prudence": 1 } }
      ]
    }
  ],

  "seedsForFuture": [
    { "item": "mikos_flower", "payoff": "book-05", "description": "Descendant recognizes pressed flower" },
    { "flag": "heard_bell_story", "payoff": "book-05", "description": "Usagi finds the actual buried bell" },
    { "flag": "stepped_on_fumie", "payoff": "book-05", "description": "Faces fumi-e again — weight is doubled" }
  ]
}
```

### SCHEMA: SKILL (already exists from v5.11, formalized)

```json
{
  "$schema": "skill.schema.json",
  "id": "bilocation",
  "name": "Bilocation",
  "tree": "miracles",
  "tier": 1,
  "cost": { "mp": 18 },
  "unlockLevel": 12,

  "effect": {
    "type": "damage",
    "element": "holy",
    "power": 45,
    "hits": 2,
    "bonus": "chance to dodge next attack (30%)"
  },

  "animation": {
    "caster": "split_image",
    "target": "holy_slash_dual",
    "particles": ["light_motes", "afterimage"],
    "duration": 1200
  },

  "saintReference": "Padre Pio, Martin de Porres",
  "lore": "Be present in two places at once, striking from angles that should be impossible.",
  "description": "2-hit holy damage. 30% dodge after cast."
}
```

---

## PART 2: THE GENERATOR PROMPT

This is the key. When you want to build a new chapter, you give Claude this prompt template filled in with the era details. Claude outputs ALL the JSON files for that chapter in one pass. Then the validator checks them.

### THE MASTER PROMPT TEMPLATE

```
You are the content generator for Samurai Usagi: The Pilgrim's Blade.

You will produce ALL data files for a single Book/Chapter.

CONTEXT:
- Game: 2D pixel-art JRPG, turn-based combat, Catholic church history
- Player: Usagi, a time-traveling rabbit saint
- Tone: Reverent but not preachy, morally complex, emotionally rich
- Combat: FF-style turn-based, saint miracle skills
- Visual: 16-bit pixel art aesthetic

THE SCHEMAS (always follow exactly):
[paste schemas above]

THE DESIGN CONSTRAINTS:
[paste constraints below]

THE ERA TO BUILD:
Book: [NUMBER]
Title: [TITLE]
Setting: [PLACE, YEAR]
Historical basis: [REAL EVENTS]
Theological conflict: [HERESY/DEBATE]
The Accuser's disguise: [WHO HE APPEARS AS]
Key historical figures: [REAL PEOPLE TO REFERENCE]

PRODUCE THE FOLLOWING FILES:
1. book-XX.json (chapter definition)
2. characters.json (all NPCs for this era, 4-8 characters)
3. enemies.json (6-12 enemy types, tiered for progression)
4. dialogue.json (all story dialogue trees)
5. items.json (era-specific weapons, armor, consumables)
6. events.json (scripted story sequences)
7. moral_choices.json (2-4 meaningful choices with virtue effects)
8. areas.json (3-6 explorable areas with palettes and music cues)

BALANCE CONSTRAINTS:
[paste balance rules]
```

---

## PART 3: THE DESIGN CONSTRAINTS

These are locked rules the generator must always follow. This is how you get beauty and consistency without manual tweaking.

### VISUAL CONSTRAINTS

```json
{
  "sprite": {
    "playerSize": [24, 32],
    "npcSize": [24, 32],
    "enemySize": { "small": [24, 32], "medium": [32, 40], "large": [48, 56], "boss": [64, 72] },
    "tileSize": 16,
    "maxColors": 16,
    "outlineColor": "#1a1a2e",
    "outlineRequired": true
  },

  "palette_rules": {
    "eachEraHasUniqueDominantColor": true,
    "holyEffectsAlways": "#ffd700",
    "bloodAlways": "#8b0000",
    "theAccuserAlways": "#4a0080",
    "uiBackground": "#0f0e17",
    "uiText": "#e8e0d4",
    "uiAccent": "#c9a959"
  },

  "era_palettes": {
    "book-00_japan_1587": { "dominant": "#4a7c59", "accent": "#c9a959", "feel": "green_gold_pastoral" },
    "book-01_rome_64ad": { "dominant": "#8b4513", "accent": "#c0392b", "feel": "terracotta_blood" },
    "book-02_egypt_325ad": { "dominant": "#daa520", "accent": "#1a5276", "feel": "sand_gold_lapis" },
    "book-03_jerusalem_1099": { "dominant": "#c9a959", "accent": "#2c3e50", "feel": "desert_steel" },
    "book-04_poland_1241": { "dominant": "#4a5568", "accent": "#e74c3c", "feel": "grey_snow_fire" },
    "book-05_japan_1638": { "dominant": "#2d3436", "accent": "#ffd700", "feel": "dark_hidden_gold" },
    "book-06_lepanto_1571": { "dominant": "#1a5276", "accent": "#f39c12", "feel": "deep_sea_flame" },
    "book-07_france_1793": { "dominant": "#7f1d1d", "accent": "#e5e7eb", "feel": "blood_marble" },
    "book-08_poland_1940s": { "dominant": "#1a1a2e", "accent": "#9ca3af", "feel": "ash_iron_cold" }
  },

  "ui": {
    "font": "monospace_pixel",
    "fontSize": { "dialogue": 8, "menu": 7, "damage": 10, "title": 14 },
    "dialogueBox": {
      "position": "bottom",
      "height": "25%",
      "background": "rgba(15,14,23,0.92)",
      "border": "1px solid #c9a959",
      "portraitSize": [48, 48],
      "typewriterSpeed": 30
    },
    "battleMenu": {
      "position": "bottom-right",
      "commands": ["FIGHT", "PRAYER", "ITEM", "GUARD", "FLEE"]
    }
  }
}
```

### BALANCE CONSTRAINTS

```json
{
  "progression": {
    "levelsPerBook": [1, 8],
    "hpPerLevel": [8, 15],
    "atkPerLevel": [1, 3],
    "newSkillsPerBook": [2, 4],
    "newItemsPerBook": [8, 15]
  },

  "combat": {
    "averageBattleDuration": "4-8 turns",
    "healingNeverExceeds": "40% max HP per turn",
    "bossHPMultiplier": [3, 5],
    "enemyGroupSize": [1, 4],
    "encounterRate": "every 15-25 steps in combat zones",
    "noRandomEncountersInStoryScenes": true
  },

  "difficulty_curve_per_act": {
    "act1": "no combat, exploration only",
    "act2": "light environmental challenges",
    "act3": "first real combat or stealth",
    "act4": "escalation, mini-boss possible",
    "act5": "boss encounter, tests skills learned"
  },

  "economy": {
    "goldDrops": "enough to afford 1 potion per 2 battles",
    "shopPrices": "2-3x average drop value",
    "rareDropRate": "5-10% from normal enemies, 25-50% from bosses"
  },

  "virtues": {
    "maxGainPerBook": 4,
    "maxLossPerBook": 2,
    "noVirtueLossWithoutPlayerChoice": true,
    "everyBookMustTestAtLeast": ["faith", "one other virtue"]
  },

  "narrative": {
    "moralChoicesPerBook": [2, 4],
    "noChoiceIsObjectivelyWrong": true,
    "theAccuserAppearsOncePerBook": true,
    "atLeastOneSeedForFutureBook": true,
    "dialogueMaxLength": "3 sentences per node",
    "cutsceneMaxDuration": "90 seconds equivalent"
  }
}
```

---

## PART 4: THE VALIDATOR

A Node.js script that checks generated content against all schemas and constraints.

```
node validate.js data/books/book-01/

✅ book-01.json — schema valid
✅ characters.json — 6 characters, all have required fields
✅ enemies.json — 8 enemies, stats within tier ranges
⚠️  enemies.json — "centurion_captain" HP (180) exceeds tier 3 max (150) — ADJUST
✅ dialogue.json — 42 nodes, all connections valid, no orphans
✅ items.json — 12 items, rarities distributed correctly
✅ moral_choices.json — 3 choices, all have virtue effects, no "wrong" answer
✅ areas.json — 4 areas, palette matches era constraint
✅ music cues — all referenced tracks exist
✅ seeds — 2 future-book seeds planted
⚠️  balance — average battle length estimated at 9.2 turns (target: 4-8) — TUNE DOWN enemy HP

RESULT: 2 warnings, 0 errors. Fix warnings and re-validate.
```

### What the Validator Checks

| Check | What It Does |
|-------|-------------|
| **Schema conformance** | Every JSON field matches the schema type and structure |
| **Cross-references** | Every NPC referenced in areas.json exists in characters.json |
| **Dialogue integrity** | No orphan nodes, no infinite loops, every branch terminates |
| **Balance math** | Enemy stats within tier ranges, drops within economy rules |
| **Virtue rules** | No virtue loss without player choice, faith tested every book |
| **Palette compliance** | Area colors match era palette from constraints |
| **Accuser rule** | Exactly one Accuser appearance per book |
| **Seed rule** | At least one seed planted for a future book |
| **Length limits** | Dialogue nodes under 3 sentences, cutscenes under 90 seconds |
| **Completeness** | All 8 required files present with minimum entity counts |

---

## PART 5: THE SPRITE FACTORY

Characters and enemies need sprites. Instead of drawing each one manually, define a **sprite generation spec** in the character schema and use a procedural pixel-art generator.

### The Approach

Each character/enemy has a `sprite.template` field that describes them in terms a generator can use:

```json
{
  "template": "humanoid_rabbit",
  "furColor": "#f5f0e8",
  "outfitTemplate": "kimono",
  "outfitPalette": ["#7a6852", "#5c4d3c"],
  "accessories": ["hidden_cross"],
  "expression": "gentle",
  "pose": "standing"
}
```

The runtime engine has a **procedural sprite renderer** (which you already built in v5.11!) that takes these parameters and draws the character. No pre-made sprite sheets needed for basic characters. The existing `drawUsagi()`, `drawEnemy()` functions evolve into a general-purpose `drawEntity(template, params)` function.

For special characters (bosses, The Messenger, The Accuser), hand-crafted sprites override the procedural system.

### Era Tileset Generation

Each era needs a tileset. Instead of drawing 200 tiles per era, define a **tileset palette transformation**:

```json
{
  "baseTileset": "generic_village",
  "paletteSwap": {
    "#4a7c59": "#daa520",
    "#8b4513": "#c9a959",
    "#2b4570": "#1a5276"
  },
  "eraOverrides": {
    "building_roof": "roman_terracotta",
    "ground": "sandstone",
    "vegetation": "palm_sparse"
  }
}
```

One base tileset → palette swap per era → unique look with minimal work.

---

## PART 6: THE BUILD PIPELINE

### How You Actually Use This

**Step 1: Decide the era**
You write a creative brief: "Book I. Rome, 64 AD. Nero's persecution. Catacombs. Gladiatorial arena. The Accuser is a senator. Theological conflict is Gnosticism."

**Step 2: Generate**
Feed the brief + schemas + constraints to Claude. Claude produces all 8 JSON files for the book.

**Step 3: Validate**
Run `node validate.js data/books/book-01/`. Fix any warnings.

**Step 4: Test**
The Phaser engine loads the new book automatically. Play through on iPad. Note anything that feels wrong.

**Step 5: Tune**
Adjust specific values (enemy HP too high, dialogue too long, area too small). Re-validate. Done.

**Step 6: Commit**
Push the new `data/books/book-01/` folder to GitHub. The game picks it up. Your daughter gets a new chapter.

### Time Estimates

| Task | Manual Approach | Factory Approach |
|------|----------------|-----------------|
| Design a new chapter | 2-4 hours (writing) | 30 min (creative brief) |
| Create all data files | 6-10 hours (hand-coding JSON) | 15 min (Claude generates) + 15 min (validate & fix) |
| Create enemies | 2 hours per enemy | 5 min per enemy (template + palette) |
| Create NPCs | 1 hour per NPC | 5 min per NPC (schema fill) |
| Balance testing | Hours of play-testing | Automated validator catches 80% of issues |
| Total per chapter | 20-40 hours | 2-4 hours |

---

## PART 7: THE RUNTIME ENGINE (Build Once)

The Phaser engine needs these core systems, each written to be data-driven:

```
┌──────────────────────────────────────────────────┐
│                 PHASER RUNTIME                     │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  SCENE   │  │ RENDERER │  │   SYSTEMS    │    │
│  │ MANAGER  │  │          │  │              │    │
│  │          │  │ • Sprites│  │ • Combat     │    │
│  │ • World  │  │ • Tiles  │  │ • Dialogue   │    │
│  │ • Battle │  │ • UI     │  │ • Virtue     │    │
│  │ • Menu   │  │ • FX     │  │ • Inventory  │    │
│  │ • Dialog │  │ • Touch  │  │ • Save/Load  │    │
│  └────┬─────┘  └────┬─────┘  │ • TimeTravel │    │
│       │              │        └──────┬───────┘    │
│       └──────┬───────┘               │            │
│              │                       │            │
│         ┌────▼───────────────────────▼────┐       │
│         │         DATA LOADER             │       │
│         │   Reads /data/books/book-XX/    │       │
│         │   Validates at load time        │       │
│         │   Hot-swaps between eras        │       │
│         └─────────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

The engine NEVER contains era-specific code. All era-specific content lives in JSON. The engine is a universal JRPG player that can render any conforming data.

---

## PART 8: WHAT TO BUILD FIRST

### The Minimum Viable Factory

1. **Write the validator script** (~200 lines of Node.js). This is your quality gate.
2. **Finalize the schemas** (the ones in this doc, refined).
3. **Build the Phaser engine** — WorldScene, BattleScene, DialogueScene, with data-loading.
4. **Generate Book Zero** data files from the narrative design doc.
5. **Validate. Test on iPad. Ship.**

Then for every future Book: brief → generate → validate → ship. The factory is running.

---

*"Give me a lever long enough and a fulcrum on which to place it, and I shall move the world." — Archimedes*

*The schemas are the fulcrum. The generator is the lever. The world is the game.*
