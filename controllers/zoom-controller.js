import store from '../state/store.js';
import { zoomAt } from '../canvas/camera.js';

export class ZoomController {
  constructor({ range, zoomOutButton, zoomInButton, getCenter }) {
    this.range = range;
    this.zoomOutButton = zoomOutButton;
    this.zoomInButton = zoomInButton;
    this.getCenter = getCenter;
    this.abortController = new AbortController();
    this.unsubscribe = null;
    this.bind();
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

    this.zoomOutButton.addEventListener('click', () => this.step(0.85), { signal });
    this.zoomInButton.addEventListener('click', () => this.step(1.18), { signal });

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
    const min = Number(this.range.min) || 0.25;
    const max = Number(this.range.max) || 3;
    const progress = ((zoom - min) / Math.max(max - min, Number.EPSILON)) * 100;

    this.range.value = String(zoom);
    this.range.style.setProperty('--zoom-progress', `${Math.min(100, Math.max(0, progress))}%`);
    this.range.setAttribute('aria-valuenow', zoom.toFixed(2));
  }

  destroy() {
    this.abortController.abort();
    this.unsubscribe?.();
  }
}

export default ZoomController;
