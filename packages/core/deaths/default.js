// packages/core/deaths/default.js
// Generic death effect for creeps

function die(state, c) {
    // simple fade out ring
    state.particles.push({ x: c.x, y: c.y, r: 0, vr: 80, ttl: 0.4, max: 0.4, a: 1, color: '#ff99ff', circle: true });
}

export default { die };
