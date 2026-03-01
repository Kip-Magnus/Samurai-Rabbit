/**
 * SAMURAI USAGI — MAP & TILESET RENDERER
 * ========================================
 * Procedural map generation from area schemas.
 * Renders tile-based maps using Phaser tilemaps with
 * procedurally generated tile textures following Visual DNA palette rules.
 *
 * No tileset image files needed — all tiles generated from code.
 *
 * Architecture:
 *   AreaData (JSON) → MapGenerator (layout) → TileRenderer (pixels) → Phaser Tilemap
 */

const TILE_SIZE = 16;
const MAP_WIDTH = 20;   // tiles
const MAP_HEIGHT = 15;  // tiles

// Tile types
const TILE = {
  GROUND: 0,    GRASS: 1,     PATH: 2,      WATER: 3,
  TREE: 4,      ROCK: 5,      WALL: 6,      DOOR: 7,
  FLOOR: 8,     ALTAR: 9,     BRIDGE: 10,   SAND: 11,
  BAMBOO: 12,   GRAVE: 13,    FIRE: 14,     DEBRIS: 15,
  STAIRS_UP: 16, STAIRS_DOWN: 17,
  NPC_SPOT: 18, CHEST: 19,    SAVE_POINT: 20,
  TRANSITION_N: 21, TRANSITION_S: 22, TRANSITION_E: 23, TRANSITION_W: 24,
};

// Collision tiles (player cannot walk through)
const SOLID_TILES = new Set([TILE.TREE, TILE.ROCK, TILE.WALL, TILE.WATER, TILE.BAMBOO, TILE.FIRE, TILE.DEBRIS]);

// ═══════════════════════════════════════════════════════════════
// TILE TEXTURE GENERATOR
// ═══════════════════════════════════════════════════════════════

export class TileTextureGenerator {
  /**
   * Generate all tile textures as a spritesheet.
   * Returns a canvas containing all tiles in a row.
   */
  static generate(palette, areaType) {
    const tileCount = 25;
    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE * tileCount;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext('2d');

    const colors = TileTextureGenerator._getPaletteColors(palette, areaType);

    for (let i = 0; i < tileCount; i++) {
      TileTextureGenerator._drawTile(ctx, i * TILE_SIZE, 0, i, colors, areaType);
    }

    return canvas;
  }

  static _getPaletteColors(palette, areaType) {
    // Default earthy palette
    const defaults = {
      ground:    '#6b5a3e',
      grass:     '#4a7c59',
      path:      '#a09070',
      water:     '#3a6b8a',
      tree:      '#2d5a2d',
      treeTrunk: '#5c3a1e',
      rock:      '#7a7a7a',
      wall:      '#5c4d3c',
      floor:     '#8b7355',
      door:      '#7a5a3a',
      altar:     '#c9a959',
      sand:      '#c2b280',
      bamboo:    '#6b8e23',
      fire:      '#ff4500',
      debris:    '#5c4d3c',
      save:      '#ffd700',
    };

    // Area type overrides
    const overrides = {
      burning_chapel: { ground: '#3a2a1a', fire: '#ff4500', debris: '#4a3020' },
      coast_road:     { ground: '#8a7a5a', sand: '#d4c490', water: '#4a8ab0' },
      mountain_path:  { ground: '#5a5040', rock: '#8a8a8a', tree: '#3a5a3a' },
      bamboo_forest:  { ground: '#4a5a3a', bamboo: '#5a8a2a', grass: '#3a7a4a' },
      hidden_chapel:  { floor: '#7a6a50', wall: '#5a4a3a', altar: '#d4af37' },
      mountain_summit:{ ground: '#6a6a6a', rock: '#9a9a9a', grass: '#5a7a5a' },
    };

    // Merge with palette from areas.json
    const areaOverrides = overrides[areaType] || {};
    const paletteColors = {};
    if (Array.isArray(palette)) {
      paletteColors.ground = palette[0] || defaults.ground;
      paletteColors.grass  = palette[1] || defaults.grass;
      paletteColors.path   = palette[2] || defaults.path;
    }

    return { ...defaults, ...paletteColors, ...areaOverrides };
  }

