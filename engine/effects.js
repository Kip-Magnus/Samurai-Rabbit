/**
 * SAMURAI USAGI — ATMOSPHERIC EFFECTS SYSTEM
 * ============================================
 * Implements Visual DNA Part 4: Atmospheric Effects
 *
 * SOURCE GAME TECHNIQUES:
 *   Octopath:  Parallax depth layers, light shafts, HD-2D atmosphere
 *   FF6:       Screen flash/shake on impacts, battle choreography
 *   CT:        Scene transition effects, time-portal visuals
 *   Celeste:   Sub-pixel environmental animation, particle physics
 *   TO:        Muted atmospheric overlays for moral weight
 *
 * Systems:
 *   ParallaxManager  — 7-layer depth with independent scroll speeds
 *   ParticleSystem   — Grass, rain, fire, snow, ash, holy motes, embers
 *   ScreenFX         — Shake, flash, fade, vignette
 *   WeatherSystem    — Time-of-day overlays, weather effects
 */

import { buildRamp, hexToRGB } from './sprites.js';

// ═══════════════════════════════════════════════════════════════
// PARALLAX MANAGER (Octopath Technique)
// ═══════════════════════════════════════════════════════════════

/**
 * Every scene has depth built from discrete layers that scroll at
 * different speeds relative to the camera.
 *
 * LAYER STACK (back to front):
 *   0: Sky gradient       (static or very slow scroll)
 *   1: Far background      (0.1x camera speed) — mountains/clouds
 *   2: Mid background      (0.3x camera speed) — treeline/buildings
 *   3: Ground plane        (1.0x camera speed) — where characters walk
 *   4: Foreground decor    (1.3x camera speed) — grass blades, posts
 *   5: Overlay effects     (independent) — rain, particles, light
 *   6: UI layer            (fixed) — dialogue, HUD
 */
export class ParallaxManager {
  constructor(scene) {
    this.scene = scene;
    this.layers = [];
    this.cameraX = 0;
    this.cameraY = 0;
  }

  buildLayers(areaData, eraPalette) {
    this.clear();
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    // Layer 0: Sky gradient (static)
    this._createSkyLayer(w, h, eraPalette, areaData);
    // Layer 1: Far background (0.1x scroll)
    this._createFarBackgroundLayer(w, h, eraPalette, areaData);
    // Layer 2: Mid background (0.3x scroll)
    this._createMidBackgroundLayer(w, h, eraPalette, areaData);
    // Layers 3-4 handled by tilemap, 5 by ParticleSystem, 6 by UI
  }

  _createSkyLayer(w, h, palette, area) {
    const skyColor = palette.sky || '#87ceeb';
    const horizonColor = palette.dominant || '#4a7c59';
    const gfx = this.scene.add.graphics();
    gfx.setDepth(-100);
    gfx.setScrollFactor(0);

    const skyRGB = hexToRGB(skyColor);
    const horizonRGB = hexToRGB(horizonColor);
    const skyH = Math.floor(h * 0.6);

    for (let y = 0; y < skyH; y++) {
      const t = y / skyH;
      const r = Math.round(skyRGB.r + (horizonRGB.r - skyRGB.r) * t * 0.3);
      const g = Math.round(skyRGB.g + (horizonRGB.g - skyRGB.g) * t * 0.3);
      const b = Math.round(skyRGB.b + (horizonRGB.b - skyRGB.b) * t * 0.3);
      gfx.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      gfx.fillRect(0, y, w, 1);
    }

    this.layers.push({ gfx, scrollFactor: 0, type: 'sky' });
  }

  _createFarBackgroundLayer(w, h, palette, area) {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(-90);
    gfx.setScrollFactor(0.1);

    const mtnColor = hexToRGB(palette.shadow || '#2b1d0e');
    const skyH = Math.floor(h * 0.55);

    gfx.fillStyle(Phaser.Display.Color.GetColor(mtnColor.r, mtnColor.g, mtnColor.b), 0.4);

    const peakCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < peakCount; i++) {
      const px = (w * 1.5) * (i / peakCount) - w * 0.1;
      const ph = 30 + Math.random() * 50;
      const pw = 80 + Math.random() * 60;
      gfx.beginPath();
      gfx.moveTo(px - pw / 2, skyH + 20);
      gfx.lineTo(px, skyH + 20 - ph);
      gfx.lineTo(px + pw / 2, skyH + 20);
      gfx.closePath();
      gfx.fill();
    }

