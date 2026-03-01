/**
 * SAMURAI USAGI — MIRACLE ANIMATIONS
 * ====================================
 * Choreographed visual sequences for prayer/miracle effects in battle.
 *
 * Animation philosophy (from studying the masters):
 *
 *   FF6:  Held impact frames. The big moment FREEZES for 100-180ms.
 *         Afterimage trails on fast movement (desaturated copies).
 *         Screen-wide color washes. Posture changes during casting.
 *
 *   Chrono Trigger:  Luminaire — levitate, dome expands, flash at peak.
 *         Multi-phase: anticipation → buildup → climax → resolve.
 *         Damage numbers appear AT the climax, never before.
 *
 *   Octopath:  Light shafts from above. Bloom/glow around focal point.
 *         Particle convergence (gather inward) then divergence (burst out).
 *         Depth-of-field darkening on non-focal elements.
 *
 * Every miracle follows: PREPARE → GATHER → CLIMAX → RESOLVE
 * Timings in frames at 60fps. 1 frame ≈ 16.67ms.
 */

import { hexToRGB, buildRamp } from './sprites.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const FPS = 60;
const FRAME = 1000 / FPS; // ~16.67ms

// Canonical colors (Visual DNA palette discipline)
const HOLY_GOLD    = { r: 255, g: 215, b: 0 };
const HOLY_WHITE   = { r: 255, g: 248, b: 240 };
const MARIAN_BLUE  = { r: 100, g: 149, b: 237 };
const BLOOD_RED    = { r: 139, g: 0,   b: 0 };
const SPIRIT_GREEN = { r: 144, g: 238, b: 144 };
const SHADOW_PURPLE= { r: 75,  g: 0,  b: 130 };
const EMBER_ORANGE = { r: 255, g: 140, b: 0 };
const PARCHMENT    = { r: 232, g: 224, b: 200 };

// Animation phase durations (in ms)
const PHASE = {
  PREPARE:  400,   // Caster changes posture, subtle glow begins
  GATHER:   600,   // Particles/light converge, energy builds
  CLIMAX:   300,   // Peak flash, held frame, maximum intensity
  RESOLVE:  500,   // Particles disperse, effects fade, numbers appear
};


// ═══════════════════════════════════════════════════════════════
// ANIMATION PARTICLE — Single animated element
// ═══════════════════════════════════════════════════════════════

class AnimParticle {
  constructor(x, y, config = {}) {
    this.x = x;
    this.y = y;
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;
    this.ax = config.ax || 0;   // acceleration
    this.ay = config.ay || 0;
    this.size = config.size || 2;
    this.color = config.color || HOLY_GOLD;
    this.alpha = config.alpha || 1;
    this.life = config.life || 1000;
    this.maxLife = this.life;
    this.fadeIn = config.fadeIn || 0;
    this.fadeOut = config.fadeOut !== false;
    this.gravity = config.gravity || 0;
    this.spin = config.spin || 0;      // angular velocity for orbital
    this.angle = config.angle || 0;
    this.orbitRadius = config.orbitRadius || 0;
    this.orbitCenter = config.orbitCenter || null;
    this.shape = config.shape || 'circle';   // circle, diamond, cross, line, star
    this.trail = config.trail || false;
    this.trailPositions = [];
    this.alive = true;
    this.age = 0;
    this.sizeDecay = config.sizeDecay || 0;
    this.pulseRate = config.pulseRate || 0;
  }

  update(delta) {
    this.age += delta;
    if (this.age >= this.maxLife) { this.alive = false; return; }

    // Trail history
    if (this.trail) {
      this.trailPositions.push({ x: this.x, y: this.y, alpha: this.alpha * 0.5 });
      if (this.trailPositions.length > 8) this.trailPositions.shift();
    }

    // Orbital motion
    if (this.orbitCenter && this.orbitRadius > 0) {
      this.angle += this.spin * (delta / 1000);
      this.x = this.orbitCenter.x + Math.cos(this.angle) * this.orbitRadius;
      this.y = this.orbitCenter.y + Math.sin(this.angle) * this.orbitRadius;
      // Shrink orbit for convergence
      if (this.orbitRadius > 0 && this.sizeDecay) {
        this.orbitRadius = Math.max(0, this.orbitRadius - this.sizeDecay * (delta / 1000));
      }
    } else {
      // Linear motion
      this.vx += this.ax * (delta / 1000);
      this.vy += (this.ay + this.gravity) * (delta / 1000);
      this.x += this.vx * (delta / 1000);
      this.y += this.vy * (delta / 1000);
    }

    // Size decay
    if (this.sizeDecay && !this.orbitCenter) {
      this.size = Math.max(0.5, this.size - this.sizeDecay * (delta / 1000));
    }

    // Pulse
    if (this.pulseRate) {
      this.alpha = 0.5 + 0.5 * Math.sin(this.age * this.pulseRate / 1000);
    }

    // Fade in/out
    const lifeRatio = this.age / this.maxLife;
    if (this.fadeIn > 0 && this.age < this.fadeIn) {
      this.alpha = this.age / this.fadeIn;
    } else if (this.fadeOut && lifeRatio > 0.7) {
      this.alpha = Math.max(0, 1 - (lifeRatio - 0.7) / 0.3);
    }
  }

