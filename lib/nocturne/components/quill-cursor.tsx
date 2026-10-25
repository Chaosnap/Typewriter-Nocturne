// The quill cursor. In place of a block, a quill pen stands at the insertion point with its nib on
// the line: it breathes softly, a light runs up its vane and the nib glints while the terminal
// waits for input. xterm.js keeps its own cursor (a thin bar in a transparent colour, see
// apply-config.ts), so selection, input methods and screen readers behave exactly as before; the
// quill is only drawn over it and never takes the pointer. It hides when a program hides the
// cursor or the view is scrolled back, and rests, dimmed, when the terminal loses focus.
//
// The pen is drawn as a real one: a gilt nib in a ferrule on a bare horn quill, a little down at
// the foot of the vane, a curved rachis, and a vane narrow on its leading side and broad on its
// trailing side, made of fine barbs with a split or two. A raven quill on light paper, a swan quill
// on dark paper (the colours are in nocturne.css).

import React, {useEffect, useRef} from 'react';

import {getLastCursor, on} from '../bus';
import type {CursorFrame} from '../bus';

/** The drawing's box with the nib at (0, 0): it reaches 4 units left of the nib and 74 above it. */
const VIEW = {left: 4, top: 74, width: 64, height: 78};
/** The quill stands about as tall as a line, the size of the block. */
const LINES = 1.15;
/** Where the nib touches the cell: its left edge, a little above the bottom (the baseline). */
const NIB_AT = {x: 0.15, y: 0.84};
/** The pen leans to the right, as a hand holds it. */
const LEAN = 35;

type Point = [number, number];

const round = (value: number) => Number(value.toFixed(2));

