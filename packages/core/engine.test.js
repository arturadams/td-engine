import { describe, it, expect } from 'vitest';
import { createEngine, Elt } from './engine.js';
import { createDefaultMap, cellCenterForMap } from './map.js';

describe('engine', () => {
  function spawnSimpleCreep(engine) {
    const base = engine.state.creepProfiles.Grunt;
    const start = engine.state.map.start;
    const end = engine.state.map.end;
    const startPx = cellCenterForMap(engine.state.map, start.x, start.y);
    const endPx = cellCenterForMap(engine.state.map, end.x, end.y);
    const creep = {
      id: 'c1',
      type: 'Grunt',
      x: startPx.x,
      y: startPx.y,
      seg: 0,
      t: 0,
      hp: base.hp,
      maxhp: base.hp,
      speed: base.speed,
      resist: { ...base.resist },
      gold: base.gold,
      status: {},
      alive: true,
      path: [startPx, endPx]
    };
    engine.state.creeps.push(creep);
    return creep;
  }

  it('allows tower placement and damages creeps', () => {
    const map = createDefaultMap();
    const engine = createEngine({ map });
    const { start } = engine.state.map;
    const res = engine.placeTower(start.x + 1, start.y, Elt.ARCHER);
    expect(res.ok).toBe(true);
    const creep = spawnSimpleCreep(engine);
    for (let i = 0; i < 200; i++) {
      engine.step(0.05);
    }
    expect(creep.hp).toBeLessThan(creep.maxhp);
  });

  it('reduces lives when creeps leak', () => {
    const map = createDefaultMap();
    const engine = createEngine({ map });
    spawnSimpleCreep(engine);
    for (let i = 0; i < 400; i++) {
      engine.step(0.05);
    }
    expect(engine.state.lives).toBeLessThan(20);
  });
});
