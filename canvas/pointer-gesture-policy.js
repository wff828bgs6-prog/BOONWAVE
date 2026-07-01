export const CARD_DRAG_START_PX = 12;

export function pointerDistance(first, second) {
  if (!first || !second) return Number.POSITIVE_INFINITY;
  return Math.hypot(Number(second.x) - Number(first.x), Number(second.y) - Number(first.y));
}

export function shouldStartCardDrag(start, current) {
  return pointerDistance(start, current) > CARD_DRAG_START_PX;
}
