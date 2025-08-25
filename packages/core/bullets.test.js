import { describe, it, expect } from 'vitest';
import { updateBullets } from './bullets.js';
import { rebuildCreepGrid } from './spatial.js';
import { getEffect } from './effects/index.js';
import { makeRng } from './rng.js';

describe('bullets', () => {
  it('apply damage on impact', () => {
    const creep = { id: 'c', x: 0, y: 0, alive: true, hp: 10, status: {}, resist: {}, gold: 0 };
    const state = {
      rng: makeRng(1),
      dt: 0.1,
      creeps: [creep],
      creepGrid: new Map(),
      creepCellSize: 40,
      bullets: [{
        kind: 'splash', x: 0, y: 0, vx: 0, vy: 0, ttl: 0,
        aoe: 20, dmg: 5, elt: 'FIRE', status: null, mod: {}, fromId: 't1', effect: getEffect('FIRE')
      }],
      particles: [],
      hits: 0
    };
    rebuildCreepGrid(state);
    updateBullets(state, { onCreepDamage: () => {} });
    expect(creep.hp).toBeLessThan(10);
    expect(state.bullets.length).toBe(0);
  });
});
