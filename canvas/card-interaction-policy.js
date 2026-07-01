export const LONG_PRESS_DELAY_MS = 500;
export const LONG_PRESS_MOVE_TOLERANCE_PX = 8;
export const CARD_DRAG_START_PX = 6;

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
