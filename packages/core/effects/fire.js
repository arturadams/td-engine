// packages/core/effects/fire.js
import base from './default.js';

function trail(state, b) {
    // fiery embers trailing behind
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: 0, ttl: 0.2, max: 0.2, a: 1, color: '#fb923c', circle: true });
}

function impact(state, b) {
    const rng = state.rng;
    base.basicImpact(state, b, { count: 12, speed: 140, ttl: 0.5, ring: 22, color: b.color || '#f97316' });
    // bright flash for fiery explosion
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: 120, ttl: 0.25, max: 0.25, a: 1, color: '#f97316', circle: true });
}

function aoe(state, b) {
    impact(state, b);
}

export default { trail, impact, aoe };
