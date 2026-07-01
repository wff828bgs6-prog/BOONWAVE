import store from '../state/store.js';
import { shouldStartCardDrag } from './pointer-gesture-policy.js';

const DRAGGING = 'DRAGGING_CARD';

function getSafeCamera() {
  const { camera = {} } = store.getState();
  return {
    x: Number.isFinite(camera.x) ? camera.x : 0,
    y: Number.isFinite(camera.y) ? camera.y : 0,
    zoom: Math.max(Number.isFinite(camera.zoom) ? camera.zoom : 1, 0.01),
  };
}

export class CardController {
  constructor(root, { onCommit, onTap, canMoveCard } = {}) {
    if (!(root instanceof Element)) throw new TypeError('CardController expects a DOM element.');
    this.root = root;
    this.onCommit = typeof onCommit === 'function' ? onCommit : null;
    this.onTap = typeof onTap === 'function' ? onTap : null;
    this.canMoveCard = typeof canMoveCard === 'function' ? canMoveCard : () => true;
    this.active = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onLostPointerCapture = this.onLostPointerCapture.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    root.addEventListener('pointerdown', this.onPointerDown);
    root.addEventListener('pointermove', this.onPointerMove);
    root.addEventListener('pointerup', this.onPointerUp);
    root.addEventListener('pointercancel', this.onPointerUp);
    root.addEventListener('lostpointercapture', this.onLostPointerCapture);
    root.addEventListener('contextmenu', this.onContextMenu);
    root.addEventListener('keydown', this.onKeyDown);
  }

  releasePointer(active) {
    if (!active?.captured || !active.element) return;
    try {
      if (!active.element.hasPointerCapture || active.element.hasPointerCapture(active.pointerId)) {
        active.element.releasePointerCapture?.(active.pointerId);
      }
    } catch {}
  }

  resetInteraction({ setIdle = true } = {}) {
    const active = this.active;
    this.active = null;
    this.releasePointer(active);
    if (setIdle) store.setState({ activeGesture: 'IDLE' });
    return active;
  }

  getCardFromElement(element) {
    const cardId = element?.dataset?.cardId;
    return cardId ? store.getState().cards[cardId] ?? null : null;
  }

  onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (this.active) this.resetInteraction();

    const element = event.target.closest('[data-card-id]');
    if (!element || !this.root.contains(element)) return;
    const card = this.getCardFromElement(element);
    if (!card || !this.canMoveCard(card)) return;

    const camera = getSafeCamera();
    const pointerWorldX = (event.clientX - camera.x) / camera.zoom;
    const pointerWorldY = (event.clientY - camera.y) / camera.zoom;

    event.preventDefault();
    event.stopPropagation();
    try { element.setPointerCapture?.(event.pointerId); } catch {}
    store.setState({ selectedCardId: card.id, activeGesture: DRAGGING });

    this.active = {
      pointerId: event.pointerId,
      cardId: card.id,
      element,
      captured: true,
      startClientX: event.clientX,
      startClientY: event.clientY,
      grabOffsetX: pointerWorldX - card.x,
      grabOffsetY: pointerWorldY - card.y,
      moved: false,
    };
  }

  onPointerMove(event) {
    const drag = this.active;
    if (!drag || drag.pointerId !== event.pointerId) return;

    drag.moved = drag.moved || shouldStartCardDrag(
      { x: drag.startClientX, y: drag.startClientY },
      { x: event.clientX, y: event.clientY },
    );

    event.preventDefault();
    event.stopPropagation();
    if (!drag.moved) return;

    const camera = getSafeCamera();
    const state = store.getState();
    const card = state.cards[drag.cardId];
    if (!card) return;

    const x = Math.round((event.clientX - camera.x) / camera.zoom - drag.grabOffsetX);
    const y = Math.round((event.clientY - camera.y) / camera.zoom - drag.grabOffsetY);
    if (card.x === x && card.y === y) return;
    drag.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    store.setState({ cards: { ...state.cards, [drag.cardId]: { ...card, x, y } } });
  }

  onPointerUp(event) {
    const drag = this.active;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    this.active = null;
    this.releasePointer(drag);
    store.setState({ activeGesture: 'IDLE' });

    if (event.type === 'pointercancel') return;
    const card = store.getState().cards[drag.cardId];
    if (!card || drag.moved) {
      if (card && drag.moved && this.onCommit) {
        Promise.resolve(this.onCommit(card)).catch((error) => console.error('Card position save failed:', error));
      }
      return;
    }

    store.setState({ selectedCardId: card.id });
    Promise.resolve(this.onTap?.(card, drag.element)).catch((error) => {
      console.error('Card tap action failed:', error);
    });
  }

  onLostPointerCapture(event) {
    const active = this.active;
    if (!active || active.pointerId !== event.pointerId) return;
    const card = store.getState().cards[active.cardId];
    const moved = active.moved;
    this.active = null;
    store.setState({ activeGesture: 'IDLE' });
    if (moved && card && this.onCommit) {
      Promise.resolve(this.onCommit(card)).catch((error) => console.error('Card position save after lost capture failed:', error));
    }
  }

  onContextMenu(event) {
    if (event.target.closest('[data-card-id]')) event.preventDefault();
  }

  onKeyDown(event) {
    if (event.target.closest('button,input,textarea,select,a')) return;
    const element = event.target.closest('[data-card-id]');
    if (!element || !this.root.contains(element)) return;
    const card = this.getCardFromElement(element);
    if (!card || event.key !== 'Enter' || !this.onTap) return;

    event.preventDefault();
    this.resetInteraction();
    store.setState({ selectedCardId: card.id });
    Promise.resolve(this.onTap(card, element)).catch((error) => console.error('Keyboard card open failed:', error));
  }

  destroy() {
    this.resetInteraction();
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointermove', this.onPointerMove);
    this.root.removeEventListener('pointerup', this.onPointerUp);
    this.root.removeEventListener('pointercancel', this.onPointerUp);
    this.root.removeEventListener('lostpointercapture', this.onLostPointerCapture);
    this.root.removeEventListener('contextmenu', this.onContextMenu);
    this.root.removeEventListener('keydown', this.onKeyDown);
  }
}

export default CardController;
