// The sheet of paper and the light on it, drawn with WebGL 2 into a canvas that lies over the
// terminal with `mix-blend-mode: multiply`: every pixel of the terminal (paper and ink alike) is
// multiplied by albedo × irradiance, exactly as light falls on a printed page. Text stays text;
// the shader only reads its own uniforms and never sees terminal content.
//
// Two passes keep the per-frame cost tiny:
//   1. surface (on layout or paper change): the paper's albedo and its fibre normals, into two
//      textures. This is the expensive part (fractal noise, foxing, laid lines, linen weave).
//   2. light (when the lamp moves, or for animated film grain): reads both textures and applies
//      the physical light model of app/nocturne/light-model.ts (inverse-square law, Lambert's
//      cosine law, a soft spot cone, a window gobo for moonlight, exposure tone mapping). The lamp
//      lights the sheet as if it were flat, and the paper keeps the same texture in its light as
//      out of it: shaded by a low lamp, every fibre would cast a speck of shadow.

import type {LightRig} from '../../../app/nocturne/light-model';
import type {Paper} from '../../../app/nocturne/papers';

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const NOISE = `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
`;

const SURFACE = `#version 300 es
precision highp float;
uniform vec2 uSize; uniform float uScale; uniform float uSeed; uniform float uFold; uniform float uFelt;
uniform float uAge; uniform float uMottle; uniform float uCrinkle; uniform float uLaid; uniform float uLinen;
layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outNormal;
${NOISE}
// Value noise turned off the pixel grid, so felted textures show no rows or columns.
const mat2 TURN = mat2(0.8, -0.6, 0.6, 0.8);
// Surface relief: vellum veins (domain-warped), long fibres and a fine tooth; laid lines and
// chain lines for laid paper; a woven cross-hatch with slubs for linen. Cotton rag is felted, not
// crumpled: a soft tooth of little rounded hills, as on cold-pressed paper, over faint clouds of
// denser and thinner pulp, with a hint of long fibres.
float relief(vec2 p) {
  vec2 w = vec2(fbm(p * 0.012 + uSeed), fbm(p * 0.012 + uSeed + 9.2));
  float veins = 1.0 - abs(fbm(p * 0.02 + w * 3.0) * 2.0 - 1.0);
  float r = 0.35 * pow(veins, 6.0) + 0.35 * noise(p * vec2(0.6, 0.18)) + 0.3 * noise(p * 1.9);
  if (uFelt > 0.0) {
    vec2 q = TURN * p;
    float tooth = 0.62 * noise(q * 0.45) + 0.38 * noise(TURN * q * 0.95 + 5.3);
    float felt = 0.7 * tooth + 0.2 * noise(q * 0.11 + 2.1) + 0.1 * noise(q * vec2(0.5, 0.12));
    r = mix(r, felt, uFelt);
  }
  float laidLines = 0.5 + 0.5 * sin(p.y * 6.2831 / 4.2);
  float chain = exp(-pow((mod(p.x, 96.0) - 48.0) / 3.2, 2.0));
  r = mix(r, r * 0.6 + laidLines * 0.18 + chain * 0.35, uLaid);
  float weave = 0.5 + 0.5 * sin(p.x * 6.2831 / 3.4) * sin(p.y * 6.2831 / 3.4);
  float slub = noise(p * vec2(0.07, 1.3));
  return mix(r, r * 0.3 + weave * 0.5 + slub * 0.35, uLinen);
}
// Albedo relative to the paper colour: mottling, and for aged paper darker ragged edges, foxing,
// tide lines and a fold.
vec3 albedo(vec2 p) {
  vec2 uv = p / uSize;
  float mottle = fbm(p * 0.006 + uSeed) * 0.65 + fbm(p * 0.022 + uSeed * 2.0) * 0.35;
  vec3 tint = mix(vec3(1.0, 0.985, 0.95), vec3(0.86, 0.74, 0.55), smoothstep(0.35, 0.8, mottle) * 0.85);
  vec3 base = mix(vec3(1.0), tint, uMottle);
  vec3 tone = vec3(1.0);
  float edge = min(min(uv.x, 1.0 - uv.x) * uSize.x, uv.y * uSize.y);
  float ragged = edge + (fbm(p * 0.05 + 3.0) - 0.5) * 26.0;
  tone *= mix(vec3(1.0), vec3(0.62, 0.45, 0.28), (1.0 - smoothstep(0.0, 46.0, ragged)) * 0.85);
  vec2 cell = floor(p / 70.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = cell + vec2(float(i), float(j));
      if (hash12(c + uSeed) > 0.16) continue;
      vec2 centre = (c + vec2(hash12(c + 1.7), hash12(c + 4.1))) * 70.0;
      float radius = mix(1.5, 6.5, hash12(c + 8.3));
      float spot = 1.0 - smoothstep(radius * 0.4, radius * 2.4, length(p - centre));
      tone *= mix(vec3(1.0), vec3(0.8, 0.62, 0.45), spot * 0.7);
    }
  }
  float tide = smoothstep(0.015, 0.0, abs(fbm(p * 0.004 + uSeed + 31.0) - 0.58));
  tone *= mix(vec3(1.0), vec3(0.82, 0.7, 0.52), tide * 0.35);
  float fold = (p.y - uFold) / 2.5;
  tone *= 1.0 - 0.08 * exp(-fold * fold) + 0.03 * exp(-(fold - 2.2) * (fold - 2.2));
  float chainTone = exp(-pow((mod(p.x, 96.0) - 48.0) / 3.2, 2.0));
  base *= 1.0 - uLaid * (0.03 * chainTone + 0.005 * (0.5 + 0.5 * sin(p.y * 6.2831 / 4.2)));
  base *= 1.0 - uLinen * 0.02 * (0.5 + 0.5 * sin(p.x * 6.2831 / 3.4) * sin(p.y * 6.2831 / 3.4));
  // Cotton's rag: a few faint threads in the pulp, lying every which way.
  if (uFelt > 0.0) {
    vec2 q = TURN * p;
    float threads = smoothstep(0.86, 0.97, noise(q * vec2(0.06, 1.1) + uSeed));
    threads += smoothstep(0.86, 0.97, noise(TURN * q * vec2(1.1, 0.06) + 3.0));
    base *= 1.0 - uFelt * 0.035 * min(1.0, threads);
  }
  return base * mix(vec3(1.0), tone, uAge);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;
  float e = 0.9;
  float h0 = relief(p);
  float slope = 1.2 + 3.0 * uCrinkle;
  vec3 n = normalize(vec3(-(relief(p + vec2(e, 0.0)) - h0) * slope, -(relief(p + vec2(0.0, e)) - h0) * slope, 1.0));
  outAlbedo = vec4(albedo(p), 1.0);
  outNormal = vec4(n.xy * 0.5 + 0.5, 0.0, 1.0);
}`;

