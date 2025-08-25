import { describe, it, expect } from 'vitest';
import { createEmitter } from './events.js';

describe('events', () => {
  it('calls handlers for emitted events', () => {
    const emitter = createEmitter();
    const calls = [];
    emitter.on('test', e => calls.push(e.value));
    emitter.emit({ type: 'test', value: 1 });
    emitter.emit({ type: 'test', value: 2 });
    expect(calls).toEqual([1, 2]);
  });

  it('off removes handlers', () => {
    const emitter = createEmitter();
    let called = false;
    const handler = () => { called = true; };
    emitter.on('test', handler);
    emitter.off('test', handler);
    emitter.emit({ type: 'test' });
    expect(called).toBe(false);
  });

  it('handlers can unsubscribe themselves', () => {
    const emitter = createEmitter();
    let count = 0;
    const off = emitter.on('test', () => {
      count++;
      off();
    });
    emitter.emit({ type: 'test' });
    emitter.emit({ type: 'test' });
    expect(count).toBe(1);
  });

  it('swallows exceptions thrown by handlers', () => {
    const emitter = createEmitter();
    let called = false;
    emitter.on('test', () => {
      throw new Error('boom');
    });
    emitter.on('test', () => {
      called = true;
    });
    expect(() => {
      emitter.emit({ type: 'test' });
    }).not.toThrow();
    expect(called).toBe(true);
  });
});
