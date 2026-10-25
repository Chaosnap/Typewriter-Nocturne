// The lamp's pull cord, hanging at the top left of the room like the cord of a theatre curtain: a
// slender rope of crimson silk twisted with gold thread, ending in a tassel with a gilt, turned
// head, a ruff of gold loops and a skirt of silk threads. Pull it down to switch the lamp: it
// stretches, the switch clicks at the bottom of its travel, the cord springs back and swings, and
// the threads of the tassel trail behind. Keyboard users press it like a button. Drawn with SVG
// and moved through refs, so dragging never re-renders React.

import React, {useEffect, useRef} from 'react';

import {stepSpring} from '../../../app/nocturne/carriage-physics';
import type {Body} from '../../../app/nocturne/carriage-physics';
import {emit} from '../bus';

const ANCHOR_X = 22;
/** Where the rope leaves the ceiling rose. */
const ROPE_TOP = 9;
const LENGTH = 150;
/** How far the cord must be pulled before the switch clicks, px. */
const TRAVEL = 34;
const MAX_PULL = 60;
const STRETCH = {frequency: 6.5, damping: 0.32};
const SWING = {frequency: 0.7, damping: 0.06};
const ANGLE_REST = {distance: 0.002, speed: 0.004};
/** Top of the tassel's skirt, below its head and ruff. */
const SKIRT_TOP = 30;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const random = (n: number) => {
  const s = Math.sin(n * 91.7 + 13.3) * 43758.5453;
  return s - Math.floor(s);
};

const SILK = ['#5c0c13', '#7a121b', '#9e2029', '#871820'];

/** The silk threads of the skirt, fanning out a little and ending unevenly. */
const THREADS = Array.from({length: 36}, (_, i) => {
  const start = -7.6 + (i / 35) * 15.2;
  const end = start * 1.32 + (random(i) - 0.5) * 1.4;
  const length = 36 + random(i + 50) * 5;
  const gold = i % 7 === 3;
  return {
    d: `M${start.toFixed(2)} ${SKIRT_TOP} Q${(start * 1.12).toFixed(2)} ${SKIRT_TOP + 18} ${end.toFixed(2)} ${(SKIRT_TOP + length).toFixed(2)}`,
    color: gold ? 'var(--tn-metal)' : SILK[i % SILK.length],
    width: gold ? 0.7 : 1
  };
});

/** The ruff under the tassel's head: a row of small gold loops. */
const RUFF = Array.from({length: 9}, (_, i) => -8.8 + i * 2.2);

type CordState = {
  /** Extra length while pulled, px. */
  stretch: Body;
  /** Swing about the ceiling rose, radians. */
  angle: Body;
  dragging: boolean;
  /** The switch has clicked during this pull. */
  clicked: boolean;
  start: {x: number; y: number};
  travelled: number;
  frame: number;
  last: number;
};

