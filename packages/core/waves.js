// packages/core/waves.js
// Wave configuration + controller (no postfix increments on non-lvalues)

import { cellCenterForMap } from './map.js';
import { astar } from './pathfinding.js';
import { ResistProfiles } from './content.js'; // assumes you export these in content.js
import { uuid } from './rng.js';

// Basic/default wave config; you can replace/extend per-map later
export function waveConfig(n) {
    const packs = [];
    if (n === 1) {
        packs.push({ type: 'Grunt', count: 6, gap: 0.6, hpMul: 0.9 });
    } else if (n === 2) {
        packs.push({ type: 'Grunt', count: 8, gap: 0.55, hpMul: 1.0 });
        packs.push({ type: 'Runner', count: 4, gap: 0.55, hpMul: 1.0 });
    } else if (n === 3) {
        packs.push({ type: 'Grunt', count: 8, gap: 0.5, hpMul: 1.1 });
        packs.push({ type: 'Shield', count: 4, gap: 0.5, hpMul: 1.0 });
    } else if (n % 10 === 0) {
        packs.push({ type: 'Boss', count: 1, gap: 1.0, hpMul: 1 + n * 0.18 });
    } else {
        const diff = 1 + n * 0.07;
        const pool = ['Grunt', 'Runner', 'Tank', 'Shield'];
        for (let i = 0; i < 3; i += 1) {
            const type = pool[(n + i) % pool.length];
            const base = 6 + Math.floor(n * 0.5) + (i === 2 ? 1 : 0);
            packs.push({ type, count: base, gap: 0.5, hpMul: diff * (type === 'Tank' ? 1.35 : 1) });
        }
    }
    return packs;
}

export function createWaveController(state, emitter, isBlocked) {
    let spawning = false;
    let packIndex = 0;
    let spawnedInPack = 0;
    let gapTimer = 0;
    let packs = [];
    let leakedThisWave = 0;
    let killedThisWave = 0;
    let combosThisWave = 0;
    let shots0 = 0;
    let hits0 = 0;

    function isSpawning() { return spawning; }

    function resetSpawner() {
        spawning = false;
        packIndex = 0;
        spawnedInPack = 0;
        gapTimer = 0;
        packs = [];
        leakedThisWave = 0;
        killedThisWave = 0;
        combosThisWave = 0;
        shots0 = 0;
        hits0 = 0;
    }

    function startWave() {
        if (spawning || state.paused || state.gameOver) return false;

        engine.hook('waveStart', ({ wave }) => { /* do stuff if you need */ });
        engine._waveStartInternal(); // call engine’s start-wave logic

        // increment wave with an explicit assignment (no postfix)
        const nextWave = state.wave + 1;
        state.wave = nextWave;

        packs = waveConfig(state.wave);
        packIndex = 0;
        spawnedInPack = 0;
        gapTimer = 0;
        leakedThisWave = 0;
        killedThisWave = 0;
        combosThisWave = 0;
        shots0 = state.shots;
        hits0 = state.hits;

        spawning = true;
        return true;
    }

    function spawnCreep(type, hpMul) {
        const base = ResistProfiles[type];
        const start = state.map.start;
        const end = state.map.end;
        const size = state.map.size;

        // compute path now to initialize creep path (safe if towers change later)
        const p = astar(start, end, isBlocked, size.cols, size.rows) || [start, end];

        const startPx = cellCenterForMap(state.map, start.x, start.y);

        const cr = {
            id: uuid(),
            type,
            x: startPx.x,
            y: startPx.y,
            seg: 0,
            t: 0,
            hp: base.hp * hpMul,
            maxhp: base.hp * hpMul,
            speed: base.speed * (1 + Math.max(0, state.wave - 3) * 0.005),
            resist: { ...base.resist },
            gold: base.gold,
            status: {},
            alive: true,
            path: p.map(n => cellCenterForMap(state.map, n.x, n.y)),
        };
        state.creeps.push(cr);
    }

    function stepSpawner() {
        if (!spawning) return;

        // current pack
        const pack = packs[packIndex];

        if (!pack) {
            // done spawning; wait for field clear to end wave (handled in engine)
            if (state.creeps.length === 0) {
                // compute rewards and end
                const waveGold = Math.floor(5 + state.wave * 1.3 + (state.gold * 0.03));
                state.gold += waveGold;
                if (leakedThisWave === 0) { state.spree = state.spree + 1; } else { state.spree = 0; }
                const accDelta = (state.hits - hits0) / Math.max(1, (state.shots - shots0));
                const waveScore = Math.floor(150 + (killedThisWave * 5) + (combosThisWave * 15) + (state.spree * 40) + (accDelta * 120) + waveGold);
                state.score += waveScore;

                state.stats.wavesCleared = state.stats.wavesCleared + 1;

                spawning = false;
                emitter.emit({ type: 'gold.change', gold: state.gold });
                emitter.emit({ type: 'wave.end', wave: state.wave, reward: waveGold });
            }
            return;
        }

        // spawn at gaps
        if (gapTimer > 0) {
            gapTimer -= state.dt;
            return;
        }

        // still need to spawn in this pack?
        if (spawnedInPack < pack.count) {
            spawnCreep(pack.type, pack.hpMul);
            spawnedInPack += 1;
            gapTimer = pack.gap;
            return;
        }

        // move to next pack after a brief settling gap
        packIndex += 1;
        spawnedInPack = 0;
        gapTimer = 0.1;
    }

    // hook engine callbacks to count leakage/kill/combo
    // engine will call these via closures it maintains (or directly on events)
    emitter.on('creep.leak', () => { leakedThisWave = leakedThisWave + 1; });
    emitter.on('creep.kill', () => { killedThisWave = killedThisWave + 1; });
    emitter.on('combo.trigger', () => { combosThisWave = combosThisWave + 1; });

    return {
        isSpawning,
        startWave,
        stepSpawner,
        resetSpawner,
    };
}
