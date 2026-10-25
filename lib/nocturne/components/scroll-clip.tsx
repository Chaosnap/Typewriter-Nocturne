// The scrollbar of the active terminal, drawn as a paper clip on the right edge of the sheet or as
// a slim translucent bar. It follows the scroll position with a spring, tilts a little while it
// moves, and can be dragged; dragging scrolls the terminal (the terminal's own wheel and keyboard
// scrolling are untouched). The clip is a Gem clip with its front loop over the paper and its back
// loop showing only beyond the paper's edge, as a clip hooked over a sheet does.

import React, {useEffect, useRef, useState} from 'react';

import {stepSpring} from '../../../app/nocturne/carriage-physics';
import type {Body} from '../../../app/nocturne/carriage-physics';
import type {Box} from '../../../app/nocturne/stage-layout';
import type {ClipFinish, ScrollbarSettings} from '../../../app/nocturne/types';
import {on} from '../bus';
import {scrollActiveTerminal} from '../terminal-bridge';

/** The clip's size: about the length of three lines of text, small beside the sheet. */
const CLIP_WIDTH = 74;
const CLIP_HEIGHT = 26;
/** How far the clip reaches onto the paper from its edge. */
const ON_PAPER = 42;
const TRACK_MARGIN = 18;
const GLIDE = {frequency: 5, damping: 0.72};
const TILT = {frequency: 3.2, damping: 0.35};
const TILT_REST = {distance: 0.001, speed: 0.002};

const FINISHES: Record<ClipFinish, [string, string, string]> = {
  silver: ['#fafbfc', '#a7adb5', '#525861'],
  brass: ['#f6e2ae', '#b8904c', '#5a3f19'],
  gold: ['#fff0b8', '#d5a746', '#71500f'],
  black: ['#8a8a8a', '#2b2b2c', '#0b0b0c']
};

// Centre line of the wire, as a Gem clip lies on the page: the inner loop (behind the sheet)
// first, then the outer loop in front.
const BACK_LOOP = 'M22 9 H58 A4 4 0 0 1 58 17 H14';
const FRONT_LOOP = 'M14 17 A6 6 0 0 1 14 5 H64 A8 8 0 0 1 64 21 H30';

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
      const tilt = clip ? m.tilt.position : 0;
      element.style.transform = `translateY(${m.y.position.toFixed(2)}px) rotate(${tilt.toFixed(4)}rad)`;
    }
  };

  const step = (now: number) => {
    const m = motion.current;
    const dt = m.last ? Math.min(0.05, (now - m.last) / 1000) : 1 / 60;
    m.last = now;
    const before = m.y.velocity;
    if (!m.dragging) {
      m.y = stepSpring(m.y, m.target, GLIDE, dt);
    }
    // The clip leans against its motion and swings back, like a light thing pushed along an edge.
    const lean = -m.y.velocity * 0.0009 - ((m.y.velocity - before) / Math.max(dt, 1 / 240)) * 0.00002;
    m.tilt = stepSpring(m.tilt, Math.max(-0.22, Math.min(0.22, lean)), TILT, dt, TILT_REST);
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

  const [light, mid, dark] = FINISHES[settings.finish];
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
        <svg viewBox={`0 0 ${CLIP_WIDTH} ${CLIP_HEIGHT}`} aria-hidden="true">
          <defs>
            <linearGradient id="tn-clip-wire" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={light} />
              <stop offset="0.45" stopColor={mid} />
              <stop offset="1" stopColor={dark} />
            </linearGradient>
            {/* The back loop is behind the sheet: it only shows beyond the paper's edge. */}
            <clipPath id="tn-clip-beyond">
              <rect x={ON_PAPER} y="0" width={CLIP_WIDTH - ON_PAPER} height={CLIP_HEIGHT} />
            </clipPath>
          </defs>
          <g clipPath="url(#tn-clip-beyond)" opacity="0.85">
            <path d={BACK_LOOP} className="tn-clip-wire" stroke="url(#tn-clip-wire)" />
          </g>
          <path d={FRONT_LOOP} className="tn-clip-shadow" />
          <path d={FRONT_LOOP} className="tn-clip-wire" stroke="url(#tn-clip-wire)" />
          <path d={FRONT_LOOP} className="tn-clip-glint" />
        </svg>
      ) : null}
    </div>
  );
}