  static _drawTile(ctx, x, y, tileType, colors, areaType) {
    const s = TILE_SIZE;

    // Helper to parse hex color
    const fill = (hex) => { ctx.fillStyle = hex; };
    const noise = (base, variance) => {
      const r = parseInt(base.slice(1, 3), 16);
      const g = parseInt(base.slice(3, 5), 16);
      const b = parseInt(base.slice(5, 7), 16);
      const v = Math.floor((Math.random() - 0.5) * variance);
      return `rgb(${Math.max(0, Math.min(255, r + v))},${Math.max(0, Math.min(255, g + v))},${Math.max(0, Math.min(255, b + v))})`;
    };

    switch (tileType) {
      case TILE.GROUND:
        // Dirt/earth with noise
        for (let py = 0; py < s; py++) for (let px = 0; px < s; px++) {
          ctx.fillStyle = noise(colors.ground, 15);
          ctx.fillRect(x + px, y + py, 1, 1);
        }
        break;

      case TILE.GRASS:
        // Green base with grass tufts
        fill(colors.grass); ctx.fillRect(x, y, s, s);
        for (let i = 0; i < 6; i++) {
          const gx = x + Math.random() * (s - 2);
          const gy = y + Math.random() * (s - 3) + 2;
          ctx.fillStyle = noise(colors.grass, 20);
          ctx.fillRect(gx, gy, 1, 3);
          ctx.fillRect(gx + 1, gy + 1, 1, 2);
        }
        break;

      case TILE.PATH:
        fill(colors.path); ctx.fillRect(x, y, s, s);
        // Footpath texture
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = noise(colors.path, 20);
          ctx.fillRect(x + Math.random() * s, y + Math.random() * s, 2, 1);
        }
        break;

      case TILE.WATER:
        fill(colors.water); ctx.fillRect(x, y, s, s);
        // Wave lines
        ctx.fillStyle = noise(colors.water, 30);
        for (let i = 0; i < 3; i++) {
          const wy = y + 4 + i * 4;
          for (let wx = 0; wx < s; wx += 3) {
            ctx.fillRect(x + wx, wy, 2, 1);
          }
        }
        break;

      case TILE.TREE:
        // Ground base + trunk + canopy
        fill(colors.grass); ctx.fillRect(x, y, s, s);
        fill(colors.treeTrunk); ctx.fillRect(x + 6, y + 8, 4, 8);
        fill(colors.tree);
        ctx.fillRect(x + 2, y + 2, 12, 8);
        ctx.fillRect(x + 4, y, 8, 4);
        ctx.fillStyle = noise(colors.tree, 25);
        ctx.fillRect(x + 4, y + 3, 4, 4);
        break;

      case TILE.ROCK:
        fill(colors.ground); ctx.fillRect(x, y, s, s);
        fill(colors.rock);
        ctx.fillRect(x + 2, y + 4, 12, 10);
        ctx.fillRect(x + 4, y + 2, 8, 12);
        ctx.fillStyle = noise(colors.rock, 20);
        ctx.fillRect(x + 5, y + 5, 6, 6);
        break;

      case TILE.WALL:
        fill(colors.wall); ctx.fillRect(x, y, s, s);
        // Brick pattern
        for (let row = 0; row < 4; row++) {
          const offset = (row % 2) * 4;
          for (let col = 0; col < 3; col++) {
            ctx.fillStyle = noise(colors.wall, 15);
            ctx.fillRect(x + offset + col * 6, y + row * 4, 5, 3);
          }
        }
        break;

      case TILE.DOOR:
        fill(colors.wall); ctx.fillRect(x, y, s, s);
        fill(colors.door); ctx.fillRect(x + 3, y + 2, 10, 14);
        fill('#2a1a0a'); ctx.fillRect(x + 4, y + 3, 8, 12);
        break;

      case TILE.FLOOR:
        for (let py = 0; py < s; py++) for (let px = 0; px < s; px++) {
          ctx.fillStyle = noise(colors.floor, 10);
          ctx.fillRect(x + px, y + py, 1, 1);
        }
        // Floorboard lines
        fill('#00000015');
        for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 4, s, 1);
        break;

      case TILE.ALTAR:
        fill(colors.floor); ctx.fillRect(x, y, s, s);
        fill(colors.altar);
        ctx.fillRect(x + 2, y + 4, 12, 10);
        ctx.fillRect(x + 4, y + 2, 8, 2);
        // Cross
        fill('#ffd700');
        ctx.fillRect(x + 7, y + 0, 2, 6);
        ctx.fillRect(x + 5, y + 2, 6, 2);
        break;

