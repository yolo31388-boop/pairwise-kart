
class ItemBox {
  constructor(x, y) { this.x=x; this.y=y; this.collected=false; this.respawnTimer=0; this.respawnTime=5; }
  pickup(kart) {
    // BUG: 没有原子检查，同帧多人都能拾取
    if (this.collected) return null;
    this.collected = true;
    this.respawnTimer = this.respawnTime;
    return this.randomItem();
  }
  update(dt) {
    if (this.collected) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.collected = false;
    }
  }
  randomItem() {
    const items = ['boost', 'shield', 'missile', 'banana'];
    return items[Math.floor(Math.random() * items.length)];
  }
}

module.exports = { ItemBox };