const LIGHT = `#version 300 es
precision highp float;
uniform sampler2D uAlbedo; uniform sampler2D uNormal;
uniform vec2 uSize; uniform float uScale; uniform int uSource;
uniform vec3 uLightPos; uniform vec3 uLightDir; uniform vec2 uCone; uniform float uExposure;
uniform vec4 uWindow; uniform vec4 uPanes; uniform vec3 uTint; uniform float uLamp;
uniform float uAmbient; uniform vec3 uAmbientTint; uniform float uRelief; uniform float uCrinkle;
uniform float uGrain; uniform float uTime; uniform float uSoft;
out vec4 outColor;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// The moonlit window (uPanes: panes across and down, edge softness in pixels, slant as a shear).
float between(float offset, float cell, float bar, float soft) {
  float t = offset / cell;
  return smoothstep(bar - soft, bar + soft, abs(t - round(t)) * cell);
}
float gobo(vec2 p) {
  float soft = max(0.5, uPanes.z);
  p.x -= (p.y - uWindow.y) * uPanes.w;
  vec2 d = p - uWindow.xy;
  vec2 inside = smoothstep(-soft, soft, uWindow.zw * 0.5 - abs(d));
  vec2 pane = uWindow.zw / uPanes.xy;
  float bar = clamp(0.04 * min(pane.x, pane.y), 4.0, 16.0);
  float open = between(d.x + uWindow.z * 0.5, pane.x, bar, soft) * between(d.y + uWindow.w * 0.5, pane.y, bar, soft);
  return inside.x * inside.y * (0.3 + 0.7 * open);
}
// A pointed beam comes from a point and narrows to it. A soft beam (uSoft = 1) comes from a small
// sphere: near it the light has no hot spot and the edge of the cone widens, as a penumbra does.
const float BULB = 30.0;
float irradiance(vec3 P, vec3 n) {
  if (uSource == 2) return max(0.0, dot(n, -uLightDir)) * gobo(P.xy);
  vec3 d = P - uLightPos; float d2 = max(1.0, dot(d, d)); vec3 r = d * inversesqrt(d2);
  float near = uSoft * (1.0 - smoothstep(0.0, 260.0, sqrt(d2)));
  float cone = smoothstep(uCone.x - 0.3 * near, uCone.y, dot(r, uLightDir));
  return cone * max(0.0, -dot(n, r)) / (d2 + uSoft * BULB * BULB);
}
void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  vec3 albedo = texelFetch(uAlbedo, texel, 0).rgb;
  vec2 nxy = texelFetch(uNormal, texel, 0).xy * 2.0 - 1.0;
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;
  // The lamp lights the sheet as if it were flat, so its pool is smooth however low the lamp
  // stands: shading every fibre in grazing light would sprinkle the page with dark specks.
  float lit = (1.0 - exp(-irradiance(vec3(p, 0.0), vec3(0.0, 0.0, 1.0)) * uExposure)) * uLamp;
  vec2 uv = p / uSize;
  float vignette = smoothstep(0.15, 1.1, length((uv - vec2(0.5, 0.55)) * vec2(1.0, 1.15)));
  float ambient = mix(1.0, uAmbient * (1.0 - 0.3 * vignette), uLamp);
  vec3 irr = uAmbientTint * ambient + (1.0 - ambient) * lit * uTint;
  // The paper's own texture, in the light as out of it: its fibres catch the room light from the
  // upper left, a few percent, bounded so ink stays crisp, and a little quieter under the bulb.
  float relief = uRelief * (1.0 - 0.4 * lit);
  float bound = (0.16 * uCrinkle + 0.04) * relief;
  irr *= clamp(1.0 + (-nxy.x * 0.35 - nxy.y * 0.55) * (0.6 + 2.2 * uCrinkle) * relief, 1.0 - bound, 1.0 + bound);
  // A sheet is never perfectly flat: its side edges fall off gently.
  irr *= mix(0.9, 1.0, smoothstep(0.0, 28.0, min(uv.x, 1.0 - uv.x) * uSize.x));
  float g = hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5;
  outColor = vec4(clamp(albedo * irr + g * (uGrain * 0.045 + 1.5 / 255.0), 0.0, 1.0), 1.0);
}`;

