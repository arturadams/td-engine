import { describe, it, expect } from 'vitest';
import { mobBehaviors } from './behaviors.js';
import { makeRng } from './rng.js';

// Helper to build a default context for behavior calls
function makeCtx() {
  return { dirx: 1, diry: 0, segLen: 100, rng: makeRng(1) };
}

describe('mobBehaviors', () => {
  it('linear returns base speed without state', () => {
    const creep = { id: 'c1' };
    const ctx = makeCtx();
    const res1 = mobBehaviors.linear(creep, 0.1, ctx);
    expect(res1.speedMul).toBe(1);
    expect(creep.beh).toBeUndefined();
    const res2 = mobBehaviors.linear(creep, 0.1, ctx);
    expect(res2.speedMul).toBe(1);
    expect(creep.beh).toBeUndefined();
  });

  it('zigzag oscillates laterally and tracks phase', () => {
    const creep = { id: 'c2' };
    const ctx = makeCtx();
    const behFn = mobBehaviors.zigzag;
    const res1 = behFn(creep, 0.25, ctx); // phase = 1.5π, sin = -1
    expect(res1.speedMul).toBe(1);
    expect(res1.lateral.x).toBeCloseTo(0);
    expect(res1.lateral.y).toBeCloseTo(-8);
    expect(creep.beh.phase).toBeCloseTo(1.5 * Math.PI);
    const res2 = behFn(creep, 0.25, ctx); // phase = 3π, sin = 0
    expect(res2.lateral.y).toBeCloseTo(0);
    expect(creep.beh.phase).toBeCloseTo(3 * Math.PI);
    const res3 = behFn(creep, 0.25, ctx); // phase = 4.5π, sin = 1
    expect(res3.lateral.y).toBeCloseTo(8);
    expect(creep.beh.phase).toBeCloseTo(4.5 * Math.PI);
  });

  it('dash provides bursts of speed with cooldown', () => {
    const creep = { id: 'c3' };
    const ctx = makeCtx();
    const behFn = mobBehaviors.dash;
    let res = behFn(creep, 0.1, ctx);
    expect(res.speedMul).toBeCloseTo(2.2);
    expect(creep.beh.remaining).toBeCloseTo(0.4);
    expect(creep.beh.cd).toBeCloseTo(4);
    // consume initial dash (extra tick to overcome FP error)
    for (let i = 0; i < 5; i++) res = behFn(creep, 0.1, ctx);
    expect(res.speedMul).toBe(1);
    expect(creep.beh.remaining).toBeCloseTo(0);
    // run through cooldown leaving 0.1s
    for (let i = 0; i < 34; i++) behFn(creep, 0.1, ctx);
    expect(creep.beh.cd).toBeCloseTo(0.1);
    // next tick triggers new dash
    res = behFn(creep, 0.1, ctx);
    expect(res.speedMul).toBeCloseTo(2.2);
    expect(creep.beh.cd).toBeCloseTo(4);
    expect(creep.beh.remaining).toBeCloseTo(0.4);
  });

  it('split sets default split metadata', () => {
    const creep = { id: 'c4', type: 'Foo' };
    const ctx = makeCtx();
    const behFn = mobBehaviors.split;
    const res1 = behFn(creep, 0.1, ctx);
    expect(res1.speedMul).toBe(1);
    expect(creep.beh.split).toEqual({ childType: 'Foo', count: 2, hpScale: 0.45 });
    const prev = creep.beh.split;
    const res2 = behFn(creep, 0.1, ctx);
    expect(res2.speedMul).toBe(1);
    expect(creep.beh.split).toBe(prev); // unchanged on subsequent calls
  });
});

