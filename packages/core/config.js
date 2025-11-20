// packages/core/config.js
// configuration options for the engine library

export const RENDER_BACKENDS = ['canvas', 'webgpu'];
export const SOUND_BACKENDS = ['sfx', 'none'];

export const defaultConfig = {
  renderer: 'webgpu',
  sound: 'sfx',
  speeds: { creep: 1, tower: 1 },
  fixedStep: 1 / 60,
  maxSubSteps: 240,
};

export function resolveConfig(user = {}) {
  const cfg = {
    ...defaultConfig,
    ...user,
    speeds: { ...defaultConfig.speeds, ...(user.speeds || {}) },
  };

  if (!RENDER_BACKENDS.includes(cfg.renderer)) {
    cfg.renderer = defaultConfig.renderer;
  }
  if (!SOUND_BACKENDS.includes(cfg.sound)) {
    cfg.sound = defaultConfig.sound;
  }
  return cfg;
}

