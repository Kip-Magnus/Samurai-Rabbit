# SAMURAI USAGI — ARCHITECTURE PLAN
## *From Monolithic HTML to a Real Game Engine*

---

## THE PROBLEM WITH MONOLITHIC HTML

Your current game is a single 2400-line HTML file. That was perfect for prototyping — you built an entire JRPG combat system, skill trees, item generation, and 5 chapters in one file. That is impressive and it works. But now you are talking about 8+ Books spanning 2000 years of history, each with unique areas, enemies, NPCs, dialogue trees, moral choices with persistent consequences, and a virtue system that tracks across the entire game. A single HTML file cannot hold that. Here is what breaks:

**Maintainability:** At 5000+ lines, finding and fixing bugs becomes a nightmare. One misplaced bracket kills the whole game.

**Content scaling:** Each new Book adds areas, enemies, skills, items, dialogue. In a monolith, adding content means editing the same massive file every time.

**Asset management:** Right now everything is procedurally drawn with canvas. That is brilliant for filesize but limits visual quality. Eventually you will want tilesets, sprite sheets, portraits, and music — and those need proper loading.

**Save system:** A real multi-Book RPG needs save/load. The monolith has no persistent state between sessions.

**Touch controls:** iPad requires touch-friendly UI — bigger buttons, swipe gestures, virtual d-pad. This needs dedicated input handling code.

---

## THE RECOMMENDED STACK

### Phaser 3 + Vanilla JavaScript + Tiled Map Editor

This is the right choice for your project for specific reasons:

**Phaser 3** is the most widely-used open-source HTML5 game framework. It handles rendering (Canvas and WebGL automatically), input (touch, keyboard, gamepad), audio, physics, tilemaps, sprite animation, scene management, and camera. It runs natively in iPad Safari with zero plugins. It has documented tutorials specifically for building FF-style turn-based RPGs. It is free forever.

**Vanilla JavaScript** (no TypeScript, no React, no build tools) keeps the barrier low. You are building this for your daughter, not shipping to Steam. The simpler the toolchain, the more time you spend on content instead of configuration.

**Tiled** is a free map editor that exports JSON. Phaser 3 has native Tiled support — you draw your maps visually, export them, and Phaser loads them directly. This is how you build Minamata Village, Nagasaki Market, and every future area without hand-coding pixel positions.

### Why NOT Unity/Godot/Unreal?

Those are real game engines with real learning curves. They output native apps, which means you would need to deal with App Store submission, signing certificates, and Xcode. For an HTML5 game served from GitHub Pages that runs instantly on any iPad browser — Phaser is the right weight class.

---

## PROJECT STRUCTURE

