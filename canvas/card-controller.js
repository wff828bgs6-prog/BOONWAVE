import store from '../state/store.js';
import {
  LONG_PRESS_DELAY_MS,
  canRemainLongPress,
  isDoubleTap,
  shouldStartCardDrag,
} from './card-interaction-policy.js';

const DRAGGING = 'DRAGGING_CARD';
const FOCUSING = 'FOCUSING_CARD';

function getSafeCamera() {
  const { camera = {} } = store.getState();
  return {
    x: Number.isFinite(camera.x) ? camera.x : 0,
    y: Number.isFinite(camera.y) ? camera.y : 0,
    zoom: Math.max(Number.isFinite(camera.zoom) ? camera.zoom : 1, 0.01),
  };
}

function getEventTime(event) {
  const value = Number(event.timeStamp);
  return Number.isFinite(value) && value >= 0 ? value : performance.now();
}

export class CardController {
  constructor(root, {
    onCommit,
    onTap,
    onLongPress,
    onDoubleTap,
    canOpenFullscreen,
  } = {}) {
    if (!(root instanceof Element)) {
      throw new TypeError('CardController expects a DOM element.');
    }

    this.root = root;
    this.onCommit = typeof onCommit === 'function' ? onCommit : null;
    this.onTap = typeof onTap === 'function' ? onTap : null;
    this.onLongPress = typeof onLongPress === 'function' ? onLongPress : null;
    this.onDoubleTap = typeof onDoubleTap === 'function' ? onDoubleTap : null;
    this.canOpenFullscreen = typeof canOpenFullscreen === 'function' ? canOpenFullscreen : () => true;
    this.active = null;
    this.longPressTimer = null;
    this.lastTap = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    root.addEventListener('pointerdown', this.onPointerDown);
    root.addEventListener('pointermove', this.onPointerMove);
    root.addEventListener('pointerup', this.onPointerUp);
    root.addEventListener('pointercancel', this.onPointerUp);
    root.addEventListener('contextmenu', this.onContextMenu);
    root.addEventListener('keydown', this.onKeyDown);
  }

  clearLongPressTimer() {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  getCardFromElement(element) {
    const cardId = element?.dataset?.cardId;
    return cardId ? store.getState().cards[cardId] ?? null : null;
  }

  onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (this.active) {
      this.clearLongPressTimer();
      return;
    }

    const element = event.target.closest('[data-card-id]');
    if (!element || !this.root.contains(element)) return;

    const card = this.getCardFromElement(element);
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
      longPressed: false,
    };

    store.setState({ selectedCardId: card.id, activeGesture: DRAGGING });
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      const active = this.active;
      if (!active || active.pointerId !== event.pointerId || active.moved || active.longPressed) return;
      active.longPressed = true;
      store.setState({ activeGesture: FOCUSING });
      const currentCard = this.getCardFromElement(active.element);
      if (currentCard && this.onLongPress) {
        Promise.resolve(this.onLongPress(currentCard, active.element)).catch((error) => {
          console.error('Card focus action failed:', error);
        });
      }
    }, LONG_PRESS_DELAY_MS);
  }

  onPointerMove(event) {
    const drag = this.active;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const start = { x: drag.startClientX, y: drag.startClientY };
    const current = { x: event.clientX, y: event.clientY };
    if (!canRemainLongPress(start, current)) this.clearLongPressTimer();
    if (drag.longPressed) return;

    drag.moved = drag.moved || shouldStartCardDrag(start, current);
    if (!drag.moved) return;

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

    this.clearLongPressTimer();
    event.stopPropagation();
    drag.element.releasePointerCapture?.(event.pointerId);
    this.active = null;
    store.setState({ activeGesture: 'IDLE' });

    if (event.type === 'pointercancel') return;
    const card = store.getState().cards[drag.cardId];
    if (!card) return;
    if (drag.longPressed) return;

    if (drag.moved && this.onCommit) {
      Promise.resolve(this.onCommit(card)).catch((error) => {
        console.error('Card position save failed:', error);
      });
      return;
    }

    const tap = {
      cardId: card.id,
      x: event.clientX,
      y: event.clientY,
      time: getEventTime(event),
    };
    const doubleTap = this.canOpenFullscreen() && isDoubleTap(this.lastTap, tap);
    this.lastTap = doubleTap ? null : tap;

    if (doubleTap && this.onDoubleTap) {
      Promise.resolve(this.onDoubleTap(card, drag.element)).catch((error) => {
        console.error('Card fullscreen action failed:', error);
      });
      return;
    }

    if (this.onTap) {
      Promise.resolve(this.onTap(card)).catch((error) => {
        console.error('Card tap action failed:', error);
      });
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
    if (!card) return;

    if (event.key === ' ' && this.onLongPress) {
      event.preventDefault();
      Promise.resolve(this.onLongPress(card, element)).catch((error) => {
        console.error('Keyboard card focus failed:', error);
      });
      return;
    }

    if (event.key === 'Enter' && this.onDoubleTap && this.canOpenFullscreen()) {
      event.preventDefault();
      Promise.resolve(this.onDoubleTap(card, element)).catch((error) => {
        console.error('Keyboard card fullscreen failed:', error);
      });
    }
  }

  destroy() {
    this.clearLongPressTimer();
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointermove', this.onPointerMove);
    this.root.removeEventListener('pointerup', this.onPointerUp);
    this.root.removeEventListener('pointercancel', this.onPointerUp);
    this.root.removeEventListener('contextmenu', this.onContextMenu);
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.active = null;
    this.lastTap = null;
  }
}

export default CardController;
