// The scrollbar of the active terminal, drawn as a paper clip on the right edge of the sheet or as
// a slim translucent bar. It follows the scroll position with a spring, leans a little while it
// moves, and can be dragged; dragging scrolls the terminal (the terminal's own wheel and keyboard
// scrolling are untouched).
//
// The clip is a Gem clip slid onto the sheet: its outer loop lies on the front of the paper, its
// inner tongue behind it (seen only as the faint line it presses into the sheet), and the bend that
// joins them stands just beyond the paper's edge. The wire is shaded as a tube lit from the upper
// left and casts a soft shadow on the paper.

import React, {useEffect, useRef, useState} from 'react';

import {stepSpring} from '../../../app/nocturne/carriage-physics';
import type {Body} from '../../../app/nocturne/carriage-physics';
import type {Box} from '../../../app/nocturne/stage-layout';
import type {ClipFinish, ScrollbarSettings} from '../../../app/nocturne/types';
import {on} from '../bus';
import {scrollActiveTerminal} from '../terminal-bridge';

/** The clip's size on screen: a little shorter than ten characters, small beside the sheet. */
const CLIP_WIDTH = 84;
const CLIP_HEIGHT = 26;
/** The drawing is 100 × 31 units; the paper's edge is at x = 88, so the end bend stands beyond it. */
const EDGE = 88;
const ON_PAPER = (CLIP_WIDTH * EDGE) / 100;
/** A clip slid onto a sheet by hand never sits quite square. */
const REST_TILT = -0.1;
const TRACK_MARGIN = 18;
const GLIDE = {frequency: 5, damping: 0.72};
const TILT = {frequency: 3.2, damping: 0.35};
const TILT_REST = {distance: 0.001, speed: 0.002};

/** Highlight, body and edge of the wire for each finish. */
const FINISHES: Record<ClipFinish, [string, string, string]> = {
  silver: ['#ffffff', '#b9bfc7', '#4d535b'],
  brass: ['#fff1c6', '#c19a52', '#4f3712'],
  gold: ['#fff6cf', '#d9ad4c', '#6a4a0c'],
  black: ['#9a9a9e', '#2e2e31', '#060607']
};

// The centre line of the wire. The outer loop lies on the front of the sheet; the tongue lies
// behind it; the hinge bend joins them beyond the paper's edge.
const FRONT = 'M90 3 H14 A12 12 0 0 0 14 27 H70';
const HINGE = 'M90 21 A9 9 0 0 0 90 3';
const TONGUE = 'M76 9 H26 A6 6 0 0 0 26 21 H90';

/** A length of wire: a dark rim, the metal, and a highlight set towards the light. */
function Wire({d, colors}: {d: string; colors: [string, string, string]}) {
  const [light, body, edge] = colors;
  return (
    <g>
      <path d={d} className="tn-clip-edge" stroke={edge} />
      <path d={d} className="tn-clip-body" stroke={body} />
      <path d={d} className="tn-clip-light" stroke={light} transform="translate(-0.3 -0.55)" />
      <path d={d} className="tn-clip-glint" transform="translate(-0.35 -0.6)" />
    </g>
  );
}

type Scroll = {viewportY: number; baseY: number; rows: number};

type ClipMotion = {
  /** Top of the clip or bar, stage y, and its velocity. */
  y: Body;
  /** Lean of the clip while it moves, radians. */
  tilt: Body;
  target: number;
  frame: number;
  last: number;
  dragging: boolean;
  /** Where on the clip the pointer took hold. */
  grab: number;
};

type ScrollClipProps = {
  settings: ScrollbarSettings;
  /** The sheet and the text box, in stage coordinates. */
  sheet: Box;
  text: Box;
};

