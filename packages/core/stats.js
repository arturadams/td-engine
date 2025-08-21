// packages/core/stats.js
// Unified, event-driven statistics collector for TD engine.

export function createStats(emitter) {
    // ---- canonical store ----------------------------------------------------
    const state = fresh();

    // ---- subscriptions ------------------------------------------------------
    const off = [];

    on('game.reset', () => replace(fresh()));
    on('map.change', () => { /* keep stats; or clear per map if you prefer */ });

    on('wave.start', ({ wave }) => {
        state.meta.lastWaveStartAt = performance.now();
        state.meta.currentWave = wave;
        state.waves[wave] ||= freshWave(wave);
    });

    on('wave.end', ({ wave, reward }) => {
        const w = state.waves[wave] || freshWave(wave);
        w.rewardGold += reward || 0;
        w.durationMs = (w.durationMs || 0) + Math.max(0, performance.now() - (state.meta.lastWaveStartAt || performance.now()));
        state.meta.lastWaveStartAt = null;

        state.totals.wavesCleared = Math.max(state.totals.wavesCleared, wave);
        if (w.leaks > 0) state.meta.leakWaves.add(wave);
    });

    on('life.change', ({ lives, delta }) => {
        if (delta < 0) {
            state.totals.livesLost += Math.abs(delta);
            const curWave = state.meta.currentWave;
            if (curWave) {
                const w = state.waves[curWave] || freshWave(curWave);
                w.leaks += Math.abs(delta);
            }
        }
        state.meta.lastLives = lives;
    });

    on('gold.change', ({ gold, delta }) => {
        if (delta > 0) state.totals.goldEarned += delta;
        if (delta < 0) state.totals.goldSpent += -delta;
        state.meta.lastGold = gold;
    });

    on('tower.place', ({ id, elt, cost, gx, gy }) => {
        ensureTower(id, elt).placedAt = performance.now();
        state.totals.goldSpent += cost || 0;
    });

    on('tower.sell', ({ id, refund }) => {
        const t = state.towers[id];
        if (t) {
            t.soldAt = performance.now();
            t.refund += refund || 0;
        }
        state.totals.goldEarned += refund || 0;
    });

    on('tower.level', ({ id, from, to, cost }) => {
        const t = ensureTower(id);
        t.levelUps += 1;
        t.finalLevel = to;
        state.totals.goldSpent += cost || 0;
    });

    on('tower.evo', ({ id, key }) => {
        const t = ensureTower(id);
        t.evolutions.push(key);
    });

    on('shot', ({ towerId }) => {
        const t = ensureTower(towerId);
        t.shots += 1; state.totals.shots += 1;
    });

    on('hit', ({ towerId }) => {
        const t = ensureTower(towerId);
        t.hits += 1; state.totals.hits += 1;
    });

    on('damage', ({ towerId, elt, creepType, amount }) => {
        const t = ensureTower(towerId, elt);
        t.damage += amount || 0;
        t.damageByElt[elt] = (t.damageByElt[elt] || 0) + (amount || 0);
        state.totals.damage += amount || 0;
        if (creepType) {
            state.damageByCreep[creepType] = (state.damageByCreep[creepType] || 0) + (amount || 0);
        }
    });

    on('creep.spawn', ({ type }) => {
        state.totals.creepsSpawned += 1;
        const w = waveSlot();
        w.creepsSpawned += 1;
        bump(state.creepsByType, type, 1);
    });

    on('creep.kill', ({ type, gold }) => {
        state.totals.creepsKilled += 1;
        const w = waveSlot();
        w.kills += 1;
        bump(state.killsByType, type, 1);
        if (gold) state.totals.goldEarned += gold;
    });

    on('creep.leak', ({ type }) => {
        state.totals.creepsLeaked += 1;
        const w = waveSlot();
        w.leaks += 1;
        bump(state.leaksByType, type, 1);
    });

    on('combo.trigger', () => {
        state.totals.combos += 1;
        const w = waveSlot();
        w.combos += 1;
    });

    // ---- public api ---------------------------------------------------------
    return {
        get raw() { return state; },
        summary() {
            const acc = accuracy(state.totals.hits, state.totals.shots);
            const bestTower = topTower(state.towers, t => t.damage);
            const bestHitRate = topTower(state.towers, t => accuracy(t.hits, t.shots));

            return {
                totals: {
                    wavesCleared: state.totals.wavesCleared,
                    goldEarned: state.totals.goldEarned,
                    goldSpent: state.totals.goldSpent,
                    damage: Math.round(state.totals.damage),
                    creeps: {
                        spawned: state.totals.creepsSpawned,
                        killed: state.totals.creepsKilled,
                        leaked: state.totals.creepsLeaked,
                    },
                    livesLost: state.totals.livesLost,
                    combos: state.totals.combos,
                    accuracy: acc,
                },
                perWave: state.waves,
                perType: {
                    kills: state.killsByType,
                    leaks: state.leaksByType,
                    damage: state.damageByCreep,
                },
                towers: state.towers,
                highlights: {
                    topDamageTower: bestTower?.id || null,
                    topDamageValue: bestTower?.score || 0,
                    topHitRateTower: bestHitRate?.id || null,
                    topHitRate: bestHitRate?.score || 0,
                    leakWaves: Array.from(state.meta.leakWaves).sort((a, b) => a - b),
                },
            };
        },
        dispose() { off.forEach(fn => fn()); off.length = 0; },
    };

    // ---- helpers ------------------------------------------------------------
    function on(type, fn) {
        const unsub = emitter.on(type, fn);
        off.push(unsub);
    }

    function waveSlot() {
        const w = state.meta.currentWave;
        if (!w) return freshWave(0);
        state.waves[w] ||= freshWave(w);
        return state.waves[w];
    }

    function ensureTower(id, elt) {
        state.towers[id] ||= {
            id, elt: elt || null,
            placedAt: 0, soldAt: 0,
            levelUps: 0, finalLevel: 1,
            evolutions: [],
            shots: 0, hits: 0,
            damage: 0,
            damageByElt: {},
            refund: 0,
        };
        if (elt && !state.towers[id].elt) state.towers[id].elt = elt;
        return state.towers[id];
    }

    function bump(obj, key, by) { obj[key] = (obj[key] || 0) + by; }

    function accuracy(h, s) { return s > 0 ? +(100 * h / s).toFixed(1) : 0; }

    function topTower(map, metric) {
        let best = null;
        for (const id in map) {
            const score = metric(map[id]) || 0;
            if (!best || score > best.score) best = { id, score };
        }
        return best;
    }

    function replace(next) {
        Object.keys(state).forEach(k => delete state[k]);
        Object.assign(state, next);
    }

    function fresh() {
        return {
            totals: {
                wavesCleared: 0,
                goldEarned: 0,
                goldSpent: 0,
                damage: 0,
                creepsSpawned: 0,
                creepsKilled: 0,
                creepsLeaked: 0,
                livesLost: 0,
                combos: 0,
                shots: 0,
                hits: 0,
            },
            waves: Object.create(null),          // waveIdx -> {kills, leaks, rewardGold, durationMs, combos, creepsSpawned}
            towers: Object.create(null),         // towerId -> stats
            killsByType: Object.create(null),    // type -> count
            leaksByType: Object.create(null),    // type -> count
            creepsByType: Object.create(null),   // type -> count
            damageByCreep: Object.create(null),  // creep type -> damage
            meta: {
                currentWave: 0,
                lastWaveStartAt: null,
                lastGold: 0,
                lastLives: 0,
                leakWaves: new Set(),
            },
        };
    }

    function freshWave(wave) {
        return { wave, kills: 0, leaks: 0, rewardGold: 0, durationMs: 0, combos: 0, creepsSpawned: 0 };
    }
}
