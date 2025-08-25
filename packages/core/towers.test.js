import { describe, it, expect } from 'vitest';
import { targetInRange } from './towers.js';
import { rebuildCreepGrid } from './spatial.js';

describe('towers targeting', () => {
  it('selects closest creep based on targeting mode', () => {
    const state = { creeps: [], creepGrid: new Map(), creepCellSize: 40 };
    const creepA = { id: 'a', x: 50, y: 0, alive: true, seg: 0, t: 0 };
    const creepB = { id: 'b', x: 150, y: 0, alive: true, seg: 0, t: 0 };
    state.creeps.push(creepA, creepB);
    rebuildCreepGrid(state);
    const tower = { x: 0, y: 0, range: 200, targeting: 'first' };
    const target = targetInRange(state, tower);
    expect(target.id).toBe('b'); // 'first' picks farthest progress
    tower.targeting = 'last';
    const last = targetInRange(state, tower);
    expect(last.id).toBe('a');
  });
});
