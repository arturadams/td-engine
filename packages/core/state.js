// packages/core/state.js
// State now carries a "map" (validated by engine.loadMap)

import { createDefaultMap, cellCenterForMap } from './map.js';
import { makeRng } from './rng.js';
import { Elt, ResistProfiles } from './content.js';

export function createInitialState(seedState) {
    const rng = makeRng(seedState?.seed ?? undefined);
    const map = seedState?.map ?? createDefaultMap();
    return {
        rng,
        seed: rng.seed,
        map,

        gold: 250,
        lives: 20,
        wave: 0,
        spree: 0,
        score: 0,
        combos: 0,
        shots: 0,
        hits: 0,
        paused: false,
        speed: 1,
        autoWaveEnabled: false,
        autoWaveDelay: 1200,
        _autoWaveTimer: -1,

        buildSel: Elt.FIRE,

        towers: [],
        creeps: [],
        bullets: [],
        events: [],
        particles: [],

        // Default creep profiles. Allows override via seedState.creepProfiles
        creepProfiles: seedState?.creepProfiles ?? structuredClone(ResistProfiles),

        selectedTowerId: null,
        hover: { gx: -1, gy: -1, valid: false },

        path: [],

        gameOver: false,
        stats: { leaks: 0, leakedByWave: {}, killsByTower: {}, wavesCleared: 0 },

        startPx: cellCenterForMap(map, map.start.x, map.start.y),
        endPx: cellCenterForMap(map, map.end.x, map.end.y),

        ...seedState,
    };
}

export function resetState(state, keep = {}) {
    const seed = keep.seed ?? state.seed;
    const rng = state.rng;

    Object.assign(state, {
        rng, seed,
        gold: 250, lives: 20, wave: 0, spree: 0, score: 0,
        combos: 0, shots: 0, hits: 0,
        paused: false, speed: 1,
        autoWaveEnabled: keep.autoWaveEnabled ?? false,
        autoWaveDelay: keep.autoWaveDelay ?? 1200, _autoWaveTimer: -1,

        towers: [], creeps: [], bullets: [], events: [], particles: [],
        selectedTowerId: null, hover: { gx: -1, gy: -1, valid: false },
        path: [], gameOver: false,
        stats: { leaks: 0, leakedByWave: {}, killsByTower: {}, wavesCleared: 0 },
    });

    // keep current map (or set via engine.loadMap before calling reset)
    state.startPx = cellCenterForMap(state.map, state.map.start.x, state.map.start.y);
    state.endPx = cellCenterForMap(state.map, state.map.end.x, state.map.end.y);
}
