import { BASE_ZOOM, clampZoom } from './camera.js';

export const HOME_CAMERA_DURATION_MS = 360;

export function easeOutCubic(value) {
  const t = Math.min(1, Math.max(0, Number(value) || 0));
  return 1 - ((1 - t) ** 3);
}

export function getCameraForCard({
  card,
  cardWidth = 230,
  cardHeight = 138,
  targetX,
  targetY,
  zoom = BASE_ZOOM,
} = {}) {
  if (!card || !Number.isFinite(card.x) || !Number.isFinite(card.y)) {
    throw new TypeError('getCameraForCard expects a positioned card.');
  }
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    throw new TypeError('getCameraForCard expects a finite target point.');
  }

  const safeZoom = clampZoom(zoom);
  const width = Math.max(1, Number(cardWidth) || 230);
  const height = Math.max(1, Number(cardHeight) || 138);
  const centerX = card.x + width / 2;
  const centerY = card.y + height / 2;

  return {
    x: targetX - centerX * safeZoom,
    y: targetY - centerY * safeZoom,
    zoom: safeZoom,
  };
}

export function interpolateCamera(from, to, progress) {
  const t = easeOutCubic(progress);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
  };
}
