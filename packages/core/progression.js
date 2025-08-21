// packages/core/progression.js
// Wave scaling and simple composer (affix-ready)

export function hpMulAtWave(wave, { difficulty = 1 } = {}) {
    // soft-exponential that grows ~8–12%/wave early, steeper later
    const base = 1 + 0.085 * Math.min(wave, 12) + 0.12 * Math.max(0, wave - 12);
    return Math.max(0.8, Math.pow(base, 0.55) * (0.92 + wave * 0.035)) * difficulty;
}

export function speedMulAtWave(wave, { difficulty = 1 } = {}) {
    // small, linear-ish speed increase
    return 1 + Math.min(0.45, 0.012 * wave) * Math.sqrt(difficulty);
}

export function goldForKill(type, wave, baseGold) {
    // keep kills meaningful later, but not runaway
    const growth = 1 + 0.06 * wave;
    const bossBonus = type === 'Boss' ? 3 : 1;
    return Math.max(1, Math.round(baseGold * growth * bossBonus));
}

// simple pack composer — you can swap this for a full “theme + affixes” composer later
export function composeWave(wave, pool = ['Grunt', 'Runner', 'Tank', 'Shield']) {
    if (wave === 1) return [{ type: 'Grunt', count: 8, gap: 0.55 }];
    if (wave === 2) return [{ type: 'Grunt', count: 10, gap: 0.5 }, { type: 'Runner', count: 4, gap: 0.55 }];
    if (wave % 10 === 0) return [{ type: 'Boss', count: 1, gap: 1.2 }];

    const packs = [];
    const budget = 10 + Math.round(wave * 1.6); // rough budget → more creeps later
    for (let i = 0; i < 3; i++) {
        const type = pool[(wave + i) % pool.length];
        const count = Math.max(5, Math.round(budget / (3 + (type === 'Tank' ? 1.2 : 1))));
        packs.push({ type, count, gap: 0.48 });
    }
    return packs;
}
