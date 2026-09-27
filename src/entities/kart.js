const {
  EffectManager,
  Projectile,
  Trap,
  EFFECT_DURATIONS,
  USE_COOLDOWN,
} = require('../items/effects.js');

const ITEM_KINDS = {
  boost: 'effect',
  shield: 'effect',
  missile: 'attack',
  banana: 'trap',
};

class Kart {
  constructor(x, y, world = null) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 1;
    this.maxSpeed = 10;
    this.acceleration = 5;
    this.shielded = false;
    this.item = null;
    this.world = world;
    this.projectiles = [];
    this.traps = [];
    this.useCooldown = 0;
    this.hitCount = 0;
    this.effects = new EffectManager(this);
  }

  useItem() {
    if (!this.item) return false;
    if (this.useCooldown > 0) return false;

    const type = this.item;
    this.item = null;
    this.useCooldown = USE_COOLDOWN;

    if (ITEM_KINDS[type] === 'effect') {
      this.effects.add(type, EFFECT_DURATIONS[type]);
    } else if (type === 'missile') {
      const speed = this.maxSpeed;
      this.projectiles.push(new Projectile(
        this, this.x, this.y, this.vx || speed, this.vy, this.world
      ));
    } else if (type === 'banana') {
      this.traps.push(new Trap(this, this.x, this.y));
    }
    return true;
  }

  hit() {
    this.hitCount += 1;
    if (this.effects.hasShield()) {
      this.effects.consumeShield();
      return false;
    }
    this.item = null;
    return true;
  }

  update(dt, karts = []) {
    if (this.useCooldown > 0) {
      this.useCooldown = Math.max(0, this.useCooldown - dt);
    }
    this.effects.update(dt);
    for (const projectile of this.projectiles) {
      projectile.update(dt, karts);
    }
    this.projectiles = this.projectiles.filter((p) => p.active);
    for (const trap of this.traps) {
      trap.update(dt, karts);
    }
    this.traps = this.traps.filter((t) => t.active);
  }
}

module.exports = { Kart, ITEM_KINDS };
