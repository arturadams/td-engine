import { describe, it, expect } from 'vitest';
import { recomputePathingForAll, advanceCreep, cullDead } from './creeps.js';
import { createDefaultMap, cellCenterForMap } from './map.js';

describe('creeps', () => {
  it('advances along path and can be culled when dead', () => {
    const map = createDefaultMap();
    const state = { map, creeps: [], dt: 0.1, path: [], pathGrid: null, gold: 0, score: 0, particles: [] };
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

  it('reroutes when towers block the direct path', () => {
    const map = createDefaultMap();
    const state = { map, creeps: [], dt: 0.1, path: [], pathGrid: null };
    recomputePathingForAll(state, () => false);
    const blockCell = { x: 1, y: 8 };
    const blockPx = cellCenterForMap(map, blockCell.x, blockCell.y);
    // ensure initial path uses the blocked cell
    expect(state.path.some(p => p.x === blockPx.x && p.y === blockPx.y)).toBe(true);
    const startPx = cellCenterForMap(map, map.start.x, map.start.y);
    const creep = {
      id: 'c', type: 'Grunt', x: startPx.x, y: startPx.y, seg: 0, t: 0,
      path: [...state.path], speed: 100, status: {}, hp: 5, maxhp: 5,
      resist: {}, gold: 1, alive: true
    };
    state.creeps.push(creep);
    recomputePathingForAll(state, (x, y) => x === blockCell.x && y === blockCell.y);
    expect(state.path.some(p => p.x === blockPx.x && p.y === blockPx.y)).toBe(false);
    expect(creep.path.some(p => p.x === blockPx.x && p.y === blockPx.y)).toBe(false);
  });

  it('calls leak callback after multiple ticks', () => {
    const map = createDefaultMap();
    const state = { map, creeps: [], dt: 1, path: [], pathGrid: null };
    const startPx = cellCenterForMap(map, map.start.x, map.start.y);
    const p1 = { x: startPx.x + 10, y: startPx.y };
    const endPx = { x: startPx.x + 20, y: startPx.y };
    const creep = {
      id: 'c', type: 'Grunt', x: startPx.x, y: startPx.y, seg: 0, t: 0,
      path: [startPx, p1, endPx], speed: 5, status: {}, hp: 5, maxhp: 5,
      resist: {}, gold: 1, alive: true
    };
    state.creeps.push(creep);
    let leaks = 0;
    for (let i = 0; i < 10; i++) advanceCreep(state, creep, () => { leaks++; });
    expect(leaks).toBe(1);
    expect(creep.alive).toBe(false);
  });

  it('handles stun and slow status effects', () => {
    const map = createDefaultMap();
    const state = { map, creeps: [], dt: 0.1, path: [], pathGrid: null };
    recomputePathingForAll(state, () => false);
    const startPx = cellCenterForMap(map, map.start.x, map.start.y);
    const endPx = cellCenterForMap(map, map.end.x, map.end.y);
    const creep = {
      id: 'c', type: 'Grunt', x: startPx.x, y: startPx.y, seg: 0, t: 0,
      path: [startPx, endPx], speed: 10,
      status: { stun: 0.1, CHILL: { slow: 0.5, t: 1 } },
      hp: 5, maxhp: 5, resist: {}, gold: 1, alive: true
    };
    state.creeps.push(creep);
    // first tick: stunned, should not move
    advanceCreep(state, creep, () => {});
    expect(creep.x).toBe(startPx.x);
    // second tick: stun expired, move at half speed
    advanceCreep(state, creep, () => {});
    expect(creep.x).toBeCloseTo(startPx.x + 0.5, 1);
  });
});