```
Samurai-Rabbit/
│
├── index.html                 # Entry point — loads Phaser + starts game
├── package.json               # (optional) for local dev server
│
├── js/
│   ├── main.js               # Phaser config, game initialization
│   ├── constants.js           # Global constants (colors, sizes, keys)
│   │
│   ├── scenes/                # One file per game scene
│   │   ├── BootScene.js       # Preloader, asset loading
│   │   ├── TitleScene.js      # Title screen, save/load menu
│   │   ├── WorldScene.js      # Overworld map movement
│   │   ├── BattleScene.js     # Turn-based combat
│   │   ├── BattleUI.js        # Battle menus (runs parallel to BattleScene)
│   │   ├── DialogueScene.js   # NPC dialogue, choices, cutscenes
│   │   ├── MenuScene.js       # Pause menu, equipment, skill tree
│   │   └── TransitionScene.js # Fade/portal effects between areas
│   │
│   ├── systems/               # Game logic modules
│   │   ├── CombatSystem.js    # Damage calc, turn order, status effects
│   │   ├── VirtueSystem.js    # The 7 virtues tracker
│   │   ├── PrayerSystem.js    # Grace gauge, prayer unlocks, Orashio
│   │   ├── DialogueSystem.js  # Branching dialogue, choice tracking
│   │   ├── InventorySystem.js # Items, equipment, Diablo loot
│   │   ├── SkillTreeSystem.js # 127-node skill tree logic
│   │   ├── SaveSystem.js      # localStorage save/load
│   │   └── QuestSystem.js     # Quest flags, Book progression
│   │
│   ├── data/                  # Pure data — no logic, just content
│   │   ├── skills.json        # All 35+ skills with stats
│   │   ├── enemies.json       # All enemy definitions per Book
│   │   ├── items.json         # Item databases, affix tables
│   │   ├── skilltree.json     # Full 127-node tree structure
│   │   │
│   │   ├── book0/             # Book Zero content
│   │   │   ├── dialogue.json  # All NPC dialogue + choices
│   │   │   ├── quests.json    # Quest definitions + flags
│   │   │   ├── areas.json     # Area metadata (connections, encounters)
│   │   │   └── events.json    # Scripted events (cutscenes, forced battles)
│   │   │
│   │   ├── book1/             # Book One: The Arena (Rome 64 AD)
│   │   │   ├── dialogue.json
│   │   │   ├── quests.json
│   │   │   ├── areas.json
│   │   │   └── events.json
│   │   │
│   │   └── ... (book2/, book3/, etc.)
│   │
│   └── entities/              # Game object classes
│       ├── Player.js          # Usagi — stats, animations, input
│       ├── Companion.js       # Party member base class
│       ├── Enemy.js           # Enemy base class
│       ├── NPC.js             # Non-combat characters
│       └── Projectile.js      # For ranged attacks/miracles
│
├── assets/
│   ├── sprites/
│   │   ├── usagi.png          # Usagi spritesheet (walk, attack, pray)
│   │   ├── obachan.png        # Grandmother portrait + sprites
│   │   ├── kenji.png          # Kenji spritesheet
│   │   ├── enemies/           # Enemy sprites per Book
│   │   └── effects/           # Attack/prayer visual effects
│   │
│   ├── tilesets/
│   │   ├── japan-village.png  # Tileset for Minamata, markets
│   │   ├── japan-interior.png # Indoor tiles
│   │   ├── japan-mountain.png # Mountain/forest tiles
│   │   ├── rome-catacomb.png  # Book 1 tiles
│   │   └── ... (per-Book tilesets)
│   │
│   ├── maps/                  # Tiled .json exports
│   │   ├── minamata.json
│   │   ├── nagasaki-market.json
│   │   ├── sea-cave.json
│   │   ├── matsuda-compound.json
│   │   ├── shimabara-mountains.json
│   │   └── ... (per-Book maps)
│   │
│   ├── portraits/             # Character face portraits for dialogue
│   │   ├── usagi-neutral.png
│   │   ├── usagi-angry.png
│   │   ├── usagi-sad.png
│   │   ├── obachan-warm.png
│   │   ├── kenji-grin.png
│   │   └── ...
│   │
│   ├── ui/                    # Menu frames, buttons, icons
│   │   ├── battle-frame.png
│   │   ├── dialogue-box.png
│   │   ├── virtue-icons.png
│   │   └── skill-icons.png
│   │
│   └── audio/
│       ├── bgm/               # Background music per area
│       ├── sfx/               # Sound effects (slash, heal, menu)
│       └── voice/             # (optional) key moment voice clips
│
├── docs/                      # Design documents
│   ├── plot-bible.md
│   ├── book-zero.md
│   ├── skill-reference.md
│   ├── changelog.md
│   └── architecture.md        # This document
│
└── tools/
    └── dialogue-editor.html   # Simple tool to write dialogue JSON
```

---

## HOW THE PIECES FIT TOGETHER

### Scene Flow

```
BootScene (load all assets)
    │
    v
TitleScene (New Game / Continue / Settings)
    │
    v
WorldScene ←──────────────────────────────┐
    │ (player walks around tilemap)        │
    │                                      │
    ├──> Random encounter ──> BattleScene ─┘
    │                              + BattleUI (overlay)
    │
    ├──> NPC interaction ──> DialogueScene ─┘
    │         (choices modify VirtueSystem)
    │
    ├──> Area transition ──> TransitionScene ──> WorldScene (new map)
    │
    └──> Pause button ──> MenuScene
              (equipment, skills, save, virtues)
```

Phaser 3's scene system lets you run multiple scenes simultaneously. During battle, BattleScene handles the combat logic and animations while BattleUI renders menus on top. During dialogue, DialogueScene overlays the world without unloading it. This is exactly how classic JRPGs work.

### Data-Driven Content

The critical architectural decision: **ALL content lives in JSON files, not in code.**