const SURFACE_UNIFORMS = [
  'uSize',
  'uScale',
  'uSeed',
  'uFold',
  'uFelt',
  'uAge',
  'uMottle',
  'uCrinkle',
  'uLaid',
  'uLinen'
] as const;
const LIGHT_UNIFORMS = [
  'uAlbedo',
  'uNormal',
  'uSize',
  'uScale',
  'uSource',
  'uLightPos',
  'uLightDir',
  'uCone',
  'uExposure',
  'uWindow',
  'uPanes',
  'uTint',
  'uLamp',
  'uAmbient',
  'uAmbientTint',
  'uRelief',
  'uCrinkle',
  'uGrain',
  'uTime',
  'uSoft'
] as const;

type Uniforms<K extends string> = Record<K, WebGLUniformLocation | null>;

export type SurfaceSpec = {
  width: number;
  height: number;
  pixelRatio: number;
  paper: Paper;
  /** Depth of the surface relief, 0–1.6 (Studio: texture depth). */
  texture: number;
};

export type LightFrame = {
  rig: LightRig;
  lamp: boolean;
  /** Light colour, 0–1 per channel. */
  tint: [number, number, number];
  /** Room light as a multiply factor, never below the paper's contrast-safe floor. */
  ambient: number;
  ambientTint: [number, number, number];
  /** How strongly the paper fibres respond to light, 0–2. */
  relief: number;
  grain: number;
  time: number;
  /** The beam opens softly round the bulb instead of narrowing to a point. */
  soft: boolean;
};

