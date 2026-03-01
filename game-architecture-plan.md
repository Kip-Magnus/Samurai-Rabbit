# SAMURAI USAGI — GAME ARCHITECTURE PLAN
## *From Monolithic HTML to a Real Game Engine*

---

## THE PROBLEM WITH MONOLITHIC HTML

Your current v5.11 is ~2,400 lines in a single HTML file. That was perfect for prototyping. It let us iterate fast on combat, skills, items, and sprites without build tools. But now you're designing an 8+ Book epic with branching narratives, multiple eras, a virtue system, and dozens of characters. A single file will collapse under that weight.

Here's what breaks:

- **One file = one brain.** You can't work on the dialogue system without scrolling past 500 lines of combat code. Claude can't either — context windows have limits.
- **No asset management.** Sprites, music, maps, and dialogue are all inline. Adding Book I means doubling the file size.
- **No save system.** The current game has no persistence. Your daughter closes the iPad tab, she loses everything.
- **No mobile-first design.** The current canvas is sized for desktop. Touch controls are an afterthought.
- **No separation of data from logic.** Adding a new enemy means editing JavaScript functions. It should mean editing a JSON file.

---

## THE RECOMMENDED ARCHITECTURE

### Option Comparison

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Stay monolithic HTML** | Simple, no build tools | Won't scale, no saves, no mobile | ❌ Dead end |
| **Vanilla JS + modules** | No framework lock-in, full control | Must build everything from scratch | ⚠️ Possible but slow |
| **Phaser 3 + Vite** | Industry standard for 2D HTML5 games, huge community, built for mobile, scene management, input handling, animation, tilemaps | Learning curve, requires Node.js tooling | ✅ **Best fit** |
| **Godot (HTML5 export)** | Full game engine, visual editor, exports to web | GDScript learning curve, large export size, less web-native | ⚠️ Overkill for 2D pixel RPG |
| **RPG Maker MZ** | Purpose-built for JRPGs, visual tools | Proprietary, limited customization, harder to host on GitHub Pages | ❌ Too constrained |

### The Recommendation: Phaser 3 + Vite + PWA

**Phaser 3** is the industry-standard open-source framework for 2D HTML5 games. It handles exactly what you need: canvas rendering, sprite animation, scene management, input (keyboard AND touch), tilemaps, audio, and camera systems. It runs natively in Safari on iPad with no plugins.

**Vite** is a modern build tool that bundles your modular JavaScript into optimized files for the web. It gives you hot-reload during development (change code, see it instantly) and produces fast, small production builds.

**PWA (Progressive Web App)** turns your game into an installable app on iPad. Your daughter taps "Add to Home Screen" in Safari, and the game gets its own icon, launches fullscreen (no browser chrome), and works offline. It looks and feels like a native app, but it's just your website.

---

## PROJECT STRUCTURE

