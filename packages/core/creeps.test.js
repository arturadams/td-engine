import { describe, it, expect } from 'vitest';
import { recomputePathingForAll, advanceCreep, cullDead } from './creeps.js';
import { createDefaultMap, cellCenterForMap } from './map.js';

describe('creeps', () => {
  it('advances along path and can be culled when dead', () => {
    const map = createDefaultMap();
    const state = { map, creeps: [], dt: 0.1, path: [], pathGrid: null, gold: 0, score: 0 };
    recomputePathingForAll(state, () => false);
    const startPx = cellCenterForMap(map, map.start.x, map.start.y);
    const endPx = cellCenterForMap(map, map.end.x, map.end.y);
    const creep = {
      id: 'c', type: 'Grunt', x: startPx.x, y: startPx.y, seg: 0, t: 0,
      path: [startPx, endPx], speed: 100, status: {}, hp: 5, maxhp: 5,
      resist: {}, gold: 1, alive: true
    };
    state.creeps.push(creep);
    advanceCreep(state, creep, () => { state.leaked = true; });
    expect(creep.x).not.toBe(startPx.x);
    creep.hp = 0;
    cullDead(state, {});
    expect(state.creeps.length).toBe(0);
  });
});
