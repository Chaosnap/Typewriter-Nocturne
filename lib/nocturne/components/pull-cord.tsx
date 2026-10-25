// The lamp's pull cord, hanging at the top left of the room: pull it down to switch the lamp on or
// off. A braided silk cord with a turned brass pull. It stretches while pulled, the switch clicks
// at the bottom of its travel, and the cord springs back and swings. Keyboard users press it like
// a button. Drawn with SVG and moved through refs, so dragging never re-renders React.

import React, {useEffect, useRef} from 'react';

import {stepSpring} from '../../../app/nocturne/carriage-physics';
import type {Body} from '../../../app/nocturne/carriage-physics';
import {emit} from '../bus';

const ANCHOR_X = 20;
const LENGTH = 92;
/** How far the cord must be pulled before the switch clicks, px. */
const TRAVEL = 30;
const MAX_PULL = 54;
const STRETCH = {frequency: 6.5, damping: 0.32};
const SWING = {frequency: 0.85, damping: 0.07};
const ANGLE_REST = {distance: 0.002, speed: 0.004};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  const cordRef = useRef<SVGGElement>(null);
  const pullRef = useRef<SVGGElement>(null);
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
    cordRef.current?.querySelectorAll('line').forEach((line) => line.setAttribute('y2', String(length)));
    pullRef.current?.setAttribute('transform', `translate(${ANCHOR_X} ${length})`);
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
    s.stretch = {position: s.stretch.position, velocity: 520};
    s.angle = {position: s.angle.position, velocity: (Math.random() - 0.5) * 0.8};
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
      state.current.angle = {position: state.current.angle.position, velocity: 0.35};
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
    s.angle = {position: clamp(Math.atan2(dx, LENGTH + s.stretch.position), -0.6, 0.6), velocity: 0};
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
      <svg viewBox="0 0 40 200" aria-hidden="true">
        <defs>
          <linearGradient id="tn-cord-brass" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{stopColor: 'var(--tn-metal-lo)'}} />
            <stop offset="0.38" style={{stopColor: 'var(--tn-metal-hi)'}} />
            <stop offset="0.62" style={{stopColor: 'var(--tn-metal)'}} />
            <stop offset="1" style={{stopColor: 'var(--tn-metal-lo)'}} />
          </linearGradient>
        </defs>
        <path className="tn-cord-rose" d="M6 0 a14 8 0 0 0 28 0 z" fill="url(#tn-cord-brass)" />
        <g ref={swingRef}>
          <g ref={cordRef}>
            <line className="tn-cord-silk" x1={ANCHOR_X} y1="6" x2={ANCHOR_X} y2={LENGTH} />
            <line className="tn-cord-twist" x1={ANCHOR_X} y1="6" x2={ANCHOR_X} y2={LENGTH} />
            <line className="tn-cord-sheen" x1={ANCHOR_X - 0.8} y1="6" x2={ANCHOR_X - 0.8} y2={LENGTH} />
          </g>
          <g ref={pullRef} transform={`translate(${ANCHOR_X} ${LENGTH})`}>
            <rect className="tn-cord-ferrule" x="-4.5" y="-1" width="9" height="6" rx="2" />
            <path d="M0 4 C9 6 10 18 6 26 Q0 34 -6 26 C-10 18 -9 6 0 4 Z" fill="url(#tn-cord-brass)" />
            <path className="tn-cord-ring" d="M-8.2 11 Q0 13.4 8.2 11 M-8.6 14 Q0 16.4 8.6 14" />
            <ellipse className="tn-cord-glint" cx="-3.2" cy="17" rx="1.5" ry="5" />
            <circle cx="0" cy="31.5" r="2.3" fill="url(#tn-cord-brass)" />
          </g>
        </g>
      </svg>
    </button>
  );
}
