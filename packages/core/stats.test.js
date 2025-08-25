import { describe, it, expect } from 'vitest';
import { attachStats } from './stats.js';

describe('stats', () => {
  it('tracks kills via hooks', () => {
    const handlers = {};
    const engine = {
      hook(name, fn) {
        (handlers[name] ||= []).push(fn);
        return () => {};
      }
    };
    const stats = attachStats(engine);
    // simulate a kill
    handlers.creepKill[0]({ type: 'Grunt', gold: 1 });
    const summary = stats.summary();
    expect(summary.totals.creepsKilled).toBe(1);
  });
});
