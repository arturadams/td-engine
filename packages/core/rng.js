// packages/core/rng.js
// Deterministic mulberry32 RNG + UUID fallback
export function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export function makeRng(seed) {
    if (typeof seed !== 'number') seed = Math.floor(Math.random() * 2 ** 31);
    const rnd = mulberry32(seed);
    rnd.int = (a, b) => Math.floor(a + rnd() * (b - a + 1));
    rnd.pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    rnd.seed = seed;
    return rnd;
}

export function uuid() {
    const g = (typeof globalThis !== 'undefined' ? globalThis : window);
    if (g.crypto && typeof g.crypto.randomUUID === 'function') return g.crypto.randomUUID();
    // RFC4122-ish v4 polyfill
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0, v = c === 'x' ? r : ((r & 0x3) | 0x8);
        return v.toString(16);
    });
}
