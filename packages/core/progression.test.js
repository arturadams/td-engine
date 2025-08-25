import { describe, it, expect } from 'vitest';
import { hpMulAtWave, speedMulAtWave, goldForKill, composeWave } from './progression.js';

describe('progression', () => {
  it('scales hp and speed with wave', () => {
    expect(hpMulAtWave(5)).toBeGreaterThan(hpMulAtWave(1));
    expect(speedMulAtWave(10)).toBeGreaterThan(speedMulAtWave(1));
  });

  it('computes gold for kill and composes waves', () => {
    expect(goldForKill('Grunt', 5, 1)).toBeGreaterThan(1);
    const packs = composeWave(1);
    expect(Array.isArray(packs)).toBe(true);
    expect(packs.length).toBeGreaterThan(0);
  });
});
