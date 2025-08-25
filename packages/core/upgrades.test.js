import { describe, it, expect } from 'vitest';
import { upgradePools } from './upgrades.js';

describe('upgrades', () => {
  it('applies upgrade effects', () => {
    const tower = { range: 100, firerate: 1, dmg: 10, mod: {} };
    const upg = upgradePools.any[0];
    upg.apply(tower);
    expect(tower.range).toBeGreaterThan(100);
  });
});