    this.layers.push({ gfx, scrollFactor: 0.1, type: 'far_bg' });
  }

  _createMidBackgroundLayer(w, h, palette, area) {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(-80);
    gfx.setScrollFactor(0.3);

    const treeDark = hexToRGB(buildRamp(palette.dominant || '#4a7c59')[0]);
    const skyH = Math.floor(h * 0.6);

    const treeCount = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < treeCount; i++) {
      const tx = (w * 1.5) * (i / treeCount) - w * 0.1 + (Math.random() - 0.5) * 30;
      const th = 25 + Math.random() * 35;
      const tw = 15 + Math.random() * 20;

      gfx.fillStyle(Phaser.Display.Color.GetColor(treeDark.r, treeDark.g, treeDark.b), 0.7);
      gfx.fillEllipse(tx, skyH + 10 - th / 2, tw, th);
      gfx.fillStyle(Phaser.Display.Color.GetColor(treeDark.r, treeDark.g, treeDark.b), 0.5);
      gfx.fillRect(tx - 2, skyH + 10 - th / 4, 4, th / 2);
    }

    this.layers.push({ gfx, scrollFactor: 0.3, type: 'mid_bg' });
  }

  clear() {
    for (const layer of this.layers) {
      if (layer.gfx) layer.gfx.destroy();
    }
    this.layers = [];
  }

  update(cameraX, cameraY) {
    this.cameraX = cameraX;
    this.cameraY = cameraY;
  }
}


