
const DEFAULT_ITEM_POOL = ['boost', 'shield', 'missile', 'banana'];
const DEFAULT_RESPAWN_TIME = 5;

const STATE_ACTIVE = 'active';
const STATE_TAKEN = 'taken';

class ItemBox {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.respawnTime = options.respawnTime ?? DEFAULT_RESPAWN_TIME;
    this.itemPool = options.itemPool ? options.itemPool.slice() : DEFAULT_ITEM_POOL.slice();
    this.rng = options.rng ?? Math.random;

    this.state = STATE_ACTIVE;
    this.collected = false;
    this.respawnTimer = 0;
    this.lastPickedBy = null;
  }

  pickup(kart) {
    // 原子 check-and-claim：先完成 active -> taken 的状态转移，再发放道具。
    // JS 单线程内状态翻转与返回之间不会插入其他拾取，因此同一帧内后续的
    // 玩家（包括重入调用）只会看到 taken 状态，拿到 null。
    if (this.state !== STATE_ACTIVE || this.collected || this.respawnTimer > 0) {
      return null;
    }
    this.state = STATE_TAKEN;
    this.collected = true;
    this.respawnTimer = this.respawnTime;
    this.lastPickedBy = kart ?? null;
    return this.rollItem();
  }

  update(dt) {
    if (this.state !== STATE_TAKEN) return;
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) this.respawn();
  }

  respawn() {
    this.respawnTimer = 0;
    this.collected = false;
    this.state = STATE_ACTIVE;
    this.lastPickedBy = null;
  }

  isAvailable() {
    return this.state === STATE_ACTIVE && !this.collected && this.respawnTimer <= 0;
  }

  rollItem() {
    const pool = this.itemPool;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  randomItem() {
    return this.rollItem();
  }
}

module.exports = { ItemBox, DEFAULT_ITEM_POOL, DEFAULT_RESPAWN_TIME, STATE_ACTIVE, STATE_TAKEN };
