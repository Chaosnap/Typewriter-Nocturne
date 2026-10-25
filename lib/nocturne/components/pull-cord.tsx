// The lamp's pull cord, coming down from above at the top left of the room like the cord of a
// theatre curtain: a rope of three crimson silk strands laid with a gold thread, ending in a tassel
// as passementerie makers build them: a gilt bead, a pear-shaped mould wrapped in crimson silk and
// laced with gold cords, a twisted gold band round its foot, and under it, a little narrower, a skirt
// of fine silk threads that draws in at the middle and flares at the ends like the branches of a
// hyperbola, catching the light in a band as silk does.
//
// Pull it down to switch the lamp: the rope stretches, the switch clicks at the bottom of its
// travel, the cord springs back and swings. Every thread of the skirt is its own damped pendulum
// hanging from the mould: threads trail behind the swing, fan out when the cord is tugged and
// settle at their own pace. Keyboard users press it like a button. Drawn with SVG and moved
// through refs, so dragging never re-renders React.

import React, {useEffect, useRef} from 'react';

import {stepSpring} from '../../../app/nocturne/carriage-physics';
import type {Body} from '../../../app/nocturne/carriage-physics';
import {emit} from '../bus';

const ANCHOR_X = 26;
/** The rope enters from just above the top edge. */
const ROPE_TOP = -6;
/** A slender rope: long and thin, as the cord of a curtain is. */
const ROPE_WIDTH = 3.6;
/** The rope hangs about 230px before the tassel. */
const LENGTH = 225;
/** How far the cord must be pulled before the switch clicks, px. */
const TRAVEL = 34;
const MAX_PULL = 60;
const STRETCH = {frequency: 6, damping: 0.3};
const SWING = {frequency: 0.65, damping: 0.06};
const ANGLE_REST = {distance: 0.002, speed: 0.004};
/** Top of the tassel's skirt, under the gold band at the mould's foot, in tassel coordinates. */
const SKIRT_TOP = 33.4;
/** Length of the skirt's threads, for the sheen that runs across them. */
const SKIRT_LENGTH = 60;
/**
 * The skirt's profile, as a share of a thread's place under the band: it draws in to WAIST at
 * WAIST_AT of its length and flares to FLARE at the ends, along the two branches of a hyperbola.
 */
const WAIST = 0.66;
const WAIST_AT = 0.4;
const FLARE = 1.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const random = (n: number) => {
  const s = Math.sin(n * 91.7 + 13.3) * 43758.5453;
  return s - Math.floor(s);
};

type Point = [number, number];

/** A smooth curve through the points (Catmull-Rom, as cubic Béziers), without the initial move. */
function curveThrough(points: Point[]) {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[Math.max(0, i - 1)];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[Math.min(points.length - 1, i + 2)];
    const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
    const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
    d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${x2} ${y2}`;
  }
  return d;
}

/** Half-width of the tassel's mould down its height: a pear under the bead, a neck, a foot. */
const HEAD: Point[] = [
  [3.1, 10.6],
  [4.9, 12.6],
  [6.5, 15.2],
  [7.6, 18.4],
  [7.9, 21.4],
  [7.4, 24.2],
  [6.3, 26.6],
  [6, 28.6],
  [6.6, 30.2],
  [6.9, 31.2]
];

const HEAD_OUTLINE = (() => {
  const right = HEAD.map(([w, y]): Point => [w, y]);
  const left = [...HEAD].reverse().map(([w, y]): Point => [-w, y]);
  return `M${right[0][0]} ${right[0][1]}${curveThrough(right)} L${left[0][0]} ${left[0][1]}${curveThrough(left)} Z`;
})();

/** Gold cords laced down the mould, as meridians of its round form seen from the front. */
const HEAD_CORDS = [-0.84, -0.46, 0, 0.46, 0.84].map((f) => {
  const points = HEAD.map(([w, y]): Point => [Number((f * w).toFixed(2)), y]);
  return {f, d: `M${points[0][0]} ${points[0][1]}${curveThrough(points)}`};
});

type Thread = {
  /** Where the thread leaves the band, x in tassel coordinates. */
  root: number;
  length: number;
  /** A thread never hangs quite straight: its own small angle at rest, radians. */
  fan: number;
  /** Natural frequency of the thread as a pendulum, Hz. */
  frequency: number;
  /** A gradient: the threads behind are darker, a few are gold. */
  color: string;
  width: number;
};

const BACK_THREADS = 40;
const FRONT_THREADS = 56;

/**
 * Threads behind first, then the front ones over them. The skirt is round: front threads are
 * brightest in the middle and darker towards the sides; a few gold threads run through it.
 */
const THREADS: Thread[] = Array.from({length: BACK_THREADS + FRONT_THREADS}, (_, n) => {
  const back = n < BACK_THREADS;
  const i = back ? n : n - BACK_THREADS;
  const count = back ? BACK_THREADS : FRONT_THREADS;
  const root = (back ? -5.6 : -6.1) + (i / (count - 1)) * (back ? 11.2 : 12.2);
  const length = SKIRT_LENGTH - 5 + random(n + 50) * 7;
  const gold = !back && i % 9 === 4;
  const side = Math.abs(root);
  let color = 'url(#tn-silk-back)';
  if (gold) {
    color = 'url(#tn-silk-gold)';
  } else if (!back) {
    // Lit by its place on the round skirt, then varied thread by thread, so each one shows.
    const shade = random(n + 90);
    let level = side < 2.3 ? 2 : side < 4.5 ? 0 : 1;
    if (shade > 0.86) {
      level = 2;
    }
    color = shade < 0.3 ? 'url(#tn-silk-back)' : `url(#tn-silk-${level})`;
  }
  let width = back ? 0.85 : 0.62;
  if (gold) {
    width = 0.42;
  }
  return {
    root,
    length,
    fan: (random(n) - 0.5) * 0.04,
    // Longer threads swing slower, as pendulums do.
    frequency: 1.45 * Math.sqrt(55 / length) * (0.92 + random(n + 7) * 0.16),
    color,
    width
  };
});

