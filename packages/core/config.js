// packages/core/config.js
// configuration options for the engine library

export const RENDER_BACKENDS = ['canvas', 'webgpu'];

export const defaultConfig = {
  renderer: 'canvas',
};

export function resolveConfig(user = {}) {
  const cfg = { ...defaultConfig, ...user };
  if (!RENDER_BACKENDS.includes(cfg.renderer)) {
    cfg.renderer = defaultConfig.renderer;
  }
  return cfg;
}

