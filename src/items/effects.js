const EFFECT_DURATIONS = { boost: 3, shield: 5 };
const USE_COOLDOWN = 0.5;

class EffectManager {
  constructor(kart) {
    this.kart = kart;
    this.effects = [];
  }

  add(type, duration) {
    const existing = this.effects.find((e) => e.type === type);
    if (existing) {
      existing.duration = duration;
      existing.remaining = duration;
      return existing;
    }
    const effect = { type, duration, remaining: duration };
    this.effects.push(effect);
    this.apply(type);
    return effect;
  }

  apply(type) {
    if (type === 'boost') {
      if (this.kart._baseMaxSpeed === undefined) {
        this.kart._baseMaxSpeed = this.kart.maxSpeed;
        this.kart._baseAcceleration = this.kart.acceleration;
      }
      this.kart.maxSpeed = this.kart._baseMaxSpeed * 1.5;
      this.kart.acceleration = this.kart._baseAcceleration * 1.5;
    } else if (type === 'shield') {
      this.kart.shielded = true;
    }
  }

  revert(type) {
    if (type === 'boost') {
      if (this.kart._baseMaxSpeed !== undefined) {
        this.kart.maxSpeed = this.kart._baseMaxSpeed;
        this.kart.acceleration = this.kart._baseAcceleration;
      }
    } else if (type === 'shield') {
      this.kart.shielded = false;
    }
  }

  update(dt) {
    for (const effect of this.effects) {
      effect.remaining -= dt;
    }
    const expired = this.effects.filter((e) => e.remaining <= 0);
    for (const effect of expired) {
      this.revert(effect.type);
    }
    this.effects = this.effects.filter((e) => e.remaining > 0);
  }

  has(type) {
    return this.effects.some((e) => e.type === type);
  }

  hasShield() {
    return this.has('shield');
  }

  consumeShield() {
    const index = this.effects.findIndex((e) => e.type === 'shield');
    if (index === -1) return false;
    this.effects.splice(index, 1);
    this.kart.shielded = false;
    return true;
  }

  clear() {
    for (const effect of this.effects) {
      this.revert(effect.type);
    }
    this.effects = [];
  }
}

class Projectile {
  constructor(owner, x, y, vx, vy, world = null, range = 30) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.world = world;
    this.range = range;
    this.traveled = 0;
    this.radius = 0.5;
    this.active = true;
    this.hitKart = null;
  }

  hitsWall() {
    const walls = this.world ? this.world.walls : null;
    if (!walls) return false;
    return walls.some((wall) => (
      this.x + this.radius > wall.x &&
      this.x - this.radius < wall.x + wall.width &&
      this.y + this.radius > wall.y &&
      this.y - this.radius < wall.y + wall.height
    ));
  }

  update(dt, karts) {
    if (!this.active) return null;
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    this.x += dx;
    this.y += dy;
    this.traveled += Math.hypot(dx, dy);

    if (this.hitsWall() || this.traveled >= this.range) {
      this.active = false;
      return null;
    }

    for (const kart of karts) {
      if (!kart || kart === this.owner) continue;
      const hitRadius = (kart.radius || 1) + this.radius;
      if (Math.hypot(kart.x - this.x, kart.y - this.y) <= hitRadius) {
        this.active = false;
        this.hitKart = kart;
        const damaged = kart.hit();
        return { kart, blocked: !damaged };
      }
    }
    return null;
  }
}

class Trap {
  constructor(owner, x, y) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.radius = 0.5;
    this.active = true;
    this.triggeredBy = null;
  }

  update(_dt, karts) {
    if (!this.active) return null;
    for (const kart of karts) {
      if (!kart || kart === this.owner) continue;
      const hitRadius = (kart.radius || 1) + this.radius;
      if (Math.hypot(kart.x - this.x, kart.y - this.y) <= hitRadius) {
        this.active = false;
        this.triggeredBy = kart;
        const damaged = kart.hit();
        return { kart, blocked: !damaged };
      }
    }
    return null;
  }
}

module.exports = {
  EffectManager,
  Projectile,
  Trap,
  EFFECT_DURATIONS,
  USE_COOLDOWN,
};