```
Samurai-Rabbit/
│
├── index.html                    ← Entry point (tiny - just loads the app)
├── manifest.json                 ← PWA manifest (app name, icon, colors)
├── sw.js                         ← Service worker (offline support)
├── vite.config.js                ← Build configuration
├── package.json                  ← Dependencies (phaser, vite)
│
├── public/
│   ├── icons/                    ← App icons (for home screen)
│   └── fonts/                    ← Pixel fonts
│
├── src/
│   ├── main.js                   ← Game initialization & Phaser config
│   │
│   ├── scenes/                   ← Each screen is a Scene
│   │   ├── BootScene.js          ← Asset loading, splash screen
│   │   ├── TitleScene.js         ← Title menu, new/continue game
│   │   ├── WorldScene.js         ← Overworld exploration (per-era)
│   │   ├── BattleScene.js        ← Turn-based combat
│   │   ├── DialogueScene.js      ← Dialogue overlay (runs on top of world)
│   │   ├── MenuScene.js          ← Pause menu, equipment, skills
│   │   ├── SkillTreeScene.js     ← Skill tree visualization
│   │   └── CutsceneScene.js      ← Scripted story sequences
│   │
│   ├── systems/                  ← Core game logic (no rendering)
│   │   ├── CombatEngine.js       ← Turn order, damage calc, AI
│   │   ├── VirtueSystem.js       ← Track 7 virtues, trigger events
│   │   ├── DialogueEngine.js     ← Parse dialogue trees, track choices
│   │   ├── SaveSystem.js         ← IndexedDB save/load
│   │   ├── InventorySystem.js    ← Items, equipment, loot tables
│   │   ├── SkillSystem.js        ← Skill trees, charism unlocks
│   │   └── TimeTravel.js         ← Era transitions, persistent state
│   │
│   ├── entities/                 ← Game objects
│   │   ├── Player.js             ← Usagi's sprite, stats, animation
│   │   ├── NPC.js                ← Non-player characters
│   │   ├── Enemy.js              ← Enemy base class
│   │   └── Companion.js          ← Party member management
│   │
│   ├── ui/                       ← Interface components
│   │   ├── BattleHUD.js          ← HP/MP bars, menus during combat
│   │   ├── DialogueBox.js        ← Text box with typewriter effect
│   │   ├── TouchControls.js      ← Virtual D-pad and buttons for iPad
│   │   └── VirtueDisplay.js      ← Virtue tracker overlay
│   │
│   └── data/                     ← Pure data, no logic
│       ├── skills.json           ← All 35+ skills with descriptions
│       ├── items.json            ← All items, affixes, loot tables
│       ├── enemies.json          ← Enemy stats, AI patterns, drops
│       ├── skilltree.json        ← Node positions, connections, costs
│       │
│       ├── books/                ← One folder per era
│       │   ├── book-00/
│       │   │   ├── maps/         ← Tiled map files (.json)
│       │   │   ├── dialogue.json ← All NPC dialogue & story beats
│       │   │   ├── events.json   ← Scripted events, triggers
│       │   │   ├── npcs.json     ← NPC definitions for this era
│       │   │   └── enemies.json  ← Era-specific enemies
│       │   ├── book-01/          ← Rome, 64 AD
│       │   ├── book-02/          ← Egypt, 325 AD
│       │   └── ...
│       │
│       └── sprites/              ← Sprite sheets & animations
│           ├── usagi/            ← Player sprites (walk, attack, pray...)
│           ├── npcs/             ← NPC sprites per era
│           ├── enemies/          ← Enemy sprites per era
│           ├── effects/          ← Skill effects, miracles
│           └── tilesets/         ← Map tiles per era
│
├── docs/                         ← Design documents (your plot bible, etc.)
│   ├── plot-bible.md
│   ├── book-zero-the-calling.md
│   ├── skill-reference.md
│   └── architecture.md           ← This document
│
└── archive/
    └── samurai-usagi-v5.html     ← The original monolith (preserved)
```

---

## WHY THIS STRUCTURE WORKS

### 1. Separation of Data and Logic
Adding Book II (Egypt) means creating a new `book-02/` folder with JSON files. You don't touch the engine. The `WorldScene` loads whatever era data you point it at. Adding a new enemy means adding a JSON entry, not rewriting JavaScript.

```json
// data/books/book-00/enemies.json
{
  "burning_timber": {
    "name": "Falling Beam",
    "type": "environmental",
    "hp": 1,
    "description": "A burning roof beam blocking the path",
    "weakness": "none",
    "behavior": "static_obstacle"
  }
}
```

### 2. Scene Management
Phaser's scene system maps perfectly to your game's screens:

```
[BootScene] → [TitleScene] → [WorldScene]
                                   ↓ (random encounter or story trigger)
                              [BattleScene] + [BattleHUD] (parallel scenes)
                                   ↓ (victory)
                              [WorldScene] (resumes)
                                   ↓ (story beat)
                              [DialogueScene] (overlay on world)
                                   ↓ (era transition)
                              [CutsceneScene] → [WorldScene] (new era)
```

Multiple scenes can run simultaneously — the BattleHUD runs as an overlay on top of BattleScene, just like the current game but properly separated.

### 3. Save System with IndexedDB
IndexedDB works on iPad Safari and persists across browser sessions. Your daughter can save and resume:

```javascript
// systems/SaveSystem.js (simplified concept)
const save = {
  currentBook: 0,
  currentAct: 2,
  playerStats: { hp: 45, mp: 20, faith: 3, ... },
  virtues: { prudence: 1, justice: 0, fortitude: 2, ... },
  inventory: ["cross", "pilgrim_blade", "mikos_flower"],
  choices: { fumiE: "refused", mountainVoice: "silence" },
  flags: { metFatherTomas: true, foundBreviary: true }
};

// Saves to IndexedDB — survives tab closes, restarts, even device reboots
await db.put('saves', save, 'slot1');
```

The `choices` object is critical — it tracks every moral decision across Books so that Book V can reference what happened in Book Zero.

### 4. Touch Controls for iPad
Phaser has built-in touch support. For the RPG, you need:

- **Virtual D-pad** (bottom-left) for movement
- **A/B buttons** (bottom-right) for confirm/cancel
- **Swipe gestures** for menu navigation
- **Tap** to interact with NPCs and objects