      case TILE.BAMBOO:
        fill(colors.grass); ctx.fillRect(x, y, s, s);
        // Bamboo stalks
        for (let i = 0; i < 3; i++) {
          const bx = x + 2 + i * 5;
          fill(colors.bamboo); ctx.fillRect(bx, y, 3, s);
          fill(noise(colors.bamboo, 20)); ctx.fillRect(bx, y + 4, 3, 1);
          ctx.fillRect(bx, y + 9, 3, 1);
        }
        break;

      case TILE.FIRE:
        fill('#1a0a00'); ctx.fillRect(x, y, s, s);
        fill(colors.fire);
        ctx.fillRect(x + 4, y + 6, 8, 10);
        fill('#ffd700');
        ctx.fillRect(x + 6, y + 4, 4, 8);
        fill('#ffffff');
        ctx.fillRect(x + 7, y + 6, 2, 4);
        break;

      case TILE.SAVE_POINT:
        fill(colors.ground); ctx.fillRect(x, y, s, s);
        // Golden cross
        fill(colors.save);
        ctx.fillRect(x + 7, y + 2, 2, 12);
        ctx.fillRect(x + 4, y + 5, 8, 2);
        break;

      case TILE.SAND:
        for (let py = 0; py < s; py++) for (let px = 0; px < s; px++) {
          ctx.fillStyle = noise(colors.sand, 12);
          ctx.fillRect(x + px, y + py, 1, 1);
        }
        break;

      case TILE.TRANSITION_N: case TILE.TRANSITION_S:
      case TILE.TRANSITION_E: case TILE.TRANSITION_W:
        fill(colors.path); ctx.fillRect(x, y, s, s);
        // Arrow indicator
        fill('#ffd70088');
        const arrows = { [TILE.TRANSITION_N]: '↑', [TILE.TRANSITION_S]: '↓', [TILE.TRANSITION_E]: '→', [TILE.TRANSITION_W]: '←' };
        ctx.fillRect(x + 4, y + 4, 8, 8);
        break;

      default:
        fill(colors.ground); ctx.fillRect(x, y, s, s);
        break;
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// MAP GENERATOR — Procedural layout from area data
// ═══════════════════════════════════════════════════════════════

export class MapGenerator {
  /**
   * Generate a map layout for an area.
   * @param {object} areaData - From areas.json
   * @param {number} seed - For deterministic generation
   * @returns {number[][]} 2D array of tile types
   */
  static generate(areaData, seed = 0) {
    const rng = MapGenerator._seededRNG(seed);
    const type = areaData.type || areaData.tileset || 'forest';

    let map;
    switch (type) {
      case 'burning_chapel':  map = MapGenerator._genInterior(rng, 'chapel_fire'); break;
      case 'hidden_chapel':   map = MapGenerator._genInterior(rng, 'chapel_safe'); break;
      case 'village':
      case 'village_outskirts': map = MapGenerator._genVillage(rng); break;
      case 'bamboo_forest':
      case 'forest':          map = MapGenerator._genForest(rng, type); break;
      case 'mountain':
      case 'mountain_path':
      case 'mountain_summit': map = MapGenerator._genMountain(rng); break;
      case 'coast':
      case 'coast_road':      map = MapGenerator._genCoast(rng); break;
      default:                map = MapGenerator._genForest(rng, type); break;
    }

    // Place transitions from area connections
    if (areaData.connections) {
      MapGenerator._placeTransitions(map, areaData.connections);
    }

    // Place save point if area allows it
    if (areaData.hasSavePoint) {
      MapGenerator._placeSavePoint(map);
    }

    return map;
  }

  static _seededRNG(seed) {
    let s = seed || Date.now();
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  }

  // ── Layout generators ────────────────────────────────────

  static _genForest(rng, subtype) {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILE.GRASS));

