// Bundled fonts (SIL Open Font License 1.1, see licenses/OFL-*.txt).
//
// The terminal must not be measured with a fallback font: xterm.js computes the cell grid from
// the font that is loaded when a terminal opens. `fontsReady` resolves once the bundled faces
// are available (or after a short timeout, so a broken font can never block startup).

import '@fontsource/ibm-plex-mono/latin-300.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-400-italic.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-ext-400.css';
import '@fontsource/ibm-plex-mono/latin-ext-600.css';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-400-italic.css';
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-600.css';

const FACES = [
  '300 14px "IBM Plex Mono"',
  '400 14px "IBM Plex Mono"',
  'italic 400 14px "IBM Plex Mono"',
  '500 14px "IBM Plex Mono"',
  '600 14px "IBM Plex Mono"',
  '700 14px "IBM Plex Mono"',
  '400 14px "Courier Prime"',
  'italic 400 14px "Courier Prime"',
  '700 14px "Courier Prime"',
  '400 14px "EB Garamond"',
  'italic 400 14px "EB Garamond"',
  '600 14px "EB Garamond"',
  'italic 500 14px "Cormorant Garamond"',
  '600 14px "Cormorant Garamond"'
];

function loadFaces(timeoutMs: number): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return Promise.resolve();
  }
  const loads = Promise.all(FACES.map((face) => document.fonts.load(face).catch(() => []))).then(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([loads, timeout]);
}

/** Resolves when the bundled fonts are ready (at most ~800 ms after startup). */
export const fontsReady: Promise<void> = loadFaces(800);
