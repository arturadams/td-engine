// packages/core/effects/light.js
import base from './default.js';

function trail(state, b) {
    const rng = state.rng;
    if (rng() < 0.5) {
        const ang = rng() * Math.PI * 2;
        state.particles.push({ x: b.x, y: b.y, ang, len: 6, ttl: 0.2, max: 0.2, a: 1, color: '#f8ff00', spark: true });
    }
}

function impact(state, b) {
    const rng = state.rng;
    base.basicImpact(state, b, { count: 12, speed: 180, ttl: 0.3, ring: 20, color: b.color || '#f8ff00' });
    // electric sparks
    for (let n = 0; n < 6; n++) {
        const ang = rng() * Math.PI * 2;
        const sp = 160;
        state.particles.push({
            x: b.x, y: b.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            ang, len: 12, ttl: 0.3, max: 0.3, a: 1, color: '#f8ff00', spark: true,
        });
    }
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: 200, ttl: 0.15, max: 0.15, a: 1, color: '#f8ff00', circle: true });
}

function aoe(state, b) {
    impact(state, b);
}

export default { trail, impact, aoe };
