// The block cursor, dressed as a typewriter's: xterm.js draws the block itself (so the character
// under it shows in the paper's colour, and selection, input methods and screen readers behave as
// always), and this layer adds what a typewriter shows at the printing point. The lower part of
// the block is the red half of a two-colour ribbon, faintly woven; with every keystroke the ribbon
// lifts, as the ribbon vibrator raises it for the strike, and drops back. A gilt pointer stands
// under the cell, like the mark on the type guide. Nothing here takes the pointer.

import React, {useEffect, useRef} from 'react';

import {getLastCursor, on} from '../bus';
import type {CursorFrame} from '../bus';

/** How long the ribbon stays lifted for a strike, in milliseconds. */
const STRIKE_MS = 170;
/** The ribbon lifts for the strike and drops back; the pointer dips as the type bar lands. */
const LIFT: Keyframe[] = [{transform: 'scaleY(1)'}, {transform: 'scaleY(1.9)', offset: 0.3}, {transform: 'scaleY(1)'}];
const DIP: Keyframe[] = [
  {transform: 'translateY(0)'},
  {transform: 'translateY(1.5px)', offset: 0.3},
  {transform: 'translateY(0)'}
];

type BlockCursorProps = {
  /** Light paper lightens the dark block with red; dark paper darkens the pale block with it. */
  appearance: 'light' | 'dark';
  /** xterm.js blinks the block; the ribbon then stays out of the way. */
  blink: boolean;
};

export function BlockCursor({appearance, blink}: BlockCursorProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const place = (frame: CursorFrame) => {
      const element = elementRef.current;
      const stage = element?.parentElement;
      if (!element || !stage) {
        return;
      }
      if (!frame.visible || frame.cursorHidden) {
        element.style.display = 'none';
        return;
      }
      const origin = stage.getBoundingClientRect();
      element.style.display = 'block';
      element.style.width = `${frame.width.toFixed(2)}px`;
      element.style.height = `${frame.height.toFixed(2)}px`;
      const x = frame.x - origin.left;
      const y = frame.y - origin.top;
      element.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      element.dataset.focused = String(frame.focused);
    };
    const last = getLastCursor();
    if (last) {
      place(last);
    }
    return on('cursor', place);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    return on('key', () => {
      const ribbon = ribbonRef.current;
      const guide = guideRef.current;
      if (reduce.matches || !ribbon || !guide || elementRef.current?.style.display === 'none') {
        return;
      }
      const timing = {duration: STRIKE_MS, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)'};
      ribbon.animate(LIFT, timing);
      guide.animate(DIP, timing);
    });
  }, []);

  return (
    <div
      ref={elementRef}
      className="tn-block-cursor"
      data-appearance={appearance}
      data-blink={String(blink)}
      aria-hidden="true"
    >
      <div ref={ribbonRef} className="tn-block-ribbon" />
      <div ref={guideRef} className="tn-block-guide" />
    </div>
  );
}
