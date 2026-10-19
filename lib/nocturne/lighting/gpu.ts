// What kind of GPU draws WebGL here, and how much of the stage it should draw.
//
// Without a usable GPU (WebGL emulated on the CPU: SwiftShader, llvmpipe, Microsoft Basic Render
// Driver) or with the thin virtual GPU of a virtual machine or remote desktop, compiling the
// typewriter's shaders and animating it would compete with the terminal for every frame. There the
// `auto` quality draws only the plain sheet (impressions and sounds stay); `high`, `medium` and
// `low` force the full stage on any GPU.

import type {EffectQuality} from '../../../app/nocturne/types';

export type GpuClass = 'none' | 'software' | 'virtual' | 'hardware';

/** `basic`: no WebGL layers (no typewriter, no paper light). The others draw the full stage. */
export type RenderMode = 'basic' | 'high' | 'medium' | 'low';

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const VIRTUAL = /paravirtual|svga3d|virtualbox|vmware|parallels|virgl|qxl|hyper-v|remote/i;

export function classifyRenderer(name: string): GpuClass {
  if (!name) {
    return 'none';
  }
  if (SOFTWARE.test(name)) {
    return 'software';
  }
  return VIRTUAL.test(name) ? 'virtual' : 'hardware';
}

export function renderMode(quality: EffectQuality, gpu: GpuClass): RenderMode {
  if (gpu === 'none') {
    return 'basic';
  }
  if (quality === 'auto') {
    return gpu === 'hardware' ? 'high' : 'basic';
  }
  return quality;
}

let detected: GpuClass | null = null;

/** Classifies the GPU once, with a small throwaway WebGL 2 context. */
export function detectGpu(): GpuClass {
  if (detected) {
    return detected;
  }
  detected = 'none';
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (gl) {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name: unknown = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
      detected = classifyRenderer(typeof name === 'string' ? name : 'unknown');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    detected = 'none';
  }
  return detected;
}
