export const PAN_INERTIA_CONFIG = Object.freeze({
  minLaunchSpeed: 0.11,
  maxLaunchSpeed: 1.15,
  stopSpeed: 0.018,
  staleAfterMs: 90,
  frictionPerMs: 0.0072,
  maxDurationMs: 560,
  maxFrameMs: 34,
  velocityResponseMs: 30,
});

function isFinitePoint(value) {
  return Boolean(value && Number.isFinite(value.x) && Number.isFinite(value.y));
}

function clampMagnitude(vector, maximum) {
  if (!isFinitePoint(vector)) return { x: 0, y: 0 };
  const speed = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(speed) || speed === 0) return { x: 0, y: 0 };
  if (speed <= maximum) return { x: vector.x, y: vector.y };
  const scale = maximum / speed;
  return { x: vector.x * scale, y: vector.y * scale };
}

export class PanVelocityTracker {
  constructor(config = PAN_INERTIA_CONFIG) {
    this.config = config;
    this.reset();
  }

  reset(time = null) {
    this.velocity = { x: 0, y: 0 };
    this.lastTime = Number.isFinite(time) ? time : null;
    this.lastMotionTime = Number.isFinite(time) ? time : null;
  }

  add(dx, dy, time) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(time)) {
      return { ...this.velocity };
    }

    if (!Number.isFinite(this.lastTime)) {
      this.reset(time);
      return { ...this.velocity };
    }

    const elapsed = Math.min(50, Math.max(1, time - this.lastTime));
    const instantaneous = clampMagnitude(
      { x: dx / elapsed, y: dy / elapsed },
      this.config.maxLaunchSpeed,
    );
    const response = 1 - Math.exp(-elapsed / this.config.velocityResponseMs);

    this.velocity = {
      x: this.velocity.x + (instantaneous.x - this.velocity.x) * response,
      y: this.velocity.y + (instantaneous.y - this.velocity.y) * response,
    };
    this.lastTime = time;
    if (Math.abs(dx) + Math.abs(dy) > 0.2) this.lastMotionTime = time;
    return { ...this.velocity };
  }

  getLaunchVelocity(time) {
    if (!Number.isFinite(time) || !Number.isFinite(this.lastMotionTime)) {
      return { x: 0, y: 0 };
    }
    if (time - this.lastMotionTime > this.config.staleAfterMs) {
      return { x: 0, y: 0 };
    }

    const velocity = clampMagnitude(this.velocity, this.config.maxLaunchSpeed);
    return Math.hypot(velocity.x, velocity.y) >= this.config.minLaunchSpeed
      ? velocity
      : { x: 0, y: 0 };
  }
}

export function stepPanInertia(velocity, deltaMs, config = PAN_INERTIA_CONFIG) {
  const safeVelocity = isFinitePoint(velocity) ? velocity : { x: 0, y: 0 };
  const elapsed = Math.min(config.maxFrameMs, Math.max(0, Number(deltaMs) || 0));
  if (elapsed === 0) {
    return {
      dx: 0,
      dy: 0,
      velocity: { ...safeVelocity },
      done: Math.hypot(safeVelocity.x, safeVelocity.y) < config.stopSpeed,
    };
  }

  const damping = Math.exp(-config.frictionPerMs * elapsed);
  const distanceFactor = (1 - damping) / config.frictionPerMs;
  const nextVelocity = {
    x: safeVelocity.x * damping,
    y: safeVelocity.y * damping,
  };

  return {
    dx: safeVelocity.x * distanceFactor,
    dy: safeVelocity.y * distanceFactor,
    velocity: nextVelocity,
    done: Math.hypot(nextVelocity.x, nextVelocity.y) < config.stopSpeed,
  };
}

export function prefersReducedPanMotion() {
  return Boolean(
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}
