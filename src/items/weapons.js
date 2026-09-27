// 攻击类（missile）与陷阱类（banana）道具的独立效果逻辑。

const MISSILE_SPEED = 12;
const MISSILE_RADIUS = 1;

class Missile {
  constructor(owner, options = {}) {
    this.owner = owner;
    this.x = owner.x;
    this.y = owner.y;
    this.speed = options.speed ?? MISSILE_SPEED;
    this.radius = options.radius ?? MISSILE_RADIUS;
    this.hit = false;
    this.hitTarget = null;
    this.hitWall = false;
    this.destroyed = false;
  }

  // 子步进：沿直线路径检测墙体与目标，保证高速移动不会穿墙。
  update(dt, targets = [], walls = []) {
    if (this.destroyed) return this;

    const dirX = Math.cos(this.owner.angle);
    const dirY = Math.sin(this.owner.angle);
    const distance = this.speed * dt;
    const steps = Math.max(1, Math.ceil(distance / (this.radius || MISSILE_RADIUS)));
    const stepDistance = distance / steps;

    for (let i = 0; i < steps && !this.destroyed; i += 1) {
      const startX = this.x;
      const startY = this.y;
      this.x += dirX * stepDistance;
      this.y += dirY * stepDistance;

      // 不能穿墙：行进线段与任意墙体 AABB 相交即命中墙体并销毁。
      if (walls.some(wall => segmentIntersectsBox(startX, startY, this.x, this.y, wall))) {
        this.hitWall = true;
        this.hit = true;
        this.destroyed = true;
        return this;
      }

      // 命中检测：不能误伤自己，目标必须在射程/半径内。
      const victim = targets.find(target =>
        target !== this.owner &&
        target.hitRadius !== 0 &&
        distanceToSegment(target.x, target.y, startX, startY, this.x, this.y) <=
          this.radius + (target.hitRadius ?? 0.8));
      if (victim) {
        this.hitTarget = victim;
        this.hit = true;
        this.destroyed = true;
        // 护盾由被击中方在 hit() 内部判定并消耗，这里只施加攻击。
        victim.hit('missile', this.owner);
        return this;
      }
    }
    return this;
  }
}

class BananaTrap {
  constructor(owner, x, y, options = {}) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.radius = options.radius ?? 1;
    this.triggered = false;
    this.hitTarget = null;
    this.destroyed = false;
  }

  update(_dt, targets = []) {
    if (this.destroyed) return this;
    // 陷阱静止触发：任何非放置者进入半径范围即被击中，放置者免疫，不会误伤自己。
    const victim = targets.find(target =>
      target !== this.owner &&
      target.hitRadius !== 0 &&
      Math.hypot(target.x - this.x, target.y - this.y) <= this.radius + (target.hitRadius ?? 0.8));
    if (victim) {
      this.triggered = true;
      this.hitTarget = victim;
      this.destroyed = true;
      victim.hit('banana', this.owner);
    }
    return this;
  }
}

function segmentIntersectsBox(x1, y1, x2, y2, box) {
  const minX = box.x;
  const minY = box.y;
  const maxX = box.x + box.width;
  const maxY = box.y + box.height;

  if (pointInBox(x1, y1, box) || pointInBox(x2, y2, box)) return true;

  return (
    segmentsIntersect(x1, y1, x2, y2, minX, minY, maxX, minY) ||
    segmentsIntersect(x1, y1, x2, y2, maxX, minY, maxX, maxY) ||
    segmentsIntersect(x1, y1, x2, y2, maxX, maxY, minX, maxY) ||
    segmentsIntersect(x1, y1, x2, y2, minX, maxY, minX, minY)
  );
}

function pointInBox(x, y, box) {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

module.exports = { Missile, BananaTrap, MISSILE_SPEED, segmentIntersectsBox };