    // Cellular automata for organic tree placement
    // Seed ~40% trees
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < MAP_WIDTH - 1; x++) {
        if (rng() < (subtype === 'bamboo_forest' ? 0.45 : 0.35)) {
          map[y][x] = subtype === 'bamboo_forest' ? TILE.BAMBOO : TILE.TREE;
        }
      }
    }

    // 3 iterations of cellular automata
    for (let iter = 0; iter < 3; iter++) {
      const next = map.map(row => [...row]);
      for (let y = 1; y < MAP_HEIGHT - 1; y++) {
        for (let x = 1; x < MAP_WIDTH - 1; x++) {
          const neighbors = MapGenerator._countNeighbors(map, x, y, [TILE.TREE, TILE.BAMBOO]);
          const treeType = subtype === 'bamboo_forest' ? TILE.BAMBOO : TILE.TREE;
          if (neighbors >= 5) next[y][x] = treeType;
          else if (neighbors <= 2) next[y][x] = TILE.GRASS;
        }
      }
      map.splice(0, map.length, ...next);
    }

    // Carve a path through
    MapGenerator._carvePath(map, rng);

    // Scatter rocks
    for (let i = 0; i < 5; i++) {
      const x = 1 + Math.floor(rng() * (MAP_WIDTH - 2));
      const y = 1 + Math.floor(rng() * (MAP_HEIGHT - 2));
      if (map[y][x] === TILE.GRASS) map[y][x] = TILE.ROCK;
    }

    return map;
  }

  static _genMountain(rng) {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILE.GROUND));

    // More rocks, sparse trees, elevation via color later
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const r = rng();
        if (r < 0.2) map[y][x] = TILE.ROCK;
        else if (r < 0.3) map[y][x] = TILE.TREE;
        else if (r < 0.4) map[y][x] = TILE.GRASS;
      }
    }

    MapGenerator._carvePath(map, rng);
    return map;
  }

  static _genCoast(rng) {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILE.SAND));

    // Water on the right side
    const coastLine = 14 + Math.floor(rng() * 3);
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const offset = Math.floor(Math.sin(y * 0.5) * 2);
      for (let x = coastLine + offset; x < MAP_WIDTH; x++) {
        map[y][x] = TILE.WATER;
      }
    }

    // Path along the coast
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const px = coastLine - 3 + Math.floor(Math.sin(y * 0.3) * 2);
      for (let dx = -1; dx <= 1; dx++) {
        if (px + dx >= 0 && px + dx < MAP_WIDTH) map[y][px + dx] = TILE.PATH;
      }
    }

    // Scatter grass and rocks inland
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < coastLine - 2; x++) {
        if (rng() < 0.2) map[y][x] = TILE.GRASS;
        if (rng() < 0.05) map[y][x] = TILE.ROCK;
      }
    }

    return map;
  }

  static _genVillage(rng) {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILE.GRASS));

    // Main path through village
    for (let x = 0; x < MAP_WIDTH; x++) {
      map[7][x] = TILE.PATH;
      map[8][x] = TILE.PATH;
    }

    // Place 3-4 buildings (wall rectangles)
    const buildings = [
      { x: 2, y: 2, w: 5, h: 4 },
      { x: 9, y: 1, w: 4, h: 5 },
      { x: 3, y: 10, w: 6, h: 4 },
      { x: 14, y: 3, w: 4, h: 3 },
    ];

    for (const b of buildings) {
      for (let by = b.y; by < b.y + b.h && by < MAP_HEIGHT; by++) {
        for (let bx = b.x; bx < b.x + b.w && bx < MAP_WIDTH; bx++) {
          map[by][bx] = (by === b.y || by === b.y + b.h - 1 || bx === b.x || bx === b.x + b.w - 1)
            ? TILE.WALL : TILE.FLOOR;
        }
      }
      // Door
      const doorX = b.x + Math.floor(b.w / 2);
      const doorY = b.y + b.h - 1;
      if (doorY < MAP_HEIGHT) map[doorY][doorX] = TILE.DOOR;
    }

    // Scatter trees around edges
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (map[y][x] === TILE.GRASS && rng() < 0.15) map[y][x] = TILE.TREE;
      }
    }

    return map;
  }

  static _genInterior(rng, subtype) {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILE.WALL));

    // Clear interior
    for (let y = 2; y < MAP_HEIGHT - 2; y++) {
      for (let x = 2; x < MAP_WIDTH - 2; x++) {
        map[y][x] = TILE.FLOOR;
      }
    }

    // Altar at the far end
    map[3][MAP_WIDTH / 2 | 0] = TILE.ALTAR;
    map[3][(MAP_WIDTH / 2 | 0) - 1] = TILE.ALTAR;
    map[3][(MAP_WIDTH / 2 | 0) + 1] = TILE.ALTAR;

    // Door at bottom
    map[MAP_HEIGHT - 2][MAP_WIDTH / 2 | 0] = TILE.DOOR;

    if (subtype === 'chapel_fire') {
      // Scatter fire and debris
      for (let y = 2; y < MAP_HEIGHT - 2; y++) {
        for (let x = 2; x < MAP_WIDTH - 2; x++) {
          if (map[y][x] === TILE.FLOOR) {
            if (rng() < 0.15) map[y][x] = TILE.FIRE;
            else if (rng() < 0.1) map[y][x] = TILE.DEBRIS;
          }
        }
      }
    }

    return map;
  }

  // ── Helpers ──────────────────────────────────────────────

  static _carvePath(map, rng) {
    // Carve winding path from south to north
    let x = Math.floor(MAP_WIDTH / 2);
    for (let y = MAP_HEIGHT - 1; y >= 0; y--) {
      map[y][x] = TILE.PATH;
      if (x > 0) map[y][x - 1] = map[y][x - 1] === TILE.PATH ? TILE.PATH : TILE.GRASS;
      if (x < MAP_WIDTH - 1) map[y][x + 1] = map[y][x + 1] === TILE.PATH ? TILE.PATH : TILE.GRASS;

      if (rng() < 0.4) x += rng() < 0.5 ? -1 : 1;
      x = Math.max(2, Math.min(MAP_WIDTH - 3, x));
    }
  }

  static _countNeighbors(map, x, y, types) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ny = y + dy, nx = x + dx;
        if (ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
          if (types.includes(map[ny][nx])) count++;
        }
      }
    }
    return count;
  }

  static _placeTransitions(map, connections) {
    if (connections.north) { map[0][MAP_WIDTH / 2 | 0] = TILE.TRANSITION_N; }
    if (connections.south) { map[MAP_HEIGHT - 1][MAP_WIDTH / 2 | 0] = TILE.TRANSITION_S; }
    if (connections.east)  { map[MAP_HEIGHT / 2 | 0][MAP_WIDTH - 1] = TILE.TRANSITION_E; }
    if (connections.west)  { map[MAP_HEIGHT / 2 | 0][0] = TILE.TRANSITION_W; }
  }

  static _placeSavePoint(map) {
    // Find a floor/path tile near center
    const cy = MAP_HEIGHT / 2 | 0;
    const cx = MAP_WIDTH / 2 | 0;
    for (let r = 0; r < 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const y = cy + dy, x = cx + dx;
          if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
            if (map[y][x] === TILE.PATH || map[y][x] === TILE.FLOOR) {
              map[y][x] = TILE.SAVE_POINT;
              return;
            }
          }
        }
      }
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// MAP SCENE — Phaser integration
// ═══════════════════════════════════════════════════════════════

