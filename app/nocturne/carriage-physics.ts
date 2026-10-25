// A small physical model of a typewriter carriage.
//
// A real carriage is pulled by a mainspring and held by an escapement: each keystroke releases
// one tooth, the carriage accelerates for one letter-width and is stopped by the next tooth with
// a small rebound. A carriage return is a hard push to the left margin stop, which the carriage
// hits and bounces off. We model exactly that: constant acceleration towards the target, a speed
// limit (friction), and an inelastic impact with a coefficient of restitution. The platen's line
// feed is a critically damped rotation. All units are CSS pixels and seconds.

export type Body = {position: number; velocity: number};

export type ImpactParams = {
  /** Acceleration towards the stop, px/s². */
  acceleration: number;
  /** Speed limit from friction, px/s. */
  maxSpeed: number;
  /** Fraction of speed kept after hitting the stop (0 = dead stop). */
  restitution: number;
};

export type SpringParams = {
  /** Natural frequency in Hz. */
  frequency: number;
  /** Damping ratio (1 = critically damped). */
  damping: number;
};

/** One tooth of the escapement: snappy, with a barely visible rebound. */
export const ESCAPEMENT: ImpactParams = {acceleration: 60000, maxSpeed: 3200, restitution: 0.22};
/** Carriage return: slower push, audible thunk at the margin. */
export const CARRIAGE_RETURN: ImpactParams = {acceleration: 14000, maxSpeed: 2600, restitution: 0.3};
/** Platen rotation for line feeds. */
export const LINE_FEED: SpringParams = {frequency: 13, damping: 1};

const SUBSTEP = 1 / 480;
const REST_SPEED = 25;
const REST_DISTANCE = 0.25;

/** Moves a body towards `target` under constant acceleration, with an inelastic stop. */
export function stepImpact(body: Body, target: number, params: ImpactParams, dt: number): Body {
  let {position, velocity} = body;
  let remaining = Math.max(0, Math.min(dt, 0.1));
  while (remaining > 0) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    const offset = target - position;
    if (Math.abs(offset) < REST_DISTANCE && Math.abs(velocity) < REST_SPEED) {
      return {position: target, velocity: 0};
    }
    const direction = Math.sign(offset) || -Math.sign(velocity);
    velocity += direction * params.acceleration * h;
    velocity = Math.max(-params.maxSpeed, Math.min(params.maxSpeed, velocity));
    const next = position + velocity * h;
    // Crossing the target means the carriage hit the stop: rebound with restitution, staying on
    // the side it came from.
    if ((next - target) * (position - target) < 0 || next === target) {
      position = target - Math.sign(velocity) * 1e-6;
      velocity = -velocity * params.restitution;
    } else {
      position = next;
    }
  }
  return {position, velocity};
}

/** Below these the body counts as at rest (defaults are in pixels; pass smaller ones for radians). */
export type RestThresholds = {distance: number; speed: number};

const PIXEL_REST: RestThresholds = {distance: REST_DISTANCE, speed: REST_SPEED};

/** Damped harmonic oscillator towards `target` (semi-implicit Euler with sub-steps). */
export function stepSpring(
  body: Body,
  target: number,
  params: SpringParams,
  dt: number,
  rest: RestThresholds = PIXEL_REST
): Body {
  const omega = 2 * Math.PI * params.frequency;
  const stiffness = omega * omega;
  const damping = 2 * params.damping * omega;
  let {position, velocity} = body;
  let remaining = Math.max(0, Math.min(dt, 0.1));
  while (remaining > 0) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    const acceleration = -stiffness * (position - target) - damping * velocity;
    velocity += acceleration * h;
    position += velocity * h;
  }
  if (Math.abs(position - target) < rest.distance && Math.abs(velocity) < rest.speed) {
    return {position: target, velocity: 0};
  }
  return {position, velocity};
}

export type Carriage = {
  x: Body;
  y: Body;
  targetX: number;
  targetY: number;
  /** `return` while the carriage travels back to the margin. */
  mode: 'escapement' | 'return';
};

export function createCarriage(x: number, y: number): Carriage {
  return {
    x: {position: x, velocity: 0},
    y: {position: y, velocity: 0},
    targetX: x,
    targetY: y,
    mode: 'escapement'
  };
}

/** Points the carriage at a new cell. Large jumps to the left are carriage returns. */
export function aimCarriage(carriage: Carriage, x: number, y: number, cellWidth: number): Carriage {
  const isReturn = x < carriage.x.position - 4 * Math.max(1, cellWidth);
  const continuingReturn = carriage.mode === 'return' && x < carriage.targetX;
  return {
    ...carriage,
    targetX: x,
    targetY: y,
    mode: isReturn || continuingReturn ? 'return' : 'escapement'
  };
}

export function stepCarriage(carriage: Carriage, dt: number): Carriage {
  const params = carriage.mode === 'return' ? CARRIAGE_RETURN : ESCAPEMENT;
  const x = stepImpact(carriage.x, carriage.targetX, params, dt);
  const y = stepSpring(carriage.y, carriage.targetY, LINE_FEED, dt);
  const settledX = x.position === carriage.targetX && x.velocity === 0;
  return {...carriage, x, y, mode: settledX ? 'escapement' : carriage.mode};
}

/**
 * The type head hangs from its guide rail like a pendulum. Horizontal acceleration of the
 * carriage tips it (the inertial pseudo-force -a/L), gravity restores it and friction in the
 * bushings damps it. Returns the new tilt in radians and its angular velocity.
 */
export const SWAY = {frequency: 4.2, damping: 0.16, length: 3600, maxTilt: 0.09};

export function stepSway(body: Body, acceleration: number, dt: number): Body {
  const omega = 2 * Math.PI * SWAY.frequency;
  let {position, velocity} = body;
  let remaining = Math.max(0, Math.min(dt, 0.1));
  while (remaining > 0) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    velocity += (-omega * omega * position - 2 * SWAY.damping * omega * velocity - acceleration / SWAY.length) * h;
    position = Math.max(-SWAY.maxTilt, Math.min(SWAY.maxTilt, position + velocity * h));
  }
  if (Math.abs(position) < 1e-4 && Math.abs(velocity) < 1e-3) {
    return {position: 0, velocity: 0};
  }
  return {position, velocity};
}

export function isSettled(carriage: Carriage): boolean {
  return (
    carriage.x.position === carriage.targetX &&
    carriage.x.velocity === 0 &&
    carriage.y.position === carriage.targetY &&
    carriage.y.velocity === 0
  );
}
