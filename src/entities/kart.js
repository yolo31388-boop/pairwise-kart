const { EffectManager } = require('../items/effects.js');
const { Missile, BananaTrap } = require('../items/weapons.js');

const BASE_MAX_SPEED = 10;
const BASE_ACCELERATION = 0.5;
const BOOST_DURATION = 3;
const SHIELD_DURATION = 5;
// 道具使用的动画/反馈时间：该冷却内不能再次使用道具。
const ITEM_USE_COOLDOWN = 0.5;

class Kart {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;

    this.baseMaxSpeed = BASE_MAX_SPEED;
    this.baseAcceleration = BASE_ACCELERATION;
    this.maxSpeed = this.baseMaxSpeed;
    this.acceleration = this.baseAcceleration;
    this.hitRadius = 0.8;

    this.shielded = false;
    this.item = null;
    this.itemUseCooldown = 0;
    this.spunOut = false;
    this.spinTimer = 0;

    this.effects = new EffectManager(this);
    this.projectiles = [];
    this.traps = [];
  }

  // 公开用途保持不变：使用当前携带的道具；攻击/陷阱类可传入世界上下文。
  useItem(world = { targets: [], walls: [] }) {
    if (!this.item) return false;
    if (this.itemUseCooldown > 0) return false;

    const item = this.item;
    this.item = null;
    this.itemUseCooldown = ITEM_USE_COOLDOWN;

    switch (item) {
      case 'boost':
        this.effects.add('boost', BOOST_DURATION);
        break;
      case 'shield':
        this.effects.add('shield', SHIELD_DURATION);
        break;
      case 'missile': {
        // 攻击道具独立逻辑：生成沿车头方向飞行的导弹，由世界更新命中。
        this.projectiles.push(new Missile(this, world.projectileOptions));
        break;
      }
      case 'banana': {
        // 陷阱道具独立逻辑：在身后放置香蕉，放置者免疫触发。
        const backX = this.x - Math.cos(this.angle) * 1.2;
        const backY = this.y - Math.sin(this.angle) * 1.2;
        this.traps.push(new BananaTrap(this, backX, backY, world.trapOptions));
        break;
      }
      default:
        break;
    }
    return true;
  }

  // 公开用途保持不变：被攻击命中。返回 false 表示被护盾抵挡，true 表示实际受击。
  hit(source = null, attacker = null) {
    if (this.effects.consumeShield()) {
      // 护盾抵挡一次后消失，不能无限抵挡。
      return false;
    }
    // 被击中后必须丢失当前携带的道具。
    this.item = null;
    this.spunOut = true;
    this.spinTimer = 1;
    return true;
  }

  update(dt, world = { targets: [], walls: [] }) {
    if (this.itemUseCooldown > 0) {
      this.itemUseCooldown = Math.max(0, this.itemUseCooldown - dt);
    }
    if (this.spunOut) {
      this.spinTimer -= dt;
      if (this.spinTimer <= 0) {
        this.spunOut = false;
        this.spinTimer = 0;
      }
    }

    this.projectiles = this.projectiles.filter(projectile => {
      projectile.update(dt, world.targets || [], world.walls || []);
      return !projectile.destroyed;
    });
    this.traps = this.traps.filter(trap => {
      trap.update(dt, world.targets || []);
      return !trap.destroyed;
    });

    this.effects.update(dt);
  }
}

module.exports = {
  Kart,
  BASE_MAX_SPEED,
  BASE_ACCELERATION,
  BOOST_DURATION,
  SHIELD_DURATION,
  ITEM_USE_COOLDOWN,
};
