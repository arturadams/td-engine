// packages/core/effects/poison.js
import base from './default.js';

function trail(state, b) {
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: 0, ttl: 0.25, max: 0.25, a: 1, color: '#b5ff66', circle: true });
}

function impact(state, b) {
    base.basicImpact(state, b, { count: 7, speed: 45, ttl: 0.6, ring: 16, color: b.color || '#39ff14' });
}

function aoe(state, b) {
    impact(state, b);
}

export default { trail, impact, aoe };
