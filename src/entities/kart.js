

class Kart {
  constructor(x, y) {
    this.x=x; this.y=y; this.vx=0; this.vy=0;
    this.maxSpeed=10; this.shielded=false; this.item=null;
    this.effects = new EffectManager(this);
  }
  useItem() {
    if (!this.item) return false;
    this.effects.add(this.item, 3);
    this.item = null;
    return true;
  }
  hit() {
    if (this.effects.hasShield()) {
      // BUG: 护盾不消失
      return false;
    }
    this.item = null;
    return true;
  }
}

module.exports = { Kart };
