const { ItemBox } = require('../src/items/itemBox.js');
const { Kart } = require('../src/entities/kart.js');
const { EffectManager } = require('../src/items/effects.js');

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

  test('同帧多名玩家只有第一人能拾取', () => {
    const box = new ItemBox(1, 1);
    const karts = [new Kart(1, 1), new Kart(1, 1), new Kart(1, 1)];
    const results = karts.map(k => box.pickup(k));
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
    expect(results[2]).toBeNull();
    expect(box.collected).toBe(true);
    expect(box.respawnTimer).toBe(box.respawnTime);
  });

  test('效果在持续时间结束的边界正确清理', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('boost', 3);
    kart.effects.update(2.9);
    expect(kart.effects.effects).toHaveLength(1);
    expect(kart.maxSpeed).toBe(15);
    kart.effects.update(0.2);
    expect(kart.effects.effects).toHaveLength(0);
    expect(kart.maxSpeed).toBe(10);
    expect(kart.acceleration).toBe(5);
  });

  test('相同道具刷新持续时间而不是新增实例', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('boost', 3);
    kart.effects.update(2);
    kart.effects.add('boost', 3);
    expect(kart.effects.effects).toHaveLength(1);
    expect(kart.effects.effects[0].remaining).toBeGreaterThan(2.5);
    expect(kart.maxSpeed).toBe(15);
  });

  test('无护盾被击丢失道具但已有效果继续存在', () => {
    const kart = new Kart(0, 0);
    kart.item = 'banana';
    kart.effects.add('boost', 3);
    expect(kart.hit()).toBe(true);
    expect(kart.item).toBeNull();
    expect(kart.hitCount).toBe(1);
    expect(kart.effects.has('boost')).toBe(true);
  });

  test('道具盒刷新期间不可拾取且刷新后可再次拾取', () => {
    const box = new ItemBox(0, 0);
    const k1 = new Kart(0, 0);
    const k2 = new Kart(0, 0);
    expect(box.pickup(k1)).not.toBeNull();
    box.update(3);
    expect(box.collected).toBe(true);
    expect(box.pickup(k2)).toBeNull();
    box.update(3);
    expect(box.collected).toBe(false);
    expect(box.respawnTimer).toBe(0);
    expect(box.pickup(k2)).not.toBeNull();
  });

  test('四类道具拥有彼此独立的效果逻辑', () => {
    const kart = new Kart(0, 0);
    kart.item = 'boost';
    kart.useItem();
    expect(kart.maxSpeed).toBe(15);
    expect(kart.shielded).toBe(false);
    expect(kart.projectiles).toHaveLength(0);
    expect(kart.traps).toHaveLength(0);

    const attacker = new Kart(0, 0);
    attacker.item = 'missile';
    attacker.useItem();
    expect(attacker.projectiles).toHaveLength(1);
    expect(attacker.shielded).toBe(false);
    expect(attacker.maxSpeed).toBe(10);

    const trapper = new Kart(0, 0);
    trapper.item = 'banana';
    trapper.useItem();
    expect(trapper.traps).toHaveLength(1);

    const defender = new Kart(0, 0);
    defender.item = 'shield';
    defender.useItem();
    expect(defender.shielded).toBe(true);
    expect(defender.maxSpeed).toBe(10);
  });

  test('导弹命中前方玩家并在命中后消失', () => {
    const attacker = new Kart(0, 0);
    const target = new Kart(8, 0);
    target.item = 'banana';
    attacker.vx = 10;
    attacker.item = 'missile';
    attacker.useItem();
    for (let i = 0; i < 8; i++) attacker.update(0.1, [attacker, target]);
    expect(target.hitCount).toBe(1);
    expect(target.item).toBeNull();
    expect(attacker.projectiles).toHaveLength(0);
  });

  test('导弹被墙阻挡不能穿墙命中', () => {
    const world = { walls: [{ x: 4, y: -1, width: 1, height: 2 }] };
    const attacker = new Kart(0, 0, world);
    const target = new Kart(10, 0, world);
    target.item = 'banana';
    attacker.vx = 10;
    attacker.item = 'missile';
    attacker.useItem();
    for (let i = 0; i < 10; i++) attacker.update(0.1, [attacker, target]);
    expect(attacker.projectiles).toHaveLength(0);
    expect(target.hitCount).toBe(0);
    expect(target.item).not.toBeNull();
  });

  test('导弹不会误伤发射者自己', () => {
    const attacker = new Kart(0, 0);
    attacker.vx = 10;
    attacker.item = 'missile';
    attacker.useItem();
    for (let i = 0; i < 40; i++) attacker.update(0.1, [attacker]);
    expect(attacker.hitCount).toBe(0);
    expect(attacker.shielded).toBe(false);
  });

  test('护盾只抵挡一次攻击，第二次攻击正常生效', () => {
    const kart = new Kart(0, 0);
    kart.item = 'banana';
    kart.effects.add('shield', 5);
    expect(kart.hit()).toBe(false);
    expect(kart.effects.hasShield()).toBe(false);
    expect(kart.shielded).toBe(false);
    expect(kart.item).toBe('banana');
    expect(kart.hit()).toBe(true);
    expect(kart.item).toBeNull();
  });

  test('加速同时修改最大速度与加速度并在结束后恢复', () => {
    const kart = new Kart(0, 0);
    expect(kart.maxSpeed).toBe(10);
    expect(kart.acceleration).toBe(5);
    kart.effects.add('boost', 3);
    kart.effects.update(0.1);
    expect(kart.maxSpeed).toBe(15);
    expect(kart.acceleration).toBe(7.5);
    kart.effects.update(3);
    expect(kart.maxSpeed).toBe(10);
    expect(kart.acceleration).toBe(5);
  });

  test('道具使用有冷却时间，冷却结束后才能再次使用', () => {
    const kart = new Kart(0, 0);
    kart.item = 'boost';
    expect(kart.useItem()).toBe(true);
    expect(kart.useCooldown).toBeGreaterThan(0);
    kart.item = 'banana';
    expect(kart.useItem()).toBe(false);
    expect(kart.item).toBe('banana');
    kart.update(0.5, [kart]);
    expect(kart.useCooldown).toBe(0);
    expect(kart.useItem()).toBe(true);
  });

  test('过期效果与手动清理都会还原玩家状态', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('shield', 1);
    kart.effects.update(1);
    expect(kart.effects.effects).toHaveLength(0);
    expect(kart.shielded).toBe(false);

    kart.effects.add('boost', 3);
    kart.effects.add('shield', 3);
    expect(kart.effects.effects).toHaveLength(2);
    kart.effects.clear();
    expect(kart.effects.effects).toHaveLength(0);
    expect(kart.maxSpeed).toBe(10);
    expect(kart.acceleration).toBe(5);
    expect(kart.shielded).toBe(false);
  });

  test('不同道具效果可以共存且独立到期', () => {
    const kart = new Kart(0, 0);
    kart.effects.add('boost', 3);
    kart.effects.add('shield', 5);
    expect(kart.effects.effects).toHaveLength(2);
    expect(kart.maxSpeed).toBe(15);
    expect(kart.shielded).toBe(true);
    kart.effects.update(3);
    expect(kart.effects.has('boost')).toBe(false);
    expect(kart.effects.has('shield')).toBe(true);
    expect(kart.maxSpeed).toBe(10);
    expect(kart.shielded).toBe(true);
    kart.effects.update(3);
    expect(kart.effects.effects).toHaveLength(0);
    expect(kart.shielded).toBe(false);
  });

  test('香蕉陷阱不影响放置者但会击中其他玩家', () => {
    const owner = new Kart(0, 0);
    const victim = new Kart(0.5, 0);
    victim.item = 'missile';
    owner.item = 'banana';
    owner.useItem();
    owner.update(0.1, [owner, victim]);
    expect(owner.hitCount).toBe(0);
    expect(victim.hitCount).toBe(1);
    expect(victim.item).toBeNull();
    expect(owner.traps).toHaveLength(0);
  });

  test('EffectManager 可独立查询护盾状态', () => {
    const manager = new EffectManager({ shielded: false });
    expect(manager.hasShield()).toBe(false);
    manager.add('shield', 2);
    expect(manager.hasShield()).toBe(true);
    expect(manager.consumeShield()).toBe(true);
    expect(manager.hasShield()).toBe(false);
    expect(manager.consumeShield()).toBe(false);
  });
});