/** A smooth curve through the points (Catmull-Rom, as cubic Béziers), without the initial move. */
function curveThrough(points: Point[]) {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[Math.max(0, i - 1)];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[Math.min(points.length - 1, i + 2)];
    const c1 = [round(x1 + (x2 - x0) / 6), round(y1 + (y2 - y0) / 6)];
    const c2 = [round(x2 - (x3 - x1) / 6), round(y2 - (y3 - y1) / 6)];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x2} ${y2}`;
  }
  return d;
}

const pathThrough = (points: Point[]) => `M${points[0][0]} ${points[0][1]}${curveThrough(points)}`;

// The pen is drawn upright, nib down at the origin, and leant as a whole.

/** The rachis, the feather's spine: a gentle curve from the top of the bare quill to the tip. */
const RACHIS: Point[] = [
  [0, -24],
  [0.4, -46],
  [2.4, -70],
  [5.6, -90]
];

function along(t: number): {at: Point; tangent: Point; normal: Point} {
  const [p0, p1, p2, p3] = RACHIS;
  const u = 1 - t;
  const weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const at: Point = [0, 0];
  RACHIS.forEach((p, i) => {
    at[0] += weights[i] * p[0];
    at[1] += weights[i] * p[1];
  });
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const length = Math.hypot(dx, dy) || 1;
  const tangent: Point = [dx / length, dy / length];
  // Pointing to the trailing (right) side of the feather.
  return {at, tangent, normal: [-tangent[1], tangent[0]]};
}

/** The vane begins a little above the bare quill and runs to the tip. */
const VANE_FROM = 0.05;
const gauss = (s: number, at: number, width: number) => Math.exp(-(((s - at) / width) ** 2));

/** Width of each side of the vane at a share s of its length, with the splits between barbs. */
const trailingWidth = (s: number) =>
  8.4 * Math.sin(Math.PI * s ** 0.75) ** 0.85 * (1 - 0.3 * gauss(s, 0.42, 0.018) - 0.24 * gauss(s, 0.67, 0.016));
const leadingWidth = (s: number) => 3.4 * Math.sin(Math.PI * s ** 0.65) ** 0.9 * (1 - 0.32 * gauss(s, 0.56, 0.02));

/** A point on an edge of the vane: barbs sweep towards the tip, so the edge leans forward. */
function edge(s: number, side: 1 | -1, reach = 1): Point {
  const t = VANE_FROM + (1 - VANE_FROM) * s;
  const {at, tangent, normal} = along(t);
  const width = (side > 0 ? trailingWidth(s) : leadingWidth(s)) * reach;
  return [
    round(at[0] + normal[0] * width * side + tangent[0] * width * 0.38),
    round(at[1] + normal[1] * width * side + tangent[1] * width * 0.38)
  ];
}

const SAMPLES = Array.from({length: 61}, (_, i) => i / 60);

const VANE = (() => {
  const leading = SAMPLES.map((s) => edge(s, -1));
  const trailing = [...SAMPLES].reverse().map((s) => edge(s, 1));
  return `${pathThrough([...leading, ...trailing.slice(1)])} Z`;
})();

/** The barbs: fine lines from the rachis out to the edge, sweeping towards the tip. */
function barbs(side: 1 | -1, count: number) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const s = 0.04 + (i / (count - 1)) * 0.9;
    const {at, normal} = along(VANE_FROM + (1 - VANE_FROM) * s);
    const end = edge(Math.min(1, s + 0.05), side, 0.94);
    const width = side > 0 ? trailingWidth(s) : leadingWidth(s);
    const control: Point = [
      round(at[0] + normal[0] * width * side * 0.55),
      round(at[1] + normal[1] * width * side * 0.55)
    ];
    d += `M${round(at[0])} ${round(at[1])} Q${control[0]} ${control[1]} ${end[0]} ${end[1]} `;
  }
  return d.trim();
}

const TRAILING_BARBS = barbs(1, 30);
const LEADING_BARBS = barbs(-1, 22);

/** The rachis as a tapering shape: stout at the foot of the vane, a hair at the tip. */
const RACHIS_SHAPE = (() => {
  const steps = Array.from({length: 25}, (_, i) => (i / 24) * 0.98);
  const side = (sign: 1 | -1) =>
    steps.map((t): Point => {
      const {at, normal} = along(t);
      const half = 0.62 * (1 - t) + 0.08;
      return [round(at[0] + normal[0] * half * sign), round(at[1] + normal[1] * half * sign)];
    });
  return `${pathThrough([...side(-1), ...side(1).reverse()])} Z`;
})();
/** A fine highlight along the rachis: the same curve as RACHIS. */
const RACHIS_LINE = 'M-0.15 -24 C0.25 -46 2.25 -70 5.6 -90';

/** The bare quill (calamus), horn-coloured, from the ferrule to the foot of the vane. */
const CALAMUS = 'M-1.15 -10.4 C-1.2 -15 -1.05 -20 -0.82 -24.6 L0.82 -24.6 C1.05 -20 1.2 -15 1.15 -10.4 Z';
/** Down at the foot of the vane: a few soft curling wisps. */
const DOWN =
  'M0 -25.2 q-2.6 0.5 -4.6 -1.4 M0 -26.6 q-3 -0.2 -4.8 -3.2 M0.1 -28 q-2.4 -0.9 -3.6 -4.2 ' +
  'M0.2 -25.4 q2.8 0.7 4.8 -0.8 M0.2 -27 q3.3 -0.1 5.2 -2.9 M0.3 -28.6 q2.7 -0.8 4 -4';
/** The ferrule that holds the nib, and the gilt nib with its slit and breather hole. */
const FERRULE = 'M-1.55 -9 L1.55 -9 L1.4 -11.2 L-1.4 -11.2 Z';
const NIB = 'M0 0.3 C-0.6 -2 -1.9 -5.4 -1.7 -9.1 L1.7 -9.1 C1.9 -5.4 0.6 -2 0 0.3 Z';
const SLIT = 'M0 -0.2 L0 -5.4';
const SHOULDERS = 'M-1.5 -7.6 Q0 -8.3 1.5 -7.6';

type QuillCursorProps = {
  /** Remount key only; colours follow the paper through CSS. */
  appearance: 'light' | 'dark';
};

export function QuillCursor({appearance}: QuillCursorProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const place = (frame: CursorFrame) => {
      const element = elementRef.current;
      // The stage, not offsetParent: that is null while the quill is hidden, so it would never show.
      const stage = element?.parentElement;
      if (!element || !stage) {
        return;
      }
      if (!frame.visible || frame.cursorHidden) {
        element.style.display = 'none';
        return;
      }
      const origin = stage.getBoundingClientRect();
      const height = frame.height * LINES;
      const scale = height / VIEW.height;
      const x = frame.x + frame.width * NIB_AT.x - origin.left - VIEW.left * scale;
      const y = frame.y + frame.height * NIB_AT.y - origin.top - VIEW.top * scale;
      element.style.display = 'block';
      element.style.width = `${(VIEW.width * scale).toFixed(2)}px`;
      element.style.height = `${height.toFixed(2)}px`;
      element.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      element.dataset.focused = String(frame.focused);
    };
    // The cursor may have stopped moving before the quill was switched on.
    const last = getLastCursor();
    if (last) {
      place(last);
    }
    return on('cursor', place);
  }, []);

  return (
    <div ref={elementRef} className="tn-quill" data-appearance={appearance} aria-hidden="true">
      <svg viewBox={`${-VIEW.left} ${-VIEW.top} ${VIEW.width} ${VIEW.height}`}>
        <defs>
          <linearGradient id="tn-quill-vane" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{stopColor: 'var(--tn-quill-edge)'}} />
            <stop offset="0.3" style={{stopColor: 'var(--tn-quill-sheen)'}} />
            <stop offset="0.5" style={{stopColor: 'var(--tn-quill-body)'}} />
            <stop offset="1" style={{stopColor: 'var(--tn-quill-edge)'}} />
          </linearGradient>
          <linearGradient id="tn-quill-gilt" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{stopColor: 'var(--tn-metal-lo)'}} />
            <stop offset="0.35" style={{stopColor: 'var(--tn-metal-hi)'}} />
            <stop offset="0.6" style={{stopColor: 'var(--tn-metal)'}} />
            <stop offset="1" style={{stopColor: 'var(--tn-metal-lo)'}} />
          </linearGradient>
          <linearGradient id="tn-quill-horn" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#8c7651" />
            <stop offset="0.35" stopColor="#f3e6c6" />
            <stop offset="1" stopColor="#a58d61" />
          </linearGradient>
          <clipPath id="tn-quill-clip">
            <path d={VANE} />
          </clipPath>
        </defs>
        <g className="tn-quill-sway">
          <g transform={`rotate(${LEAN})`}>
            <path d={DOWN} className="tn-quill-down" />
            <path d={VANE} className="tn-quill-vane" />
            <g clipPath="url(#tn-quill-clip)">
              <path d={TRAILING_BARBS} className="tn-quill-barbs" />
              <path d={LEADING_BARBS} className="tn-quill-barbs" />
              <rect className="tn-quill-shine" x="-8" y="-32" width="22" height="8" />
            </g>
            <path d={RACHIS_SHAPE} className="tn-quill-rachis" />
            <path d={RACHIS_LINE} className="tn-quill-rachis-light" />
            <path d={CALAMUS} fill="url(#tn-quill-horn)" />
            <path d={FERRULE} fill="url(#tn-quill-gilt)" />
            <path d={NIB} fill="url(#tn-quill-gilt)" />
            <path d={SHOULDERS} className="tn-quill-engraving" />
            <path d={SLIT} className="tn-quill-engraving" />
            <circle cx="0" cy="-6" r="0.5" className="tn-quill-hole" />
            <circle className="tn-quill-glint" cx="0.4" cy="-1.8" r="0.9" />
          </g>
        </g>
      </svg>
    </div>
  );
}
