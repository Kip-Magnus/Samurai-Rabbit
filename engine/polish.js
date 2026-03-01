/**
 * SAMURAI USAGI — POLISH SYSTEM
 * ================================
 * Visual juice: sprite animations, particles, transitions, screen effects.
 *
 * Principles:
 *   - Every action has visual feedback
 *   - Particles enhance atmosphere, never distract
 *   - Animations follow classic JRPG timing (6-8 fps for sprites)
 *   - Effects scale with the 320×240 native resolution
 *   - Everything is procedural — zero sprite sheets required
 */

const W = 320;
const H = 240;
const TILE_SIZE = 16;
const ANIM_FPS = 8;  // Classic pixel art frame rate


// ═══════════════════════════════════════════════════════════════
// SPRITE ANIMATOR — Walk cycles, idle, combat poses
// ═══════════════════════════════════════════════════════════════

export class SpriteAnimator {
  constructor() {
    this.entities = new Map();  // id → AnimatedEntity
    this.globalTime = 0;
  }

  /**
   * Register an entity for animation.
   */
  register(id, config = {}) {
    this.entities.set(id, {
      x: config.x || 0,
      y: config.y || 0,
      targetX: config.x || 0,
      targetY: config.y || 0,
      facing: config.facing || 'down',
      state: 'idle',         // idle, walk, attack, hurt, cast, dead
      frame: 0,
      frameTimer: 0,
      species: config.species || 'rabbit',
      palette: config.palette || {},
      moveSpeed: config.moveSpeed || 64, // pixels per second
      flashTimer: 0,
      flashColor: '#ffffff',
      shakeTimer: 0,
      shakeIntensity: 0,
      opacity: 1,
      scale: 1,
      bobOffset: 0,
      bobSpeed: config.bobSpeed || 2,
      isNPC: config.isNPC || false,
    });
  }

  /**
   * Move entity to tile position with walk animation.
   */
  moveTo(id, tileX, tileY, direction) {
    const e = this.entities.get(id);
    if (!e) return;

    e.targetX = tileX * TILE_SIZE;
    e.targetY = tileY * TILE_SIZE;
    e.facing = direction || e.facing;
    e.state = 'walk';
  }

  /**
   * Set entity state.
   */
  setState(id, state) {
    const e = this.entities.get(id);
    if (!e) return;
    e.state = state;
    e.frame = 0;
    e.frameTimer = 0;
  }

  /**
   * Flash entity (hit effect).
   */
  flash(id, color = '#ffffff', duration = 0.15) {
    const e = this.entities.get(id);
    if (!e) return;
    e.flashTimer = duration;
    e.flashColor = color;
  }

  /**
   * Shake entity (hit recoil).
   */
  shake(id, intensity = 3, duration = 0.2) {
    const e = this.entities.get(id);
    if (!e) return;
    e.shakeTimer = duration;
    e.shakeIntensity = intensity;
  }

  /**
   * Dissolve entity (death animation).
   */
  dissolve(id, duration = 0.8) {
    const e = this.entities.get(id);
    if (!e) return;
    e.state = 'dead';
    e._dissolveTimer = duration;
    e._dissolveDuration = duration;
  }

