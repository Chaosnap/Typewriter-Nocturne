// The lamp's pull cord, coming down from above at the top left of the room like the cord of a
// theatre curtain: a rope of three crimson silk strands laid with a gold thread, ending in a tassel
// with a gold-bound neck, a carved gilt head, a ruff of twisted gold and a skirt of silk threads.
//
// Pull it down to switch the lamp: the rope stretches, the switch clicks at the bottom of its
// travel, the cord springs back and swings. Every thread of the skirt is its own damped pendulum
// hanging from the ruff: threads trail behind the swing, fan out when the cord is tugged and
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
/** Top of the tassel's skirt, below its head and ruff, in tassel coordinates. */
const SKIRT_TOP = 40;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const random = (n: number) => {
  const s = Math.sin(n * 91.7 + 13.3) * 43758.5453;
  return s - Math.floor(s);
};

const SILK = ['#5a0b12', '#741019', '#951c25', '#83161f', '#a3242d'];

type Thread = {
  /** Root on the ruff, x in tassel coordinates. */
  root: number;
  length: number;
  /** Resting fan angle, radians. */
  fan: number;
  /** Natural frequency of the thread as a pendulum, Hz. */
  frequency: number;
  color: string;
  width: number;
};

const THREADS: Thread[] = Array.from({length: 48}, (_, i) => {
  const root = -10.5 + (i / 47) * 21;
  const length = 50 + random(i + 50) * 7;
  const gold = i % 8 === 4;
  return {
    root,
    length,
    fan: root * 0.018 + (random(i) - 0.5) * 0.03,
    // Longer threads swing slower, as pendulums do.
    frequency: 1.45 * Math.sqrt(52 / length) * (0.92 + random(i + 7) * 0.16),
    color: gold ? 'var(--tn-metal)' : SILK[i % SILK.length],
    width: gold ? 0.8 : 1.15
  };
});

/** The ruff under the tassel's head: a ring of twisted gold loops. */
const RUFF = Array.from({length: 11}, (_, i) => -11 + i * 2.2);

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

function threadPath(thread: Thread, angle: number) {
  const a = thread.fan + angle;
  const ex = thread.root + Math.sin(a) * thread.length;
  const ey = SKIRT_TOP + Math.cos(a) * thread.length;
  // The thread bends: its upper part stays close to the ruff, its end follows the swing.
  const cx = thread.root + Math.sin(a * 0.4) * thread.length * 0.55;
  const cy = SKIRT_TOP + Math.cos(a * 0.4) * thread.length * 0.55;
  return `M${thread.root.toFixed(2)} ${SKIRT_TOP} Q${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
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
   * Threads hang from the ruff of a tassel that swings with the cord: in the tassel's frame they are
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
          <linearGradient id="tn-cord-skirt-shade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="0.3" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.2" />
          </linearGradient>
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
                  key={thread.root}
                  d={threadPath(thread, 0)}
                  stroke={thread.color}
                  strokeWidth={thread.width}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
            </g>
            <rect x="-13" y={SKIRT_TOP} width="26" height="60" fill="url(#tn-cord-skirt-shade)" />
            {/* Neck: the rope bound with gold thread. */}
            <rect x="-2.6" y="-1" width="5.2" height="9" fill="url(#tn-cord-twist)" />
            <path className="tn-cord-binding" d="M-2.8 1 H2.8 M-2.8 2.8 H2.8 M-2.8 4.6 H2.8 M-2.8 6.4 H2.8" />
            {/* Head: a ball, a collar and a carved bell, all gilt. */}
            <circle cx="0" cy="11.2" r="4.4" fill="url(#tn-cord-metal-ball)" />
            <rect x="-5.8" y="14.4" width="11.6" height="2.6" rx="1.2" fill="url(#tn-cord-metal)" />
            <path
              d="M0 16.6 C5.2 16.6 6.8 20 6.4 23.4 C10.6 25.6 12 31.2 10.6 36.6 L-10.6 36.6 C-12 31.2 -10.6 25.6 -6.4 23.4 C-6.8 20 -5.2 16.6 0 16.6 Z"
              fill="url(#tn-cord-metal)"
            />
            <path className="tn-cord-ring" d="M-6.8 24.4 Q0 26.6 6.8 24.4 M-10.9 31.2 Q0 33.8 10.9 31.2" />
            <path className="tn-cord-carving" d="M-4 27.6 Q-2 29.4 0 27.6 Q2 29.4 4 27.6" />
            {RUFF.map((x) => (
              <ellipse key={x} cx={x} cy="38.4" rx="1.5" ry="2" fill="url(#tn-cord-metal-ball)" />
            ))}
            <ellipse className="tn-cord-glint" cx="-4.4" cy="27.5" rx="1.4" ry="5.4" />
            <ellipse className="tn-cord-glint" cx="-1.6" cy="10" rx="1.1" ry="1.6" />
          </g>
        </g>
      </svg>
    </button>
  );
}