export class MapScene {
  constructor(scene) {
    this.scene = scene;
    this.currentArea = null;
    this.mapData = null;
    this.tileLayer = null;
    this.playerSprite = null;
    this.npcSprites = [];
    this.stepCount = 0;
  }

  /**
   * Load and render an area.
   */
  loadArea(areaData, playerPos) {
    this.currentArea = areaData;

    // Generate map layout
    const seed = this._hashString(areaData.id || 'default');
    this.mapData = MapGenerator.generate(areaData, seed);

    // Generate tile textures
    const palette = areaData.palette || areaData.tileset_palette || [];
    const tilesheet = TileTextureGenerator.generate(palette, areaData.type || areaData.id);

    // Create Phaser tilemap
    this._createTilemap(tilesheet);

    // Place player
    const startX = playerPos?.x || (MAP_WIDTH / 2 | 0);
    const startY = playerPos?.y || (MAP_HEIGHT - 2);
    this._placePlayer(startX, startY);

    // Place NPCs from area data
    if (areaData.npcs) {
      this._placeNPCs(areaData.npcs);
    }

    return { width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE };
  }

  _createTilemap(tilesheet) {
    // Add tilesheet as texture
    if (this.scene.textures.exists('tiles')) this.scene.textures.remove('tiles');
    this.scene.textures.addCanvas('tiles', tilesheet);

    // Create tilemap data
    const mapConfig = {
      data: this.mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    };

    if (this.tileLayer) this.tileLayer.destroy();

    const tilemap = this.scene.make.tilemap(mapConfig);
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', TILE_SIZE, TILE_SIZE);
    this.tileLayer = tilemap.createLayer(0, tileset, 0, 0);

    // Set collision
    for (const solidTile of SOLID_TILES) {
      tilemap.setCollision(solidTile);
    }

    return tilemap;
  }