// ═══════════════════════════════════════════════════════════════
// PARTICLE SYSTEM — Environmental Detail Generators
// ═══════════════════════════════════════════════════════════════

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.emitters = [];
    this.customParticles = [];
    this.active = true;
  }

  createEffect(type, palette, config = {}) {
    const creators = {
      dust_motes: () => this._createDustMotes(palette, config),
      rain: () => this._createRain(palette, config),
      fire: () => this._createFire(palette, config),
      embers: () => this._createEmbers(palette, config),
      snow: () => this._createFallingParticles('#ffffff', 0.8, config),
      ash: () => this._createFallingParticles('#888888', 0.5, config),
      light_shaft: () => this._createLightShaft(palette, config),
      holy_motes: () => this._createHolyMotes(palette, config),
      stars: () => this._createStars(palette, config),
      fireflies: () => this._createFireflies(palette, config),
      water_sparkle: () => this._createWaterSparkle(palette, config),
    };
    const creator = creators[type];
    if (!creator) { console.warn(`Unknown particle: ${type}`); return null; }
    return creator();
  }

  // ── Dust Motes: Morning atmosphere, warm particles drifting upward ──
  _createDustMotes(palette, config) {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const particles = [];
    for (let i = 0; i < (config.count || 20); i++) {
      particles.push({
        type: 'dust_mote', x: Math.random() * w * 1.5, y: Math.random() * h,
        size: 1 + Math.floor(Math.random() * 2),
        speedX: (Math.random() - 0.5) * 0.2, speedY: -0.1 - Math.random() * 0.3,
        alpha: 0.2 + Math.random() * 0.4, color: palette.accent || '#c9a959',
        phase: Math.random() * Math.PI * 2, alive: true,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── Rain: 1px wide, 8-15px tall, slight angle, splash rings ──
  _createRain(palette, config) {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const particles = [];
    for (let i = 0; i < (config.count || 40); i++) {
      const depth = Math.random();
      particles.push({
        type: 'rain', x: Math.random() * w * 1.3, y: -Math.random() * h,
        length: 8 + Math.floor(Math.random() * 8),
        speedY: 4 + depth * 6, speedX: 1 + depth * 0.5,
        alpha: 0.3 + depth * 0.4, color: '#aaccee', width: 1,
        alive: true, depth, splashing: false,
        splashX: 0, splashY: 0, splashTimer: 0, splashFrame: 0,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── Fire: Core yellow-white 2x2 jitter, mid orange envelope, sparks ──
  _createFire(palette, config) {
    const cx = config.x || this.scene.scale.width / 2;
    const cy = config.y || this.scene.scale.height / 2;
    const particles = [];

    for (let i = 0; i < 6; i++) {
      particles.push({
        type: 'fire_core', baseX: cx, baseY: cy, x: cx, y: cy,
        size: 2, color: '#fff4c0', alpha: 0.9, alive: true, timer: Math.random() * 100,
      });
    }
    for (let i = 0; i < 4; i++) {
      particles.push({
        type: 'fire_mid', baseX: cx, baseY: cy, x: cx, y: cy,
        sizeW: 3, sizeH: 4, color: '#ff8c00', alpha: 0.7,
        shapeIndex: i, alive: true, timer: Math.random() * 100,
      });
    }
    particles.push({
      type: 'fire_outer', x: cx, y: cy, sizeW: 5, sizeH: 6,
      color: palette.fire || '#ff4500', alpha: 0.3, alive: true,
    });
    for (let i = 0; i < 8; i++) {
      particles.push({
        type: 'fire_spark',
        x: cx + (Math.random() - 0.5) * 6, y: cy,
        speedX: (Math.random() - 0.5) * 0.8, speedY: -1 - Math.random() * 2,
        alpha: 0.8, life: 0, maxLife: 30 + Math.random() * 40,
        color: '#ffcc33', alive: true,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── Embers: Floating fire remnants for destruction scenes ──
  _createEmbers(palette, config) {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const particles = [];
    for (let i = 0; i < (config.count || 25); i++) {
      particles.push({
        type: 'ember', x: Math.random() * w, y: h + Math.random() * 20,
        speedX: (Math.random() - 0.5) * 0.5, speedY: -0.5 - Math.random() * 1.5,
        alpha: 0.5 + Math.random() * 0.5, size: 1 + Math.floor(Math.random() * 2),
        color: Math.random() > 0.5 ? '#ff6633' : '#ffcc33',
        phase: Math.random() * Math.PI * 2, alive: true,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── Snow/Ash: 1-2px, sine-wave diagonal drift, depth by size ──
  _createFallingParticles(baseColor, baseAlpha, config) {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const particles = [];
    for (let i = 0; i < (config.count || 30); i++) {
      const depth = Math.random();
      particles.push({
        type: 'falling', x: Math.random() * w * 1.3, y: -Math.random() * h,
        size: depth > 0.5 ? 2 : 1, speedX: 0.3 + depth * 0.5, speedY: 0.3 + depth * 0.7,
        alpha: (baseAlpha - 0.2) + depth * 0.3, color: baseColor,
        phase: Math.random() * Math.PI * 2,
        sineAmplitude: 10 + Math.random() * 20, sineFreq: 0.02 + Math.random() * 0.03,
        alive: true,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── Light Shafts (Octopath): Triangular gold gradient, motes within ──
  _createLightShaft(palette, config) {
    const shaft = {
      type: 'light_shaft',
      x: config.x || this.scene.scale.width * 0.4,
      topY: config.topY || 0, bottomY: config.bottomY || this.scene.scale.height,
      topW: config.topWidth || 20, bottomW: config.bottomWidth || 80,
      color: palette.holy || '#ffd700',
      alpha: 0.08 + Math.random() * 0.04,
      driftX: 0, driftSpeed: 1 / 30, driftRange: 15,
      motes: [], alive: true,
    };
    for (let i = 0; i < 6; i++) {
      shaft.motes.push({
        x: shaft.x + (Math.random() - 0.5) * shaft.bottomW * 0.6,
        y: shaft.topY + Math.random() * (shaft.bottomY - shaft.topY),
        speedY: -0.2 - Math.random() * 0.3,
        size: 1 + Math.floor(Math.random() * 2), alpha: 0.3 + Math.random() * 0.4,
      });
    }
    this.customParticles.push(shaft);
    return shaft;
  }

  // ── Holy Motes: Spiral inward during prayer, burst on release ──
  _createHolyMotes(palette, config) {
    const cx = config.x || this.scene.scale.width / 2;
    const cy = config.y || this.scene.scale.height / 2;
    const particles = [];
    for (let i = 0; i < (config.count || 15); i++) {
      const angle = (i / (config.count || 15)) * Math.PI * 2;
      const radius = 30 + Math.random() * 50;
      particles.push({
        type: 'holy_mote', x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius,
        targetX: cx, targetY: cy, angle, radius,
        speed: 0.5 + Math.random() * 0.5, size: 1 + Math.floor(Math.random() * 2),
        alpha: 0.5 + Math.random() * 0.5, color: palette.holy || '#ffd700',
        phase: 'gather', alive: true,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── Stars: Night sky twinkle ──
  _createStars(palette, config) {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height * 0.5;
    const particles = [];
    for (let i = 0; i < (config.count || 30); i++) {
      particles.push({
        type: 'star', x: Math.random() * w, y: Math.random() * h,
        size: Math.random() > 0.7 ? 2 : 1,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.01 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2,
        color: '#ffffff', alive: true,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── Fireflies: Warm evening blink ──
  _createFireflies(palette, config) {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const particles = [];
    for (let i = 0; i < (config.count || 12); i++) {
      particles.push({
        type: 'firefly', x: Math.random() * w, y: h * 0.3 + Math.random() * h * 0.5,
        speedX: (Math.random() - 0.5) * 0.3, speedY: (Math.random() - 0.5) * 0.2,
        alpha: 0, targetAlpha: 0.7, size: 2, color: '#ccff66', glowRadius: 4,
        blinkTimer: Math.random() * 200, blinkRate: 100 + Math.random() * 150, alive: true,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── Water Sparkle: Surface highlights ──
  _createWaterSparkle(palette, config) {
    const w = this.scene.scale.width;
    const baseY = config.y || this.scene.scale.height * 0.6;
    const particles = [];
    for (let i = 0; i < (config.count || 8); i++) {
      particles.push({
        type: 'water_sparkle', x: Math.random() * w, y: baseY + Math.random() * 40,
        alpha: 0, maxAlpha: 0.6 + Math.random() * 0.4,
        timer: Math.random() * 100, sparkleRate: 50 + Math.random() * 80,
        size: 1, color: '#ffffff', alive: true,
      });
    }
    this.customParticles.push(...particles);
    return particles;
  }

  // ── UPDATE all particles ──
  update(time, delta) {
    if (!this.active) return;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const dt = delta / 16.67;

    for (const p of this.customParticles) {
      if (!p.alive) continue;

      switch (p.type) {
        case 'dust_mote':
          p.x += p.speedX * dt + Math.sin(p.phase) * 0.1;
          p.y += p.speedY * dt;
          p.phase += 0.02 * dt;
          p.alpha = 0.2 + Math.sin(p.phase) * 0.2;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w * 1.5; }
          break;

        case 'rain':
          if (p.splashing) {
            p.splashTimer += dt;
            p.splashFrame = Math.floor(p.splashTimer / 3);
            if (p.splashFrame > 2) {
              p.splashing = false; p.x = Math.random() * w * 1.3; p.y = -Math.random() * 20;
            }
          } else {
            p.x += p.speedX * dt; p.y += p.speedY * dt;
            if (p.y > h - 10) {
              p.splashing = true; p.splashX = p.x; p.splashY = h - 5;
              p.splashTimer = 0; p.splashFrame = 0;
            }
          }
          break;

        case 'fire_core':
          p.timer += dt;
          p.x = p.baseX + Math.round((Math.random() - 0.5) * 2);
          p.y = p.baseY + Math.round((Math.random() - 0.5) * 2) - 2;
          break;

        case 'fire_mid':
          p.timer += dt;
          p.shapeIndex = Math.floor(p.timer / 4) % 4;
          p.x = p.baseX + Math.round((Math.random() - 0.5) * 2);
          p.y = p.baseY - 3 + Math.round((Math.random() - 0.5) * 1);
          break;

        case 'fire_spark':
          p.x += p.speedX * dt; p.y += p.speedY * dt;
          p.speedX += (Math.random() - 0.5) * 0.1;
          p.life += dt;
          p.alpha = Math.max(0, 0.8 * (1 - p.life / p.maxLife));
          if (p.life >= p.maxLife) {
            p.x += (Math.random() - 0.5) * 6; p.y += 20; p.life = 0;
            p.speedX = (Math.random() - 0.5) * 0.8; p.speedY = -1 - Math.random() * 2;
            p.alpha = 0.8;
          }
          break;

        case 'ember':
          p.x += p.speedX * dt + Math.sin(p.phase) * 0.3;
          p.y += p.speedY * dt; p.phase += 0.03 * dt; p.alpha *= 0.998;
          if (p.y < -20 || p.alpha < 0.05) {
            p.x = Math.random() * w; p.y = h + Math.random() * 20;
            p.alpha = 0.5 + Math.random() * 0.5;
          }
          break;

        case 'falling':
          p.x += p.speedX * dt; p.y += p.speedY * dt;
          p.x += Math.sin(p.phase) * 0.3; p.phase += p.sineFreq * dt;
          if (p.y > h + 5) { p.y = -5; p.x = Math.random() * w * 1.3; }
          break;

        case 'light_shaft':
          p.driftX += p.driftSpeed * dt;
          if (Math.abs(p.driftX) > p.driftRange) p.driftSpeed *= -1;
          for (const mote of p.motes) {
            mote.y += mote.speedY * dt;
            if (mote.y < p.topY) {
              mote.y = p.bottomY;
              mote.x = p.x + p.driftX + (Math.random() - 0.5) * p.bottomW * 0.6;
            }
          }
          break;

        case 'holy_mote':
          if (p.phase === 'gather') {
            p.radius -= p.speed * dt; p.angle += 0.05 * dt;
            p.x = p.targetX + Math.cos(p.angle) * p.radius;
            p.y = p.targetY + Math.sin(p.angle) * p.radius;
            if (p.radius <= 3) p.phase = 'hold';
          } else if (p.phase === 'hold') {
            p.x = p.targetX + (Math.random() - 0.5) * 4;
            p.y = p.targetY + (Math.random() - 0.5) * 4;
          } else if (p.phase === 'burst') {
            p.radius += 3 * dt;
            p.x = p.targetX + Math.cos(p.angle) * p.radius;
            p.y = p.targetY + Math.sin(p.angle) * p.radius;
            p.alpha -= 0.02 * dt;
            if (p.alpha <= 0) p.alive = false;
          }
          break;

        case 'star':
          p.twinklePhase += p.twinkleSpeed * dt;
          p.alpha = 0.3 + Math.abs(Math.sin(p.twinklePhase)) * 0.7;
          break;

        case 'firefly':
          p.x += p.speedX * dt; p.y += p.speedY * dt;
          p.blinkTimer += dt;
          const bp = (p.blinkTimer % p.blinkRate) / p.blinkRate;
          p.alpha = bp < 0.3 ? p.targetAlpha * (bp / 0.3) :
                    bp < 0.5 ? p.targetAlpha :
                    p.targetAlpha * (1 - (bp - 0.5) / 0.5);
          if (Math.random() < 0.01) {
            p.speedX = (Math.random() - 0.5) * 0.3; p.speedY = (Math.random() - 0.5) * 0.2;
          }
          if (p.x < 0 || p.x > w) p.speedX *= -1;
          if (p.y < h * 0.2 || p.y > h * 0.8) p.speedY *= -1;
          break;

        case 'water_sparkle':
          p.timer += dt;
          const sp = (p.timer % p.sparkleRate) / p.sparkleRate;
          p.alpha = sp < 0.1 ? p.maxAlpha * (sp / 0.1) :
                    sp < 0.2 ? p.maxAlpha :
                    sp < 0.3 ? p.maxAlpha * (1 - (sp - 0.2) / 0.1) : 0;
          break;
      }
    }

    this.customParticles = this.customParticles.filter(p => p.alive);
  }

  // ── RENDER all particles to a Graphics object ──
  render(graphics) {
    if (!this.active) return;

    for (const p of this.customParticles) {
      if (!p.alive || p.alpha <= 0) continue;

      const rgb = hexToRGB(p.color || '#ffffff');
      const pColor = Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b);

      switch (p.type) {
        case 'dust_mote': case 'ember': case 'star': case 'water_sparkle':
          graphics.fillStyle(pColor, p.alpha);
          graphics.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
          break;

        case 'rain':
          if (p.splashing) {
            const sr = 3 + p.splashFrame * 2;
            graphics.lineStyle(1, pColor, p.alpha * 0.5);
            graphics.strokeCircle(p.splashX, p.splashY, sr);
          } else {
            graphics.lineStyle(p.width, pColor, p.alpha);
            graphics.lineBetween(
              Math.round(p.x), Math.round(p.y),
              Math.round(p.x + p.speedX * 2), Math.round(p.y + p.length)
            );
          }
          break;

        case 'fire_core':
          graphics.fillStyle(pColor, p.alpha);
          graphics.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, p.size, p.size);
          break;

        case 'fire_mid': {
          graphics.fillStyle(pColor, p.alpha);
          const shapes = [[0,0,p.sizeW,p.sizeH],[-1,0,p.sizeW+1,p.sizeH-1],[0,-1,p.sizeW-1,p.sizeH+1],[1,0,p.sizeW,p.sizeH-1]];
          const s = shapes[p.shapeIndex % shapes.length];
          graphics.fillRect(Math.round(p.x)+s[0]-1, Math.round(p.y)+s[1]-4, s[2], s[3]);
          break;
        }

        case 'fire_outer':
          graphics.fillStyle(pColor, p.alpha);
          graphics.fillRect(Math.round(p.x)-Math.floor(p.sizeW/2), Math.round(p.y)-p.sizeH, p.sizeW, p.sizeH);
          break;

        case 'fire_spark': case 'falling':
          graphics.fillStyle(pColor, p.alpha);
          graphics.fillRect(Math.round(p.x), Math.round(p.y), p.size || 1, p.size || 1);
          break;

        case 'light_shaft': {
          const sRGB = hexToRGB(p.color);
          const sColor = Phaser.Display.Color.GetColor(sRGB.r, sRGB.g, sRGB.b);
          const sx = p.x + p.driftX;
          for (let y = p.topY; y < p.bottomY; y += 2) {
            const t = (y - p.topY) / (p.bottomY - p.topY);
            const lineW = p.topW + (p.bottomW - p.topW) * t;
            graphics.fillStyle(sColor, p.alpha * (1 - t * 0.5));
            graphics.fillRect(Math.round(sx - lineW / 2), y, Math.round(lineW), 2);
          }
          for (const mote of p.motes) {
            graphics.fillStyle(sColor, mote.alpha);
            graphics.fillRect(Math.round(mote.x), Math.round(mote.y), mote.size, mote.size);
          }
          break;
        }

        case 'holy_mote':
          graphics.fillStyle(pColor, p.alpha * 0.2);
          graphics.fillRect(Math.round(p.x)-1, Math.round(p.y)-1, p.size+2, p.size+2);
          graphics.fillStyle(pColor, p.alpha);
          graphics.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
          break;

        case 'firefly':
          if (p.alpha > 0.05) {
            graphics.fillStyle(pColor, p.alpha * 0.15);
            graphics.fillCircle(Math.round(p.x), Math.round(p.y), p.glowRadius);
            graphics.fillStyle(pColor, p.alpha);
            graphics.fillRect(Math.round(p.x)-1, Math.round(p.y)-1, p.size, p.size);
          }
          break;
      }
    }
  }

  burstHolyMotes() {
    for (const p of this.customParticles) {
      if (p.type === 'holy_mote' && p.phase === 'hold') p.phase = 'burst';
    }
  }

  clear() {
    this.customParticles = [];
    for (const emitter of this.emitters) { if (emitter.destroy) emitter.destroy(); }
    this.emitters = [];
  }
}


// ═══════════════════════════════════════════════════════════════
// SCREEN EFFECTS — Shake, Flash, Fade, Vignette
// ═══════════════════════════════════════════════════════════════

export class ScreenFX {
  constructor(scene) {
    this.scene = scene;
    this.overlay = null;
    this.vignetteAlpha = 0.12;
    this.vignetteColor = '#000000';
    this.activeEffects = [];
  }

  init() {
    this.overlay = this.scene.add.graphics();
    this.overlay.setDepth(9999);
    this.overlay.setScrollFactor(0);
  }

  // ── CAMERA SHAKE ──
  // Light: ±2px 3 frames | Heavy: ±4px 6 frames sine decay | Emotional: ±1px sustained 2s
  shake(intensity = 'light') {
    const cam = this.scene.cameras.main;
    switch (intensity) {
      case 'light': cam.shake(50, 0.004); break;
      case 'heavy': cam.shake(100, 0.008); break;
      case 'emotional': cam.shake(2000, 0.002); break;
    }
  }

  // ── SCREEN FLASH ──
  // Damage: white 80% 2-frame on/off 2 cycles
  // Holy: gold 40% fade-in 6f hold 4f fade-out 8f
  // Lightning: full white 2f then dark 4f
  // Memory: sepia 30% sustained
  flash(type = 'damage') {
    switch (type) {
      case 'damage':
        this.activeEffects.push({
          type: 'flash', color: '#ffffff', alpha: 0.8,
          pattern: [{on:true,duration:33},{on:false,duration:33},{on:true,duration:33},{on:false,duration:33}],
          currentStep: 0, timer: 0,
        });
        break;
      case 'holy':
        this.activeEffects.push({
          type: 'fade_flash', color: '#ffd700', maxAlpha: 0.4, alpha: 0,
          fadeInDuration: 100, holdDuration: 67, fadeOutDuration: 133,
          phase: 'fadeIn', timer: 0,
        });
        break;
      case 'lightning':
        this.activeEffects.push({
          type: 'flash', color: '#ffffff', alpha: 1.0,
          pattern: [{on:true,duration:33},{on:false,duration:67}],
          currentStep: 0, timer: 0,
        });
        break;
      case 'memory':
        this.activeEffects.push({
          type: 'sustained', color: '#d4a574', alpha: 0.3, duration: 3000, timer: 0,
        });
        break;
    }
  }

  // ── SCENE FADE ──
  // Scene transition: black 30f out / 20f in (asymmetric = intentional)
  // Death: slow white 20f then hard cut black
  // Time travel: gold expanding circle 15 frames
  fade(direction = 'out', style = 'black', onComplete = null) {
    const cam = this.scene.cameras.main;
    if (style === 'black') {
      if (direction === 'out') {
        cam.fadeOut(500, 0, 0, 0, (c, p) => { if (p === 1 && onComplete) onComplete(); });
      } else {
        cam.fadeIn(333, 0, 0, 0, (c, p) => { if (p === 1 && onComplete) onComplete(); });
      }
    } else if (style === 'white') {
      if (direction === 'out') {
        cam.fadeOut(333, 255, 255, 255, (c, p) => { if (p === 1 && onComplete) onComplete(); });
      } else {
        cam.fadeIn(167, 255, 255, 255);
        if (onComplete) this.scene.time.delayedCall(167, onComplete);
      }
    } else if (style === 'gold_circle') {
      this.activeEffects.push({
        type: 'circle_wipe', color: '#ffd700', alpha: 0.9,
        centerX: this.scene.scale.width / 2, centerY: this.scene.scale.height / 2,
        radius: 0, maxRadius: Math.max(this.scene.scale.width, this.scene.scale.height),
        speed: Math.max(this.scene.scale.width, this.scene.scale.height) / 15,
        timer: 0, onComplete,
      });
    }
  }

  // ── VIGNETTE ──
  // Normal: dark corners 10-15% | Danger: 30% red tint | Sacred: lighten center gold 5%
  setVignette(mode = 'normal') {
    switch (mode) {
      case 'normal': this.vignetteAlpha = 0.12; this.vignetteColor = '#000000'; break;
      case 'danger': this.vignetteAlpha = 0.3; this.vignetteColor = '#330000'; break;
      case 'sacred': this.vignetteAlpha = 0.05; this.vignetteColor = '#1a1500'; break;
    }
  }

  update(time, delta) {
    if (!this.overlay) return;
    this.overlay.clear();
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const dt = delta / 16.67;

    const completed = [];
    for (let i = 0; i < this.activeEffects.length; i++) {
      const fx = this.activeEffects[i];

      if (fx.type === 'flash') {
        fx.timer += delta;
        const step = fx.pattern[fx.currentStep];
        if (!step) { completed.push(i); continue; }
        if (fx.timer >= step.duration) { fx.timer = 0; fx.currentStep++; }
        if (fx.currentStep >= fx.pattern.length) { completed.push(i); continue; }
        const cur = fx.pattern[fx.currentStep];
        if (cur && cur.on) {
          const rgb = hexToRGB(fx.color);
          this.overlay.fillStyle(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b), fx.alpha);
          this.overlay.fillRect(0, 0, w, h);
        }

      } else if (fx.type === 'fade_flash') {
        fx.timer += delta;
        let a = 0;
        if (fx.phase === 'fadeIn') {
          a = fx.maxAlpha * Math.min(1, fx.timer / fx.fadeInDuration);
          if (fx.timer >= fx.fadeInDuration) { fx.phase = 'hold'; fx.timer = 0; }
        } else if (fx.phase === 'hold') {
          a = fx.maxAlpha;
          if (fx.timer >= fx.holdDuration) { fx.phase = 'fadeOut'; fx.timer = 0; }
        } else if (fx.phase === 'fadeOut') {
          a = fx.maxAlpha * (1 - Math.min(1, fx.timer / fx.fadeOutDuration));
          if (fx.timer >= fx.fadeOutDuration) { completed.push(i); continue; }
        }
        const rgb = hexToRGB(fx.color);
        this.overlay.fillStyle(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b), a);
        this.overlay.fillRect(0, 0, w, h);

      } else if (fx.type === 'sustained') {
        fx.timer += delta;
        if (fx.timer >= fx.duration) { completed.push(i); continue; }
        const rgb = hexToRGB(fx.color);
        this.overlay.fillStyle(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b), fx.alpha);
        this.overlay.fillRect(0, 0, w, h);

      } else if (fx.type === 'circle_wipe') {
        fx.timer += dt; fx.radius += fx.speed * dt;
        const rgb = hexToRGB(fx.color);
        this.overlay.fillStyle(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b), fx.alpha);
        this.overlay.fillCircle(fx.centerX, fx.centerY, fx.radius);
        if (fx.radius >= fx.maxRadius) { completed.push(i); if (fx.onComplete) fx.onComplete(); }
      }
    }

    for (let i = completed.length - 1; i >= 0; i--) this.activeEffects.splice(completed[i], 1);

    // Always render vignette
    this._renderVignette(w, h);
  }

  _renderVignette(w, h) {
    if (this.vignetteAlpha <= 0) return;
    const rgb = hexToRGB(this.vignetteColor);
    const color = Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b);
    const cs = Math.min(w, h) * 0.4;

    for (let r = cs; r > 0; r -= 4) {
      const t = 1 - (r / cs);
      this.overlay.fillStyle(color, this.vignetteAlpha * t * t);
      this.overlay.fillRect(0, 0, r, r);
      this.overlay.fillRect(w - r, 0, r, r);
      this.overlay.fillRect(0, h - r, r, r);
      this.overlay.fillRect(w - r, h - r, r, r);
    }
  }

  destroy() {
    if (this.overlay) this.overlay.destroy();
    this.activeEffects = [];
  }
}


// ═══════════════════════════════════════════════════════════════
// WEATHER SYSTEM — Time-of-Day & Weather Overlays
// ═══════════════════════════════════════════════════════════════

export class WeatherSystem {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay = 'morning';
    this.weather = 'clear';
    this.overlay = null;
    this.particleSystem = null;
  }

  init(particleSystem) {
    this.particleSystem = particleSystem;
    this.overlay = this.scene.add.graphics();
    this.overlay.setDepth(9990);
    this.overlay.setScrollFactor(0);
  }

  setTimeOfDay(time, palette) {
    this.timeOfDay = time;
    if (!this.particleSystem) return;
    switch (time) {
      case 'morning': this.particleSystem.createEffect('dust_motes', palette, { count: 15 }); break;
      case 'evening': this.particleSystem.createEffect('fireflies', palette, { count: 8 }); break;
      case 'night': this.particleSystem.createEffect('stars', palette, { count: 25 }); break;
    }
  }

  setWeather(weather, palette) {
    this.weather = weather;
    if (!this.particleSystem) return;
    switch (weather) {
      case 'rain': this.particleSystem.createEffect('rain', palette, { count: 40 }); break;
      case 'storm': this.particleSystem.createEffect('rain', palette, { count: 60 }); break;
      case 'snow': this.particleSystem.createEffect('snow', palette, { count: 35 }); break;
      case 'ash': this.particleSystem.createEffect('ash', palette, { count: 30 }); break;
    }
  }

  update(time, delta) {
    if (!this.overlay) return;
    this.overlay.clear();
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    // Time-of-day overlay
    switch (this.timeOfDay) {
      case 'afternoon': this.overlay.fillStyle(0xfff8e0, 0.10); this.overlay.fillRect(0,0,w,h); break;
      case 'evening':   this.overlay.fillStyle(0xffb07a, 0.15); this.overlay.fillRect(0,0,w,h); break;
      case 'night':     this.overlay.fillStyle(0x1a2a4a, 0.30); this.overlay.fillRect(0,0,w,h); break;
      case 'firelight': this.overlay.fillStyle(0x0a0800, 0.25); this.overlay.fillRect(0,0,w,h); break;
    }

    // Weather overlay
    switch (this.weather) {
      case 'rain':  this.overlay.fillStyle(0x2244aa, 0.10); this.overlay.fillRect(0,0,w,h); break;
      case 'storm': this.overlay.fillStyle(0x222233, 0.20); this.overlay.fillRect(0,0,w,h); break;
      case 'snow':  this.overlay.fillStyle(0xccddee, 0.08); this.overlay.fillRect(0,0,w,h); break;
    }
  }

  destroy() { if (this.overlay) this.overlay.destroy(); }
}


// ═══════════════════════════════════════════════════════════════
// EFFECTS MANAGER — Master Controller
// ═══════════════════════════════════════════════════════════════

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.parallax = new ParallaxManager(scene);
    this.particles = new ParticleSystem(scene);
    this.screenFX = new ScreenFX(scene);
    this.weather = new WeatherSystem(scene);
    this.particleGraphics = null;
  }

  init() {
    this.screenFX.init();
    this.particleGraphics = this.scene.add.graphics();
    this.particleGraphics.setDepth(9000);
    this.particleGraphics.setScrollFactor(0);
    this.weather.init(this.particles);
  }

  setupArea(areaData, eraPalette) {
    this.parallax.clear();
    this.particles.clear();
    this.parallax.buildLayers(areaData, eraPalette);

    const time = (areaData.palette && areaData.palette.time) || 'morning';
    this.weather.setTimeOfDay(time, eraPalette);
    const weatherType = areaData.weather || 'clear';
    this.weather.setWeather(weatherType, eraPalette);

    if (areaData.ambience) {
      for (const amb of areaData.ambience) {
        switch (amb) {
          case 'water_stream': this.particles.createEffect('water_sparkle', eraPalette, { y: 200 }); break;
          case 'wind_grass': this.particles.createEffect('dust_motes', eraPalette, { count: 10 }); break;
          case 'fire': case 'burning': this.particles.createEffect('embers', eraPalette, { count: 25 }); break;
          case 'sacred': case 'chapel':
            this.particles.createEffect('light_shaft', eraPalette, {
              x: this.scene.scale.width * 0.35, topY: 0,
              bottomY: this.scene.scale.height * 0.8, topWidth: 15, bottomWidth: 60,
            });
            break;
        }
      }
    }

    const tone = areaData.tone || 'warm';
    if (tone === 'dread' || tone === 'grief') this.screenFX.setVignette('danger');
    else if (tone === 'desolation_to_awe' || tone === 'sacred') this.screenFX.setVignette('sacred');
    else this.screenFX.setVignette('normal');
  }

  setupBattle(eraPalette, backgroundType) {
    this.particles.clear();
    if (backgroundType === 'outdoor') this.particles.createEffect('dust_motes', eraPalette, { count: 8 });
    else if (backgroundType === 'underground') this.particles.createEffect('embers', eraPalette, { count: 5 });
    else if (backgroundType === 'chapel' || backgroundType === 'sacred') {
      this.particles.createEffect('light_shaft', eraPalette, {
        x: this.scene.scale.width * 0.3, topY: 0,
        bottomY: this.scene.scale.height * 0.5, topWidth: 10, bottomWidth: 40,
      });
    }
  }

  // Convenience methods
  shakeCamera(intensity) { this.screenFX.shake(intensity); }
  flashScreen(type) { this.screenFX.flash(type); }
  fadeScene(direction, style, onComplete) { this.screenFX.fade(direction, style, onComplete); }
  setVignette(mode) { this.screenFX.setVignette(mode); }
  addFire(x, y, palette) { this.particles.createEffect('fire', palette, { x, y }); }
  addHolyMotes(x, y, palette) { this.particles.createEffect('holy_motes', palette, { x, y, count: 12 }); }
  burstHolyMotes() { this.particles.burstHolyMotes(); }

  update(time, delta) {
    this.parallax.update(this.scene.cameras.main.scrollX, this.scene.cameras.main.scrollY);
    this.particles.update(time, delta);
    this.weather.update(time, delta);
    this.screenFX.update(time, delta);
    if (this.particleGraphics) {
      this.particleGraphics.clear();
      this.particles.render(this.particleGraphics);
    }
  }

  destroy() {
    this.parallax.clear(); this.particles.clear();
    this.screenFX.destroy(); this.weather.destroy();
    if (this.particleGraphics) this.particleGraphics.destroy();
  }
}
