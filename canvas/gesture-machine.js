import store from '../state/store.js';
import { pan, zoomAt } from './camera.js';

const STATES = Object.freeze({
  IDLE: 'IDLE',
  PANNING: 'PANNING',
  PINCHING: 'PINCHING',
});

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export class GestureMachine {
  constructor(element, { interactiveSelector = '[data-card-id]' } = {}) {
    if (!(element instanceof Element)) {
      throw new TypeError('GestureMachine expects a DOM element.');
    }

    this.element = element;
    this.interactiveSelector = interactiveSelector;
    this.pointers = new Map();
    this.state = STATES.IDLE;
    this.lastPanPoint = null;
    this.lastPinchDistance = 0;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);

    this.element.style.touchAction = 'none';
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);
    this.element.addEventListener('wheel', this.onWheel, { passive: false });
  }

  setState(nextState) {
    this.state = nextState;
    store.setState({ activeGesture: nextState });
  }

  onPointerDown(event) {
    const startedOnInteractive = Boolean(event.target.closest?.(this.interactiveSelector));
    if (startedOnInteractive && this.pointers.size === 0) return;

    this.element.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      this.lastPanPoint = { x: event.clientX, y: event.clientY };
      this.setState(STATES.PANNING);
      return;
    }

    if (this.pointers.size >= 2) {
      const [first, second] = [...this.pointers.values()];
      this.lastPinchDistance = Math.max(distance(first, second), 1);
      this.setState(STATES.PINCHING);
    }
  }

  onPointerMove(event) {
    if (!this.pointers.has(event.pointerId)) return;

    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1 && this.state === STATES.PANNING) {
      const current = { x: event.clientX, y: event.clientY };
      if (this.lastPanPoint) {
        pan(current.x - this.lastPanPoint.x, current.y - this.lastPanPoint.y);
      }
      this.lastPanPoint = current;
      return;
    }

    if (this.pointers.size >= 2) {
      const [first, second] = [...this.pointers.values()];
      const nextDistance = Math.max(distance(first, second), 1);
      const center = midpoint(first, second);
      const factor = nextDistance / Math.max(this.lastPinchDistance, 1);

      if (Number.isFinite(factor) && factor > 0) {
        zoomAt(center.x, center.y, factor);
      }

      this.lastPinchDistance = nextDistance;
      this.setState(STATES.PINCHING);
    }
  }

  onPointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;

    this.pointers.delete(event.pointerId);
    this.element.releasePointerCapture?.(event.pointerId);

    if (this.pointers.size === 1) {
      this.lastPanPoint = [...this.pointers.values()][0];
      this.setState(STATES.PANNING);
      return;
    }

    if (this.pointers.size === 0) {
      this.lastPanPoint = null;
      this.lastPinchDistance = 0;
      this.setState(STATES.IDLE);
    }
  }

  onWheel(event) {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    zoomAt(event.clientX, event.clientY, factor);
  }

  destroy() {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.element.removeEventListener('wheel', this.onWheel);
    this.pointers.clear();
    this.setState(STATES.IDLE);
  }
}

export default GestureMachine;
