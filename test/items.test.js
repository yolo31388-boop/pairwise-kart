
const { ItemBox } = require('../src/items/itemBox.js');
const { Kart } = require('../src/entities/kart.js');

describe('竞速道具系统', () => {
  test('同帧原子拾取', () => {
    const box = new ItemBox(0, 0);
    const k1 = new Kart(0, 0);
    const k2 = new Kart(0, 0);
    const i1 = box.pickup(k1);
    const i2 = box.pickup(k2);
    expect(i1).not.toBeNull();
    expect(i2).toBeNull();
  });
  test('效果持续时间', () => {
    const kart = new Kart(0, 0);
    kart.item = 'boost';
    kart.useItem();
    kart.effects.update(1);
    expect(kart.maxSpeed).toBe(15);
    kart.effects.update(3);
    expect(kart.maxSpeed).toBe(10);
  });
  test('相同道具不叠加', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('boost', 3);
    kart.effects.add('boost', 3);
    expect(kart.effects.effects.filter(e => e.type === 'boost').length).toBe(1);
  });
  test('被击丢失道具', () => {
    const kart = new Kart(0, 0);
    kart.item = 'missile';
    kart.hit();
    expect(kart.item).toBeNull();
  });
  test('护盾抵挡一次', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('shield', 5);
    expect(kart.hit()).toBe(false);
    expect(kart.effects.hasShield()).toBe(false);
  });
  test('道具盒刷新', () => {
    const box = new ItemBox(0, 0);
    box.pickup(new Kart(0,0));
    expect(box.collected).toBe(true);
    box.update(6);
    expect(box.collected).toBe(false);
  });
  test('加速修改速度', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('boost', 3);
    kart.effects.update(0.1);
    expect(kart.maxSpeed).toBeGreaterThan(10);
  });
  test('使用冷却', () => {
    const kart = new Kart(0, 0);
    kart.item = 'boost';
    expect(kart.useItem()).toBe(true);
    expect(kart.useItem()).toBe(false);
  });
});

const { Missile, BananaTrap } = require('../src/items/weapons.js');
const { BOOST_MAX_SPEED, BOOST_ACCEL_MULTIPLIER } = require('../src/items/effects.js');
const { ITEM_USE_COOLDOWN } = require('../src/entities/kart.js');

