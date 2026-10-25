// A red wax seal on a silk ribbon, drawn on a canvas: an irregular blob of wax with a pressed rim,
// an embossed monogram and a soft highlight. Deterministic for a given seed, so a folio's seal
// looks the same every time it is drawn.

export type SealStyle = {
  seed: number;
  monogram: string;
  /** Font stack for the monogram. */
  display: string;
};

function ribbon(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  for (const side of [-1, 1]) {
    const tipX = x + side * r * 0.95;
    const tipY = y + r * 2.1;
    c.beginPath();
    c.moveTo(x + side * r * 0.12, y);
    c.lineTo(x + side * r * 0.62, y + r * 0.1);
    c.lineTo(tipX + side * r * 0.2, tipY);
    c.lineTo(tipX - side * r * 0.08, tipY - r * 0.28);
    c.lineTo(tipX - side * r * 0.42, tipY + r * 0.06);
    c.closePath();
    const silk = c.createLinearGradient(x, y, tipX, tipY);
    silk.addColorStop(0, '#5e1410');
    silk.addColorStop(0.5, '#8f241b');
    silk.addColorStop(1, '#6a1812');
    c.fillStyle = silk;
    c.fill();
  }
}

function blob(c: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  c.beginPath();
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const slow = 0.05 * Math.sin(3 * t + seed) + 0.035 * Math.sin(7 * t + seed * 2);
    const wobble = slow + 0.025 * Math.sin(13 * t + seed * 3);
    const px = x + Math.cos(t) * r * (1 + wobble);
    const py = y + Math.sin(t) * r * (1 + wobble);
    if (i === 0) {
      c.moveTo(px, py);
    } else {
      c.lineTo(px, py);
    }
  }
  c.closePath();
}

/** Draws the seal centred at (x, y) with radius r. */
export function drawSeal(c: CanvasRenderingContext2D, x: number, y: number, r: number, style: SealStyle) {
  c.save();
  ribbon(c, x, y, r);

  // The wax, with its shadow on the paper.
  c.shadowColor = 'rgba(40, 8, 4, 0.45)';
  c.shadowBlur = r * 0.18;
  c.shadowOffsetY = r * 0.06;
  blob(c, x, y, r, style.seed);
  const wax = c.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.08, x, y, r * 1.1);
  wax.addColorStop(0, '#c53a2b');
  wax.addColorStop(0.55, '#8f1f16');
  wax.addColorStop(1, '#5a0e09');
  c.fillStyle = wax;
  c.fill();
  c.shadowColor = 'transparent';

  // The pressed field inside the rim.
  c.beginPath();
  c.arc(x, y, r * 0.72, 0, Math.PI * 2);
  const field = c.createRadialGradient(x + r * 0.2, y + r * 0.25, r * 0.05, x, y, r * 0.75);
  field.addColorStop(0, '#9d281d');
  field.addColorStop(1, '#6e150f');
  c.fillStyle = field;
  c.fill();
  c.lineWidth = r * 0.06;
  c.strokeStyle = 'rgba(52, 6, 3, 0.6)';
  c.stroke();
  c.beginPath();
  c.arc(x - r * 0.02, y - r * 0.02, r * 0.75, Math.PI * 0.9, Math.PI * 1.75);
  c.lineWidth = r * 0.03;
  c.strokeStyle = 'rgba(255, 196, 176, 0.3)';
  c.stroke();

  // The monogram, embossed: a dark lower edge, a light upper edge, the wax colour between.
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `600 ${Math.round(r * 0.95)}px ${style.display}`;
  const baseline = y + r * 0.04;
  c.fillStyle = 'rgba(48, 6, 3, 0.75)';
  c.fillText(style.monogram, x + r * 0.03, baseline + r * 0.04);
  c.fillStyle = 'rgba(255, 190, 170, 0.45)';
  c.fillText(style.monogram, x - r * 0.025, baseline - r * 0.03);
  c.fillStyle = '#8a1c14';
  c.fillText(style.monogram, x, baseline);

  // A crescent and three stars above the letter.
  c.fillStyle = 'rgba(255, 190, 170, 0.35)';
  for (const offset of [-0.28, 0, 0.28]) {
    c.beginPath();
    c.arc(x + offset * r, y - r * 0.52 + Math.abs(offset) * r * 0.12, r * 0.035, 0, Math.PI * 2);
    c.fill();
  }

  // A highlight on the curved wax.
  c.beginPath();
  c.ellipse(x - r * 0.42, y - r * 0.46, r * 0.22, r * 0.1, -0.7, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255, 228, 220, 0.32)';
  c.fill();
  c.restore();
}
