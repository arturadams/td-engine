import { describe, it, expect } from 'vitest';
import { upgradePools } from './upgrades.js';
import { makeRng } from './rng.js';

function weightedPick(pool, rng) {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return pool[pool.length - 1];
}

describe('upgrades', () => {
  it('applies upgrade effects', () => {
    const tower = { range: 100, firerate: 1, dmg: 10, mod: {} };
    const upg = upgradePools.any[0];
    upg.apply(tower);
    expect(tower.range).toBeGreaterThan(100);
  });

  it('selects upgrades deterministically with seeded rng', () => {
    const rngA = makeRng(123);
    const rngB = makeRng(123);
    const pickA = weightedPick(upgradePools.any, rngA);
    const pickB = weightedPick(upgradePools.any, rngB);
    expect(pickA.key).toBe(pickB.key);
  });

  it('applies element-specific modifiers', () => {
    const tower = { range: 100, firerate: 1, dmg: 10, mod: { burn: 0 } };
    const rng = makeRng(7);
    const upg = weightedPick(upgradePools.FIRE, rng);
    upg.apply(tower);
    expect(tower.mod.burn).toBeCloseTo(0.4);
  });
});
