import { describe, it, expect } from 'vitest';
import { createInitialState } from './state.js';

describe('state', () => {
  it('creates initial state with defaults', () => {
    const state = createInitialState();
    expect(state.gold).toBe(250);
    expect(state.towers).toEqual([]);
  });
});
