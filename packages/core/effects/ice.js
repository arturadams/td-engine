// packages/core/effects/ice.js
import base from './default.js';

function trail(state, b) {
    // cold mist trail
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: 0, ttl: 0.3, max: 0.3, a: 1, color: '#aafcff', circle: true });
}

function impact(state, b) {
    const rng = state.rng;
    base.basicImpact(state, b, { count: 8, speed: 40, ttl: 0.7, ring: 16, color: b.color || '#00eaff' });
    // icy spikes
    for (let n = 0; n < 4; n++) {
        const ang = rng() * Math.PI * 2;
        state.particles.push({ x: b.x, y: b.y, ang, len: 8, ttl: 0.5, max: 0.5, a: 1, color: '#ccfaff', spark: true });
        state.particles.push({ x: b.x, y: b.y, ang: ang + Math.PI / 2, len: 8, ttl: 0.5, max: 0.5, a: 1, color: '#ccfaff', spark: true });
    }
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: 60, ttl: 0.3, max: 0.3, a: 1, color: '#aafcff', circle: true });
}

function aoe(state, b) {
    impact(state, b);
}

export default { trail, impact, aoe };
