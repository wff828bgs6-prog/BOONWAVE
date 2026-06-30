export const LONG_PRESS_DELAY_MS = 500;
export const LONG_PRESS_MOVE_TOLERANCE_PX = 8;
export const CARD_DRAG_START_PX = 6;
export const DOUBLE_TAP_WINDOW_MS = 320;
export const DOUBLE_TAP_DISTANCE_PX = 28;

export function pointerDistance(first, second) {
  if (!first || !second) return Number.POSITIVE_INFINITY;
  return Math.hypot(
    Number(second.x) - Number(first.x),
    Number(second.y) - Number(first.y),
  );
}

export function canRemainLongPress(start, current) {
  return pointerDistance(start, current) <= LONG_PRESS_MOVE_TOLERANCE_PX;
}

export function shouldStartCardDrag(start, current) {
  return pointerDistance(start, current) > CARD_DRAG_START_PX;
}

export function isDoubleTap(previous, current) {
  if (!previous || !current) return false;
  if (previous.cardId !== current.cardId) return false;

  const elapsed = Number(current.time) - Number(previous.time);
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > DOUBLE_TAP_WINDOW_MS) return false;

  return pointerDistance(previous, current) <= DOUBLE_TAP_DISTANCE_PX;
}
