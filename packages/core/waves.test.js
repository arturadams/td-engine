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

  it('handles rewards and boss waves and ends when creeps die', () => {
    const state = { wave: 0, creeps: [], gold: 0 };
    const spawnedTypes = [];
    const waveRewards = [];
    const ctrl = createWaveController(state, {
      getWavePacks: defaultWaveConfig,
      spawnCreep: (type) => {
        spawnedTypes.push(type);
        state.creeps.push({});
      },
      onWaveStart: () => {},
      onWaveEnd: (reward) => waveRewards.push(reward),
      awardWaveGold: (amount) => {
        state.gold += amount;
      }
    });

    // --- wave 1 ---
    expect(ctrl.startWave()).toBe(true);
    while (spawnedTypes.length < 6) ctrl.stepSpawner(1);
    // ensure not finished while creeps remain
    ctrl.stepSpawner(1);
    expect(waveRewards.length).toBe(0);
    // all creeps die
    state.creeps.length = 0;
    ctrl.stepSpawner(1);
    expect(waveRewards).toEqual([6]);

    // --- wave 10 (boss) ---
    state.wave = 9; // simulate advancing to wave 9
    spawnedTypes.length = 0;
    expect(ctrl.startWave()).toBe(true);
    while (spawnedTypes.length < 1) ctrl.stepSpawner(1);
    ctrl.stepSpawner(1); // grace step
    expect(spawnedTypes).toEqual(['Boss']);
    state.creeps.length = 0;
    ctrl.stepSpawner(1);
    expect(waveRewards).toEqual([6, 18]);
    expect(state.gold).toBe(24);
  });

  it('tracks pack transitions and can reset spawner', () => {
    const state = { wave: 1, creeps: [], gold: 0 };
    const types = [];
    const ctrl = createWaveController(state, {
      getWavePacks: defaultWaveConfig,
      spawnCreep: (type) => types.push(type),
      onWaveStart: () => {},
      onWaveEnd: () => {},
      awardWaveGold: () => {}
    });

    expect(ctrl.startWave()).toBe(true); // wave 2 -> Grunts then Runners
    for (let i = 0; i < 20; i++) ctrl.stepSpawner(1);
    expect(types.slice(0, 8).every((t) => t === 'Grunt')).toBe(true);
    expect(types.slice(8)).toEqual(Array(4).fill('Runner'));

    ctrl.resetSpawner();
    types.length = 0;
    // step without starting again should spawn nothing
    ctrl.stepSpawner(1);
    expect(types.length).toBe(0);
    // restart same wave number
    state.wave = 1;
    expect(ctrl.startWave()).toBe(true);
    ctrl.stepSpawner(1);
    expect(types[0]).toBe('Grunt');
  });
});
