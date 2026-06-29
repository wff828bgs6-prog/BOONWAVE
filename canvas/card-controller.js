import store from '../state/store.js';

const DRAGGING = 'DRAGGING_CARD';
const MOVE_THRESHOLD_PX = 1.5;

function getSafeCamera() {
  const { camera = {} } = store.getState();
  return {
    x: Number.isFinite(camera.x) ? camera.x : 0,
    y: Number.isFinite(camera.y) ? camera.y : 0,
    zoom: Math.max(Number.isFinite(camera.zoom) ? camera.zoom : 1, 0.01),
  };
}

export class CardController {
  constructor(root, { onCommit, onTap } = {}) {
    if (!(root instanceof Element)) {
      throw new TypeError('CardController expects a DOM element.');
    }

    this.root = root;
    this.onCommit = typeof onCommit === 'function' ? onCommit : null;
    this.onTap = typeof onTap === 'function' ? onTap : null;
    this.active = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    root.addEventListener('pointerdown', this.onPointerDown);
    root.addEventListener('pointermove', this.onPointerMove);
    root.addEventListener('pointerup', this.onPointerUp);
    root.addEventListener('pointercancel', this.onPointerUp);
  }

  onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;

    const element = event.target.closest('[data-card-id]');
    if (!element || !this.root.contains(element)) return;

    const { cards } = store.getState();
    const card = cards[element.dataset.cardId];
    if (!card) return;

    const camera = getSafeCamera();
    const pointerWorldX = (event.clientX - camera.x) / camera.zoom;
    const pointerWorldY = (event.clientY - camera.y) / camera.zoom;

    event.stopPropagation();
    element.setPointerCapture?.(event.pointerId);

    this.active = {
      pointerId: event.pointerId,
      cardId: card.id,
      element,
      startClientX: event.clientX,
      startClientY: event.clientY,
      grabOffsetX: pointerWorldX - card.x,
      grabOffsetY: pointerWorldY - card.y,
      moved: false,
    };

    store.setState({ selectedCardId: card.id, activeGesture: DRAGGING });
  }

  onPointerMove(event) {
    const drag = this.active;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const screenDistance = Math.hypot(
      event.clientX - drag.startClientX,
      event.clientY - drag.startClientY,
    );
    drag.moved = drag.moved || screenDistance > MOVE_THRESHOLD_PX;

    const camera = getSafeCamera();
    const nextX = (event.clientX - camera.x) / camera.zoom - drag.grabOffsetX;
    const nextY = (event.clientY - camera.y) / camera.zoom - drag.grabOffsetY;

    const state = store.getState();
    const card = state.cards[drag.cardId];
    if (!card) return;

    const x = Math.round(nextX);
    const y = Math.round(nextY);
    if (card.x === x && card.y === y) return;

    drag.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    store.setState({
      cards: {
        ...state.cards,
        [drag.cardId]: {
          ...card,
          x,
          y,
        },
      },
    });
  }

  onPointerUp(event) {
    const drag = this.active;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.stopPropagation();
    drag.element.releasePointerCapture?.(event.pointerId);
    this.active = null;
    store.setState({ activeGesture: 'IDLE' });

    const card = store.getState().cards[drag.cardId];
    if (!card) return;

    if (drag.moved && this.onCommit) {
      Promise.resolve(this.onCommit(card)).catch((error) => {
        console.error('Card position save failed:', error);
      });
      return;
    }

    if (!drag.moved && this.onTap) {
      Promise.resolve(this.onTap(card)).catch((error) => {
        console.error('Card tap action failed:', error);
      });
    }
  }

  destroy() {
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointermove', this.onPointerMove);
    this.root.removeEventListener('pointerup', this.onPointerUp);
    this.root.removeEventListener('pointercancel', this.onPointerUp);
    this.active = null;
  }
}

export default CardController;
