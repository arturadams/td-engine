// packages/core/stats.js
export function attachStats(engine, { waveCap = 50 } = {}) {
    const stats = fresh();
    const off = [];

    // helper to attach and collect unsub
    const on = (name, fn) => off.push(engine.hook(name, fn));

    on('waveStart', ({ wave }) => {
        stats.meta.currentWave = wave;
        stats.meta.lastWaveStartAt = performance.now();
        stats.waves[wave] ||= freshWave(wave);
    });

    on('waveEnd', ({ wave, reward }) => {
        const w = stats.waves[wave] || freshWave(wave);
        w.rewardGold += reward || 0;
        w.durationMs = (w.durationMs || 0) + Math.max(0, performance.now() - (stats.meta.lastWaveStartAt || performance.now()));
        stats.totals.wavesCleared = Math.max(stats.totals.wavesCleared, wave);
        stats.meta.lastWaveStartAt = null;
        if (w.leaks > 0) stats.meta.leakWaves.add(wave);
        prune();
    });

    on('lifeChange', ({ lives, delta }) => {
        if (delta < 0) {
            stats.totals.livesLost += -delta;
            const w = waveSlot(); w.leaks += -delta;
        }
        stats.meta.lastLives = lives;
    });

    on('goldChange', ({ gold, delta }) => {
        if (delta > 0) stats.totals.goldEarned += delta;
        if (delta < 0) stats.totals.goldSpent += -delta;
        stats.meta.lastGold = gold;
    });

    on('towerPlace', ({ id, elt, cost }) => {
        const t = ensureTower(id, elt);
        t.placedAt = performance.now();
        t.cost = cost || 0;
        stats.totals.goldSpent += cost || 0;
    });

    on('towerSell', ({ id, refund }) => {
        const t = ensureTower(id);
        t.soldAt = performance.now();
        t.refund += refund || 0;
        stats.totals.goldEarned += refund || 0;
    });

    on('towerLevel', ({ id, from, to, cost }) => {
        const t = ensureTower(id);
        t.levelUps += 1; t.finalLevel = to;
        stats.totals.goldSpent += cost || 0;
    });

    on('towerEvo', ({ id, key }) => {
        const t = ensureTower(id);
        t.evolutions.push(key);
    });

    on('shot', ({ towerId }) => { ensureTower(towerId).shots += 1; stats.totals.shots += 1; });
    on('hit', ({ towerId }) => { ensureTower(towerId).hits += 1; stats.totals.hits += 1; });

    on('creepSpawn', ({ type }) => {
        stats.totals.creepsSpawned += 1;
        const w = waveSlot(); w.creepsSpawned += 1;
        bump(stats.creepsByType, type, 1);
    });

    on('creepKill', ({ type, gold }) => {
        stats.totals.creepsKilled += 1;
        const w = waveSlot(); w.kills += 1;
        bump(stats.killsByType, type, 1);
        if (gold) stats.totals.goldEarned += gold;
    });

    on('creepLeak', ({ type }) => {
        stats.totals.creepsLeaked += 1;
        const w = waveSlot(); w.leaks += 1;
        bump(stats.leaksByType, type, 1);
    });

    on('creepDamage', ({ towerId, elt, creepType, amount }) => {
        const t = ensureTower(towerId, elt);
        t.damage += amount || 0;
        t.damageByElt[elt] = (t.damageByElt[elt] || 0) + (amount || 0);
        stats.totals.damage += amount || 0;
        if (creepType) bump(stats.damageByCreep, creepType, amount || 0);
    });

    // public
    return {
        raw: stats,
        summary() {
            const bestDamage = top(stats.towers, t => t.damage);
            const bestHit = top(stats.towers, t => acc(t.hits, t.shots));
            return {
                totals: {
                    wavesCleared: stats.totals.wavesCleared,
                    goldEarned: stats.totals.goldEarned,
                    goldSpent: stats.totals.goldSpent,
                    damage: Math.round(stats.totals.damage),
                    creeps: {
                        spawned: stats.totals.creepsSpawned,
                        killed: stats.totals.creepsKilled,
                        leaked: stats.totals.creepsLeaked,
                    },
                    livesLost: stats.totals.livesLost,
                    combos: stats.totals.combos || 0,
                    accuracy: acc(stats.totals.hits, stats.totals.shots),
                },
                perWave: stats.waves,
                pruned: stats.meta.pruned,
                perType: {
                    kills: stats.killsByType,
                    leaks: stats.leaksByType,
                    damage: stats.damageByCreep,
                },
                towers: stats.towers,
                highlights: {
                    topDamageTower: bestDamage?.id || null,
                    topDamageValue: bestDamage?.score || 0,
                    topHitRateTower: bestHit?.id || null,
                    topHitRate: bestHit?.score || 0,
                    leakWaves: Array.from(stats.meta.leakWaves).sort((a, b) => a - b),
                }
            };
        },
        dispose() {
            off.forEach(fn => fn());
            off.length = 0;
            stats.waves = Object.create(null);
            stats.towers = Object.create(null);
            stats.killsByType = Object.create(null);
            stats.leaksByType = Object.create(null);
            stats.creepsByType = Object.create(null);
            stats.damageByCreep = Object.create(null);
            stats.meta.leakWaves.clear();
            stats.meta.pruned = { count: 0, kills: 0, leaks: 0, rewardGold: 0, durationMs: 0, combos: 0, creepsSpawned: 0 };
        },
    };

    // ---- helpers
    function fresh() {
        return {
            totals: {
                wavesCleared: 0, goldEarned: 0, goldSpent: 0,
                damage: 0, creepsSpawned: 0, creepsKilled: 0, creepsLeaked: 0,
                livesLost: 0, combos: 0, shots: 0, hits: 0,
            },
            waves: Object.create(null),
            towers: Object.create(null),
            killsByType: Object.create(null),
            leaksByType: Object.create(null),
            creepsByType: Object.create(null),
            damageByCreep: Object.create(null),
            meta: {
                currentWave: 0,
                lastWaveStartAt: null,
                lastGold: 0,
                lastLives: 0,
                leakWaves: new Set(),
                pruned: { count: 0, kills: 0, leaks: 0, rewardGold: 0, durationMs: 0, combos: 0, creepsSpawned: 0 }
            },
        };
    }
    function freshWave(wave) { return { wave, kills: 0, leaks: 0, rewardGold: 0, durationMs: 0, combos: 0, creepsSpawned: 0 }; }
    function waveSlot() { return stats.waves[stats.meta.currentWave] ||= freshWave(stats.meta.currentWave); }
    function prune() {
        const keys = Object.keys(stats.waves);
        if (keys.length <= waveCap) return;
        keys.sort((a, b) => a - b);
        while (keys.length > waveCap) {
            const k = keys.shift();
            const old = stats.waves[k];
            delete stats.waves[k];
            stats.meta.leakWaves.delete(+k);
            const p = stats.meta.pruned;
            p.count += 1;
            p.kills += old.kills;
            p.leaks += old.leaks;
            p.rewardGold += old.rewardGold;
            p.durationMs += old.durationMs;
            p.combos += old.combos;
            p.creepsSpawned += old.creepsSpawned;
        }
    }
    function ensureTower(id, elt) {
        const t = (stats.towers[id] ||= { id, elt: elt || null, placedAt: 0, soldAt: 0, levelUps: 0, finalLevel: 1, evolutions: [], shots: 0, hits: 0, damage: 0, damageByElt: {}, refund: 0, cost: 0 });
        if (elt && !t.elt) t.elt = elt;
        return t;
    }
    function bump(obj, k, by) { obj[k] = (obj[k] || 0) + by; }
    function acc(h, s) { return s > 0 ? +(100 * h / s).toFixed(1) : 0; }
    function top(map, metric) { let best = null; for (const id in map) { const v = metric(map[id]) || 0; if (!best || v > best.score) best = { id, score: v }; } return best; }
}
