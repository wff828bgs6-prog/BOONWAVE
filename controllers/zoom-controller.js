import store from '../state/store.js';
import {
  BASE_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  zoomAt,
} from '../canvas/camera.js';

const ZOOM_OUT_FACTOR = 0.82;
const ZOOM_IN_FACTOR = 1.22;
const RANGE_STEP = 0.005;

export class ZoomController {
  constructor({ range, zoomOutButton, zoomInButton, getCenter }) {
    this.range = range;
    this.zoomOutButton = zoomOutButton;
    this.zoomInButton = zoomInButton;
    this.getCenter = getCenter;
    this.abortController = new AbortController();
    this.unsubscribe = null;
    this.configureRange();
    this.bind();
  }

  configureRange() {
    this.range.min = String(MIN_ZOOM);
    this.range.max = String(MAX_ZOOM);
    this.range.step = String(RANGE_STEP);
    this.range.value = String(BASE_ZOOM);
  }

  bind() {
    const signal = this.abortController.signal;

    this.range.addEventListener('input', () => {
      const nextZoom = Number(this.range.value);
      const currentZoom = store.getState().camera.zoom;
      if (!Number.isFinite(nextZoom) || !Number.isFinite(currentZoom) || currentZoom <= 0) return;
      const center = this.getCenter();
      zoomAt(center.x, center.y, nextZoom / currentZoom);
    }, { signal });

    this.zoomOutButton.addEventListener('click', () => this.step(ZOOM_OUT_FACTOR), { signal });
    this.zoomInButton.addEventListener('click', () => this.step(ZOOM_IN_FACTOR), { signal });

    this.unsubscribe = store.subscribe((next, previous) => {
      if (next.camera !== previous.camera) this.sync(next.camera.zoom);
    });

    this.sync(store.getState().camera.zoom);
  }

  step(factor) {
    const center = this.getCenter();
    zoomAt(center.x, center.y, factor);
  }

  sync(zoom) {
    if (!Number.isFinite(zoom)) return;
    const min = Number(this.range.min) || MIN_ZOOM;
    const max = Number(this.range.max) || MAX_ZOOM;
    const progress = ((zoom - min) / Math.max(max - min, Number.EPSILON)) * 100;

    this.range.value = String(zoom);
    this.range.style.setProperty('--zoom-progress', `${Math.min(100, Math.max(0, progress))}%`);
    this.range.setAttribute('aria-valuenow', zoom.toFixed(3));
  }

  destroy() {
    this.abortController.abort();
    this.unsubscribe?.();
  }
}

export default ZoomController;
