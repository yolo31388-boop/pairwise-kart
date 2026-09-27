
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
