import { describe, it, expect } from 'vitest';
import { createEngine, Elt } from './engine.js';
import { COST, REFUND_RATE, UPG_COST, TILE } from './content.js';
import { cellCenterForMap } from './map.js';

const narrowMap = {
  id: 'narrow',
  name: 'narrow',
  size: { cols: 3, rows: 3 },
  start: { x: 0, y: 1 },
  end: { x: 2, y: 1 },
  blocked: [ { x: 1, y: 0 }, { x: 1, y: 2 } ],
  buildableMask: null,
  rules: {
    allowElements: ['FIRE','POISON','ARCHER'],
    maxWaves: 0,
    autoWaveDefault: false,
    speedCaps: [1,2,4],
    disableEvolutions: false,
    upgradeCredits: [2,4,6],
  },
  waves: {
    mode: 'procedural',
    authored: null,
    scaling: { hp: 'linear(0.07)', speed: 'flat(0.005)', gold: 'interest(0.03)' }
  }
};

function spawnTestCreep(engine) {
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

describe('engine integration', () => {
  it('enforces placement rules for path blocking and occupied tiles', () => {
    const engine = createEngine({ map: narrowMap });
    const res = engine.placeTower(1,1,Elt.ARCHER);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('blocks_path');

    const creep = spawnTestCreep(engine);
    creep.x = 0 * TILE + TILE/2;
    creep.y = 0 * TILE + TILE/2;
    const res2 = engine.placeTower(0,0,Elt.ARCHER);
    expect(res2.ok).toBe(false);
    expect(res2.reason).toBe('occupied_by_creep');
  });

  it('sells towers and refunds gold', () => {
    const engine = createEngine({ map: narrowMap });
    const goldStart = engine.state.gold;
    const { tower } = engine.placeTower(0,0,Elt.ARCHER);
    const goldAfterPlace = engine.state.gold;
    engine.sellTower(tower.id);
    const expected = goldStart - COST[Elt.ARCHER] + Math.floor(COST[Elt.ARCHER]*REFUND_RATE.basic);
    expect(engine.state.gold).toBe(expected);
    expect(engine.state.gold).toBeGreaterThan(goldAfterPlace);
  });

  it('levels up towers consuming gold', () => {
    const engine = createEngine({ map: narrowMap });
    engine.placeTower(0,0,Elt.ARCHER);
    const tower = engine.selectTowerAt(0,0);
    const cost = UPG_COST(tower.lvl, tower.elt);
    const goldBefore = engine.state.gold;
    const ok = engine.levelUpSelected();
    expect(ok).toBe(true);
    expect(tower.lvl).toBe(2);
    expect(engine.state.gold).toBe(goldBefore - cost);
  });

  it('handles combo interactions and deterministic RNG', () => {
    const engine1 = createEngine({ map: narrowMap, seed: 123 });
    const engine2 = createEngine({ map: narrowMap, seed: 123 });
    const r1 = engine1.state.rng.int(0,100);
    const r2 = engine2.state.rng.int(0,100);
    expect(r1).toBe(r2);

    const comboEngine = createEngine({ map: narrowMap, seed: 555 });
    comboEngine.placeTower(0,0,Elt.FIRE);
    comboEngine.placeTower(0,2,Elt.POISON);
    const creep = spawnTestCreep(comboEngine);
    for (let i=0;i<200;i++) comboEngine.step(0.05);
    expect(creep.status.combo_acid).toBeDefined();
  });
});
