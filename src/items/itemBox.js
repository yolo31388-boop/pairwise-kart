const ITEMS = ['boost', 'shield', 'missile', 'banana'];

class ItemBox {
  constructor(x, y, respawnTime = 5) {
    this.x = x;
    this.y = y;
    this.collected = false;
    this.respawnTimer = 0;
    this.respawnTime = respawnTime;
  }

  pickup(kart) {
    if (this.collected) return null;
    if (!kart) return null;
    this.collected = true;
    this.respawnTimer = this.respawnTime;
    return this.randomItem();
  }

  update(dt) {
    if (!this.collected) return;
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawnTimer = 0;
      this.collected = false;
    }
  }

  randomItem() {
    return ITEMS[Math.floor(Math.random() * ITEMS.length)];
  }
}

module.exports = { ItemBox, ITEMS };