This means adding a new Book requires:
1. New dialogue.json, quests.json, areas.json, events.json in the data folder
2. New tileset PNGs and map JSONs in the assets folder
3. New enemy entries in enemies.json
4. New sprite sheets in assets/sprites

You never touch the game engine code to add content. The engine reads data files and presents them. This is how professional RPGs scale.

Example — adding a new enemy to enemies.json:
```json
{
  "ashigaru": {
    "name": "Ashigaru",
    "hp": 30, "atk": 8, "def": 5, "spd": 4,
    "sprite": "enemies/ashigaru.png",
    "abilities": ["spear_thrust", "shield_wall"],
    "weakness": ["holy"],
    "drops": [
      { "item": "rice_ball", "chance": 0.3 },
      { "item": "bamboo_spear", "chance": 0.1 }
    ],
    "xp": 12, "gold": 8,
    "book": 0
  }
}
```

Example — dialogue with branching choices:
```json
{
  "scene_4_night_visitors": {
    "speaker": "narrator",
    "text": "Two young men stand in the rain, terrified.",
    "next": "choice_shelter",
    "portrait": null
  },
  "choice_shelter": {
    "type": "choice",
    "prompt": "What do you do?",
    "options": [
      {
        "text": "Come in. You are safe here.",
        "virtue": { "charity": 1 },
        "flags": { "sheltered_jesuits": true },
        "next": "shelter_a_response"
      },
      {
        "text": "I will take you to the cave.",
        "virtue": { "prudence": 1 },
        "flags": { "cave_jesuits": true },
        "next": "shelter_b_response"
      },
      {
        "text": "I... I cannot. My grandmother...",
        "virtue": {},
        "flags": { "rejected_jesuits": true },
        "next": "shelter_c_response"
      }
    ]
  }
}
```

---

## IPAD OPTIMIZATION

### Touch Controls

The game needs to work beautifully on iPad with zero keyboard. Here is the input design:

**Overworld movement:** Virtual joystick (left thumb) or tap-to-move (tap a tile, Usagi pathfinds there). Tap-to-move is better for RPGs on tablets — it is less fatiguing.

