// packages/core/particles.js
// Simple particle updater for bullet impact effects

const pool = [];
const MAX_POOL = 10000;

export function acquireParticle() {
    return pool.pop() || {};
}

export function releaseParticle(p) {
    for (const k in p) delete p[k];
    if (pool.length < MAX_POOL) pool.push(p);
}

export function clearParticlePool() {
    pool.length = 0;
}

export function updateParticles(state) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.ttl -= state.dt;
        if (p.vx) p.x += p.vx * state.dt;
        if (p.vy) p.y += p.vy * state.dt;
        if (p.vr) p.r += p.vr * state.dt;
        p.a = p.ttl / p.max;
        if (p.ttl <= 0) {
            const last = state.particles.pop();
            if (last !== p) state.particles[i] = last;
            releaseParticle(p);
        }
    }
}
