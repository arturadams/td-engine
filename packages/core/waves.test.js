import { describe, it, expect } from 'vitest';
import { createWaveController, defaultWaveConfig } from './waves.js';

describe('waves', () => {
  it('spawns creeps when stepping spawner', () => {
    const state = { wave: 0, creeps: [], gold: 0 };
    let spawned = 0;
    const ctrl = createWaveController(state, {
      getWavePacks: defaultWaveConfig,
      spawnCreep: () => { spawned++; },
      onWaveStart: () => {},
      onWaveEnd: () => {},
      awardWaveGold: () => {}
    });
    expect(ctrl.startWave()).toBe(true);
    for (let i = 0; i < 20; i++) ctrl.stepSpawner(1);
    expect(spawned).toBeGreaterThan(0);
  });
});