  _placePlayer(tileX, tileY) {
    const px = tileX * TILE_SIZE + TILE_SIZE / 2;
    const py = tileY * TILE_SIZE + TILE_SIZE / 2;

    if (!this.playerSprite) {
      this.playerSprite = this.scene.add.rectangle(px, py, 12, 14, 0xa0784c);
      this.playerSprite.setDepth(100);
    } else {
      this.playerSprite.setPosition(px, py);
    }

    this.playerSprite.tileX = tileX;
    this.playerSprite.tileY = tileY;
  }

  _placeNPCs(npcs) {
    for (const sprite of this.npcSprites) sprite.destroy();
    this.npcSprites = [];

    for (const npc of npcs) {
      const px = (npc.x || 5) * TILE_SIZE + TILE_SIZE / 2;
      const py = (npc.y || 5) * TILE_SIZE + TILE_SIZE / 2;
      const color = npc.species === 'rabbit' ? 0xf5f0e8 : npc.species === 'fox' ? 0x8b5e3c : 0x6b6b6b;
      const sprite = this.scene.add.rectangle(px, py, 12, 14, color);
      sprite.setDepth(99);
      sprite.npcData = npc;
      this.npcSprites.push(sprite);
    }
  }

  /**
   * Move player by tiles. Returns action if transition/NPC/encounter.
   */
  movePlayer(dx, dy) {
    const newX = this.playerSprite.tileX + dx;
    const newY = this.playerSprite.tileY + dy;

    // Bounds check
    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return null;

    // Collision check
    const tile = this.mapData[newY][newX];
    if (SOLID_TILES.has(tile)) return { type: 'blocked' };

    // Move
    this.playerSprite.tileX = newX;
    this.playerSprite.tileY = newY;
    this.playerSprite.setPosition(newX * TILE_SIZE + TILE_SIZE / 2, newY * TILE_SIZE + TILE_SIZE / 2);
    this.stepCount++;

    // Check what's on this tile
    switch (tile) {
      case TILE.TRANSITION_N: return { type: 'transition', direction: 'north', target: this.currentArea.connections?.north };
      case TILE.TRANSITION_S: return { type: 'transition', direction: 'south', target: this.currentArea.connections?.south };
      case TILE.TRANSITION_E: return { type: 'transition', direction: 'east', target: this.currentArea.connections?.east };
      case TILE.TRANSITION_W: return { type: 'transition', direction: 'west', target: this.currentArea.connections?.west };
      case TILE.SAVE_POINT:   return { type: 'save_point' };
      case TILE.ALTAR:        return { type: 'altar' };
      case TILE.DOOR:         return { type: 'door' };
      case TILE.CHEST:        return { type: 'chest' };
    }

    // NPC proximity check
    for (const npc of this.npcSprites) {
      if (npc.npcData && Math.abs(npc.npcData.x - newX) <= 1 && Math.abs(npc.npcData.y - newY) <= 1) {
        return { type: 'npc_nearby', npc: npc.npcData };
      }
    }

    // Encounter check (every 16 steps)
    if (this.stepCount % 16 === 0) {
      return { type: 'encounter_check' };
    }

    return { type: 'move' };
  }

  /** Check if a tile position has a hidden item (requires detect passive) */
  checkHidden(tileX, tileY, hasDetect) {
    if (!hasDetect) return null;
    // Hidden items at specific coordinates defined in area data
    const hiddens = this.currentArea.hiddenItems || [];
    return hiddens.find(h => h.x === tileX && h.y === tileY) || null;
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

// Export constants for other systems
export { TILE, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, SOLID_TILES, getDisplayName, getGrade };
