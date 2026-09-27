
const BOOST_MAX_SPEED = 15;
const BOOST_ACCEL_MULTIPLIER = 2;

class EffectManager {
  constructor(kart) {
    this.kart = kart;
    // 每种类型至多保留一个生效中的效果，相同道具刷新持续时间而不是叠加层数。
    this.effects = [];
  }

  add(type, duration) {
    if (!type || !(duration > 0)) return null;

    const existing = this.effects.find(e => e.type === type);
    if (existing) {
      // 相同道具不叠加：仅重置剩余时间（取新持续时间，避免无限刷新成永久效果）。
      existing.duration = duration;
      existing.remaining = duration;
      this.syncState();
      return existing;
    }

    const effect = { type, duration, remaining: duration };
    this.effects.push(effect);
    this.syncState();
    return effect;
  }

  update(dt) {
    const expired = [];
    for (const effect of this.effects) {
      effect.remaining -= dt;
      if (effect.remaining <= 0) expired.push(effect.type);
    }
    if (expired.length > 0) {
      this.effects = this.effects.filter(e => e.remaining > 0);
      // 过期效果统一走清理逻辑，保证属性恢复到基础值，不留永久状态。
      expired.forEach(type => this.cleanup(type));
    }
    this.syncState();
  }

  has(type) {
    return this.effects.some(e => e.type === type);
  }

  hasShield() {
    return this.has('shield');
  }

  remaining(type) {
    const effect = this.effects.find(e => e.type === type);
    return effect ? effect.remaining : 0;
  }

  // 护盾只抵挡一次攻击：抵挡后立即移除该效果。
  consumeShield() {
    if (!this.hasShield()) return false;
    this.effects = this.effects.filter(e => e.type !== 'shield');
    this.cleanup('shield');
    this.syncState();
    return true;
  }

  remove(type) {
    this.effects = this.effects.filter(e => e.type !== type);
    this.cleanup(type);
    this.syncState();
  }

  clear() {
    const types = this.effects.map(e => e.type);
    this.effects = [];
    types.forEach(type => this.cleanup(type));
    this.syncState();
  }

  cleanup(type) {
    const kart = this.kart;
    switch (type) {
      case 'boost':
        // 加速结束：最大速度与加速度恢复原值，不永久篡改。
        kart.maxSpeed = kart.baseMaxSpeed;
        kart.acceleration = kart.baseAcceleration;
        break;
      case 'shield':
        kart.shielded = false;
        break;
      case 'missile':
      case 'banana':
        // 攻击/陷阱是即时道具，不在 EffectManager 中留下持久状态。
        break;
      default:
        break;
    }
  }

  // 每帧依据当前生效集合重算状态：不同道具可以共存，各自只修改自己的属性。
  syncState() {
    const kart = this.kart;
    const boostActive = this.has('boost');
    kart.maxSpeed = boostActive ? BOOST_MAX_SPEED : kart.baseMaxSpeed;
    kart.acceleration = boostActive
      ? kart.baseAcceleration * BOOST_ACCEL_MULTIPLIER
      : kart.baseAcceleration;
    kart.shielded = this.hasShield();
  }
}

module.exports = { EffectManager, BOOST_MAX_SPEED, BOOST_ACCEL_MULTIPLIER };
