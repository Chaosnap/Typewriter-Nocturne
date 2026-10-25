// Original line icons for the Nocturne toolbar (MIT). Drawn on a 20×20 grid with the stroke
// colour inherited from CSS, so they follow the theme's brass, gold or silver.

import React from 'react';

export function LampIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 9h8l-2-6H8z" />
      <path d="M10 9v6M6.5 17h7" />
      <path d="M8 12l-2 2.5M12 12l2 2.5" opacity="0.6" />
    </svg>
  );
}

export function TypefaceIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 16l4.5-12L12 16M4.8 11.5h5.4" />
      <path d="M14 10.5a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM16.4 10.5V16" />
    </svg>
  );
}

export function BellIcon({muted}: {muted: boolean}) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 14V9.5a5 5 0 0 1 10 0V14l1.5 1.5h-13z" />
      <path d="M8.5 17.5h3" />
      {muted ? <path d="M3 3l14 14" /> : null}
    </svg>
  );
}

export function FocusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
    </svg>
  );
}

export function StudioIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 5h12M4 10h12M4 15h12" opacity="0.55" />
      <path d="M7 3.5v3M13 8.5v3M9 13.5v3" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M14.5 13.5A6.5 6.5 0 0 1 8.2 3.6a6.5 6.5 0 1 0 8.2 8.2 6.4 6.4 0 0 1-1.9 1.7z" />
    </svg>
  );
}

export function QuillIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M16.5 3.2C11 4 7.2 8.4 5.6 14.4l1.6-.6c.9-2.4 2.3-4.5 4.3-6.1-1.4 2-2.4 4.1-2.9 6.3 4.6-1.4 7.4-6 7.9-10.8z" />
      <path d="M5.6 14.4L4 17.2" />
      <path d="M3 17.6h7" opacity="0.6" />
    </svg>
  );
}
