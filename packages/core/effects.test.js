import { describe, it, expect } from 'vitest';
import { getEffect } from './effects/index.js';

describe('effects', () => {
  it('returns effect object with trail and impact', () => {
    const eff = getEffect('FIRE');
    expect(typeof eff.trail).toBe('function');
    expect(typeof eff.impact).toBe('function');
  });
});
