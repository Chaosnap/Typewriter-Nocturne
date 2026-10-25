// The block cursor, as a blot of ink. xterm.js keeps its own cursor, a bar in a transparent colour
// (see apply-config.ts), so selection, input methods and screen readers behave as always; this
// layer draws the block over it: ink with a soft, fibrous edge where it has soaked into the paper,
// a little darker at its rim where it pooled, and the character under it in the paper's colour.
// It lies on the sheet under the paper light, so the lamp lights it as it lights the type.
//
// While the terminal waits, the ink sinks into the page and wells up again, a faint halo spreading
// round it as it fades, as a drop of ink does on damp paper. A keystroke presses fresh ink into the
// cell, and it rests a moment before it fades again. Without focus only a faint outline remains.

import React, {useEffect, useRef} from 'react';

import {getLastCursor, on} from '../bus';
import type {CursorFrame} from '../bus';

/** One breath of the ink: it rests, sinks into the page, lies faint, and wells up again. */
const BREATH_MS = 1700;
/** After a keystroke the ink stays fresh this long before it fades again. */
const REST_MS = 650;

const SINK: Keyframe[] = [
  {opacity: 1, offset: 0},
  {opacity: 1, offset: 0.36, easing: 'cubic-bezier(0.4, 0, 0.6, 1)'},
  {opacity: 0.08, offset: 0.62},
  {opacity: 0.08, offset: 0.74, easing: 'cubic-bezier(0.3, 0, 0.3, 1)'},
  {opacity: 1, offset: 1}
];
/** As the ink sinks, a faint halo spreads round it and is drawn into the paper. */
const SPREAD: Keyframe[] = [
  {opacity: 0, transform: 'scale(1)', offset: 0},
  {opacity: 0, transform: 'scale(1)', offset: 0.36, easing: 'ease-out'},
  {opacity: 0.3, transform: 'scale(1.2)', offset: 0.52, easing: 'ease-in'},
  {opacity: 0, transform: 'scale(1.55)', offset: 0.74},
  {opacity: 0, transform: 'scale(1)', offset: 1}
];
/** A keystroke presses fresh ink into the cell. */
const FRESH: Keyframe[] = [{transform: 'scale(1.12)'}, {transform: 'scale(1)'}];
const FRESH_HALO: Keyframe[] = [
  {opacity: 0.35, transform: 'scale(1.3)'},
  {opacity: 0, transform: 'scale(1)'}
];

type BlockCursorProps = {
  /** The ink's colours follow the paper through CSS; dark paper takes a pale ink. */
  appearance: 'light' | 'dark';
  /** The terminal's type, for the character drawn in the block. */
  fontSize: number;
  fontWeight: number;
  fontWeightBold: number;
};

export function BlockCursor({appearance, fontSize, fontWeight, fontWeightBold}: BlockCursorProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const blotRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const glyphRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const place = (frame: CursorFrame) => {
      const element = elementRef.current;
      const glyph = glyphRef.current;
      const sheet = element?.parentElement;
      if (!element || !glyph || !sheet) {
        return;
      }
      if (!frame.visible || frame.cursorHidden) {
        element.style.display = 'none';
        return;
      }
      const origin = sheet.getBoundingClientRect();
      const x = frame.x - origin.left;
      const y = frame.y - origin.top;
      element.style.display = 'block';
      element.style.width = `${(frame.width * frame.glyph.width).toFixed(2)}px`;
      element.style.height = `${frame.height.toFixed(2)}px`;
      element.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      element.dataset.focused = String(frame.focused);
      glyph.textContent = frame.glyph.char;
      glyph.dataset.bold = String(frame.glyph.bold);
      glyph.dataset.italic = String(frame.glyph.italic);
    };
    const last = getLastCursor();
    if (last) {
      place(last);
    }
    return on('cursor', place);
  }, []);

  useEffect(() => {
    const blot = blotRef.current;
    const halo = haloRef.current;
    const glyph = glyphRef.current;
    if (!blot || !halo || !glyph) {
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let breathing: Animation[] = [];
    const breathe = () => {
      breathing.forEach((animation) => animation.cancel());
      breathing = [];
      if (reduce.matches) {
        return;
      }
      const timing = {duration: BREATH_MS, delay: REST_MS, iterations: Infinity};
      breathing = [blot.animate(SINK, timing), glyph.animate(SINK, timing), halo.animate(SPREAD, timing)];
    };
    breathe();
    const stop = on('key', () => {
      breathe();
      if (!reduce.matches) {
        blot.animate(FRESH, {duration: 160, easing: 'ease-out'});
        halo.animate(FRESH_HALO, {duration: 240, easing: 'ease-out'});
      }
    });
    reduce.addEventListener('change', breathe);
    return () => {
      stop();
      reduce.removeEventListener('change', breathe);
      breathing.forEach((animation) => animation.cancel());
    };
  }, []);

  const type = {
    '--tn-ink-size': `${fontSize}px`,
    '--tn-ink-weight': String(fontWeight),
    '--tn-ink-weight-bold': String(fontWeightBold)
  } as React.CSSProperties;

  return (
    <div ref={elementRef} className="tn-block-cursor" data-appearance={appearance} style={type} aria-hidden="true">
      <div ref={haloRef} className="tn-ink-halo" />
      <div ref={blotRef} className="tn-ink-blot" />
      <span ref={glyphRef} className="tn-ink-glyph" />
    </div>
  );
}
