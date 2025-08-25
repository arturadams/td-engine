import { describe, it, expect } from 'vitest';
import { buildHudSnapshot } from './selectors.js';
import { Elt } from './content.js';

describe('selectors', () => {
  it('builds HUD snapshot', () => {
    const state = { gold: 100, lives: 20, wave: 1, spree: 0, score: 0, hits: 0, shots: 0, speed: 1, buildSel: Elt.FIRE };
    const hud = buildHudSnapshot(state);
    expect(hud.gold).toBe(100);
    expect(hud.canAfford(Elt.FIRE)).toBe(true);
  });
});
