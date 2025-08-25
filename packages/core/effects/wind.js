// packages/core/effects/wind.js
import base from './default.js';

function trail(state, b) {
    // faint breeze trails
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: 0, ttl: 0.2, max: 0.2, a: 1, color: '#80d8ff', circle: true });
}

function impact(state, b) {
    base.basicImpact(state, b, { color: b.color || '#00bbff' });
}

function aoe(state, b) {
    impact(state, b);
}

export default { trail, impact, aoe };
