import { describe, it, expect, beforeEach } from 'vitest';
import { acquireParticle, releaseParticle, clearParticlePool, updateParticles } from './particles.js';

describe('particles', () => {
  beforeEach(() => {
    clearParticlePool();
  });

  it('acquires new particles and reuses released ones without leftover properties', () => {
    const p = acquireParticle();
    expect(Object.keys(p).length).toBe(0);
    p.foo = 'bar';
    releaseParticle(p);
    const q = acquireParticle();
    expect(q).toBe(p);
    expect(q).not.toHaveProperty('foo');
  });

  it('clearParticlePool empties the pool', () => {
    const p = acquireParticle();
    releaseParticle(p);
    clearParticlePool();
    const q = acquireParticle();
    expect(q).not.toBe(p);
  });

  it('updateParticles simulates lifetime decay and releases expired particles', () => {
    const p = acquireParticle();
    Object.assign(p, { x: 0, y: 0, r: 0, vx: 1, vy: 2, vr: 3, ttl: 2, max: 2 });
    const state = { dt: 1, particles: [p] };
    updateParticles(state);
    expect(p.ttl).toBe(1);
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p.r).toBe(3);
    expect(p.a).toBeCloseTo(0.5);
    updateParticles(state);
    expect(state.particles.length).toBe(0);
    const q = acquireParticle();
    expect(q).toBe(p);
  });

  it('does not exceed the MAX_POOL size', () => {
    const MAX_POOL = 10000;
    const released = new Set();
    for (let i = 0; i < MAX_POOL + 5; i++) {
      const obj = {};
      released.add(obj);
      releaseParticle(obj);
    }
    let reused = 0;
    let fresh = 0;
    for (let i = 0; i < MAX_POOL + 5; i++) {
      const obj = acquireParticle();
      if (released.has(obj)) reused++;
      else fresh++;
    }
    expect(reused).toBe(MAX_POOL);
    expect(fresh).toBe(5);
  });
});

