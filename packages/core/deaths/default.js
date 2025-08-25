// packages/core/deaths/default.js
// Generic death effect for creeps

function die(state, c) {
    // simple fade out ring
    // avoid errors if particles array hasn't been initialized on the state
    const particles = state.particles || (state.particles = []);
    particles.push({ x: c.x, y: c.y, r: 0, vr: 80, ttl: 0.4, max: 0.4, a: 1, color: '#94a3b8', circle: true });
}

export default { die };
