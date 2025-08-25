// packages/render-webgpu/index.js
// Minimal WebGPU renderer that clears the screen each frame.
// This is a placeholder implementation and does not render game entities yet.

export async function createWebGPURenderer({ canvas, engine, options = {} }) {
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in this environment');
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  // Minimal texture cache for future sprite rendering.
  const textureCache = new WeakMap();
  function ensureTexture(img) {
    if (!img || !img.complete) return null;
    let tex = textureCache.get(img);
    if (!tex) {
      // Create a texture that could be sampled in a shader later.
      // Actual image upload is omitted for now.
      const usage = (globalThis.GPUTextureUsage?.TEXTURE_BINDING ?? 0) |
                    (globalThis.GPUTextureUsage?.COPY_DST ?? 0);
      tex = device.createTexture({
        size: [img.width || 1, img.height || 1, 1],
        format: 'rgba8unorm',
        usage,
      });
      textureCache.set(img, tex);
      // TODO: copy image pixels to GPU texture when WebGPU image upload is implemented.
    }
    return tex;
  }

  function render(state, dt) {
    // Preload textures for any entities with images (future sprite support).
    if (state.creeps) {
      for (const c of state.creeps) if (c.img) ensureTexture(c.img);
    }
    if (state.towers) {
      for (const t of state.towers) if (t.img) ensureTexture(t.img);
    }

    // Currently we only clear the screen each frame.
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: 'store'
      }]
    });
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  return { render };
}
