// Geometry of the typewriter stage for a given window size: where the sheet, the platen, the paper
// bail and the terminal sit. The DOM shell, the paper light and the 3D machine all read this one
// layout, so they agree to the pixel. Mirrors layout() in docs/preview/index.html.
//
// Coordinates are CSS pixels relative to the stage (the area below the toolbar). The sheet starts
// a little above the stage so its top edge is never seen; it runs down behind the platen.
//
// The machine is proportioned to the window, not to the sheet: the platen keeps its length while
// the sheet is made wider, up to the full length of the platen.

export type Box = {x: number; y: number; width: number; height: number};

export type StageLayout = {
  width: number;
  height: number;
  /** Whether the typewriter is drawn (false in focus mode or when the carriage is turned off). */
  machine: boolean;
  machineHeight: number;
  machineTop: number;
  sheet: Box;
  /** The side margin the machine is proportioned to: the left edge of the narrowest sheet. */
  margin: number;
  /** The platen's ends, stage x. */
  platen: {left: number; right: number};
  platenY: number;
  platenRadius: number;
  /** The paper bail: the chrome bar that holds the sheet against the platen. */
  bailY: number;
  /** The terminal's box. Text ends above the bail, so the machine never covers a character. */
  text: Box;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const SHEET_OVERHANG = 12;

/**
 * The layout for a stage of this size. `paperWidth` widens the sheet from the narrowest (0) to the
 * full length of the platen (1).
 */
export function stageLayout(width: number, height: number, machine: boolean, paperWidth = 0): StageLayout {
  if (!machine) {
    const whole = {x: 0, y: 0, width, height};
    return {
      width,
      height,
      machine: false,
      machineHeight: 0,
      machineTop: height,
      sheet: whole,
      margin: 0,
      platen: {left: 0, right: width},
      platenY: height,
      platenRadius: 0,
      bailY: height,
      text: whole
    };
  }

  const machineHeight = clamp(height * 0.3, 160, 300);
  // Side margins of about 8.5% leave room for the platen ends and knobs without wide empty bands.
  const margins = width < 720 ? 40 : 2 * clamp(width * 0.085, 64, 150);
  const narrowest = Math.round(Math.max(160, Math.min(width - margins, 1240)));
  const margin = Math.round((width - narrowest) / 2);
  // The platen runs a little past the narrowest sheet on both sides, to its knobs.
  const reach = Math.min(margin * 0.45, 90);
  const platen = {left: margin - reach, right: margin + narrowest + reach};
  const sheetWidth = Math.round(narrowest + 2 * reach * clamp(paperWidth, 0, 1));
  const sheetX = Math.round((width - sheetWidth) / 2);
  const machineTop = height - machineHeight;
  const platenRadius = machineHeight * 0.12;
  const platenY = machineTop + machineHeight * 0.24;
  const bailY = machineTop + machineHeight * 0.08;
  const textHeight = Math.max(80, Math.round(bailY - 16));

  return {
    width,
    height,
    machine: true,
    machineHeight,
    machineTop,
    sheet: {x: sheetX, y: -SHEET_OVERHANG, width: sheetWidth, height: Math.ceil(platenY + SHEET_OVERHANG)},
    margin,
    platen,
    platenY,
    platenRadius,
    bailY,
    text: {x: sheetX, y: 0, width: sheetWidth, height: textHeight}
  };
}

/**
 * The two knurled rollers on the paper bail, in stage coordinates (the model draws them at the same
 * place). Double-clicking the left one scrolls the terminal to its top, the right one to its bottom.
 */
export function rollerBoxes(layout: StageLayout): Box[] {
  if (!layout.machine) {
    return [];
  }
  const {sheet} = layout;
  const width = clamp(sheet.width * 0.055, 30, 56);
  const radius = clamp(layout.machineHeight * 0.045, 9, 14);
  return [0.2, 0.8].map((fraction) => ({
    x: sheet.x + sheet.width * fraction - width / 2 - 4,
    y: layout.bailY - radius - 4,
    width: width + 8,
    height: radius * 2 + 8
  }));
}
