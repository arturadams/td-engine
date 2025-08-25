import { describe, it } from 'vitest';
import assert from 'node:assert';
import { createWebGPURenderer } from './index.js';

describe('render-webgpu', () => {
  it('throws when WebGPU unsupported', async () => {
    const oldNav = global.navigator;
    global.navigator = {};
    let threw = false;
    try {
      await createWebGPURenderer({ canvas: {}, engine: {} });
    } catch (err) {
      threw = true;
    }
    assert.ok(threw, 'throws when WebGPU unsupported');
    global.navigator = oldNav;
  });

  it('submits commands when WebGPU is supported', async () => {
    const beginCalls = [];
    const submitCalls = [];

    const pass = { end() {} };
    const encoder = {
      beginRenderPass(opts) { beginCalls.push(opts); return pass; },
      finish() { return 'cmd'; }
    };
    const device = {
      createCommandEncoder() { return encoder; },
      queue: { submit(cmds) { submitCalls.push(cmds); } }
    };
    const adapter = { requestDevice: async () => device };
    const gpu = {
      requestAdapter: async () => adapter,
      getPreferredCanvasFormat: () => 'rgba8unorm'
    };
    const context = {
      configure() {},
      getCurrentTexture: () => ({ createView: () => 'view' })
    };
    const canvas = { getContext: () => context };
    const oldNav = global.navigator;
    global.navigator = { gpu };
    const renderer = await createWebGPURenderer({ canvas, engine: {} });
    renderer.render({}, 0);
    assert.strictEqual(beginCalls.length, 1, 'render pass begun');
    const opts = beginCalls[0];
    assert.strictEqual(opts.colorAttachments[0].loadOp, 'clear');
    assert.deepStrictEqual(opts.colorAttachments[0].clearValue, { r: 0, g: 0, b: 0, a: 1 });
    assert.strictEqual(submitCalls.length, 1, 'commands submitted');
    global.navigator = oldNav;
  });

  it('creates textures for entity images (stub)', async () => {
    let textureCalls = 0;
    const pass = { end() {} };
    const encoder = { beginRenderPass() { return pass; }, finish() { return 'cmd'; } };
    const device = {
      createCommandEncoder() { return encoder; },
      createTexture() { textureCalls++; return {}; },
      queue: { submit() {} }
    };
    const adapter = { requestDevice: async () => device };
    const gpu = { requestAdapter: async () => adapter, getPreferredCanvasFormat: () => 'rgba8unorm' };
    const context = { configure() {}, getCurrentTexture: () => ({ createView: () => 'view' }) };
    const canvas = { getContext: () => context };
    const oldNav = global.navigator;
    global.navigator = { gpu };
    const renderer = await createWebGPURenderer({ canvas, engine: {} });
    const img = { complete: true, width: 1, height: 1 };
    renderer.render({ creeps: [{ img }] }, 0);
    assert.strictEqual(textureCalls, 1, 'texture created for sprite');
    global.navigator = oldNav;
  });
});

console.log('render-webgpu tests passed');