  update(dt) {
    this.globalTime += dt;

    for (const [id, e] of this.entities) {
      // Movement interpolation
      const dx = e.targetX - e.x;
      const dy = e.targetY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.5) {
        const step = Math.min(dist, e.moveSpeed * dt);
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
      } else if (e.state === 'walk') {
        e.x = e.targetX;
        e.y = e.targetY;
        e.state = 'idle';
      }

      // Frame animation
      e.frameTimer += dt;
      if (e.frameTimer >= 1 / ANIM_FPS) {
        e.frameTimer -= 1 / ANIM_FPS;
        e.frame++;
      }

      // Flash decay
      if (e.flashTimer > 0) e.flashTimer -= dt;

      // Shake decay
      if (e.shakeTimer > 0) e.shakeTimer -= dt;

      // Dissolve
      if (e.state === 'dead' && e._dissolveTimer > 0) {
        e._dissolveTimer -= dt;
        e.opacity = Math.max(0, e._dissolveTimer / e._dissolveDuration);
      }

      // NPC bob
      if (e.isNPC) {
        e.bobOffset = Math.sin(this.globalTime * e.bobSpeed + id.length) * 1.5;
      }

      // Idle breathing
      if (e.state === 'idle') {
        e.scale = 1 + Math.sin(this.globalTime * 1.5) * 0.015;
      } else {
        e.scale = 1;
      }
    }
  }

  /**
   * Render an entity's sprite to canvas.
   */
  renderEntity(ctx, id, cameraX = 0, cameraY = 0) {
    const e = this.entities.get(id);
    if (!e || e.opacity <= 0) return;

    const x = Math.round(e.x - cameraX);
    const y = Math.round(e.y - cameraY + e.bobOffset);

    ctx.save();
    ctx.globalAlpha = e.opacity;

    // Shake offset
    let sx = 0, sy = 0;
    if (e.shakeTimer > 0) {
      sx = (Math.random() - 0.5) * e.shakeIntensity;
      sy = (Math.random() - 0.5) * e.shakeIntensity;
    }

    ctx.translate(x + 8 + sx, y + 8 + sy);
    ctx.scale(e.scale, e.scale);
    ctx.translate(-8, -8);

    // Draw sprite based on state + frame
    this._drawSprite(ctx, e);

    // Flash overlay
    if (e.flashTimer > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = e.flashColor;
      ctx.globalAlpha = e.flashTimer * 4;
      ctx.fillRect(0, 0, 16, 16);
    }

    ctx.restore();
  }

  _drawSprite(ctx, entity) {
    const f = entity.frame % 4;
    const species = entity.species;

    // Body
    const bodyColor = entity.palette.body || (species === 'rabbit' ? '#f5f0e8' : '#8b7355');
    const earColor = entity.palette.ear || bodyColor;
    const eyeColor = entity.palette.eye || '#2a1a0a';

    // Walk cycle offset
    const walkBob = entity.state === 'walk' ? Math.sin(entity.frame * 0.8) * 1 : 0;
    const legOffset = entity.state === 'walk' ? [0, 1, 0, -1][f] : 0;

    // Body rectangle
    ctx.fillStyle = bodyColor;
    ctx.fillRect(4, 4 + walkBob, 8, 10);

    // Head
    ctx.fillRect(3, 1 + walkBob, 10, 6);

    // Ears (rabbits only)
    if (species === 'rabbit') {
      ctx.fillStyle = earColor;
      const earH = entity.state === 'idle' ? 4 + Math.sin(this.globalTime * 2) * 0.5 : 3;
      ctx.fillRect(4, -earH + 2 + walkBob, 2, earH);
      ctx.fillRect(9, -earH + 2 + walkBob, 2, earH);
    }

    // Eyes
    ctx.fillStyle = eyeColor;
    const eyeY = 3 + walkBob;
    switch (entity.facing) {
      case 'down':  ctx.fillRect(5, eyeY, 1, 1); ctx.fillRect(9, eyeY, 1, 1); break;
      case 'up':    break; // back of head
      case 'left':  ctx.fillRect(4, eyeY, 1, 1); break;
      case 'right': ctx.fillRect(10, eyeY, 1, 1); break;
    }

    // Legs
    ctx.fillStyle = bodyColor;
    ctx.fillRect(5, 14 + legOffset, 2, 2);
    ctx.fillRect(9, 14 - legOffset, 2, 2);

    // Attack state: arm extension
    if (entity.state === 'attack') {
      ctx.fillStyle = '#aaa';
      const attackFrame = entity.frame % 3;
      if (entity.facing === 'right' || entity.facing === 'down') {
        ctx.fillRect(12, 6 + walkBob - attackFrame, 3, 2);
      } else {
        ctx.fillRect(1 - 3, 6 + walkBob - attackFrame, 3, 2);
      }
    }

    // Cast state: glow
    if (entity.state === 'cast') {
      ctx.fillStyle = '#ffd70066';
      ctx.fillRect(2, 0, 12, 16);
    }

    // Hurt state: tilt
    if (entity.state === 'hurt') {
      ctx.fillStyle = '#cc333344';
      ctx.fillRect(0, 0, 16, 16);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// EXPLORATION PARTICLES — Atmospheric per-area effects
// ═══════════════════════════════════════════════════════════════

export class ExplorationParticles {
  constructor() {
    this.particles = [];
    this.emitters = [];
    this.maxParticles = 60;
    this.time = 0;
  }

  /**
   * Set up particles for an area type.
   */
  setArea(areaType) {
    this.particles = [];
    this.emitters = [];

    switch (areaType) {
      case 'village':
      case 'forest':
        this._addEmitter('firefly', { rate: 0.5, color: '#aaffaa44', size: [1, 2], speed: [4, 10], life: [3, 6], drift: true });
        this._addEmitter('leaf', { rate: 0.15, color: '#4a7c5966', size: [2, 3], speed: [8, 15], life: [4, 8], gravity: 6, sway: true });
        break;
      case 'bamboo_forest':
        this._addEmitter('firefly', { rate: 0.6, color: '#aaffaa55', size: [1, 2], speed: [3, 8], life: [4, 8], drift: true });
        this._addEmitter('bamboo_leaf', { rate: 0.1, color: '#6b8e2344', size: [2, 4], speed: [5, 12], life: [3, 6], gravity: 8, sway: true });
        break;
      case 'mountain':
      case 'mountain_summit':
        this._addEmitter('dust', { rate: 0.3, color: '#8a807866', size: [1, 2], speed: [10, 20], life: [2, 4], windX: 15 });
        if (areaType === 'mountain_summit') {
          this._addEmitter('star', { rate: 0.2, color: '#ffffff66', size: [1, 1], speed: [0, 2], life: [1, 3], twinkle: true });
        }
        break;
      case 'coast':
        this._addEmitter('spray', { rate: 0.4, color: '#ffffff44', size: [1, 2], speed: [6, 14], life: [1, 3], gravity: 12, spawnX: [260, 320], spawnY: [0, 240] });
        break;
      case 'burning_chapel':
        this._addEmitter('ember', { rate: 1.5, color: '#ff450088', size: [1, 3], speed: [15, 30], life: [1, 3], gravity: -20, flicker: true });
        this._addEmitter('ash', { rate: 0.8, color: '#88888866', size: [1, 2], speed: [5, 12], life: [3, 6], gravity: 4, sway: true });
        this._addEmitter('smoke', { rate: 0.3, color: '#44444444', size: [3, 6], speed: [8, 15], life: [2, 5], gravity: -10, grow: true });
        break;
      case 'hidden_chapel':
        this._addEmitter('dust_mote', { rate: 0.2, color: '#ffd70033', size: [1, 2], speed: [2, 5], life: [4, 8], drift: true });
        break;
    }
  }

  _addEmitter(type, config) {
    this.emitters.push({ type, ...config, _timer: 0 });
  }

  update(dt) {
    this.time += dt;

    // Emit new particles
    for (const em of this.emitters) {
      em._timer += dt;
      while (em._timer >= 1 / em.rate) {
        em._timer -= 1 / em.rate;
        if (this.particles.length < this.maxParticles) {
          this.particles.push(this._createParticle(em));
        }
      }
    }

    // Update particles
    for (const p of this.particles) {
      p.age += dt;

      // Movement
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Gravity
      if (p.gravity) p.vy += p.gravity * dt;

      // Wind
      if (p.windX) p.x += p.windX * dt;

      // Drift (lazy sinusoidal)
      if (p.drift) {
        p.x += Math.sin(this.time * 0.7 + p._seed) * 3 * dt;
        p.y += Math.cos(this.time * 0.5 + p._seed * 1.3) * 2 * dt;
      }

      // Sway (leaf-like)
      if (p.sway) {
        p.x += Math.sin(this.time * 1.5 + p._seed) * 8 * dt;
      }

      // Grow
      if (p.grow) {
        p.size = p.baseSize + (p.age / p.life) * p.baseSize * 2;
      }
    }

    // Cull dead particles
    this.particles = this.particles.filter(p => p.age < p.life);
  }

  _createParticle(emitter) {
    const spawnX = emitter.spawnX ? emitter.spawnX[0] + Math.random() * (emitter.spawnX[1] - emitter.spawnX[0]) : Math.random() * W;
    const spawnY = emitter.spawnY ? emitter.spawnY[0] + Math.random() * (emitter.spawnY[1] - emitter.spawnY[0]) : Math.random() * H;
    const speed = emitter.speed[0] + Math.random() * (emitter.speed[1] - emitter.speed[0]);
    const angle = Math.random() * Math.PI * 2;
    const size = emitter.size[0] + Math.random() * (emitter.size[1] - emitter.size[0]);
    const life = emitter.life[0] + Math.random() * (emitter.life[1] - emitter.life[0]);

    return {
      x: spawnX, y: spawnY,
      vx: Math.cos(angle) * speed * (emitter.gravity ? 0.3 : 1),
      vy: emitter.gravity ? -Math.abs(Math.sin(angle) * speed) : Math.sin(angle) * speed,
      size, baseSize: size,
      color: emitter.color,
      life, age: 0,
      gravity: emitter.gravity || 0,
      windX: emitter.windX || 0,
      drift: emitter.drift || false,
      sway: emitter.sway || false,
      grow: emitter.grow || false,
      flicker: emitter.flicker || false,
      twinkle: emitter.twinkle || false,
      _seed: Math.random() * 100,
    };
  }

  render(ctx) {
    for (const p of this.particles) {
      const fadeIn = Math.min(1, p.age / 0.3);
      const fadeOut = Math.max(0, 1 - (p.age - p.life + 0.5) / 0.5);
      let alpha = Math.min(fadeIn, fadeOut);

      if (p.flicker) alpha *= 0.5 + Math.sin(this.time * 12 + p._seed * 10) * 0.5;
      if (p.twinkle) alpha *= 0.3 + Math.sin(this.time * 3 + p._seed * 5) * 0.7;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.size <= 1) {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}


// ═══════════════════════════════════════════════════════════════
// DAMAGE NUMBERS — Physics-based floating text
// ═══════════════════════════════════════════════════════════════

export class DamageNumberSystem {
  constructor() {
    this.numbers = [];
  }

  /**
   * Spawn a damage number.
   */
  spawn(x, y, text, options = {}) {
    this.numbers.push({
      x, y,
      text: String(text),
      color: options.color || '#ffffff',
      size: options.critical ? 12 : options.heal ? 9 : 10,
      vx: (Math.random() - 0.5) * 20,
      vy: -40 - Math.random() * 20,
      gravity: 80,
      age: 0,
      life: options.life || 1.2,
      critical: options.critical || false,
      holy: options.holy || false,
    });
  }

  update(dt) {
    for (const n of this.numbers) {
      n.age += dt;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.vy += n.gravity * dt;

      // Bounce at floor
      if (n.y > n._startY && n.vy > 0) {
        n.vy *= -0.3;
        n.vx *= 0.5;
      }
    }
    this.numbers = this.numbers.filter(n => n.age < n.life);
  }

  render(ctx) {
    for (const n of this.numbers) {
      const alpha = Math.max(0, 1 - (n.age / n.life));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = n.color;
      ctx.font = `${n.critical ? 'bold ' : ''}${n.size}px monospace`;
      ctx.textAlign = 'center';

      // Critical flash
      if (n.critical && n.age < 0.2) {
        ctx.fillStyle = '#ffffff';
      }

      // Holy glow
      if (n.holy) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 4;
      }

      ctx.fillText(n.text, Math.round(n.x), Math.round(n.y));
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}


// ═══════════════════════════════════════════════════════════════
// SCREEN EFFECTS — Global visual juice
// ═══════════════════════════════════════════════════════════════

export class ScreenEffects {
  constructor() {
    this.shake = { timer: 0, intensity: 0 };
    this.flash = { timer: 0, color: '#ffffff' };
    this.vignette = 0;
    this.screenTint = null;
    this.letterbox = 0;
    this.time = 0;
  }

  /**
   * Screen shake.
   */
  triggerShake(intensity = 4, duration = 0.3) {
    this.shake.timer = duration;
    this.shake.intensity = intensity;
  }

  /**
   * White/colored flash.
   */
  triggerFlash(color = '#ffffff', duration = 0.2) {
    this.flash.timer = duration;
    this.flash.color = color;
  }

  /**
   * Cinematic letterbox for cutscenes.
   */
  setLetterbox(amount) {
    this.letterbox = amount; // 0-30 pixels
  }

  /**
   * Screen tint (e.g., red for low HP, sepia for memory).
   */
  setTint(color) {
    this.screenTint = color;  // '#ff000022' or null
  }

  /**
   * Vignette intensity (0-1).
   */
  setVignette(intensity) {
    this.vignette = intensity;
  }

  update(dt) {
    this.time += dt;
    if (this.shake.timer > 0) this.shake.timer -= dt;
    if (this.flash.timer > 0) this.flash.timer -= dt;
  }

  /**
   * Apply pre-render effects (shake transform).
   */
  applyPreRender(ctx) {
    if (this.shake.timer > 0) {
      const sx = (Math.random() - 0.5) * this.shake.intensity;
      const sy = (Math.random() - 0.5) * this.shake.intensity;
      ctx.translate(sx, sy);
    }
  }

  /**
   * Apply post-render effects (flash, tint, vignette, letterbox).
   */
  applyPostRender(ctx) {
    // Flash
    if (this.flash.timer > 0) {
      ctx.fillStyle = this.flash.color;
      ctx.globalAlpha = this.flash.timer * 3;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Tint
    if (this.screenTint) {
      ctx.fillStyle = this.screenTint;
      ctx.fillRect(0, 0, W, H);
    }

    // Vignette
    if (this.vignette > 0) {
      const gradient = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, `rgba(0,0,0,${this.vignette})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }

    // Letterbox
    if (this.letterbox > 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, this.letterbox);
      ctx.fillRect(0, H - this.letterbox, W, this.letterbox);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// BATTLE INTRO EFFECT — Swirl transition into combat
// ═══════════════════════════════════════════════════════════════

export class BattleIntroEffect {
  constructor() {
    this.active = false;
    this.timer = 0;
    this.duration = 0.8;
  }

  start() {
    this.active = true;
    this.timer = 0;
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;
    if (this.timer >= this.duration) this.active = false;
  }

  render(ctx) {
    if (!this.active) return;

    const t = this.timer / this.duration;
    const cx = W / 2;
    const cy = H / 2;

    // Rotating black triangles closing in
    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + t * Math.PI;
      const dist = (1 - t) * 200;

      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -dist);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(-100, -100);
      ctx.lineTo(100, -100);
      ctx.lineTo(0, 100);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Flash at the end
    if (t > 0.8) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = (t - 0.8) / 0.2;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// LEVEL UP EFFECT — Sparkle cascade
// ═══════════════════════════════════════════════════════════════

export class LevelUpEffect {
  constructor() {
    this.active = false;
    this.timer = 0;
    this.sparks = [];
  }

  start() {
    this.active = true;
    this.timer = 0;
    this.sparks = [];

    // Create sparkle ring
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      this.sparks.push({
        x: W / 2, y: H * 0.6,
        vx: Math.cos(angle) * (30 + Math.random() * 40),
        vy: Math.sin(angle) * (30 + Math.random() * 40) - 40,
        size: 1 + Math.random() * 2,
        color: ['#ffd700', '#ffffff', '#c9a959', '#f5f0e8'][Math.floor(Math.random() * 4)],
        life: 1 + Math.random() * 0.5,
        age: 0,
      });
    }
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    for (const s of this.sparks) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 60 * dt; // gravity
    }
    this.sparks = this.sparks.filter(s => s.age < s.life);

    if (this.timer > 2) this.active = false;
  }

  render(ctx) {
    if (!this.active) return;

    // "LEVEL UP" text
    if (this.timer < 1.5) {
      const alpha = Math.min(1, this.timer / 0.3) * Math.min(1, (1.5 - this.timer) / 0.3);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fillText('LEVEL UP', W / 2, H * 0.5);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // Sparks
    for (const s of this.sparks) {
      const alpha = Math.max(0, 1 - s.age / s.life);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }
}
