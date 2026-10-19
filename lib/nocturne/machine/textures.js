// Procedural textures for the typewriter model. All of them are drawn on canvases at build time:
// no image files, no network.

import * as THREE from 'three';

export const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Normal map of fine ridges around a knob or roller. */
export function knurlTexture(ridges) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 8;
  const context = canvas.getContext('2d');
  const image = context.createImageData(512, 8);
  for (let i = 0; i < 512; i++) {
    const slope = Math.sin((i / 512) * ridges * Math.PI * 2) * 0.85;
    for (let j = 0; j < 8; j++) {
      const k = (j * 512 + i) * 4;
      image.data[k] = (slope * 0.5 + 0.5) * 255;
      image.data[k + 1] = 128;
      image.data[k + 2] = 255;
      image.data[k + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Fine random grain, used as a roughness or bump map for enamel and rubber. */
export function grainTexture(repeat, contrast) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const image = context.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 128 + (hash(i * 0.37) - 0.5) * contrast;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}

/** The sheet where it wraps round the platen: the paper colour with faint fibres, shaded below. */
export function paperTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 2600; i++) {
    context.fillStyle = `rgba(${90 + hash(i) * 60}, ${60 + hash(i + 1) * 40}, 30, ${hash(i + 2) * 0.05})`;
    context.fillRect(hash(i + 3) * 512, hash(i + 4) * 128, 1 + hash(i + 5) * 14, 1 + hash(i + 6) * 2);
  }
  const shade = context.createLinearGradient(0, 0, 0, 128);
  shade.addColorStop(0, 'rgba(80, 50, 20, 0)');
  shade.addColorStop(1, 'rgba(80, 50, 20, 0.35)');
  context.fillStyle = shade;
  context.fillRect(0, 0, 512, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Engraving for the nickel paper scale: black hairline ticks, one per terminal column, serif
 * numerals every ten columns and a red half-scale.
 */
export function scaleEngraving({width, height, cols, cell, offset, serif}) {
  const k = 4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * k);
  canvas.height = Math.round(height * k);
  const context = canvas.getContext('2d');
  context.scale(k, k);
  const ink = 'rgba(22, 17, 13, 0.95)';
  const red = 'rgba(168, 44, 28, 0.95)';
  const mid = height * 0.56;
  context.fillStyle = ink;
  context.fillRect(offset - 2, mid - 0.25, cols * cell + 4, 0.5);
  for (let col = 0; col <= cols; col++) {
    const x = offset + col * cell;
    const half = col % 5 === 0;
    let length = height * 0.1;
    if (col % 10 === 0) {
      length = height * 0.26;
    } else if (half) {
      length = height * 0.18;
    }
    context.fillStyle = ink;
    context.fillRect(x - 0.24, mid - length, 0.48, length);
    if (half) {
      context.fillStyle = red;
      context.fillRect(x - 0.2, mid, 0.4, height * 0.1);
    }
  }
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `600 ${(height * 0.27).toFixed(1)}px ${serif}`;
  context.fillStyle = ink;
  for (let col = 10; col <= cols; col += 10) {
    context.fillText(String(col), offset + col * cell, mid - height * 0.3);
  }
  context.font = `italic 600 ${(height * 0.24).toFixed(1)}px ${serif}`;
  context.fillStyle = red;
  for (let col = 5; col <= cols; col += 10) {
    context.fillText(String(col), offset + col * cell, height * 0.96);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** White letters on black: the alpha mask (sharp) or the bump map (blurred) of gilt lettering. */
export function letteringMask({text, width, height, serif, blur}) {
  const k = 4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * k);
  canvas.height = Math.round(height * k);
  const context = canvas.getContext('2d');
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.filter = blur ? `blur(${blur * k}px)` : 'none';
  context.fillStyle = '#fff';
  context.font = `600 ${Math.round(height * 0.6 * k)}px ${serif}`;
  // Letters are spaced by hand (no reliance on canvas letterSpacing) and the exact ink width is
  // centred, so the name sits in the middle of the machine.
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  const spacing = height * 0.3 * k;
  const letters = Array.from(text);
  const widths = letters.map((letter) => context.measureText(letter).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (widths.length - 1);
  let x = (canvas.width - total) / 2;
  letters.forEach((letter, i) => {
    context.fillText(letter, x, canvas.height / 2 + height * 0.05 * k);
    x += widths[i] + spacing;
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

/** A soft round glow for the bulb's halo. */
export function haloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const glow = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.08, 'rgba(255,255,255,0.7)');
  glow.addColorStop(0.3, 'rgba(255,255,255,0.12)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