  draw(gfx) {
    if (!this.alive || this.alpha <= 0) return;

    const c = this.color;
    const color = Phaser.Display.Color.GetColor(c.r, c.g, c.b);

    // Draw trail first (afterimage technique from FF6)
    if (this.trail && this.trailPositions.length > 0) {
      for (let i = 0; i < this.trailPositions.length; i++) {
        const t = this.trailPositions[i];
        const trailAlpha = (i / this.trailPositions.length) * this.alpha * 0.3;
        const trailSize = this.size * (0.5 + 0.5 * (i / this.trailPositions.length));
        gfx.fillStyle(color, trailAlpha);
        gfx.fillCircle(t.x, t.y, trailSize);
      }
    }

    gfx.fillStyle(color, this.alpha);

    switch (this.shape) {
      case 'diamond':
        gfx.fillPoint(this.x, this.y - this.size, 1);
        gfx.fillPoint(this.x - this.size, this.y, 1);
        gfx.fillPoint(this.x + this.size, this.y, 1);
        gfx.fillPoint(this.x, this.y + this.size, 1);
        gfx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        break;

      case 'cross':
        gfx.fillRect(this.x - 1, this.y - this.size, 2, this.size * 2);
        gfx.fillRect(this.x - this.size * 0.6, this.y - this.size * 0.3, this.size * 1.2, 2);
        break;

      case 'line':
        gfx.fillRect(this.x - 1, this.y, 2, this.size);
        break;

      case 'star': {
        // 4-point star
        const s = this.size;
        gfx.fillRect(this.x - s, this.y - 0.5, s * 2, 1);
        gfx.fillRect(this.x - 0.5, this.y - s, 1, s * 2);
        gfx.fillRect(this.x - s * 0.5, this.y - 0.5, s, 1);
        gfx.fillRect(this.x - 0.5, this.y - s * 0.5, 1, s);
        break;
      }

      case 'ring': {
        // Hollow circle
        const segments = 16;
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          const px = this.x + Math.cos(a) * this.size;
          const py = this.y + Math.sin(a) * this.size;
          gfx.fillCircle(px, py, 1);
        }
        break;
      }

      default: // circle
        gfx.fillCircle(this.x, this.y, this.size);
        break;
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// LIGHT EFFECTS — Domes, shafts, rays, glows
// ═══════════════════════════════════════════════════════════════

class LightEffect {
  constructor(config) {
    this.type = config.type;   // 'dome', 'shaft', 'ray_burst', 'cross_trace', 'ring_expand', 'column'
    this.x = config.x;
    this.y = config.y;
    this.color = config.color || HOLY_GOLD;
    this.alpha = 0;
    this.maxAlpha = config.maxAlpha || 0.4;
    this.size = 0;
    this.maxSize = config.maxSize || 100;
    this.life = 0;
    this.maxLife = config.life || 1000;
    this.alive = true;
    this.phase = 'grow';  // grow, hold, shrink
    this.growDuration = config.growDuration || 400;
    this.holdDuration = config.holdDuration || 200;
    this.shrinkDuration = config.shrinkDuration || 400;
    this.rays = config.rays || 0;
    this.rotation = 0;
    this.rotationSpeed = config.rotationSpeed || 0;
  }

  update(delta) {
    this.life += delta;
    if (this.life >= this.maxLife) { this.alive = false; return; }

    this.rotation += this.rotationSpeed * (delta / 1000);

    if (this.life < this.growDuration) {
      // Grow phase
      const t = this.life / this.growDuration;
      this.size = this.maxSize * this._easeOutCubic(t);
      this.alpha = this.maxAlpha * this._easeOutCubic(t);
    } else if (this.life < this.growDuration + this.holdDuration) {
      // Hold phase (FF6 technique: FREEZE the peak)
      this.size = this.maxSize;
      this.alpha = this.maxAlpha;
    } else {
      // Shrink phase
      const elapsed = this.life - this.growDuration - this.holdDuration;
      const t = Math.min(1, elapsed / this.shrinkDuration);
      this.size = this.maxSize * (1 - this._easeInCubic(t));
      this.alpha = this.maxAlpha * (1 - this._easeInCubic(t));
    }
  }

  draw(gfx) {
    if (!this.alive || this.alpha <= 0 || this.size <= 0) return;

    const c = this.color;
    const color = Phaser.Display.Color.GetColor(c.r, c.g, c.b);

    switch (this.type) {
      case 'dome':
        this._drawDome(gfx, color);
        break;
      case 'shaft':
        this._drawShaft(gfx, color);
        break;
      case 'ray_burst':
        this._drawRayBurst(gfx, color);
        break;
      case 'cross_trace':
        this._drawCrossTrace(gfx, color);
        break;
      case 'ring_expand':
        this._drawRingExpand(gfx, color);
        break;
      case 'column':
        this._drawColumn(gfx, color);
        break;
    }
  }

  /** Chrono Trigger Luminaire: dome of light expanding from center */
  _drawDome(gfx, color) {
    // Concentric rings getting more transparent outward
    const rings = 5;
    for (let i = rings; i >= 0; i--) {
      const r = this.size * (i / rings);
      const a = this.alpha * (1 - i / rings) * 0.5;
      gfx.fillStyle(color, a);
      gfx.fillCircle(this.x, this.y, r);
    }
    // Bright center point
    gfx.fillStyle(0xffffff, this.alpha * 0.8);
    gfx.fillCircle(this.x, this.y, Math.max(2, this.size * 0.08));
  }

  /** Octopath: Light shaft from above, triangular, gold gradient */
  _drawShaft(gfx, color) {
    const topWidth = this.size * 0.3;
    const bottomWidth = this.size * 0.8;
    const height = this.size * 2;
    const topY = this.y - height;

    // Draw shaft as stacked horizontal lines getting wider
    const steps = Math.floor(height / 3);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const w = topWidth + (bottomWidth - topWidth) * t;
      const ly = topY + i * 3;
      const a = this.alpha * (0.3 + 0.7 * t) * (1 - Math.abs(t - 0.7) * 1.5);
      gfx.fillStyle(color, Math.max(0, a));
      gfx.fillRect(this.x - w / 2, ly, w, 3);
    }

    // Motes rising within shaft
    const moteCount = 3;
    for (let i = 0; i < moteCount; i++) {
      const moteT = ((this.life / 800 + i / moteCount) % 1);
      const moteY = this.y - moteT * height;
      const moteX = this.x + Math.sin(moteT * Math.PI * 4 + i * 2) * bottomWidth * 0.2;
      gfx.fillStyle(0xffffff, this.alpha * 0.6);
      gfx.fillCircle(moteX, moteY, 1.5);
    }
  }

  /** FF6: Radial rays bursting outward from center */
  _drawRayBurst(gfx, color) {
    const rayCount = this.rays || 12;
    const innerR = this.size * 0.1;
    const outerR = this.size;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + this.rotation;
      const x1 = this.x + Math.cos(angle) * innerR;
      const y1 = this.y + Math.sin(angle) * innerR;
      const x2 = this.x + Math.cos(angle) * outerR;
      const y2 = this.y + Math.sin(angle) * outerR;

      // Ray as a thin triangle
      const perpX = Math.cos(angle + Math.PI / 2) * 2;
      const perpY = Math.sin(angle + Math.PI / 2) * 2;

      gfx.fillStyle(color, this.alpha * 0.6);
      gfx.fillTriangle(x1, y1, x2 + perpX, y2 + perpY, x2 - perpX, y2 - perpY);
    }

    // Center glow
    gfx.fillStyle(0xffffff, this.alpha);
    gfx.fillCircle(this.x, this.y, innerR);
  }

  /** Sign of the Cross: trace a cross shape */
  _drawCrossTrace(gfx, color) {
    const armLength = this.size;
    const thickness = Math.max(2, this.size * 0.08);
    const crossbarY = this.y - armLength * 0.15;

    // Vertical beam
    gfx.fillStyle(color, this.alpha);
    gfx.fillRect(this.x - thickness / 2, this.y - armLength, thickness, armLength * 1.6);

    // Horizontal beam
    gfx.fillRect(this.x - armLength * 0.5, crossbarY - thickness / 2, armLength, thickness);

    // Glow at intersection
    gfx.fillStyle(0xffffff, this.alpha * 0.5);
    gfx.fillCircle(this.x, crossbarY, thickness * 2);
  }

  /** Expanding ring (like a shockwave) */
  _drawRingExpand(gfx, color) {
    const thickness = Math.max(2, 4 - (this.size / this.maxSize) * 3);
    const segments = 32;

    gfx.lineStyle(thickness, color, this.alpha);
    gfx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const px = this.x + Math.cos(a) * this.size;
      const py = this.y + Math.sin(a) * this.size;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.strokePath();
  }

  /** Column of light rising from ground (Octopath divine) */
  _drawColumn(gfx, color) {
    const width = this.size * 0.4;
    const height = this.size * 3;

    // Column body — vertical gradient
    const steps = Math.floor(height / 2);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const ly = this.y - t * height;
      const a = this.alpha * (1 - t * 0.7) * (0.3 + 0.7 * Math.sin(t * Math.PI));
      const w = width * (1 - t * 0.3);
      gfx.fillStyle(color, a);
      gfx.fillRect(this.x - w / 2, ly, w, 2);
    }

    // Base glow
    gfx.fillStyle(0xffffff, this.alpha * 0.4);
    gfx.fillCircle(this.x, this.y, width * 0.6);
  }

  _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  _easeInCubic(t) { return t * t * t; }
  _easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
}


// ═══════════════════════════════════════════════════════════════
// SCREEN FLASH — Full-screen color overlays (FF6 technique)
// ═══════════════════════════════════════════════════════════════

class ScreenFlash {
  constructor(config) {
    this.color = config.color || HOLY_WHITE;
    this.pattern = config.pattern || 'single'; // single, double, triple, pulse, hold
    this.maxAlpha = config.maxAlpha || 0.8;
    this.duration = config.duration || 300;
    this.alpha = 0;
    this.life = 0;
    this.alive = true;
  }