const atRest = (body: Body) => body.position === 0 && body.velocity === 0;

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
    const {stretch, angle} = state.current;
    const length = LENGTH + stretch.position;
    swingRef.current?.setAttribute('transform', `rotate(${(angle.position * 180) / Math.PI} ${ANCHOR_X} 0)`);
    ropeRef.current?.querySelectorAll('rect').forEach((rect) => rect.setAttribute('height', String(length - ROPE_TOP)));
    tasselRef.current?.setAttribute('transform', `translate(${ANCHOR_X} ${length})`);
    // The threads trail behind the swing.
    const trail = clamp(-angle.velocity * 16, -26, 26);
    skirtRef.current?.setAttribute('transform', `translate(0 ${SKIRT_TOP}) skewX(${trail}) translate(0 ${-SKIRT_TOP})`);
  };

  const step = (now: number) => {
    const s = state.current;
    const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 1 / 60;
    s.last = now;
    if (!s.dragging) {
      s.stretch = stepSpring(s.stretch, 0, STRETCH, dt);
      s.angle = stepSpring(s.angle, 0, SWING, dt, ANGLE_REST);
    }
    draw();
    if (s.dragging || !atRest(s.stretch) || !atRest(s.angle)) {
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
    s.stretch = {position: clamp(pull, 0, MAX_PULL), velocity: 0};
    const previous = s.angle.position;
    const angle = clamp(Math.atan2(dx, LENGTH + s.stretch.position), -0.5, 0.5);
    s.angle = {position: angle, velocity: (angle - previous) * 60};
    if (!s.clicked && s.stretch.position >= TRAVEL) {
      click();
    }
  };

  const onPointerUp = () => {
    const s = state.current;
    if (!s.dragging) {
      return;
    }
    s.dragging = false;
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
      <svg viewBox="0 0 44 300" aria-hidden="true">
        <defs>
          <linearGradient id="tn-cord-metal" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{stopColor: 'var(--tn-metal-lo)'}} />
            <stop offset="0.35" style={{stopColor: 'var(--tn-metal-hi)'}} />
            <stop offset="0.6" style={{stopColor: 'var(--tn-metal)'}} />
            <stop offset="1" style={{stopColor: 'var(--tn-metal-lo)'}} />
          </linearGradient>
          <linearGradient id="tn-cord-round" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="0.32" stopColor="#fff" stopOpacity="0.22" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#000" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="tn-cord-skirt-shade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.5" />
            <stop offset="0.35" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.25" />
          </linearGradient>
          {/* Three crimson strands laid with a gold thread: the twist of a curtain rope. */}
          <pattern id="tn-cord-twist" width="6" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-34)">
            <rect width="6" height="5" fill="#8a1820" />
            <rect y="1.6" width="6" height="1.4" fill="#a8252e" />
            <rect y="3.4" width="6" height="0.9" style={{fill: 'var(--tn-metal)'}} />
            <rect width="6" height="0.55" fill="#2a0408" opacity="0.7" />
          </pattern>
        </defs>
        <g className="tn-cord-rose">
          <path d="M8 0 a14 7 0 0 0 28 0 z" fill="url(#tn-cord-metal)" />
          <circle cx={ANCHOR_X} cy="7" r="2.6" fill="none" stroke="url(#tn-cord-metal)" strokeWidth="1.5" />
        </g>
        <g ref={swingRef}>
          <g ref={ropeRef}>
            <rect x={ANCHOR_X - 2.4} y={ROPE_TOP} width="4.8" height={LENGTH - ROPE_TOP} fill="url(#tn-cord-twist)" />
            <rect x={ANCHOR_X - 2.4} y={ROPE_TOP} width="4.8" height={LENGTH - ROPE_TOP} fill="url(#tn-cord-round)" />
          </g>
          <g ref={tasselRef} transform={`translate(${ANCHOR_X} ${LENGTH})`}>
            <g ref={skirtRef}>
              {THREADS.map((thread) => (
                <path key={thread.d} d={thread.d} stroke={thread.color} strokeWidth={thread.width} fill="none" />
              ))}
              <rect x="-11" y={SKIRT_TOP} width="22" height="42" fill="url(#tn-cord-skirt-shade)" />
            </g>
            <ellipse cx="0" cy="1.5" rx="3.4" ry="2.4" fill="url(#tn-cord-metal)" />
            <rect x="-2" y="3" width="4" height="5" fill="url(#tn-cord-twist)" />
            <path
              d="M0 7.5 C4 7.5 5.4 10.5 5 13.5 C8.6 15.6 9.6 21.6 8.2 26.5 L-8.2 26.5 C-9.6 21.6 -8.6 15.6 -5 13.5 C-5.4 10.5 -4 7.5 0 7.5 Z"
              fill="url(#tn-cord-metal)"
            />
            <path className="tn-cord-ring" d="M-5.4 14.4 Q0 16 5.4 14.4 M-8.6 21.4 Q0 23.4 8.6 21.4" />
            {RUFF.map((x) => (
              <circle key={x} cx={x} cy="28.2" r="1.4" fill="url(#tn-cord-metal)" />
            ))}
            <ellipse className="tn-cord-glint" cx="-3.4" cy="18" rx="1.3" ry="4.4" />
          </g>
        </g>
      </svg>
    </button>
  );
}