```javascript
// ui/TouchControls.js (concept)
// Phaser makes this straightforward:
this.input.addPointer(1); // Enable multi-touch
// Virtual joystick plugin or custom zone-based input
// Automatically hidden on desktop (keyboard takes over)
```

### 5. PWA = App-Like Experience on iPad

With three files, your website becomes an "app":

```json
// manifest.json
{
  "name": "Samurai Usagi: The Pilgrim's Blade",
  "short_name": "Samurai Usagi",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#1a1a2e",
  "theme_color": "#c9a959",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

Your daughter opens Safari → goes to `https://kip-magnus.github.io/Samurai-Rabbit/` → taps Share → "Add to Home Screen." Now she has a golden icon on her iPad. Tapping it launches the game fullscreen with no browser bars. It caches assets for offline play.

---

## THE MIGRATION PATH

You don't throw away v5.11. You migrate it piece by piece.

### Phase 1: Scaffold (Week 1)
Set up the project structure, install Phaser + Vite, get a blank scene rendering on screen. Deploy to GitHub Pages. Confirm it loads on iPad.

### Phase 2: Port the Engine (Weeks 2-3)
Move the combat system, skill system, and item system into `systems/` as pure JavaScript modules. No rendering — just logic. Write them so they can be tested independently.

### Phase 3: Port the Rendering (Weeks 3-4)
Recreate the pixel-art sprites as proper sprite sheets. Build the BattleScene using Phaser's sprite and animation systems instead of raw canvas. This is where the game starts looking *better* than the monolith — Phaser handles scaling, retina displays, and touch automatically.

### Phase 4: Build Book Zero (Weeks 4-6)
Create the Kurosaki village map using Tiled (free map editor). Implement the dialogue system. Build the four acts. This is where the new architecture pays off — adding story content is editing JSON, not hacking JavaScript.

### Phase 5: PWA + Save System (Week 6)
Add manifest.json, service worker, and IndexedDB saves. Test on iPad. Your daughter can play.

### Phase 6: Port Existing Content (Weeks 7-8)
Move the existing v5.11 content (5 chapters, all enemies, all items) into the new structure as Book Zero.5 or as a "training ground" accessible between Books.

---

## TOOLS YOU'LL NEED

| Tool | Purpose | Cost |
|------|---------|------|
| **VS Code** | Code editor | Free |
| **Node.js** | Runs Vite, installs packages | Free |
| **Phaser 3** | Game framework | Free, open source |
| **Vite** | Build tool + dev server | Free |
| **Tiled** | Map editor (visual, drag-and-drop) | Free |
| **Aseprite** | Pixel art sprite editor | $20 (one-time) or free if compiled from source |
| **GitHub Pages** | Hosting | Free |
| **Chrome DevTools** | Debugging, iPad simulation | Free |

### iPad Testing
Chrome DevTools has a device emulation mode that simulates iPad screen sizes and touch input. For real-device testing, connect your iPad to a Mac and use Safari's Web Inspector.

---

## WHAT YOU KEEP FROM V5.11

The monolith isn't wasted. Everything you built carries over:

| V5.11 Feature | New Home |
|----------------|----------|
| SKILL_DB (35 saint-based skills) | `data/skills.json` |
| Skill tree (127 nodes, 8 trees) | `data/skilltree.json` |
| Item generation (6 rarities, affixes) | `systems/InventorySystem.js` + `data/items.json` |
| Combat engine (turn-based, ATB) | `systems/CombatEngine.js` |
| Enemy definitions (15 types) | `data/enemies.json` |
| Pixel art sprite rendering | Converted to proper sprite sheets in `data/sprites/` |
| Catholic saint miracle names | Preserved exactly as-is in JSON |

The story, the theology, the virtue system, the saint-based skill names — all of that is pure design. It transcends any architecture. You're not starting over. You're moving into a bigger house.

---

## THE BOTTOM LINE

**The monolith got you here.** It proved the concept. It built the combat system, the skill trees, the item generation, the sprite rendering. That work is real and it transfers.

**Phaser + Vite + PWA gets you where you're going.** A modular, expandable, iPad-native game that your daughter can install on her home screen and play through 2,000 years of Church history, one Book at a time, with saves that persist and touch controls that feel right.

**The content is the hard part, and you've already started.** The architecture is just plumbing. The plot bible, Book Zero, the saint-based skill system — that's the soul of the game. The plumbing just needs to not leak.

Start with Phase 1. Get Phaser rendering a single screen on iPad. Everything else follows from there.

---

*"Unless a grain of wheat falls to the earth and dies, it remains alone; but if it dies, it bears much fruit." — John 12:24*

*The monolith dies. The game lives.*