  update(delta) {
    this.life += delta;
    if (this.life >= this.duration) { this.alive = false; return; }

    const t = this.life / this.duration;

    switch (this.pattern) {
      case 'single':
        // Sharp flash then fade
        this.alpha = this.maxAlpha * (1 - t * t);
        break;

      case 'double':
        // Two peaks (FF6 damage flash: 2-frame on/off twice)
        if (t < 0.25) this.alpha = this.maxAlpha;
        else if (t < 0.4) this.alpha = 0;
        else if (t < 0.65) this.alpha = this.maxAlpha;
        else this.alpha = this.maxAlpha * (1 - (t - 0.65) / 0.35);
        break;

      case 'triple':
        // Three flashes (enemy death)
        const cycle = (t * 3) % 1;
        this.alpha = cycle < 0.5 ? this.maxAlpha : 0;
        if (t > 0.9) this.alpha = 0;
        break;

      case 'pulse':
        // Smooth sine pulse
        this.alpha = this.maxAlpha * Math.sin(t * Math.PI);
        break;

      case 'hold':
        // FF6 held frame: sharp on, hold, sharp off
        if (t < 0.1) this.alpha = this.maxAlpha * (t / 0.1);
        else if (t < 0.8) this.alpha = this.maxAlpha;
        else this.alpha = this.maxAlpha * (1 - (t - 0.8) / 0.2);
        break;

      case 'holy_fade':
        // Fade in slowly, hold, fade out slowly (holy gold wash)
        if (t < 0.3) this.alpha = this.maxAlpha * (t / 0.3);
        else if (t < 0.6) this.alpha = this.maxAlpha;
        else this.alpha = this.maxAlpha * (1 - (t - 0.6) / 0.4);
        break;
    }
  }

  draw(gfx, w, h) {
    if (!this.alive || this.alpha <= 0) return;
    const c = this.color;
    gfx.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), this.alpha);
    gfx.fillRect(0, 0, w, h);
  }
}


// ═══════════════════════════════════════════════════════════════
// AFTERIMAGE — FF6 Cyan technique: desaturated trailing copies
// ═══════════════════════════════════════════════════════════════

class AfterImage {
  constructor(sprite, config = {}) {
    this.sprite = sprite;
    this.copies = [];
    this.maxCopies = config.count || 4;
    this.interval = config.interval || 50;  // ms between captures
    this.timer = 0;
    this.active = false;
    this.fadeDuration = config.fadeDuration || 200;
    this.tint = config.tint || 0x8888ff;  // Desaturated blue-ish
  }

  start() { this.active = true; this.copies = []; this.timer = 0; }
  stop() { this.active = false; }

  update(delta, scene) {
    // Update existing copies
    for (const copy of this.copies) {
      copy.age += delta;
      copy.alpha = Math.max(0, 1 - copy.age / this.fadeDuration);
    }
    this.copies = this.copies.filter(c => c.alpha > 0);

    // Capture new copy
    if (this.active) {
      this.timer += delta;
      if (this.timer >= this.interval) {
        this.timer = 0;
        if (this.copies.length < this.maxCopies) {
          this.copies.push({
            x: this.sprite.x,
            y: this.sprite.y,
            age: 0,
            alpha: 0.6,
          });
        }
      }
    }
  }

