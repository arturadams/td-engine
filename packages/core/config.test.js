import { describe, it, expect } from 'vitest';
import { resolveConfig, defaultConfig } from './config.js';

describe('config', () => {
  it('falls back to default renderer', () => {
    const cfg = resolveConfig({ renderer: 'invalid' });
    expect(cfg.renderer).toBe('webgpu');
  });

  it('merges partial user config preserving defaults', () => {
    const cfg = resolveConfig({ speeds: { tower: 2 } });
    expect(cfg.renderer).toBe(defaultConfig.renderer);
    expect(cfg.sound).toBe(defaultConfig.sound);
    expect(cfg.speeds.tower).toBe(2);
    expect(cfg.speeds.creep).toBe(defaultConfig.speeds.creep);
  });

  it('keeps user options while falling back on invalid ones', () => {
    const cfg = resolveConfig({ renderer: 'invalid', sound: 'invalid', speeds: { creep: 3 } });
    expect(cfg.renderer).toBe(defaultConfig.renderer); // fallback
    expect(cfg.sound).toBe(defaultConfig.sound); // fallback
    expect(cfg.speeds.creep).toBe(3); // user option preserved
    expect(cfg.speeds.tower).toBe(defaultConfig.speeds.tower); // default preserved
  });
});
