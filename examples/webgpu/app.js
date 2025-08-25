const canvas = document.getElementById('gpu-canvas');
canvas.width = canvas.clientWidth * window.devicePixelRatio;
canvas.height = canvas.clientHeight * window.devicePixelRatio;

async function init() {
  if (!navigator.gpu) {
    document.body.innerHTML = '<p>WebGPU not supported</p>';
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  // Vertex positions and RGB colors
  const vertices = new Float32Array([
    0, 0.5,   1, 0, 0,
   -0.5, -0.5, 0, 1, 0,
    0.5, -0.5, 0, 0, 1,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
  vertexBuffer.unmap();

  const shader = `
struct Uniforms { angle : f32 };
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct VSOut {
  @builtin(position) Position : vec4<f32>,
  @location(0) color : vec3<f32>,
};

@vertex
fn vs_main(@location(0) pos : vec2<f32>, @location(1) color : vec3<f32>) -> VSOut {
  let s = sin(uniforms.angle);
  let c = cos(uniforms.angle);
  let rotated = vec2<f32>(c * pos.x - s * pos.y, s * pos.x + c * pos.y);
  var out : VSOut;
  out.Position = vec4<f32>(rotated, 0.0, 1.0);
  out.color = color;
  return out;
}

@fragment
fn fs_main(@location(0) color : vec3<f32>) -> @location(0) vec4<f32> {
  return vec4<f32>(color, 1.0);
}
`;

  const module = device.createShaderModule({ code: shader });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs_main',
      buffers: [{
        arrayStride: 5 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x2' },
          { shaderLocation: 1, offset: 2 * 4, format: 'float32x3' },
        ],
      }],
    },
    fragment: {
      module,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const uniformBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  function frame(time) {
    const angle = time / 1000;
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([angle]));

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
        storeOp: 'store',
      }],
    });
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

init();