const SOURCE_INDEX = {carriage: 0, 'desk-lamp': 1, moonlight: 2} as const;

function attach(gl: WebGL2RenderingContext, program: WebGLProgram, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Could not create a shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  gl.attachShader(program, shader);
}

/** Starts compiling and linking; nothing here waits for the driver. */
function startProgram(gl: WebGL2RenderingContext, fragment: string) {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Could not create a program');
  }
  attach(gl, program, gl.VERTEX_SHADER, VERTEX);
  attach(gl, program, gl.FRAGMENT_SHADER, fragment);
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  return program;
}

function checkProgram(gl: WebGL2RenderingContext, program: WebGLProgram) {
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const logs = (gl.getAttachedShaders(program) ?? []).map((shader) => gl.getShaderInfoLog(shader) ?? '');
    throw new Error(gl.getProgramInfoLog(program) || logs.join('\n') || 'Program link failed');
  }
}

function locate<K extends string>(gl: WebGL2RenderingContext, program: WebGLProgram, names: readonly K[]) {
  const uniforms = {} as Uniforms<K>;
  for (const name of names) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return uniforms;
}

export class PaperLight {
  private gl: WebGL2RenderingContext;
  private parallel: {COMPLETION_STATUS_KHR: number} | null;
  private surfaceProgram: WebGLProgram;
  private lightProgram: WebGLProgram;
  private surfaceUniforms: Uniforms<(typeof SURFACE_UNIFORMS)[number]> | null = null;
  private lightUniforms: Uniforms<(typeof LIGHT_UNIFORMS)[number]> | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private textures: WebGLTexture[] = [];
  private spec: SurfaceSpec | null = null;
  private pending: SurfaceSpec | null = null;
  private state: 'compiling' | 'ready' | 'failed' = 'compiling';
  private pollTimer: ReturnType<typeof setTimeout> | undefined;
  private onReady: () => void;

  /** Returns null when WebGL 2 is unavailable; the sheet then shows the plain paper colour. */
  static create(canvas: HTMLCanvasElement, onReady: () => void): PaperLight | null {
    // Alpha keeps the canvas transparent (no effect under multiply) until the first frame is drawn.
    const gl = canvas.getContext('webgl2', {premultipliedAlpha: false, antialias: false});
    if (!gl) {
      return null;
    }
    try {
      return new PaperLight(gl, onReady);
    } catch (error) {
      console.warn('Paper lighting disabled:', (error as Error).message);
      return null;
    }
  }

  private constructor(gl: WebGL2RenderingContext, onReady: () => void) {
    this.gl = gl;
    this.onReady = onReady;
    // With parallel compilation the driver compiles on its own threads and the window never waits
    // for it (on Windows the shaders go through Direct3D's compiler, which is slow).
    this.parallel = gl.getExtension('KHR_parallel_shader_compile') as {COMPLETION_STATUS_KHR: number} | null;
    this.surfaceProgram = startProgram(gl, SURFACE);
    this.lightProgram = startProgram(gl, LIGHT);
    // One triangle that covers the viewport.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.pollTimer = setTimeout(() => this.poll(), 0);
  }