describe('竞速道具系统 - 引擎边界不变量', () => {
  test('同帧原子拾取：单帧内多名玩家只有第一人拿到道具', () => {
    const box = new ItemBox(0, 0);
    const karts = [new Kart(0, 0), new Kart(0, 0), new Kart(0, 0), new Kart(0, 0)];
    const results = [];
    // 模拟同一帧 update 内的遍历拾取
    karts.forEach(k => results.push(box.pickup(k)));
    const winners = results.filter(item => item !== null);
    expect(winners).toHaveLength(1);
    expect(box.collected).toBe(true);
    expect(box.respawnTimer).toBe(box.respawnTime);
  });

  test('同帧原子拾取：拾取期间的重入调用不能重复发放', () => {
    const box = new ItemBox(0, 0);
    const kart = new Kart(0, 0);
    const reentrant = [];
    kart.reenter = () => reentrant.push(box.pickup(kart));
    const first = box.pickup(kart);
    kart.reenter();
    expect(first).not.toBeNull();
    expect(reentrant[0]).toBeNull();
    expect(box.isAvailable()).toBe(false);
  });

  test('道具盒刷新：刷新前不可拾取，刷新计时结束后可再次拾取', () => {
    const box = new ItemBox(0, 0);
    const k1 = new Kart(0, 0);
    const k2 = new Kart(0, 0);
    expect(box.pickup(k1)).not.toBeNull();
    box.update(3);
    expect(box.collected).toBe(true);
    expect(box.pickup(k2)).toBeNull();
    box.update(3);
    expect(box.collected).toBe(false);
    expect(box.isAvailable()).toBe(true);
    expect(box.pickup(k2)).not.toBeNull();
  });

  test('效果持续时间与清理：加速结束后最大速度和加速度都恢复原值', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('boost', 2);
    kart.effects.update(1.9);
    expect(kart.maxSpeed).toBe(BOOST_MAX_SPEED);
    expect(kart.acceleration).toBeCloseTo(kart.baseAcceleration * BOOST_ACCEL_MULTIPLIER);
    kart.effects.update(0.2);
    expect(kart.maxSpeed).toBe(kart.baseMaxSpeed);
    expect(kart.acceleration).toBe(kart.baseAcceleration);
    expect(kart.effects.effects).toHaveLength(0);
  });

  test('相同道具不叠加：重复使用只刷新持续时间，层数始终为 1', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('boost', 3);
    kart.effects.update(1);
    kart.effects.add('boost', 3);
    const boosts = kart.effects.effects.filter(e => e.type === 'boost');
    expect(boosts).toHaveLength(1);
    expect(boosts[0].remaining).toBeCloseTo(3);
  });

  test('多道具共存：加速与护盾同时存在且互不影响，各自独立过期', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('boost', 8);
    kart.effects.add('shield', 2);
    expect(kart.effects.effects).toHaveLength(2);
    expect(kart.maxSpeed).toBe(BOOST_MAX_SPEED);
    expect(kart.shielded).toBe(true);
    kart.effects.update(3);
    expect(kart.effects.hasShield()).toBe(false);
    expect(kart.shielded).toBe(false);
    expect(kart.effects.has('boost')).toBe(true);
    expect(kart.maxSpeed).toBe(BOOST_MAX_SPEED);
    kart.effects.update(6);
    expect(kart.maxSpeed).toBe(kart.baseMaxSpeed);
  });

  test('被击丢失道具：被攻击击中的玩家保留不了携带道具并进入失控', () => {
    const kart = new Kart(0, 0);
    kart.item = 'missile';
    const damaged = kart.hit('banana');
    expect(damaged).toBe(true);
    expect(kart.item).toBeNull();
    expect(kart.spunOut).toBe(true);
  });

  test('护盾抵挡一次：抵挡后立即消失，第二次攻击必须造成伤害', () => {
    const kart = new Kart(0, 0);
    kart.item = 'boost';
    kart.effects.add('shield', 5);
    expect(kart.hit('missile')).toBe(false);
    expect(kart.effects.hasShield()).toBe(false);
    expect(kart.shielded).toBe(false);
    expect(kart.item).toBe('boost');
    expect(kart.hit('missile')).toBe(true);
    expect(kart.item).toBeNull();
  });

  test('使用冷却时间：动画/反馈期间即使有新道具也不能再次使用', () => {
    const kart = new Kart(0, 0);
    kart.item = 'boost';
    expect(kart.useItem()).toBe(true);
    kart.item = 'shield';
    expect(kart.useItem()).toBe(false);
    kart.update(ITEM_USE_COOLDOWN / 2, { targets: [], walls: [] });
    expect(kart.useItem()).toBe(false);
    kart.update(ITEM_USE_COOLDOWN / 2 + 0.01, { targets: [], walls: [] });
    expect(kart.useItem()).toBe(true);
  });

  test('攻击命中检测：导弹击中前方敌人并令其丢失道具', () => {
    const attacker = new Kart(0, 0);
    const victim = new Kart(5, 0);
    victim.item = 'banana';
    const missile = new Missile(attacker);
    missile.update(1, [attacker, victim], []);
    expect(missile.hit).toBe(true);
    expect(missile.hitTarget).toBe(victim);
    expect(missile.destroyed).toBe(true);
    expect(victim.item).toBeNull();
  });

  test('攻击命中检测：导弹不能误伤发射者自己', () => {
    const attacker = new Kart(0, 0);
    attacker.item = 'boost';
    const missile = new Missile(attacker);
    missile.update(1, [attacker], []);
    expect(missile.hit).toBe(false);
    expect(missile.hitTarget).toBeNull();
    expect(attacker.item).toBe('boost');
  });

  test('攻击命中检测：导弹被墙体阻挡，不能穿墙命中墙后的敌人', () => {
    const attacker = new Kart(0, 0);
    const victim = new Kart(5, 0);
    victim.item = 'shield';
    const wall = { x: 2, y: -1, width: 1, height: 2 };
    const missile = new Missile(attacker);
    missile.update(1, [victim], [wall]);
    expect(missile.hitWall).toBe(true);
    expect(missile.hitTarget).toBeNull();
    expect(victim.item).toBe('shield');
  });

  test('攻击命中检测：敌人的护盾抵挡导弹后消失且道具保留', () => {
    const attacker = new Kart(0, 0);
    const victim = new Kart(5, 0);
    victim.item = 'banana';
    victim.effects.add('shield', 5);
    const missile = new Missile(attacker);
    const result = missile.update(1, [victim], []);
    expect(result.destroyed).toBe(true);
    expect(missile.hitTarget).toBe(victim);
    expect(victim.effects.hasShield()).toBe(false);
    expect(victim.shielded).toBe(false);
    expect(victim.item).toBe('banana');
  });

  test('陷阱独立逻辑：香蕉被其他玩家触发，但放置者免疫', () => {
    const owner = new Kart(0, 0);
    const victim = new Kart(2, 0);
    victim.item = 'missile';
    const trap = new BananaTrap(owner, 2, 0);
    trap.update(0, [owner, victim]);
    expect(trap.triggered).toBe(true);
    expect(trap.hitTarget).toBe(victim);
    expect(victim.item).toBeNull();

    const owner2 = new Kart(10, 0);
    const ownTrap = new BananaTrap(owner2, 10, 0);
    ownTrap.update(0, [owner2]);
    expect(ownTrap.triggered).toBe(false);
    expect(ownTrap.destroyed).toBe(false);
  });

  test('不同道具类型独立逻辑：四类道具分别走加速/护盾/攻击/陷阱分支', () => {
    const kart = new Kart(0, 0);
    kart.item = 'missile';
    expect(kart.useItem({ targets: [], walls: [] })).toBe(true);
    expect(kart.projectiles).toHaveLength(1);
    expect(kart.traps).toHaveLength(0);

    kart.item = 'banana';
    kart.itemUseCooldown = 0;
    expect(kart.useItem({ targets: [], walls: [] })).toBe(true);
    expect(kart.traps).toHaveLength(1);
    expect(kart.effects.has('boost')).toBe(false);
    expect(kart.effects.hasShield()).toBe(false);

    kart.item = 'boost';
    kart.itemUseCooldown = 0;
    kart.useItem();
    expect(kart.maxSpeed).toBe(BOOST_MAX_SPEED);

    kart.item = 'shield';
    kart.itemUseCooldown = 0;
    kart.useItem();
    expect(kart.effects.hasShield()).toBe(true);
  });

  test('道具效果清理：导弹命中或消失后不留下永久效果，世界实体被回收', () => {
    const attacker = new Kart(0, 0);
    const victim = new Kart(5, 0);
    attacker.item = 'missile';
    attacker.useItem({ targets: [victim], walls: [] });
    expect(attacker.projectiles).toHaveLength(1);
    attacker.update(1, { targets: [victim], walls: [] });
    expect(attacker.projectiles).toHaveLength(0);
    expect(attacker.maxSpeed).toBe(attacker.baseMaxSpeed);
    expect(attacker.shielded).toBe(false);
  });
});
