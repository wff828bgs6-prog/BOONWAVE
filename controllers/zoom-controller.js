import store from '../state/store.js';
import { BASE_ZOOM, MAX_ZOOM, MIN_ZOOM, zoomAt } from '../canvas/camera.js';

const RANGE_STEP = 0.005;
const TRACK_INSET_PX = 12;

export class ZoomController {
  constructor({ range, getCenter }) {
    if (!(range instanceof HTMLInputElement)) throw new TypeError('ZoomController expects a range input.');
    this.range = range;
    this.getCenter = getCenter;
    this.touchArea = range.closest('.zoom-touch-area');
    this.visualRoot = range.closest('.rail-zoom');
    this.rail = range.closest('.one-hand-rail');
    this.thumb = this.visualRoot?.querySelector('.zoom-thumb') ?? null;
    this.fill = this.visualRoot?.querySelector('.zoom-fill') ?? null;
    this.activePointerId = null;
    this.visualFrame = null;
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

    if (this.touchArea) {
      this.touchArea.addEventListener('pointerdown', (event) => this.onPointerDown(event), { signal });
      this.touchArea.addEventListener('pointermove', (event) => this.onPointerMove(event), { signal });
      this.touchArea.addEventListener('pointerup', (event) => this.onPointerUp(event), { signal });
      this.touchArea.addEventListener('pointercancel', (event) => this.onPointerUp(event), { signal });
      this.touchArea.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
    }

    window.addEventListener('resize', () => this.scheduleVisualSync(store.getState().camera.zoom), { signal });
    this.unsubscribe = store.subscribe((next, previous) => {
      if (next.camera !== previous.camera) this.sync(next.camera.zoom);
    });
    this.sync(store.getState().camera.zoom);
  }

  isHorizontal() {
    return this.rail?.dataset.position === 'bottom';
  }

  onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.activePointerId = event.pointerId;
    try { this.touchArea.setPointerCapture?.(event.pointerId); } catch {}
    this.applyFromPointer(event);
  }

  onPointerMove(event) {
    if (event.pointerId !== this.activePointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.applyFromPointer(event);
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

  applyFromPointer(event) {
    const rect = this.touchArea.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rawRatio = this.isHorizontal()
      ? (event.clientX - rect.left) / rect.width
      : (rect.bottom - event.clientY) / rect.height;
    const ratio = Math.min(1, Math.max(0, rawRatio));
    this.applyZoom(MIN_ZOOM + ratio * (MAX_ZOOM - MIN_ZOOM));
  }

  applyZoom(nextZoom) {
    const currentZoom = store.getState().camera.zoom;
    if (!Number.isFinite(nextZoom) || !Number.isFinite(currentZoom) || currentZoom <= 0) return;
    const center = this.getCenter();
    zoomAt(center.x, center.y, nextZoom / currentZoom);
  }

  sync(zoom) {
    if (!Number.isFinite(zoom)) return;
    this.range.value = String(zoom);
    this.range.setAttribute('aria-valuenow', zoom.toFixed(3));
    this.range.setAttribute('aria-orientation', this.isHorizontal() ? 'horizontal' : 'vertical');
    this.scheduleVisualSync(zoom);
  }

  scheduleVisualSync(zoom) {
    if (this.visualFrame !== null) cancelAnimationFrame(this.visualFrame);
    this.visualFrame = requestAnimationFrame(() => {
      this.visualFrame = null;
      this.updateVisuals(zoom);
    });
  }

  updateVisuals(zoom) {
    if (!this.touchArea || !this.thumb || !this.fill) return;
    const progress = Math.min(1, Math.max(0, (zoom - MIN_ZOOM) / Math.max(MAX_ZOOM - MIN_ZOOM, Number.EPSILON)));
    const rect = this.touchArea.getBoundingClientRect();

    if (this.isHorizontal()) {
      const usable = Math.max(0, rect.width - TRACK_INSET_PX * 2);
      const offset = TRACK_INSET_PX + usable * progress;
      this.thumb.style.left = `${offset}px`;
      this.thumb.style.top = '50%';
      this.thumb.style.bottom = 'auto';
      this.fill.style.width = `${usable * progress}px`;
      this.fill.style.height = '2px';
    } else {
      const usable = Math.max(0, rect.height - TRACK_INSET_PX * 2);
      const offset = TRACK_INSET_PX + usable * progress;
      this.thumb.style.bottom = `${offset}px`;
      this.thumb.style.left = '50%';
      this.thumb.style.top = 'auto';
      this.fill.style.height = `${usable * progress}px`;
      this.fill.style.width = '2px';
    }
  }

  refreshLayout() {
    this.sync(store.getState().camera.zoom);
  }

  destroy() {
    if (this.visualFrame !== null) cancelAnimationFrame(this.visualFrame);
    this.abortController.abort();
    this.unsubscribe?.();
    this.activePointerId = null;
  }
}

export default ZoomController;