**Battle menus:** Large touch-friendly buttons. The current 6px text will not work — minimum 16px for iPad. Menu items should be at least 44x44 pixels (Apple's minimum touch target). The FF-style command menu (FIGHT / PRAYER / ITEM / RUN) works perfectly with four large buttons at the bottom of the screen.

**Dialogue:** Tap anywhere to advance text. Choice buttons are large, centered, with generous padding.

**Skill tree:** Pinch-to-zoom on the full tree. Tap nodes to inspect/unlock. This works naturally with Phaser's camera system.

### Resolution and Scaling

Target the pixel-art aesthetic at a base resolution of **320x240** (classic SNES) or **384x256**, then scale up with Phaser's `pixelArt: true` and `scale` mode:

```javascript
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 384,
        height: 256
    },
    pixelArt: true,
    // ... scenes, physics, etc.
};
```

This renders at low resolution and scales to fill the iPad screen with crisp pixel art. No blurriness. Looks intentional and beautiful.

### Save System

Use `localStorage` for saves. iPad Safari supports it and it persists across sessions:

```javascript
// SaveSystem.js
export function saveGame(slot, gameState) {
    const data = {
        book: gameState.currentBook,
        area: gameState.currentArea,
        position: { x: player.x, y: player.y },
        stats: gameState.playerStats,
        virtues: gameState.virtues,
        inventory: gameState.inventory,
        skills: gameState.unlockedSkills,
        flags: gameState.questFlags,  // every choice ever made
        playtime: gameState.playtime
    };
    localStorage.setItem('usagi_save_' + slot, JSON.stringify(data));
}
```

Three save slots. Auto-save at area transitions. The quest flags object is the key — it remembers EVERY choice across EVERY Book, enabling callbacks like "in Book V, if you sheltered the Jesuits in Book Zero, their students' descendants recognize you."

---

## MIGRATION PLAN — FROM MONOLITH TO MODULAR

You do not throw away your existing game. You migrate it in phases:

### Phase 1: Extract the Engine (Week 1-2)

Take your existing combat system, skill tree, and item generator — the core systems that work — and refactor them into standalone modules. Your combat math is solid. Your skill tree is 127 nodes deep. Your Diablo loot system generates items across 6 rarities. All of that transfers directly.

What changes: instead of being inline functions in one HTML file, each system becomes its own .js file that exports functions.

### Phase 2: Set Up Phaser (Week 2-3)

Create the basic Phaser project. Get a single tilemap loading, a character walking on it, and a battle triggering from a random encounter zone. Phaser's existing RPG tutorials cover exactly this — the GameDev Academy series walks through it step by step.

### Phase 3: Port Combat (Week 3-4)

Take your existing turn-based battle system and implement it inside Phaser's BattleScene. The logic is identical — ATK vs DEF, skill effects, turn order — but now it renders through Phaser's sprite system instead of raw canvas calls.

### Phase 4: Build Book Zero (Week 4-8)

With the engine running, build Book Zero's content: Minamata Village as a Tiled map, NPCs with dialogue, the dungeon, the cutscenes. This is where the plot bible and Book Zero design doc become your construction blueprints.

### Phase 5: Add Books (Ongoing)

Each new Book is content, not code. New maps, new dialogue JSONs, new enemy entries, new tilesets. The engine is done. You are adding chapters to a book, not rebuilding the printing press.

---

## ART DIRECTION

### The Pixel Art Approach

Your current procedural art (the little samurai rabbit drawn in canvas) has real charm. For the modular version, I recommend **16x16 tile size** with **32x32 character sprites** — the classic SNES RPG look. This is achievable with free tools:

**Aseprite** ($20, one-time) — The gold standard for pixel art and sprite animation. Worth every penny.

**Tiled** (free) — Map editor. Draw your villages, dungeons, and mountains tile by tile.

**OpenGameArt.org** — Free tilesets and sprites to use as placeholders or permanently (check licenses).

The aesthetic should feel like a cross between Chrono Trigger's warm palette and Final Fantasy Tactics' detailed environments, with a distinctly Japanese woodblock-print color sensibility — muted earth tones, sudden bursts of red and gold for sacred moments.

---

## HOSTING AND DEPLOYMENT

The game continues to live on GitHub Pages. The structure changes slightly:

Your `index.html` loads Phaser from CDN, then loads `js/main.js`, which bootstraps the game. All assets are relative paths. GitHub Pages serves static files perfectly.

```
https://kip-magnus.github.io/Samurai-Rabbit/
```

Same URL. Same instant access. Your daughter opens it on her iPad, it loads, she plays. No app store. No downloads. No updates to install. You push changes to GitHub, she refreshes the page, and the new content is there.

If you ever want an "app icon" on her iPad home screen: in Safari, tap Share > Add to Home Screen. It creates a standalone app-like icon that opens the game in fullscreen. This is a Progressive Web App (PWA) feature that works out of the box.

---

## RECOMMENDED LEARNING PATH

If you are new to Phaser, this is the order to learn:

1. **Phaser 3 Getting Started** — phaser.io/tutorials/getting-started-phaser3
2. **GameDev Academy RPG Tutorial** — The 3-part series on building an FF-style RPG in Phaser 3
3. **Monster Tamer Tutorial** — A Pokemon-style RPG tutorial series on Phaser's site, covers battle UI, world maps, NPC dialogue
4. **Tiled Map Editor Docs** — doc.mapeditor.org
5. **Modular Game Worlds in Phaser 3** — Medium series by Michael Hadley on tilemap integration

You already know JavaScript. You already built a working JRPG. The framework is just organization — it gives you rooms to put the furniture you have already built.

---

## SUMMARY

| Question | Answer |
|----------|--------|
| **Framework** | Phaser 3 (free, open source, iPad native) |
| **Language** | Vanilla JavaScript (no TypeScript, no build tools) |
| **Map Editor** | Tiled (free, exports JSON, Phaser native support) |
| **Art Style** | 16x16 tiles, 32x32 sprites, pixel art |
| **Resolution** | 384x256 base, scaled to fit with pixelArt mode |
| **Hosting** | GitHub Pages (same as now) |
| **Content Model** | Data-driven JSON files per Book |
| **Save System** | localStorage, 3 slots, auto-save at transitions |
| **Touch Support** | Tap-to-move, large buttons (44px+ targets), pinch-zoom skill tree |
| **Migration** | Phased — extract, scaffold, port, build, expand |
| **Time to Book Zero playable** | 6-8 weeks at hobby pace |
