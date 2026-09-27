
class EffectManager {
  constructor(kart) { this.kart=kart; this.effects=[]; }
  add(type, duration) {
    // BUG: 相同道具无限叠加
    this.effects.push({type, duration, remaining: duration});
  }
  update(dt) {
    for (const e of this.effects) {
      e.remaining -= dt;
      if (e.type === 'boost') this.kart.maxSpeed = 15;
      if (e.type === 'shield') this.kart.shielded = true;
    }
    // BUG: 结束后不清理状态
    this.effects = this.effects.filter(e => e.remaining > 0);
  }
  hasShield() { return this.effects.some(e => e.type === 'shield'); }
}

module.exports = { EffectManager };