export function ScrollClip({settings, sheet, text}: ScrollClipProps) {
  const [scroll, setScroll] = useState<Scroll>({viewportY: 0, baseY: 0, rows: 1});
  const elementRef = useRef<HTMLDivElement>(null);
  const motion = useRef<ClipMotion>({
    y: {position: -1, velocity: 0},
    tilt: {position: 0, velocity: 0},
    target: 0,
    frame: 0,
    last: 0,
    dragging: false,
    grab: 0
  });

  useEffect(() => {
    return on('cursor', (frame) => {
      setScroll((previous) => {
        if (previous.viewportY === frame.viewportY && previous.baseY === frame.baseY && previous.rows === frame.rows) {
          return previous;
        }
        return {viewportY: frame.viewportY, baseY: frame.baseY, rows: frame.rows};
      });
    });
  }, []);

  const clip = settings.style === 'clip';
  const trackTop = text.y + TRACK_MARGIN;
  const trackHeight = Math.max(40, text.height - TRACK_MARGIN * 2);
  const thumbHeight = clip ? CLIP_HEIGHT : Math.max(28, (trackHeight * scroll.rows) / (scroll.rows + scroll.baseY));
  const travel = Math.max(1, trackHeight - thumbHeight);
  const ratio = scroll.baseY > 0 ? scroll.viewportY / scroll.baseY : 1;

  const place = () => {
    const element = elementRef.current;
    const m = motion.current;
    if (element) {
      const tilt = clip ? REST_TILT + m.tilt.position : 0;
      element.style.transform = `translateY(${m.y.position.toFixed(2)}px) rotate(${tilt.toFixed(4)}rad)`;
    }
  };

  const step = (now: number) => {
    const m = motion.current;
    // The time since the last frame, run in short slices: the clip keeps pace with the scroll
    // even when frames are slow (a stage drawn on the CPU), and the springs stay stable.
    let elapsed = m.last ? Math.min(0.5, (now - m.last) / 1000) : 1 / 60;
    m.last = now;
    while (elapsed > 0) {
      const dt = Math.min(1 / 60, elapsed);
      elapsed -= dt;
      const before = m.y.velocity;
      if (!m.dragging) {
        m.y = stepSpring(m.y, m.target, GLIDE, dt);
      }
      // The clip leans against its motion and swings back, like a light thing pushed along an edge.
      const lean = -m.y.velocity * 0.0009 - ((m.y.velocity - before) / Math.max(dt, 1 / 240)) * 0.00002;
      m.tilt = stepSpring(m.tilt, Math.max(-0.22, Math.min(0.22, lean)), TILT, dt, TILT_REST);
    }
    place();
    const moving = m.y.position !== m.target || m.y.velocity !== 0 || m.tilt.position !== 0 || m.tilt.velocity !== 0;
    if (m.dragging || moving) {
      m.frame = requestAnimationFrame(step);
    } else {
      m.frame = 0;
      m.last = 0;
    }
  };

  const animate = () => {
    if (!motion.current.frame) {
      motion.current.frame = requestAnimationFrame(step);
    }
  };

  // Follow the terminal's scroll position.
  useEffect(() => {
    const m = motion.current;
    m.target = trackTop + ratio * travel;
    if (m.y.position < 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      m.y = {position: m.target, velocity: 0};
      place();
    }
    if (!m.dragging) {
      animate();
    }
  }, [trackTop, ratio, travel, clip]);

  useEffect(() => {
    const m = motion.current;
    return () => cancelAnimationFrame(m.frame);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Keeps keyboard focus in the terminal.
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const m = motion.current;
    m.dragging = true;
    m.grab = event.clientY - m.y.position;
    animate();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const m = motion.current;
    if (!m.dragging) {
      return;
    }
    const y = Math.max(trackTop, Math.min(trackTop + travel, event.clientY - m.grab));
    m.y = {position: y, velocity: (y - m.y.position) * 60};
    scrollActiveTerminal(((y - trackTop) / travel) * scroll.baseY);
  };

  const onPointerUp = () => {
    motion.current.dragging = false;
    animate();
  };

  if (settings.style === 'native' || scroll.baseY === 0) {
    return null;
  }

  const colors = FINISHES[settings.finish];
  // The clip turns about the point where it grips the paper's edge.
  let style: React.CSSProperties = {
    left: sheet.x + sheet.width - ON_PAPER,
    width: CLIP_WIDTH,
    height: CLIP_HEIGHT,
    transformOrigin: `${ON_PAPER}px 50%`
  };
  if (!clip) {
    style = {
      left: sheet.x + sheet.width - settings.barWidth - 7,
      width: settings.barWidth,
      height: thumbHeight,
      opacity: settings.barOpacity
    };
  }

  return (
    <div
      ref={elementRef}
      className={clip ? 'tn-scroll tn-scroll-clip' : 'tn-scroll tn-scroll-bar'}
      style={style}
      role="scrollbar"
      aria-orientation="vertical"
      aria-label="Scroll the terminal"
      aria-valuemin={0}
      aria-valuemax={scroll.baseY}
      aria-valuenow={scroll.viewportY}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {clip ? (
        <svg viewBox="0 -0.5 100 31" aria-hidden="true">
          <defs>
            <clipPath id="tn-clip-paper">
              <rect x="-20" y="-20" width={EDGE + 20} height="70" />
            </clipPath>
            <clipPath id="tn-clip-beyond">
              <rect x={EDGE} y="-20" width="40" height="70" />
            </clipPath>
            <filter id="tn-clip-blur" x="-20%" y="-60%" width="140%" height="220%">
              <feGaussianBlur stdDeviation="1.1" />
            </filter>
          </defs>
          {/* On the paper: the line the tongue presses into the sheet, and the clip's shadow. */}
          <g clipPath="url(#tn-clip-paper)">
            <path d={TONGUE} className="tn-clip-pressed" />
            <path d={`${FRONT} ${HINGE}`} className="tn-clip-shadow" filter="url(#tn-clip-blur)" />
          </g>
          <g clipPath="url(#tn-clip-beyond)">
            <Wire d={TONGUE} colors={colors} />
          </g>
          <Wire d={HINGE} colors={colors} />
          <Wire d={FRONT} colors={colors} />
        </svg>
      ) : null}
    </div>
  );
}
