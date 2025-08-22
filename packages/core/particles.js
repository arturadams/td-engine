// packages/core/particles.js
// Simple particle updater for bullet impact effects

export function updateParticles(state) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.ttl -= state.dt;
        if (p.vx) p.x += p.vx * state.dt;
        if (p.vy) p.y += p.vy * state.dt;
        if (p.vr) p.r += p.vr * state.dt;
        p.a = p.ttl / p.max;
        if (p.ttl <= 0) state.particles.splice(i, 1);
    }
}