  draw(gfx) {
    // Draw afterimages as simple silhouettes
    for (const copy of this.copies) {
      if (copy.alpha <= 0) continue;
      gfx.fillStyle(this.tint, copy.alpha * 0.4);
      // Approximate sprite shape
      gfx.fillRect(copy.x - 16, copy.y - 24, 32, 48);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// MIRACLE ANIMATION CHOREOGRAPHER
// ═══════════════════════════════════════════════════════════════

/**
 * Each miracle gets a choreography function that returns a timeline:
 * an array of { time: ms, action: function(ctx) } events.
 *
 * The MiracleAnimator executes these timelines during battle.
 */
export class MiracleAnimator {
  constructor(scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(400);

    this.particles = [];
    this.lights = [];
    this.flashes = [];
    this.afterimages = [];
    this.timeline = [];
    this.timelineStart = 0;
    this.playing = false;
    this.onComplete = null;

    // Screen dimensions
    this.w = scene.scale.width;
    this.h = scene.scale.height;
  }

  /**
   * Play a miracle animation.
   * @param {string} miracleId - ID from miracles.json
   * @param {object} caster - { x, y, sprite }
   * @param {object} target - { x, y, sprite } or null for self/party
   * @param {function} onComplete - called when animation finishes
   */
  play(miracleId, caster, target, onComplete) {
    this.clear();
    this.onComplete = onComplete;
    this.playing = true;
    this.timelineStart = Date.now();

    // Get the choreography for this miracle
    const choreo = this._getChoreography(miracleId, caster, target || caster);
    this.timeline = choreo;

    // Sort by time
    this.timeline.sort((a, b) => a.time - b.time);
  }

  clear() {
    this.particles = [];
    this.lights = [];
    this.flashes = [];
    this.afterimages = [];
    this.timeline = [];
    this.playing = false;
    this.gfx.clear();
  }

  update(time, delta) {
    if (!this.playing) return;

    const elapsed = Date.now() - this.timelineStart;

    // Execute timeline events
    while (this.timeline.length > 0 && this.timeline[0].time <= elapsed) {
      const event = this.timeline.shift();
      event.action(this);
    }

    // Update all effects
    for (const p of this.particles) p.update(delta);
    for (const l of this.lights) l.update(delta);
    for (const f of this.flashes) f.update(delta);
    for (const a of this.afterimages) a.update(delta, this.scene);

    // Remove dead
    this.particles = this.particles.filter(p => p.alive);
    this.lights = this.lights.filter(l => l.alive);
    this.flashes = this.flashes.filter(f => f.alive);

    // Draw
    this.gfx.clear();

    // Screen flashes first (behind everything)
    for (const f of this.flashes) f.draw(this.gfx, this.w, this.h);

    // Lights
    for (const l of this.lights) l.draw(this.gfx);

    // Afterimages
    for (const a of this.afterimages) a.draw(this.gfx);

    // Particles on top
    for (const p of this.particles) p.draw(this.gfx);

    // Check if animation is complete
    if (this.timeline.length === 0 && this.particles.length === 0 &&
        this.lights.length === 0 && this.flashes.length === 0) {
      this.playing = false;
      this.gfx.clear();
      if (this.onComplete) this.onComplete();
    }
  }

  // ── Helper spawners ──────────────────────────────────────

  _spawnParticle(config) {
    this.particles.push(new AnimParticle(config.x, config.y, config));
  }

  _spawnLight(config) {
    this.lights.push(new LightEffect(config));
  }

  _spawnFlash(config) {
    this.flashes.push(new ScreenFlash(config));
  }

  /** Spawn N particles in a ring, converging inward */
  _spawnConvergenceRing(cx, cy, count, radius, color, duration) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const r = radius + Math.random() * 20;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;

      this._spawnParticle({
        x: px, y: py,
        orbitCenter: { x: cx, y: cy },
        orbitRadius: r,
        angle: angle,
        spin: 3 + Math.random() * 2,
        sizeDecay: r / (duration / 1000), // Converge to center over duration
        color: color,
        size: 2 + Math.random() * 2,
        life: duration,
        shape: 'diamond',
        trail: true,
      });
    }
  }

  /** Spawn particles bursting outward from center */
  _spawnBurst(cx, cy, count, speed, color, config = {}) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const spd = speed * (0.5 + Math.random() * 1);

      this._spawnParticle({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: color,
        size: config.size || (1 + Math.random() * 3),
        life: config.life || 800,
        shape: config.shape || 'circle',
        gravity: config.gravity || 0,
        trail: config.trail || false,
        fadeOut: true,
      });
    }
  }

  /** Spawn particles rising upward (column of light motes) */
  _spawnRisingColumn(cx, cy, count, height, color, duration) {
    for (let i = 0; i < count; i++) {
      const delay = (i / count) * duration * 0.5;
      const startX = cx + (Math.random() - 0.5) * 30;

      setTimeout(() => {
        if (!this.playing) return;
        this._spawnParticle({
          x: startX, y: cy,
          vx: (Math.random() - 0.5) * 10,
          vy: -(height / (duration / 1000)) * (0.7 + Math.random() * 0.6),
          color: color,
          size: 1 + Math.random() * 2,
          life: duration * 0.6,
          shape: 'star',
          fadeOut: true,
        });
      }, delay);
    }
  }


  // ═══════════════════════════════════════════════════════════
  // CHOREOGRAPHIES — One per miracle type
  // ═══════════════════════════════════════════════════════════

  _getChoreography(miracleId, caster, target) {
    const choreographies = {
      // ── FAITH MIRACLES ───────────────────────────────
      'pater_noster':     () => this._choreoOurFather(caster, target),
      'shield_faith':     () => this._choreoShieldOfFaith(caster),
      'divine_light':     () => this._choreoLuxAeterna(caster, target),
      'guardian_angel':   () => this._choreoGuardianAngel(caster),
      'holy_water':       () => this._choreoAspersion(caster, target),
      'sign_of_cross':    () => this._choreoSignOfCross(caster),
      'de_profundis':     () => this._choreoDeProfundis(caster),
      'reveal_truth':     () => this._choreoDiscernment(caster, target),
      'exorcism_minor':   () => this._choreoVadeRetro(caster, target),
      'communion_saints': () => this._choreoCloudOfWitnesses(caster),

      // ── HOPE MIRACLES ────────────────────────────────
      'ave_maria':        () => this._choreoHailMary(caster),
      'salve_regina':     () => this._choreoSalveRegina(caster),
      'memorare':         () => this._choreoMemomare(caster),
      'rosary_decade':    () => this._choreoRosaryDecade(caster),

      // ── CHARITY MIRACLES ─────────────────────────────
      'heal_minor':       () => this._choreoLayingOnHands(caster, target),
      'heal_major':       () => this._choreoAnointing(caster, target),
      'cure_status':      () => this._choreoAbsolution(caster, target),
      'forgiveness':      () => this._choreoForgiveness(caster, target),
      'viaticum':         () => this._choreoViaticum(caster, target),

      // ── JUSTICE MIRACLES ─────────────────────────────
      'righteous_strike': () => this._choreoSwordOfSpirit(caster, target),
      'shield_of_just':   () => this._choreoBreastplate(caster),

      // ── FORTITUDE MIRACLES ───────────────────────────
      'last_stand':       () => this._choreoMartyrsStand(caster),
      'martyrs_resolve':  () => this._choreoCrownOfLife(caster),

      // ── TEMPERANCE MIRACLES ──────────────────────────
      'resist_temptation':() => this._choreoFastingDesert(caster),
      'perfect_stillness':() => this._choreoSabbathRest(caster),
      'act_of_contrition_battle': () => this._choreoContrition(caster),
    };

    const fn = choreographies[miracleId] || choreographies['pater_noster'];
    return fn();
  }


  // ─────────────────────────────────────────────────────────
  // FAITH
  // ─────────────────────────────────────────────────────────

  /** Our Father — Universal prayer. Gentle gold wash, small heal particles rise from party. */
  _choreoOurFather(caster, target) {
    return [
      // PREPARE: Caster bows head
      { time: 0, action: (ctx) => {
        // Subtle golden aura at caster's feet
        ctx._spawnLight({ type: 'ring_expand', x: caster.x, y: caster.y + 20,
          color: HOLY_GOLD, maxSize: 40, maxAlpha: 0.2, life: PHASE.PREPARE,
          growDuration: PHASE.PREPARE, holdDuration: 0, shrinkDuration: 0 });
      }},
      // GATHER: Gold motes rise gently
      { time: PHASE.PREPARE, action: (ctx) => {
        ctx._spawnRisingColumn(caster.x, caster.y + 10, 12, 80, HOLY_GOLD, PHASE.GATHER);
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'holy_fade', maxAlpha: 0.08, duration: PHASE.GATHER });
      }},
      // CLIMAX: Soft gold pulse
      { time: PHASE.PREPARE + PHASE.GATHER, action: (ctx) => {
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'pulse', maxAlpha: 0.15, duration: 300 });
        ctx._spawnBurst(caster.x, caster.y, 8, 30, HOLY_GOLD, { size: 2, life: 600, shape: 'star' });
      }},
      // RESOLVE: Healing sparkles on party
      { time: PHASE.PREPARE + PHASE.GATHER + 200, action: (ctx) => {
        ctx._spawnRisingColumn(caster.x, caster.y, 6, 40, HOLY_WHITE, 500);
      }},
    ];
  }

  /** Shield of Faith — Golden dome encases caster (Ephesians 6:16) */
  _choreoShieldOfFaith(caster) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnConvergenceRing(caster.x, caster.y, 16, 80, HOLY_GOLD, PHASE.GATHER);
      }},
      { time: PHASE.GATHER, action: (ctx) => {
        // Dome forms
        ctx._spawnLight({ type: 'dome', x: caster.x, y: caster.y,
          color: HOLY_GOLD, maxSize: 50, maxAlpha: 0.35,
          life: 800, growDuration: 200, holdDuration: 300, shrinkDuration: 300 });
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'single', maxAlpha: 0.2, duration: 200 });
      }},
      { time: PHASE.GATHER + 200, action: (ctx) => {
        // Shield hexagon pattern (faint geometric lines)
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          ctx._spawnParticle({
            x: caster.x + Math.cos(angle) * 45,
            y: caster.y + Math.sin(angle) * 45,
            color: HOLY_GOLD, size: 2, life: 600, shape: 'diamond',
            pulseRate: 8, fadeOut: true,
          });
        }
      }},
    ];
  }

  /**
   * Lux Aeterna — HOLY NUKE. The big one.
   * Chrono Trigger Luminaire structure:
   * 1. Caster levitates (tween y -20px)
   * 2. Arms spread — gold convergence ring pulls in
   * 3. DOME of light expands from caster
   * 4. Screen flash WHITE — HELD for 180ms (FF6 technique)
   * 5. Dome dissipates — ray burst outward
   * 6. Damage numbers at the flash, not before
   */
  _choreoLuxAeterna(caster, target) {
    return [
      // 1. PREPARE: Levitate caster
      { time: 0, action: (ctx) => {
        if (caster.sprite) {
          ctx.scene.tweens.add({ targets: caster.sprite, y: caster.y - 20,
            duration: PHASE.PREPARE, ease: 'Sine.Out' });
        }
        // Subtle glow at feet
        ctx._spawnLight({ type: 'ring_expand', x: caster.x, y: caster.y + 20,
          color: HOLY_GOLD, maxSize: 30, maxAlpha: 0.3,
          life: PHASE.PREPARE, growDuration: PHASE.PREPARE, holdDuration: 0, shrinkDuration: 0 });
      }},

      // 2. GATHER: Convergence ring — particles spiral inward
      { time: PHASE.PREPARE, action: (ctx) => {
        ctx._spawnConvergenceRing(caster.x, caster.y - 20, 24, 120, HOLY_GOLD, PHASE.GATHER);
        ctx._spawnConvergenceRing(caster.x, caster.y - 20, 12, 80, HOLY_WHITE, PHASE.GATHER);
        // Building intensity glow
        ctx._spawnLight({ type: 'dome', x: caster.x, y: caster.y - 20,
          color: HOLY_GOLD, maxSize: 30, maxAlpha: 0.2,
          life: PHASE.GATHER, growDuration: PHASE.GATHER, holdDuration: 0, shrinkDuration: 0 });
      }},

      // 3. CLIMAX: DOME EXPANSION + HELD WHITE FLASH
      { time: PHASE.PREPARE + PHASE.GATHER, action: (ctx) => {
        // THE DOME — Luminaire signature
        ctx._spawnLight({ type: 'dome', x: caster.x, y: caster.y - 20,
          color: HOLY_GOLD, maxSize: 200, maxAlpha: 0.5,
          life: 800, growDuration: 250, holdDuration: 200, shrinkDuration: 350 });

        // HELD WHITE FLASH (FF6: freeze the peak)
        ctx._spawnFlash({ color: HOLY_WHITE, pattern: 'hold', maxAlpha: 0.7, duration: 400 });

        // Ray burst at center
        ctx._spawnLight({ type: 'ray_burst', x: caster.x, y: caster.y - 20,
          color: HOLY_GOLD, maxSize: 150, maxAlpha: 0.6, rays: 16, rotationSpeed: 0.5,
          life: 600, growDuration: 150, holdDuration: 200, shrinkDuration: 250 });

        // Camera shake
        if (ctx.scene.cameras?.main) {
          ctx.scene.cameras.main.shake(300, 0.01);
        }
      }},

      // 4. RESOLVE: Burst outward + return caster
      { time: PHASE.PREPARE + PHASE.GATHER + 300, action: (ctx) => {
        ctx._spawnBurst(caster.x, caster.y - 20, 32, 80, HOLY_GOLD,
          { size: 3, life: 800, shape: 'star', trail: true });
        ctx._spawnBurst(caster.x, caster.y - 20, 16, 50, HOLY_WHITE,
          { size: 2, life: 600, shape: 'diamond' });

        // Expanding ring shockwave
        ctx._spawnLight({ type: 'ring_expand', x: caster.x, y: caster.y - 20,
          color: HOLY_GOLD, maxSize: 180, maxAlpha: 0.4,
          life: 500, growDuration: 300, holdDuration: 0, shrinkDuration: 200 });

        // Return caster to ground
        if (caster.sprite) {
          ctx.scene.tweens.add({ targets: caster.sprite, y: caster.y,
            duration: 400, ease: 'Bounce.Out' });
        }
      }},
    ];
  }

  /** Guardian Angel — Wings of light flash behind caster */
  _choreoGuardianAngel(caster) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnConvergenceRing(caster.x, caster.y - 10, 10, 60, PARCHMENT, 400);
      }},
      { time: 400, action: (ctx) => {
        // Wing shapes — two arcs of particles
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 8; i++) {
            const angle = (side === -1 ? Math.PI * 0.7 : Math.PI * 0.3) - (i / 8) * Math.PI * 0.5 * side;
            const r = 30 + i * 5;
            ctx._spawnParticle({
              x: caster.x + Math.cos(angle) * r * side,
              y: caster.y - 20 + Math.sin(angle) * r * 0.5,
              color: PARCHMENT, size: 3 - i * 0.2, life: 800,
              shape: 'diamond', fadeOut: true, pulseRate: 4,
            });
          }
        }
        ctx._spawnFlash({ color: PARCHMENT, pattern: 'pulse', maxAlpha: 0.15, duration: 500 });
      }},
      { time: 700, action: (ctx) => {
        ctx._spawnRisingColumn(caster.x, caster.y, 8, 60, HOLY_WHITE, 600);
      }},
    ];
  }

  /** Sign of the Cross — Quick trace, subtle but always available. Free. */
  _choreoSignOfCross(caster) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnLight({ type: 'cross_trace', x: caster.x, y: caster.y - 10,
          color: HOLY_GOLD, maxSize: 25, maxAlpha: 0.5,
          life: 600, growDuration: 200, holdDuration: 200, shrinkDuration: 200 });
      }},
      { time: 250, action: (ctx) => {
        ctx._spawnBurst(caster.x, caster.y - 10, 4, 15, HOLY_GOLD,
          { size: 1.5, life: 400, shape: 'diamond' });
      }},
    ];
  }

  /** Aspersion (Holy Water) — Splash of blessed water */
  _choreoAspersion(caster, target) {
    return [
      { time: 0, action: (ctx) => {
        // Arc of water droplets from caster to target
        const dx = target.x - caster.x;
        const dy = target.y - caster.y;
        for (let i = 0; i < 8; i++) {
          const delay = i * 40;
          setTimeout(() => {
            if (!ctx.playing) return;
            ctx._spawnParticle({
              x: caster.x + 20, y: caster.y - 10,
              vx: dx * (0.8 + Math.random() * 0.4) / 0.4,
              vy: -80 + Math.random() * 20,
              gravity: 300,
              color: MARIAN_BLUE, size: 2, life: 500,
              shape: 'circle', trail: true,
            });
          }, delay);
        }
      }},
      { time: 350, action: (ctx) => {
        // Splash on target
        ctx._spawnBurst(target.x, target.y, 10, 40, MARIAN_BLUE,
          { size: 2, life: 400, gravity: 100 });
        ctx._spawnFlash({ color: MARIAN_BLUE, pattern: 'single', maxAlpha: 0.1, duration: 150 });
      }},
    ];
  }

  /** De Profundis — Revive from death. Light rises from below. */
  _choreoDeProfundis(caster) {
    return [
      // Darkness first
      { time: 0, action: (ctx) => {
        ctx._spawnFlash({ color: { r: 0, g: 0, b: 0 }, pattern: 'hold', maxAlpha: 0.5, duration: 800 });
      }},
      // A single light from below
      { time: 600, action: (ctx) => {
        ctx._spawnLight({ type: 'column', x: caster.x, y: caster.y + 30,
          color: HOLY_GOLD, maxSize: 60, maxAlpha: 0.6,
          life: 1200, growDuration: 500, holdDuration: 400, shrinkDuration: 300 });
      }},
      // Gold convergence
      { time: 900, action: (ctx) => {
        ctx._spawnConvergenceRing(caster.x, caster.y, 20, 100, HOLY_GOLD, 600);
      }},
      // Flash — life returns
      { time: 1400, action: (ctx) => {
        ctx._spawnFlash({ color: HOLY_WHITE, pattern: 'hold', maxAlpha: 0.6, duration: 400 });
        ctx._spawnBurst(caster.x, caster.y, 24, 60, HOLY_GOLD,
          { size: 3, life: 800, shape: 'star', trail: true });
        ctx._spawnLight({ type: 'ring_expand', x: caster.x, y: caster.y,
          color: HOLY_GOLD, maxSize: 100, maxAlpha: 0.4,
          life: 500, growDuration: 250, holdDuration: 0, shrinkDuration: 250 });
      }},
    ];
  }

  /** Discernment of Spirits — Revealing pulse */
  _choreoDiscernment(caster, target) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnLight({ type: 'ring_expand', x: caster.x, y: caster.y,
          color: MARIAN_BLUE, maxSize: 200, maxAlpha: 0.3,
          life: 800, growDuration: 600, holdDuration: 0, shrinkDuration: 200 });
      }},
      { time: 200, action: (ctx) => {
        // Second ring
        ctx._spawnLight({ type: 'ring_expand', x: caster.x, y: caster.y,
          color: HOLY_WHITE, maxSize: 180, maxAlpha: 0.2,
          life: 700, growDuration: 500, holdDuration: 0, shrinkDuration: 200 });
      }},
    ];
  }

  /** Vade Retro — Exorcism. Cross blazes with light, drives shadow back. */
  _choreoVadeRetro(caster, target) {
    return [
      { time: 0, action: (ctx) => {
        // Cross of light forms
        ctx._spawnLight({ type: 'cross_trace', x: caster.x, y: caster.y - 15,
          color: HOLY_GOLD, maxSize: 40, maxAlpha: 0.7,
          life: 500, growDuration: 250, holdDuration: 150, shrinkDuration: 100 });
      }},
      { time: 350, action: (ctx) => {
        // Blast toward target
        const dx = target.x - caster.x;
        const dy = target.y - caster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist;
        const ny = dy / dist;

        for (let i = 0; i < 16; i++) {
          ctx._spawnParticle({
            x: caster.x, y: caster.y - 10,
            vx: nx * (200 + Math.random() * 100) + (Math.random() - 0.5) * 40,
            vy: ny * (200 + Math.random() * 100) + (Math.random() - 0.5) * 40,
            color: HOLY_GOLD, size: 3, life: 500,
            shape: 'cross', trail: true, fadeOut: true,
          });
        }
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'double', maxAlpha: 0.4, duration: 300 });
        if (ctx.scene.cameras?.main) ctx.scene.cameras.main.shake(200, 0.008);
      }},
      { time: 550, action: (ctx) => {
        // Impact on target
        ctx._spawnBurst(target.x, target.y, 12, 50, HOLY_WHITE,
          { size: 2, life: 500, shape: 'star' });
        ctx._spawnLight({ type: 'dome', x: target.x, y: target.y,
          color: HOLY_GOLD, maxSize: 60, maxAlpha: 0.4,
          life: 400, growDuration: 100, holdDuration: 150, shrinkDuration: 150 });
      }},
    ];
  }

  /**
   * Cloud of Witnesses — The cross-era miracle.
   * Ghost figures appear behind caster, each contributing light.
   * Hebrews 12:1 made visible.
   */
  _choreoCloudOfWitnesses(caster) {
    return [
      // Gather — soft lights appear at various positions (the saints)
      { time: 0, action: (ctx) => {
        const positions = [
          { x: caster.x - 60, y: caster.y - 30 },
          { x: caster.x - 40, y: caster.y - 50 },
          { x: caster.x - 20, y: caster.y - 60 },
          { x: caster.x + 20, y: caster.y - 60 },
          { x: caster.x + 40, y: caster.y - 50 },
          { x: caster.x + 60, y: caster.y - 30 },
        ];
        for (let i = 0; i < positions.length; i++) {
          setTimeout(() => {
            if (!ctx.playing) return;
            const p = positions[i];
            // Ghost figure (faint column of light)
            ctx._spawnLight({ type: 'column', x: p.x, y: p.y,
              color: PARCHMENT, maxSize: 20, maxAlpha: 0.3,
              life: 1500, growDuration: 400, holdDuration: 700, shrinkDuration: 400 });
            // Their light converges on caster
            ctx._spawnParticle({
              x: p.x, y: p.y,
              orbitCenter: { x: caster.x, y: caster.y - 10 },
              orbitRadius: Math.sqrt((p.x - caster.x) ** 2 + (p.y - caster.y) ** 2),
              angle: Math.atan2(p.y - caster.y, p.x - caster.x),
              spin: 1.5, sizeDecay: 60,
              color: HOLY_GOLD, size: 3, life: 1200,
              shape: 'star', trail: true,
            });
          }, i * 150);
        }
      }},
      // Climax — all saints' light merges into caster
      { time: 1200, action: (ctx) => {
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'holy_fade', maxAlpha: 0.25, duration: 600 });
        ctx._spawnLight({ type: 'dome', x: caster.x, y: caster.y,
          color: PARCHMENT, maxSize: 80, maxAlpha: 0.3,
          life: 600, growDuration: 200, holdDuration: 200, shrinkDuration: 200 });
        ctx._spawnBurst(caster.x, caster.y, 16, 40, HOLY_GOLD,
          { size: 2, life: 700, shape: 'star' });
      }},
    ];
  }


  // ─────────────────────────────────────────────────────────
  // HOPE
  // ─────────────────────────────────────────────────────────

  /** Hail Mary — Marian blue shield. Gentle, protective. */
  _choreoHailMary(caster) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnConvergenceRing(caster.x, caster.y, 12, 60, MARIAN_BLUE, 500);
      }},
      { time: 450, action: (ctx) => {
        ctx._spawnLight({ type: 'dome', x: caster.x, y: caster.y,
          color: MARIAN_BLUE, maxSize: 45, maxAlpha: 0.3,
          life: 800, growDuration: 200, holdDuration: 300, shrinkDuration: 300 });
        ctx._spawnFlash({ color: MARIAN_BLUE, pattern: 'pulse', maxAlpha: 0.1, duration: 400 });
        // Marian stars (5 small white stars in arc above)
        for (let i = 0; i < 5; i++) {
          const angle = Math.PI * 0.3 + (i / 4) * Math.PI * 0.4;
          ctx._spawnParticle({
            x: caster.x + Math.cos(angle) * 40,
            y: caster.y - 30 + Math.sin(angle) * -20,
            color: HOLY_WHITE, size: 2, life: 1000,
            shape: 'star', pulseRate: 6, fadeOut: true,
          });
        }
      }},
    ];
  }

  /** Salve Regina — Wave of blue light healing despair. */
  _choreoSalveRegina(caster) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnRisingColumn(caster.x, caster.y + 10, 16, 100, MARIAN_BLUE, 800);
      }},
      { time: 400, action: (ctx) => {
        ctx._spawnLight({ type: 'shaft', x: caster.x, y: caster.y,
          color: MARIAN_BLUE, maxSize: 50, maxAlpha: 0.3,
          life: 800, growDuration: 300, holdDuration: 300, shrinkDuration: 200 });
      }},
      { time: 700, action: (ctx) => {
        // Expanding ring of peace
        ctx._spawnLight({ type: 'ring_expand', x: caster.x, y: caster.y,
          color: MARIAN_BLUE, maxSize: 150, maxAlpha: 0.25,
          life: 600, growDuration: 400, holdDuration: 0, shrinkDuration: 200 });
        ctx._spawnFlash({ color: MARIAN_BLUE, pattern: 'pulse', maxAlpha: 0.12, duration: 500 });
      }},
    ];
  }

  /**
   * The Memorare — THE NUCLEAR OPTION. Once per book.
   * Full-screen Marian intervention. The most dramatic animation in the game.
   *
   * 1. Screen goes dark (all seems lost)
   * 2. A single blue star appears at top of screen
   * 3. Blue light shafts rain down
   * 4. Full party heals in cascading columns of light
   * 5. HELD Marian blue flash with white center
   * 6. Stars burst outward — invulnerability granted
   */
  _choreoMemomare(caster) {
    return [
      // 1. Darkness
      { time: 0, action: (ctx) => {
        ctx._spawnFlash({ color: { r: 0, g: 0, b: 0 }, pattern: 'hold', maxAlpha: 0.7, duration: 1000 });
      }},

      // 2. Single star of hope
      { time: 800, action: (ctx) => {
        ctx._spawnParticle({
          x: ctx.w / 2, y: 20,
          color: MARIAN_BLUE, size: 4, life: 2500,
          shape: 'star', pulseRate: 3,
        });
      }},

      // 3. Light shafts from above
      { time: 1200, action: (ctx) => {
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (!ctx.playing) return;
            const sx = ctx.w * 0.2 + i * (ctx.w * 0.15);
            ctx._spawnLight({ type: 'shaft', x: sx, y: ctx.h * 0.5,
              color: MARIAN_BLUE, maxSize: 40, maxAlpha: 0.35,
              life: 1200, growDuration: 300, holdDuration: 500, shrinkDuration: 400 });
          }, i * 150);
        }
      }},

      // 4. Healing columns on party
      { time: 1800, action: (ctx) => {
        ctx._spawnLight({ type: 'column', x: caster.x, y: caster.y + 20,
          color: HOLY_WHITE, maxSize: 50, maxAlpha: 0.5,
          life: 1000, growDuration: 300, holdDuration: 400, shrinkDuration: 300 });
        ctx._spawnRisingColumn(caster.x, caster.y + 10, 20, 120, MARIAN_BLUE, 800);
        ctx._spawnRisingColumn(caster.x, caster.y + 10, 12, 100, HOLY_WHITE, 700);
      }},

      // 5. THE HELD FLASH — Marian blue with white center
      { time: 2400, action: (ctx) => {
        ctx._spawnFlash({ color: MARIAN_BLUE, pattern: 'hold', maxAlpha: 0.5, duration: 500 });
        // Dome
        ctx._spawnLight({ type: 'dome', x: ctx.w / 2, y: ctx.h * 0.4,
          color: MARIAN_BLUE, maxSize: 250, maxAlpha: 0.4,
          life: 800, growDuration: 200, holdDuration: 300, shrinkDuration: 300 });
        if (ctx.scene.cameras?.main) ctx.scene.cameras.main.shake(300, 0.006);
      }},

      // 6. Star burst — invulnerability
      { time: 2800, action: (ctx) => {
        ctx._spawnBurst(ctx.w / 2, ctx.h * 0.4, 40, 100, MARIAN_BLUE,
          { size: 3, life: 1000, shape: 'star', trail: true });
        ctx._spawnBurst(ctx.w / 2, ctx.h * 0.4, 20, 60, HOLY_WHITE,
          { size: 2, life: 800, shape: 'diamond' });
        // Five Marian stars linger
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          ctx._spawnParticle({
            x: caster.x + Math.cos(angle) * 50,
            y: caster.y + Math.sin(angle) * 50,
            color: MARIAN_BLUE, size: 2.5, life: 1500,
            shape: 'star', pulseRate: 5, fadeOut: true,
          });
        }
      }},
    ];
  }

  /** Decade of the Rosary — Orbiting beads of light, multi-turn */
  _choreoRosaryDecade(caster) {
    return [
      { time: 0, action: (ctx) => {
        // 10 beads orbit the caster (a decade)
        for (let i = 0; i < 10; i++) {
          ctx._spawnParticle({
            x: caster.x, y: caster.y,
            orbitCenter: { x: caster.x, y: caster.y },
            orbitRadius: 35,
            angle: (i / 10) * Math.PI * 2,
            spin: 1.5,
            color: MARIAN_BLUE, size: 2.5, life: 2000,
            shape: 'circle', pulseRate: 3, fadeOut: true,
          });
        }
        ctx._spawnFlash({ color: MARIAN_BLUE, pattern: 'holy_fade', maxAlpha: 0.06, duration: 1500 });
      }},
      { time: 800, action: (ctx) => {
        ctx._spawnRisingColumn(caster.x, caster.y + 5, 6, 40, MARIAN_BLUE, 600);
      }},
    ];
  }


  // ─────────────────────────────────────────────────────────
  // CHARITY
  // ─────────────────────────────────────────────────────────

  /** Laying on of Hands — Warm gold glow, gentle heal */
  _choreoLayingOnHands(caster, target) {
    const tx = target?.x || caster.x;
    const ty = target?.y || caster.y;
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnLight({ type: 'dome', x: tx, y: ty,
          color: HOLY_GOLD, maxSize: 35, maxAlpha: 0.3,
          life: 800, growDuration: 300, holdDuration: 200, shrinkDuration: 300 });
      }},
      { time: 200, action: (ctx) => {
        ctx._spawnRisingColumn(tx, ty + 5, 10, 50, HOLY_GOLD, 600);
      }},
      { time: 500, action: (ctx) => {
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'pulse', maxAlpha: 0.1, duration: 300 });
      }},
    ];
  }

  /** Anointing of the Sick — Oil glow + deeper heal */
  _choreoAnointing(caster, target) {
    const tx = target?.x || caster.x;
    const ty = target?.y || caster.y;
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnConvergenceRing(tx, ty, 12, 50, EMBER_ORANGE, 500);
      }},
      { time: 400, action: (ctx) => {
        // Oil anoint glow (warm amber)
        ctx._spawnLight({ type: 'dome', x: tx, y: ty,
          color: EMBER_ORANGE, maxSize: 40, maxAlpha: 0.35,
          life: 700, growDuration: 200, holdDuration: 300, shrinkDuration: 200 });
      }},
      { time: 600, action: (ctx) => {
        // Transition to holy gold (sacramental grace)
        ctx._spawnLight({ type: 'column', x: tx, y: ty + 20,
          color: HOLY_GOLD, maxSize: 40, maxAlpha: 0.4,
          life: 600, growDuration: 200, holdDuration: 200, shrinkDuration: 200 });
        ctx._spawnRisingColumn(tx, ty + 5, 8, 60, HOLY_WHITE, 500);
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'pulse', maxAlpha: 0.15, duration: 400 });
      }},
    ];
  }

  /** Absolution — White cleansing light */
  _choreoAbsolution(caster, target) {
    const tx = target?.x || caster.x;
    const ty = target?.y || caster.y;
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnLight({ type: 'shaft', x: tx, y: ty,
          color: HOLY_WHITE, maxSize: 35, maxAlpha: 0.3,
          life: 800, growDuration: 300, holdDuration: 200, shrinkDuration: 300 });
      }},
      { time: 400, action: (ctx) => {
        ctx._spawnBurst(tx, ty, 8, 25, HOLY_WHITE,
          { size: 2, life: 500, shape: 'diamond' });
      }},
    ];
  }

  /** Forgiveness — Pacifist victory. Light washes over enemy, expression changes. */
  _choreoForgiveness(caster, target) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnRisingColumn(caster.x, caster.y + 10, 8, 60, HOLY_GOLD, 600);
      }},
      // Light travels from caster to target
      { time: 400, action: (ctx) => {
        const dx = target.x - caster.x;
        const dy = target.y - caster.y;
        for (let i = 0; i < 12; i++) {
          setTimeout(() => {
            if (!ctx.playing) return;
            ctx._spawnParticle({
              x: caster.x, y: caster.y,
              vx: dx / 0.5 + (Math.random() - 0.5) * 30,
              vy: dy / 0.5 + (Math.random() - 0.5) * 30,
              color: HOLY_GOLD, size: 3, life: 600,
              shape: 'star', trail: true, fadeOut: true,
            });
          }, i * 40);
        }
      }},
      // Impact: gentle dome on enemy, NOT violent
      { time: 900, action: (ctx) => {
        ctx._spawnLight({ type: 'dome', x: target.x, y: target.y,
          color: HOLY_GOLD, maxSize: 50, maxAlpha: 0.35,
          life: 1000, growDuration: 300, holdDuration: 400, shrinkDuration: 300 });
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'holy_fade', maxAlpha: 0.2, duration: 800 });
        ctx._spawnRisingColumn(target.x, target.y + 5, 10, 80, HOLY_WHITE, 800);
      }},
    ];
  }

  /** Viaticum — Sacred, solemn. Gold light, peaceful. */
  _choreoViaticum(caster, target) {
    const tx = target?.x || caster.x;
    const ty = target?.y || caster.y;
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnLight({ type: 'shaft', x: tx, y: ty,
          color: HOLY_GOLD, maxSize: 30, maxAlpha: 0.4,
          life: 1500, growDuration: 500, holdDuration: 600, shrinkDuration: 400 });
      }},
      { time: 500, action: (ctx) => {
        ctx._spawnConvergenceRing(tx, ty, 8, 40, HOLY_GOLD, 600);
      }},
      { time: 1000, action: (ctx) => {
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'holy_fade', maxAlpha: 0.15, duration: 500 });
        ctx._spawnRisingColumn(tx, ty, 6, 100, HOLY_WHITE, 500);
      }},
    ];
  }


  // ─────────────────────────────────────────────────────────
  // JUSTICE
  // ─────────────────────────────────────────────────────────

  /** Sword of the Spirit — Golden slash with holy edge */
  _choreoSwordOfSpirit(caster, target) {
    return [
      // Wind-up: gold energy gathers at blade
      { time: 0, action: (ctx) => {
        ctx._spawnConvergenceRing(caster.x + 15, caster.y - 10, 8, 40, HOLY_GOLD, 300);
      }},
      // Slash: fast arc of golden light
      { time: 300, action: (ctx) => {
        // Slash trail — arc of particles from caster to target
        const steps = 12;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const sx = caster.x + (target.x - caster.x) * t;
          const sy = caster.y + (target.y - caster.y) * t - Math.sin(t * Math.PI) * 30;
          setTimeout(() => {
            if (!ctx.playing) return;
            ctx._spawnParticle({
              x: sx, y: sy,
              color: HOLY_GOLD, size: 4 - t * 2, life: 400,
              shape: 'line', trail: true, fadeOut: true,
            });
          }, i * 15);
        }
      }},
      // Impact
      { time: 500, action: (ctx) => {
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'double', maxAlpha: 0.4, duration: 250 });
        ctx._spawnBurst(target.x, target.y, 10, 50, HOLY_GOLD,
          { size: 2, life: 400, shape: 'line' });
        ctx._spawnLight({ type: 'cross_trace', x: target.x, y: target.y,
          color: HOLY_GOLD, maxSize: 30, maxAlpha: 0.5,
          life: 300, growDuration: 100, holdDuration: 100, shrinkDuration: 100 });
        if (ctx.scene.cameras?.main) ctx.scene.cameras.main.shake(150, 0.008);
      }},
    ];
  }

  /** Breastplate of Righteousness — Protective wall of golden light */
  _choreoBreastplate(caster) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnLight({ type: 'ray_burst', x: caster.x, y: caster.y,
          color: HOLY_GOLD, maxSize: 60, maxAlpha: 0.3, rays: 8, rotationSpeed: 0.3,
          life: 1000, growDuration: 400, holdDuration: 300, shrinkDuration: 300 });
      }},
      { time: 300, action: (ctx) => {
        // Shield wall particles
        for (let i = 0; i < 10; i++) {
          const angle = Math.PI * -0.4 + (i / 9) * Math.PI * 0.8;
          ctx._spawnParticle({
            x: caster.x + Math.cos(angle) * 40,
            y: caster.y + Math.sin(angle) * 30,
            color: HOLY_GOLD, size: 3, life: 800,
            shape: 'diamond', pulseRate: 5, fadeOut: true,
          });
        }
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'pulse', maxAlpha: 0.12, duration: 400 });
      }},
    ];
  }


  // ─────────────────────────────────────────────────────────
  // FORTITUDE
  // ─────────────────────────────────────────────────────────

  /** Martyrs' Stand — Red-gold determination aura at low HP */
  _choreoMartyrsStand(caster) {
    return [
      { time: 0, action: (ctx) => {
        // Ground impact — determination
        ctx._spawnFlash({ color: BLOOD_RED, pattern: 'single', maxAlpha: 0.2, duration: 200 });
        if (ctx.scene.cameras?.main) ctx.scene.cameras.main.shake(100, 0.005);
      }},
      { time: 200, action: (ctx) => {
        // Aura rises — red to gold transition
        ctx._spawnRisingColumn(caster.x, caster.y + 15, 12, 80, BLOOD_RED, 500);
      }},
      { time: 400, action: (ctx) => {
        ctx._spawnRisingColumn(caster.x, caster.y + 15, 8, 80, HOLY_GOLD, 500);
        ctx._spawnLight({ type: 'ring_expand', x: caster.x, y: caster.y,
          color: HOLY_GOLD, maxSize: 50, maxAlpha: 0.3,
          life: 500, growDuration: 250, holdDuration: 0, shrinkDuration: 250 });
      }},
    ];
  }

  /** Crown of Life — Golden crown descends, stat doubling aura */
  _choreoCrownOfLife(caster) {
    return [
      { time: 0, action: (ctx) => {
        // Crown descends from above
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx._spawnParticle({
            x: caster.x + Math.cos(angle) * 20,
            y: caster.y - 80,
            vy: 60, color: HOLY_GOLD, size: 3, life: 1200,
            shape: 'diamond', trail: true, fadeOut: true,
          });
        }
      }},
      { time: 600, action: (ctx) => {
        // Crown settles — ring of golden light
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          ctx._spawnParticle({
            x: caster.x + Math.cos(angle) * 18,
            y: caster.y - 35 + Math.sin(angle) * 5,
            color: HOLY_GOLD, size: 2.5, life: 1500,
            shape: 'star', pulseRate: 4, fadeOut: true,
          });
        }
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'hold', maxAlpha: 0.3, duration: 400 });
        ctx._spawnLight({ type: 'ray_burst', x: caster.x, y: caster.y - 30,
          color: HOLY_GOLD, maxSize: 50, maxAlpha: 0.4, rays: 12,
          life: 600, growDuration: 200, holdDuration: 200, shrinkDuration: 200 });
      }},
    ];
  }


  // ─────────────────────────────────────────────────────────
  // TEMPERANCE
  // ─────────────────────────────────────────────────────────

  /** Fasting of the Desert — Sandy gold particles form barrier */
  _choreoFastingDesert(caster) {
    return [
      { time: 0, action: (ctx) => {
        ctx._spawnConvergenceRing(caster.x, caster.y, 10, 50, PARCHMENT, 500);
      }},
      { time: 400, action: (ctx) => {
        // Still, quiet dome — temperance is restraint
        ctx._spawnLight({ type: 'dome', x: caster.x, y: caster.y,
          color: PARCHMENT, maxSize: 35, maxAlpha: 0.25,
          life: 600, growDuration: 200, holdDuration: 200, shrinkDuration: 200 });
      }},
    ];
  }

  /** Sabbath Rest — Stillness. MP restores. Almost no visual — that IS the point. */
  _choreoSabbathRest(caster) {
    return [
      { time: 0, action: (ctx) => {
        // Just a few motes drifting upward. Peace.
        for (let i = 0; i < 5; i++) {
          ctx._spawnParticle({
            x: caster.x + (Math.random() - 0.5) * 20,
            y: caster.y + 10,
            vy: -15, vx: (Math.random() - 0.5) * 5,
            color: HOLY_GOLD, size: 1.5, life: 2000,
            shape: 'circle', fadeOut: true,
          });
        }
      }},
    ];
  }

  /** Act of Contrition — Violet/gold cleansing */
  _choreoContrition(caster) {
    return [
      { time: 0, action: (ctx) => {
        // Violet (penitential) motes rise and transform to gold
        ctx._spawnRisingColumn(caster.x, caster.y + 10, 8, 50, SHADOW_PURPLE, 500);
      }},
      { time: 400, action: (ctx) => {
        ctx._spawnRisingColumn(caster.x, caster.y + 10, 8, 50, HOLY_GOLD, 500);
        ctx._spawnFlash({ color: HOLY_GOLD, pattern: 'pulse', maxAlpha: 0.1, duration: 400 });
      }},
    ];
  }
}