/** Silk catches the light in a band across the skirt: a dark root under the band, the sheen, the ends. */
const SILKS = [
  {id: 'tn-silk-0', stops: ['#33040a', '#7d131c', '#d9555e', '#9e1e28', '#6e1018'], sheen: 0.28},
  {id: 'tn-silk-1', stops: ['#2c0408', '#701019', '#c9464f', '#8f1a23', '#5e0c14'], sheen: 0.32},
  {id: 'tn-silk-2', stops: ['#3a060c', '#8a1820', '#e66a71', '#a8242e', '#741219'], sheen: 0.25},
  {id: 'tn-silk-back', stops: ['#1c0206', '#3f0810', '#7a1a22', '#4f0b13', '#33060c'], sheen: 0.3},
  {id: 'tn-silk-gold', stops: ['#4a3410', '#9c7a34', '#fbe6a6', '#c49a45', '#7d5c1f'], sheen: 0.29}
];

type CordState = {
  /** Extra length while pulled, px. */
  stretch: Body;
  /** Swing about the point where the rope comes in, radians. */
  angle: Body;
  /** Each thread's angle away from its fan, radians, and its angular velocity. */
  threads: Float64Array;
  threadVelocity: Float64Array;
  dragging: boolean;
  /** The switch has clicked during this pull. */
  clicked: boolean;
  start: {x: number; y: number};
  travelled: number;
  frame: number;
  last: number;
};

const atRest = (body: Body) => body.position === 0 && body.velocity === 0;

/** The skirt's width at a share t of its length, relative to its top: a hyperbola on each side. */
function profile(t: number) {
  const below = t > WAIST_AT;
  const reach = below ? (FLARE ** 2 - WAIST ** 2) / (1 - WAIST_AT) ** 2 : (1 - WAIST ** 2) / WAIST_AT ** 2;
  return Math.sqrt(WAIST ** 2 + reach * (t - WAIST_AT) ** 2);
}

const PROFILE = [0, 0.18, WAIST_AT, 0.7, 1].map((t) => ({t, width: profile(t)}));

function threadPath(thread: Thread, angle: number) {
  // The swing moves a thread more the further down it is, as a hanging thread bends.
  const sway = Math.sin(thread.fan + angle) * thread.length;
  const points = PROFILE.map(({t, width}): Point => [
    Number((thread.root * width + sway * t * t).toFixed(2)),
    Number((SKIRT_TOP + thread.length * t).toFixed(2))
  ]);
  return `M${points[0][0]} ${points[0][1]}${curveThrough(points)}`;
}

type PullCordProps = {
  on: boolean;
  onToggle: () => void;
};

