import store from '../state/store.js';
import { BASE_ZOOM, MAX_ZOOM, MIN_ZOOM, zoomAt } from '../canvas/camera.js';

const ZOOM_OUT_FACTOR = 0.82;
const ZOOM_IN_FACTOR = 1.22;
const RANGE_STEP = 0.005;

export class ZoomController {
  constructor({ range, zoomOutButton, zoomInButton, getCenter }) {
    if (!(range instanceof HTMLInputElement)) throw new TypeError('ZoomController expects a range input.');
    this.range = range;
    this.zoomOutButton = zoomOutButton;
    this.zoomInButton = zoomInButton;
    this.getCenter = getCenter;
    this.touchArea = range.closest('.zoom-touch-area');
    this.visualRoot = range.closest('.rail-zoom');
    this.activePointerId = null;
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

    this.range.addEventListener('input', () => this.applyZoom(Number(this.range.value)), { signal });
    this.zoomOutButton.addEventListener('click', () => this.step(ZOOM_OUT_FACTOR), { signal });
    this.zoomInButton.addEventListener('click', () => this.step(ZOOM_IN_FACTOR), { signal });

    if (this.touchArea) {
      this.touchArea.addEventListener('pointerdown', (event) => this.onPointerDown(event), { signal });
      this.touchArea.addEventListener('pointermove', (event) => this.onPointerMove(event), { signal });
      this.touchArea.addEventListener('pointerup', (event) => this.onPointerUp(event), { signal });
      this.touchArea.addEventListener('pointercancel', (event) => this.onPointerUp(event), { signal });
    }

    this.unsubscribe = store.subscribe((next, previous) => {
      if (next.camera !== previous.camera) this.sync(next.camera.zoom);
    });
    this.sync(store.getState().camera.zoom);
  }

  onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.activePointerId = event.pointerId;
    try { this.touchArea.setPointerCapture?.(event.pointerId); } catch {}
    this.applyFromClientY(event.clientY);
  }

  onPointerMove(event) {
    if (event.pointerId !== this.activePointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.applyFromClientY(event.clientY);
  }

  onPointerUp(event) {
    if (event.pointerId !== this.activePointerId) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      if (!this.touchArea.hasPointerCapture || this.touchArea.hasPointerCapture(event.pointerId)) {
        this.touchArea.releasePointerCapture?.(event.pointerId);
      }
    } catch {}
    this.activePointerId = null;
  }

  applyFromClientY(clientY) {
    const rect = this.touchArea.getBoundingClientRect();
    if (!rect.height) return;
    const ratio = Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height));
    const nextZoom = MIN_ZOOM + ratio * (MAX_ZOOM - MIN_ZOOM);
    this.applyZoom(nextZoom);
  }

  applyZoom(nextZoom) {
    const currentZoom = store.getState().camera.zoom;
    if (!Number.isFinite(nextZoom) || !Number.isFinite(currentZoom) || currentZoom <= 0) return;
    const center = this.getCenter();
    zoomAt(center.x, center.y, nextZoom / currentZoom);
  }

  step(factor) {
    const center = this.getCenter();
    zoomAt(center.x, center.y, factor);
  }

  sync(zoom) {
    if (!Number.isFinite(zoom)) return;
    const progress = Math.min(1, Math.max(0, (zoom - MIN_ZOOM) / Math.max(MAX_ZOOM - MIN_ZOOM, Number.EPSILON)));
    this.range.value = String(zoom);
    this.range.setAttribute('aria-valuenow', zoom.toFixed(3));
    this.visualRoot?.style.setProperty('--zoom-progress', `${progress * 100}%`);
  }

  destroy() {
    this.abortController.abort();
    this.unsubscribe?.();
    this.activePointerId = null;
  }
}

export default ZoomController;
