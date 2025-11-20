import { describe, expect, it } from 'vitest';
import { createEngine } from './engine.js';
import { createDefaultMap } from './map.js';

function makeEngine() {
  return createEngine({ map: createDefaultMap() });
}

describe('engine alpha interpolation', () => {
  it('returns bounded alpha for partial updates', () => {
    const engine = makeEngine();
    const result = engine.update(0.005);
    expect(result.alpha).toBeGreaterThanOrEqual(0);
    expect(result.alpha).toBeLessThanOrEqual(1);
    expect(engine.state.ticks).toBe(0);
  });

  it('accumulates time over sequential updates', () => {
    const engine = makeEngine();
    engine.update(0.01);
    const result = engine.update(0.01);
    expect(engine.state.ticks).toBe(1);
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.alpha).toBeLessThan(1);
  });

  it('processes multiple fixed steps on long frames', () => {
    const engine = makeEngine();
    const result = engine.update(0.1);
    expect(engine.state.ticks).toBeGreaterThan(1);
    expect(result.alpha).toBeGreaterThanOrEqual(0);
    expect(result.alpha).toBeLessThan(1);
  });
});
