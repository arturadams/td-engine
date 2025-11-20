// packages/core/rng.js
// Deterministic mulberry32 RNG + deterministic id generator
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

export function makeIdGenerator(seed) {
    // Keep deterministic output even without an explicit seed.
    const baseSeed = (typeof seed === 'number') ? seed : 0xABCDEF;
    const rnd = mulberry32((baseSeed ^ 0x9E3779B9) >>> 0);
    let counter = 0;
    const hex = (n, len) => n.toString(16).padStart(len, '0');

    return function uuid() {
        const a = (rnd() * 0xFFFFFFFF) >>> 0;
        const b = (rnd() * 0xFFFFFFFF) >>> 0;
        const c = (rnd() * 0xFFFFFFFF) >>> 0;
        const d = (rnd() * 0xFFFFFFFF) >>> 0;
        counter = (counter + 1) >>> 0;

        const p1 = hex(a, 8);
        const p2 = hex(b >>> 16, 4);
        const p3 = hex((b & 0xFFFF) | 0x4000, 4); // set version bits
        const p4 = hex(((c >>> 16) & 0x3FFF) | 0x8000, 4); // set variant bits
        const p5 = hex(((c & 0xFFFF) << 16) | (d >>> 16), 8) + hex((d & 0xFFFF) ^ counter, 4);

        return `${p1}-${p2}-${p3}-${p4}-${p5}`;
    };
}
