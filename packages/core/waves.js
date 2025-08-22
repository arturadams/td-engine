// packages/core/waves.js
// Pure wave controller — no emitter. Consumers inject side-effects.

export function defaultWaveConfig(n) {
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
        for (let i = 0; i < 3; i++) {
            const type = pool[(n + i) % pool.length];
            const count = 6 + Math.floor(n * 0.5) + (i === 2 ? 1 : 0);
            packs.push({ type, count, gap: 0.5, hpMul: diff * (type === 'Tank' ? 1.35 : 1) });
        }
    }
    return packs;
}

/**
 * createWaveController(state, deps)
 *
 * deps:
 * - getWavePacks(n): Pack[]                     // returns packs for wave n
 * - spawnCreep(type, hpMul): void               // creates & pushes creep, fires your creepSpawn hook
 * - onWaveStart(): void                         // fires waveStart hook
 * - onWaveEnd(reward): void                     // fires waveEnd hook
 * - awardWaveGold(amount): void                 // adds gold & fires goldChange hook
 */
export function createWaveController(state, deps) {
    const {
        getWavePacks = defaultWaveConfig,
        spawnCreep,
        onWaveStart,
        onWaveEnd,
        awardWaveGold,
    } = deps;

    // internal wave spawn state
    let spawning = false;
    let packs = [];
    let packIndex = 0;
    let spawnedInPack = 0;
    let timer = 0;

    function startWave() {
        if (spawning) return false;
        state.wave += 1;
        packs = getWavePacks(state.wave) || [];
        packIndex = 0;
        spawnedInPack = 0;
        timer = 0;
        spawning = true;
        onWaveStart && onWaveStart();
        return true;
    }

    function isSpawning() {
        return spawning;
    }

    function stepSpawner(dtSec) {
        if (!spawning) return;

        // advance current pack/timer
        if (packIndex < packs.length) {
            const pack = packs[packIndex];
            timer -= dtSec;
            if (timer <= 0 && spawnedInPack < pack.count) {
                spawnCreep && spawnCreep(pack.type, pack.hpMul || 1);
                spawnedInPack += 1;
                timer = pack.gap || 0.5;
            }
            // move to next pack when done & a small grace
            if (spawnedInPack >= pack.count && timer < -0.1) {
                packIndex += 1;
                spawnedInPack = 0;
                timer = 0;
            }
        }

        // if all packs enqueued AND there are no creeps left alive → wave end
        if (packIndex >= packs.length && state.creeps.length === 0) {
            spawning = false;

            // calculate a simple wave reward (same formula you used before)
            const reward = Math.floor(5 + state.wave * 1.3 + (state.gold * 0.03));
            awardWaveGold && awardWaveGold(reward);
            onWaveEnd && onWaveEnd(reward);
        }
    }

    function resetSpawner() {
        spawning = false;
        packs = [];
        packIndex = 0;
        spawnedInPack = 0;
        timer = 0;
    }

    return { startWave, isSpawning, stepSpawner, resetSpawner };
}