  private poll() {
    const {gl, parallel} = this;
    if (parallel) {
      const programs = [this.surfaceProgram, this.lightProgram];
      if (!programs.every((program) => gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR) === true)) {
        this.pollTimer = setTimeout(() => this.poll(), 32);
        return;
      }
    }
    try {
      checkProgram(gl, this.surfaceProgram);
      checkProgram(gl, this.lightProgram);
    } catch (error) {
      this.state = 'failed';
      console.warn('Paper lighting disabled:', (error as Error).message);
      return;
    }
    this.surfaceUniforms = locate(gl, this.surfaceProgram, SURFACE_UNIFORMS);
    this.lightUniforms = locate(gl, this.lightProgram, LIGHT_UNIFORMS);
    this.state = 'ready';
    if (this.pending) {
      this.build(this.pending);
    }
    this.onReady();
  }

  get canvas() {
    return this.gl.canvas as HTMLCanvasElement;
  }

  /** Sizes the canvas and renders the paper surface (albedo and fibre normals). */
  build(spec: SurfaceSpec) {
    const {gl} = this;
    const u = this.surfaceUniforms;
    if (this.state !== 'ready' || !u) {
      this.pending = spec;
      return;
    }
    this.pending = null;
    this.spec = spec;
    const width = Math.max(1, Math.round(spec.width * spec.pixelRatio));
    const height = Math.max(1, Math.round(spec.height * spec.pixelRatio));
    this.canvas.width = width;
    this.canvas.height = height;
    this.releaseTargets();
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0);
      this.textures.push(texture);
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    this.framebuffer = framebuffer;

    const {surface} = spec.paper;
    gl.useProgram(this.surfaceProgram);
    gl.viewport(0, 0, width, height);
    gl.uniform2f(u.uSize, spec.width, spec.height);
    gl.uniform1f(u.uScale, spec.pixelRatio);
    gl.uniform1f(u.uSeed, 3.7);
    gl.uniform1f(u.uFold, spec.height * 0.38);
    gl.uniform1f(u.uFelt, surface.felt);
    gl.uniform1f(u.uAge, surface.age);
    gl.uniform1f(u.uMottle, surface.mottle);
    gl.uniform1f(u.uCrinkle, surface.crinkle * spec.texture);
    gl.uniform1f(u.uLaid, surface.laid * Math.min(1, spec.texture));
    gl.uniform1f(u.uLinen, surface.linen * Math.min(1, spec.texture));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Lights the paper. Cheap: two texture reads and the light model per pixel. */
  render(frame: LightFrame) {
    const {gl, spec} = this;
    const u = this.lightUniforms;
    if (!spec || !u || this.textures.length < 2 || gl.isContextLost()) {
      return;
    }
    const {rig} = frame;
    gl.useProgram(this.lightProgram);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
    gl.uniform1i(u.uAlbedo, 0);
    gl.uniform1i(u.uNormal, 1);
    gl.uniform2f(u.uSize, spec.width, spec.height);
    gl.uniform1f(u.uScale, spec.pixelRatio);
    gl.uniform1i(u.uSource, SOURCE_INDEX[rig.source]);
    gl.uniform3fv(u.uLightPos, rig.position);
    gl.uniform3fv(u.uLightDir, rig.direction);
    gl.uniform2f(u.uCone, rig.cosOuter, rig.cosInner);
    gl.uniform1f(u.uExposure, rig.exposure);
    gl.uniform4f(u.uWindow, rig.window.x, rig.window.y, rig.window.width, rig.window.height);
    const {columns, rows, softness, skew} = rig.window;
    gl.uniform4f(u.uPanes, columns, rows, softness, skew);
    const peak = Math.max(frame.tint[0], frame.tint[1], frame.tint[2], 1e-6);
    gl.uniform3f(u.uTint, frame.tint[0] / peak, frame.tint[1] / peak, frame.tint[2] / peak);
    gl.uniform1f(u.uLamp, frame.lamp ? 1 : 0);
    gl.uniform1f(u.uAmbient, frame.ambient);
    gl.uniform3fv(u.uAmbientTint, frame.ambientTint);
    gl.uniform1f(u.uRelief, frame.relief);
    gl.uniform1f(u.uSoft, frame.soft ? 1 : 0);
    gl.uniform1f(u.uCrinkle, spec.paper.surface.crinkle * spec.texture);
    gl.uniform1f(u.uGrain, frame.grain);
    gl.uniform1f(u.uTime, frame.time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private releaseTargets() {
    const {gl} = this;
    this.textures.forEach((texture) => gl.deleteTexture(texture));
    this.textures = [];
    if (this.framebuffer) {
      gl.deleteFramebuffer(this.framebuffer);
      this.framebuffer = null;
    }
  }

  dispose() {
    clearTimeout(this.pollTimer);
    this.releaseTargets();
    this.gl.deleteProgram(this.surfaceProgram);
    this.gl.deleteProgram(this.lightProgram);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
