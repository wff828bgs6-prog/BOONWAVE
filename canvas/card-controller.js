import store from '../state/store.js';

const DRAGGING = 'DRAGGING_CARD';

export class CardController {
  constructor(root, { onCommit } = {}) {
    if (!(root instanceof Element)) {
      throw new TypeError('CardController expects a DOM element.');
    }

    this.root = root;
    this.onCommit = typeof onCommit === 'function' ? onCommit : null;
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

    const { cards, camera } = store.getState();
    const card = cards[element.dataset.cardId];
    if (!card) return;

    event.stopPropagation();
    element.setPointerCapture?.(event.pointerId);

    this.active = {
      pointerId: event.pointerId,
      cardId: card.id,
      element,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: card.x,
      startY: card.y,
      zoom: Math.max(camera.zoom || 1, 0.01),
      moved: false,
    };

    store.setState({ selectedCardId: card.id, activeGesture: DRAGGING });
  }

  onPointerMove(event) {
    const drag = this.active;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const dx = (event.clientX - drag.startClientX) / drag.zoom;
    const dy = (event.clientY - drag.startClientY) / drag.zoom;
    drag.moved = drag.moved || Math.hypot(dx, dy) > 2;

    const state = store.getState();
    const card = state.cards[drag.cardId];
    if (!card) return;

    store.setState({
      cards: {
        ...state.cards,
        [drag.cardId]: {
          ...card,
          x: Math.round(drag.startX + dx),
          y: Math.round(drag.startY + dy),
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
    if (drag.moved && card && this.onCommit) {
      Promise.resolve(this.onCommit(card)).catch((error) => {
        console.error('Card position save failed:', error);
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
