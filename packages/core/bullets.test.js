import { describe, it, expect, vi } from 'vitest';
import { createEngine } from './engine.js';
import { getEffect } from './effects/index.js';
import { Status } from './content.js';

function makeCreep(id, x, y, prog = 0) {
  return {
    id,
    type: 'Test',
    x,
    y,
    seg: 0,
    t: prog,
    path: [{ x, y }, { x: x + 1, y }],
    speed: 0,
    hp: 10,
    maxhp: 10,
    resist: {},
    status: {},
    gold: 0,
    alive: true,
  };
}

describe('bullets via engine.step', () => {
  it('handles splash AoE damage and removes bullet', () => {
    const engine = createEngine();
    const c1 = makeCreep('c1', 0, 0);
    const c2 = makeCreep('c2', 10, 0);
    engine.state.creeps.push(c1, c2);
    engine.state.bullets.push({
      kind: 'splash',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ttl: 0,
      aoe: 20,
      dmg: 5,
      elt: 'FIRE',
      status: null,
      mod: {},
      fromId: 't1',
      effect: getEffect('FIRE'),
    });
    const dmg = [];
    engine.hook('creepDamage', e => dmg.push(e.amount));
    engine.step(0.1);
    expect(c1.hp).toBe(5);
    expect(c2.hp).toBe(5);
    expect(dmg).toEqual([5, 5]);
    expect(engine.state.bullets.length).toBe(0);
  });

  it('applies status effects from bullets', () => {
    const engine = createEngine();
    const c = makeCreep('c', 0, 0);
    engine.state.creeps.push(c);
    engine.state.bullets.push({
      kind: 'splash',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ttl: 0,
      aoe: 15,
      dmg: 2,
      elt: 'FIRE',
      status: Status.BURN,
      mod: {},
      fromId: 't1',
      effect: getEffect('FIRE'),
    });
    const onDamage = vi.fn();
    engine.hook('creepDamage', onDamage);
    engine.step(0.1);
    expect(c.hp).toBe(8);
    expect(c.status[Status.BURN]).toBeTruthy();
    const [[evt]] = onDamage.mock.calls;
    expect(evt.amount).toBe(2);
    expect(engine.state.bullets.length).toBe(0);
  });

  it('pierces through multiple creeps', () => {
    const engine = createEngine();
    // ensure deterministic hits
    engine.state.rng = () => 0;
    const c1 = makeCreep('c1', 40, 0, 0.5);
    const c2 = makeCreep('c2', 80, 0, 0.1);
    engine.state.creeps.push(c1, c2);
    const t = {
      id: 't',
      x: 0,
      y: 0,
      gx: 0,
      gy: 0,
      elt: 'FIRE',
      range: 200,
      firerate: 1,
      dmg: 10,
      type: 'bolt',
      status: null,
      cooldown: 0,
      mod: { dmg: 0, burn: 0, poison: 0, chill: 0, slowDur: 0, chainBounce: 0, chainRange: 0, stun: 0, aoe: 0, splash: 0, nova: false, resShred: 0, maxStacks: 1, pierce: 1 },
      synergy: 0,
      targeting: 'first',
      _cycleIndex: 0,
    };
    engine.state.towers.push(t);
    const onDamage = vi.fn();
    engine.hook('creepDamage', onDamage);
    engine.step(0.1);
    expect(c1.hp).toBe(0);
    expect(c2.hp).toBeCloseTo(3);
    expect(onDamage.mock.calls.map(c => c[0].amount)).toEqual([10, 7]);
    expect(engine.state.bullets.length).toBe(0);
  });

  it('tracks arc progress and height for arcing bullets', () => {
    const engine = createEngine();
    const b = {
      kind: 'splash',
      x: 0,
      y: 0,
      z: 3,
      baseZ: 3,
      vx: 0,
      vy: 0,
      ttl: 1,
      flightTime: 1,
      arc: { apex: 12, flightTime: 1 },
      aoe: 0,
      dmg: 0,
      elt: 'FIRE',
      status: null,
      mod: {},
      fromId: 't1',
      effect: getEffect('FIRE'),
    };
    engine.state.bullets.push(b);
    engine.step(0.25);
    expect(b.arcProgress).toBeCloseTo(0.25, 2);
    const expectedZ = 3 + 4 * 12 * 0.25 * 0.75;
    expect(b.z).toBeCloseTo(expectedZ, 2);
    expect(engine.state.bullets.length).toBe(1);
  });
});

