import { describe, it, expect } from 'vitest';
import { resolveConfig } from './config.js';

describe('config', () => {
  it('falls back to default renderer', () => {
    const cfg = resolveConfig({ renderer: 'invalid' });
    expect(cfg.renderer).toBe('webgpu');
  });
});
