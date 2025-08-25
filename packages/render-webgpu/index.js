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

  function render(state, dt) {
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