export function PullCord({on, onToggle}: PullCordProps) {
  const swingRef = useRef<SVGGElement>(null);
  const ropeRef = useRef<SVGGElement>(null);
  const tasselRef = useRef<SVGGElement>(null);
  const skirtRef = useRef<SVGGElement>(null);
  const state = useRef<CordState>({
    stretch: {position: 0, velocity: 0},
    angle: {position: 0, velocity: 0},
    threads: new Float64Array(THREADS.length),
    threadVelocity: new Float64Array(THREADS.length),
    dragging: false,
    clicked: false,
    start: {x: 0, y: 0},
    travelled: 0,
    frame: 0,
    last: 0
  });
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;
  const reduceMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)'));

  const draw = () => {
    const {stretch, angle, threads} = state.current;
    const length = LENGTH + stretch.position;
    swingRef.current?.setAttribute('transform', `rotate(${(angle.position * 180) / Math.PI} ${ANCHOR_X} 0)`);
    ropeRef.current?.querySelectorAll('rect').forEach((rect) => rect.setAttribute('height', String(length - ROPE_TOP)));
    tasselRef.current?.setAttribute('transform', `translate(${ANCHOR_X} ${length})`);
    skirtRef.current?.querySelectorAll('path').forEach((path, i) => {
      path.setAttribute('d', threadPath(THREADS[i], threads[i]));
    });
  };

  /**
   * Threads hang from the mould of a tassel that swings with the cord: in the tassel's frame they are
   * pulled back towards world-vertical (−angle), pushed by the swing's acceleration and fanned out by
   * a sudden tug on the cord.
   */
  const stepThreads = (dt: number, angularAcceleration: number, tug: number) => {
    const s = state.current;
    const swing = s.angle.position;
    const reach = (LENGTH + s.stretch.position) * angularAcceleration;
    let moving = false;
    for (let i = 0; i < THREADS.length; i++) {
      const thread = THREADS[i];
      const w = 2 * Math.PI * thread.frequency;
      const target = -swing * 0.75 + Math.sign(thread.root) * clamp(tug, -0.35, 0.35) * Math.abs(thread.root) * 0.06;
      let position = s.threads[i];
      let velocity = s.threadVelocity[i];
      let remaining = dt;
      while (remaining > 0) {
        const h = Math.min(1 / 240, remaining);
        remaining -= h;
        velocity += (-w * w * (position - target) - 2 * 0.11 * w * velocity - reach / thread.length) * h;
        position = clamp(position + velocity * h, -0.9, 0.9);
      }
      if (Math.abs(position - target) < 0.0015 && Math.abs(velocity) < 0.004) {
        position = target;
        velocity = 0;
      } else {
        moving = true;
      }
      s.threads[i] = position;
      s.threadVelocity[i] = velocity;
    }
    return moving;
  };

  const step = (now: number) => {
    const s = state.current;
    const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 1 / 60;
    s.last = now;
    const before = s.angle.velocity;
    const pullBefore = s.stretch.velocity;
    if (!s.dragging) {
      s.stretch = stepSpring(s.stretch, 0, STRETCH, dt);
      s.angle = stepSpring(s.angle, 0, SWING, dt, ANGLE_REST);
    }
    const angularAcceleration = dt > 0 ? (s.angle.velocity - before) / dt : 0;
    const tug = dt > 0 ? (s.stretch.velocity - pullBefore) / dt / 6000 : 0;
    const threadsMoving = stepThreads(dt, angularAcceleration, tug);
    draw();
    if (s.dragging || threadsMoving || !atRest(s.stretch) || !atRest(s.angle)) {
      s.frame = requestAnimationFrame(step);
    } else {
      s.frame = 0;
      s.last = 0;
    }
  };

  const animate = () => {
    if (!state.current.frame) {
      state.current.frame = requestAnimationFrame(step);
    }
  };

  const click = () => {
    state.current.clicked = true;
    emit('cue', {kind: 'cord'});
    toggleRef.current();
  };

  /** A pull without dragging: a click, a tap or the keyboard. */
  const pullOnce = () => {
    click();
    if (reduceMotion.current.matches) {
      return;
    }
    const s = state.current;
    s.stretch = {position: s.stretch.position, velocity: 560};
    s.angle = {position: s.angle.position, velocity: (Math.random() - 0.5) * 0.7};
    animate();
  };

  useEffect(() => {
    const s = state.current;
    draw();
    return () => cancelAnimationFrame(s.frame);
  }, []);

  // Switched from the menu or a shortcut: the cord stirs a little.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!state.current.dragging && !reduceMotion.current.matches) {
      state.current.angle = {position: state.current.angle.position, velocity: 0.3};
      animate();
    }
  }, [on]);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    // Keeps keyboard focus in the terminal.
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const s = state.current;
    s.dragging = true;
    s.clicked = false;
    s.travelled = 0;
    s.start = {x: event.clientX, y: event.clientY};
    animate();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const s = state.current;
    if (!s.dragging) {
      return;
    }
    const dx = event.clientX - s.start.x;
    const dy = event.clientY - s.start.y;
    s.travelled = Math.max(s.travelled, Math.hypot(dx, dy));
    const pull = dy > TRAVEL ? TRAVEL + (dy - TRAVEL) * 0.35 : Math.max(0, dy);
    const previousPull = s.stretch.position;
    const stretch = clamp(pull, 0, MAX_PULL);
    s.stretch = {position: stretch, velocity: (stretch - previousPull) * 60};
    const previous = s.angle.position;
    const angle = clamp(Math.atan2(dx, LENGTH + stretch), -0.5, 0.5);
    s.angle = {position: angle, velocity: (angle - previous) * 60};
    if (!s.clicked && stretch >= TRAVEL) {
      click();
    }
  };

  const onPointerUp = () => {
    const s = state.current;
    if (!s.dragging) {
      return;
    }
    s.dragging = false;
    s.stretch = {position: s.stretch.position, velocity: 0};
    if (!s.clicked && s.travelled < 4) {
      pullOnce();
      return;
    }
    animate();
  };

  return (
    <button
      type="button"
      className="tn-cord"
      aria-label="Lamp cord: pull to switch the lamp on or off"
      aria-pressed={on}
      title="Pull to switch the lamp on or off"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(event) => event.detail === 0 && pullOnce()}
    >
      <svg viewBox="0 0 52 400" aria-hidden="true">
        <defs>
          <linearGradient id="tn-cord-metal" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{stopColor: 'var(--tn-metal-lo)'}} />
            <stop offset="0.3" style={{stopColor: 'var(--tn-metal-hi)'}} />
            <stop offset="0.55" style={{stopColor: 'var(--tn-metal)'}} />
            <stop offset="0.8" style={{stopColor: 'var(--tn-metal-hi)'}} />
            <stop offset="1" style={{stopColor: 'var(--tn-metal-lo)'}} />
          </linearGradient>
          <radialGradient id="tn-cord-metal-ball" cx="0.35" cy="0.35" r="0.7">
            <stop offset="0" style={{stopColor: 'var(--tn-metal-hi)'}} />
            <stop offset="0.55" style={{stopColor: 'var(--tn-metal)'}} />
            <stop offset="1" style={{stopColor: 'var(--tn-metal-lo)'}} />
          </radialGradient>
          <linearGradient id="tn-cord-round" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.6" />
            <stop offset="0.28" stopColor="#fff" stopOpacity="0.2" />
            <stop offset="0.42" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="0.75" stopColor="#000" stopOpacity="0.2" />
            <stop offset="1" stopColor="#000" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="tn-cord-strand" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#5e0d14" />
            <stop offset="0.45" stopColor="#b02a33" />
            <stop offset="1" stopColor="#6a1018" />
          </linearGradient>
          {SILKS.map((silk) => (
            <linearGradient
              key={silk.id}
              id={silk.id}
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={SKIRT_TOP}
              y2={SKIRT_TOP + SKIRT_LENGTH}
            >
              <stop offset="0" stopColor={silk.stops[0]} />
              <stop offset={silk.sheen - 0.14} stopColor={silk.stops[1]} />
              <stop offset={silk.sheen} stopColor={silk.stops[2]} />
              <stop offset={silk.sheen + 0.16} stopColor={silk.stops[3]} />
              <stop offset="1" stopColor={silk.stops[4]} />
            </linearGradient>
          ))}
          {/* The mould's crimson silk, round: shadowed at both sides, lit on the left. */}
          <linearGradient id="tn-tassel-silk" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#2a0307" />
            <stop offset="0.24" stopColor="#a4303a" />
            <stop offset="0.36" stopColor="#d15560" />
            <stop offset="0.58" stopColor="#8c1a23" />
            <stop offset="1" stopColor="#2c0408" />
          </linearGradient>
          <radialGradient id="tn-tassel-volume" cx="0.4" cy="0.42" r="0.62">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.5" />
          </radialGradient>
          {/* Silk wound round the mould: fine dark lines between the turns. */}
          <pattern id="tn-tassel-wraps" width="4" height="0.9" patternUnits="userSpaceOnUse">
            <rect y="0.62" width="4" height="0.28" fill="#000" opacity="0.32" />
            <rect y="0.05" width="4" height="0.16" fill="#fff" opacity="0.1" />
          </pattern>
          {/* A twisted gold cord (gimp) for the band at the mould's foot. */}
          <pattern
            id="tn-tassel-gimp"
            width="1.6"
            height="1.6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(52)"
          >
            <rect width="1.6" height="1.6" style={{fill: 'var(--tn-metal-lo)'}} />
            <rect width="1.6" height="0.9" style={{fill: 'var(--tn-metal-hi)'}} />
            <rect y="0.2" width="1.6" height="0.3" fill="#fff" opacity="0.4" />
          </pattern>
          <clipPath id="tn-tassel-head">
            <path d={HEAD_OUTLINE} />
          </clipPath>
          {/* Three crimson strands, each rounded by its own shading, laid with a fine gold thread. */}
          <pattern
            id="tn-cord-twist"
            width="6"
            height="4.2"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-38)"
          >
            <rect width="6" height="4.2" fill="#4a0910" />
            <rect y="0.25" width="6" height="1.2" fill="url(#tn-cord-strand)" />
            <rect y="1.6" width="6" height="1.2" fill="url(#tn-cord-strand)" />
            <rect y="2.95" width="6" height="0.85" style={{fill: 'var(--tn-metal)'}} />
            <rect y="3.05" width="6" height="0.25" fill="#fff" opacity="0.35" />
          </pattern>
        </defs>
        <g ref={swingRef}>
          <g ref={ropeRef}>
            <rect
              x={ANCHOR_X - ROPE_WIDTH / 2}
              y={ROPE_TOP}
              width={ROPE_WIDTH}
              height={LENGTH - ROPE_TOP}
              fill="url(#tn-cord-twist)"
            />
            <rect
              x={ANCHOR_X - ROPE_WIDTH / 2}
              y={ROPE_TOP}
              width={ROPE_WIDTH}
              height={LENGTH - ROPE_TOP}
              fill="url(#tn-cord-round)"
            />
          </g>
          <g ref={tasselRef} transform={`translate(${ANCHOR_X} ${LENGTH})`}>
            <g ref={skirtRef}>
              {THREADS.map((thread) => (
                <path
                  key={`${thread.root}-${thread.width}`}
                  d={threadPath(thread, 0)}
                  stroke={thread.color}
                  strokeWidth={thread.width}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
            </g>
            {/* Neck: the rope bound with gold thread, and a gilt bead. */}
            <rect x="-2.3" y="-1" width="4.6" height="6.2" fill="url(#tn-cord-twist)" />
            <path className="tn-cord-binding" d="M-2.5 0.8 H2.5 M-2.5 2.4 H2.5 M-2.5 4 H2.5" />
            <circle cx="0" cy="7.8" r="3.3" fill="url(#tn-cord-metal-ball)" />
            <ellipse className="tn-cord-glint" cx="-1.2" cy="6.7" rx="0.9" ry="1.2" />
            {/* The mould: crimson silk wound round it, gold cords laced down it, its volume shaded. */}
            <path d={HEAD_OUTLINE} fill="url(#tn-tassel-silk)" />
            <g clipPath="url(#tn-tassel-head)">
              <rect x="-10" y="10" width="20" height="22" fill="url(#tn-tassel-wraps)" />
              {HEAD_CORDS.map((cord) => (
                <path
                  key={cord.f}
                  d={cord.d}
                  className="tn-tassel-cord"
                  style={{opacity: 1 - Math.abs(cord.f) * 0.45}}
                />
              ))}
              <rect x="-10" y="10" width="20" height="22" fill="url(#tn-tassel-volume)" />
            </g>
            <ellipse className="tn-cord-glint" cx="-4.3" cy="19.5" rx="1.3" ry="4.6" />
            {/* The band of twisted gold round the mould's foot. */}
            <rect x="-7.3" y="30.3" width="14.6" height="3.6" rx="1.6" fill="url(#tn-tassel-gimp)" />
            <rect x="-7.3" y="30.3" width="14.6" height="3.6" rx="1.6" fill="url(#tn-cord-round)" />
          </g>
        </g>
      </svg>
    </button>
  );
}
