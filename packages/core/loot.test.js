import { describe, it, expect } from 'vitest';
import { lootTables, weightedPick } from './loot.js';
import { makeRng } from './rng.js';

describe('loot', () => {
  it('picks entries deterministically', () => {
    const rngA = makeRng(1);
    const rngB = makeRng(1);
    const pickA = weightedPick(lootTables.common, rngA);
    const pickB = weightedPick(lootTables.common, rngB);
    expect(pickA.id).toBe(pickB.id);
  });
});
