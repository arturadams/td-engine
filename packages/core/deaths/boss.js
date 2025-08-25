// packages/core/deaths/boss.js
import base from './default.js';

function die(state, c) {
    base.die(state, c);
    const rng = state.rng;
    // boss explodes into many fragments
    for (let n = 0; n < 24; n++) {
        const ang = rng() * Math.PI * 2;
        const sp = 60 + rng() * 80;
        state.particles.push({
            x: c.x, y: c.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            ttl: 0.6, max: 0.6, a: 1, color: '#f8ff00',
        });
    }
}

export default { die };
