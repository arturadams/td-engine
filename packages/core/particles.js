// packages/core/particles.js
// Simple particle helpers for transient effects.

export function spawnDeathParticles(state, creep) {
    state.particles.push({
        x: creep.x,
        y: creep.y,
        r: 0,
        a: 0.6,
        ttl: 0.3,
        ring: true,
        color: '#f87171',
    });
}

export function updateParticles(state) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        if (p.ring) {
            p.r += 60 * state.dt;
        }
        if (typeof p.a === 'number') {
            p.a -= state.dt * 2;
        }
        p.ttl -= state.dt;
        if (p.ttl <= 0 || (typeof p.a === 'number' && p.a <= 0)) {
            state.particles.splice(i, 1);
        }
    }
}
