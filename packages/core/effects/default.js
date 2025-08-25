// packages/core/effects/default.js
// Generic effect descriptors for bullet behavior

function trail(state, b) {
    // default bullets have no trail effect
}

function basicImpact(state, b, opts = {}) {
    const rng = state.rng;
    const { count = 6, speed = 40, ttl = 0.4, ring = 12, color = b.color || '#ff99ff' } = opts;
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: ring / ttl, ttl, max: ttl, a: 1, color, ring: true });
    for (let n = 0; n < count; n++) {
        const ang = rng() * Math.PI * 2;
        const sp = speed * (0.5 + rng());
        state.particles.push({
            x: b.x, y: b.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            ttl, max: ttl, a: 1, color,
        });
    }
}

function impact(state, b) {
    basicImpact(state, b);
}

function aoe(state, b) {
    impact(state, b);
}

export default { trail, impact, aoe, basicImpact };
