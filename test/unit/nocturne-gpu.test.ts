import test from 'ava';

import {classifyRenderer, renderMode} from '../../lib/nocturne/lighting/gpu';

test('software, virtual and real GPUs are told apart', (t) => {
  t.is(classifyRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'), 'software');
  t.is(classifyRenderer('llvmpipe (LLVM 15.0.7, 256 bits)'), 'software');
  t.is(classifyRenderer('ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)'), 'software');
  t.is(classifyRenderer('ANGLE Metal Renderer: Apple Paravirtual device, Unspecified Version'), 'virtual');
  t.is(classifyRenderer('ANGLE (VMware, Inc., SVGA3D; build: RELEASE; LLVM;)'), 'virtual');
  t.is(classifyRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)'), 'hardware');
  t.is(classifyRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'), 'hardware');
  t.is(classifyRenderer(''), 'none');
});

test('auto draws the full stage only on a real GPU; explicit qualities force it', (t) => {
  t.is(renderMode('auto', 'hardware'), 'high');
  t.is(renderMode('auto', 'software'), 'basic');
  t.is(renderMode('auto', 'virtual'), 'basic');
  t.is(renderMode('high', 'software'), 'high');
  t.is(renderMode('low', 'virtual'), 'low');
  t.is(renderMode('high', 'none'), 'basic');
});
