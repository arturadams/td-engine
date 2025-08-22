// packages/core/effects/earth.js
import base from './default.js';

function trail(state, b) {
    // subtle dust trail
    state.particles.push({ x: b.x, y: b.y, r: 0, vr: 0, ttl: 0.2, max: 0.2, a: 1, color: '#d4d4d4', circle: true });
}

function impact(state, b) {
    base.basicImpact(state, b, { color: b.color || '#a3a3a3' });
}

function aoe(state, b) {
    impact(state, b);
}

export default { trail, impact, aoe };
