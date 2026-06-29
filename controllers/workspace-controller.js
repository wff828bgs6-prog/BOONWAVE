import store from '../state/store.js';
import { GestureMachine } from '../canvas/gesture-machine.js';
import { CardController } from '../canvas/card-controller.js';
import { createLinksRenderer } from '../canvas/links.js';
import { NODE_TYPE_LABELS } from '../domain/node-schemas.js';
import { updateCardNode } from '../services/node-service.js';
import { loadWorkspace, saveCamera } from '../services/workspace-service.js';

const STATUS_LABELS = Object.freeze({
  preparation: 'Подготовка',
  planned: 'Запланировано',
  active: 'Активно',
  draft: 'Черновик',
  in_progress: 'В работе',
  paused: 'На паузе',
  completed: 'Завершено',
});

function getNodeMeta(card) {
  const data = card.data ?? {};

  if (card.type === 'project') {
    return [STATUS_LABELS[data.status] ?? data.status, data.address].filter(Boolean);
  }

  if (card.type === 'process' || card.type === 'goal') {
    const progress = Number.isFinite(data.progress) ? `${Math.round(data.progress)}%` : null;
    return [STATUS_LABELS[data.status] ?? data.status, progress].filter(Boolean);
  }

  if (card.type === 'person') {
    return [data.role, data.organization].filter(Boolean);
  }

  if (card.type === 'idea') {
    return [STATUS_LABELS[data.status] ?? data.status, data.category].filter(Boolean);
  }

  return [];
}

function collectChangedCardIds(nextCards = {}, previousCards = {}) {
  const ids = new Set([...Object.keys(nextCards), ...Object.keys(previousCards)]);
  return [...ids].filter((id) => nextCards[id] !== previousCards[id]);
}

export class WorkspaceController {
  constructor({ canvas, world, initialSelectedCardId = null }) {
    if (!(canvas instanceof Element) || !(world instanceof Element)) {
      throw new TypeError('WorkspaceController expects canvas and world elements.');
    }

    this.canvas = canvas;
    this.world = world;
    this.initialSelectedCardId = initialSelectedCardId;
    this.cardTapHandler = null;
    this.backgroundTapHandler = null;
    this.linkSourceProvider = null;
    this.cameraSaveTimer = null;
    this.gestureMachine = null;
    this.cardController = null;
    this.linksRenderer = null;
    this.unsubscribe = null;
    this.abortController = new AbortController();
  }

  setCardTapHandler(handler) {
    this.cardTapHandler = typeof handler === 'function' ? handler : null;
  }

  setBackgroundTapHandler(handler) {
    this.backgroundTapHandler = typeof handler === 'function' ? handler : null;
  }

  setLinkSourceProvider(provider) {
    this.linkSourceProvider = typeof provider === 'function' ? provider : null;
  }

  async init({ onEmpty } = {}) {
    await loadWorkspace();

    if (Object.keys(store.getState().cards).length === 0 && typeof onEmpty === 'function') {
      await onEmpty();
      await loadWorkspace();
    }

    const cards = store.getState().cards;
    const selectedCardId = this.initialSelectedCardId && cards[this.initialSelectedCardId]
      ? this.initialSelectedCardId
      : null;
    store.setState({ selectedCardId });

    this.renderCards();
    this.applyCamera();
    this.mountCore();
    this.bindStore();
    this.bindCanvas();
    return this;
  }

  createCardElement() {
    const element = document.createElement('article');
    element.className = 'card';
    element.innerHTML = '<div class="card-head"><div class="card-type"></div><div class="card-status"></div></div><h2></h2><p></p><div class="card-meta"></div>';
    return element;
  }

  updateCardElement(element, card, state, linkSourceId) {
    const meta = getNodeMeta(card);
    element.dataset.nodeType = card.type;
    element.dataset.selected = String(state.selectedCardId === card.id);
    element.dataset.linkSource = String(linkSourceId === card.id);
    element.style.transform = `translate3d(${card.x}px, ${card.y}px, 0)`;
    element.querySelector('.card-type').textContent = NODE_TYPE_LABELS[card.type] ?? card.type;
    element.querySelector('.card-status').textContent = meta[0] ?? '';
    element.querySelector('h2').textContent = card.title;
    element.querySelector('p').textContent = card.description;
    element.querySelector('.card-meta').textContent = meta.slice(1).join(' • ');
  }

  renderCards(cardIds = null) {
    const state = store.getState();
    const linkSourceId = this.linkSourceProvider?.() ?? null;

    if (cardIds === null) {
      const existing = new Map(
        [...this.world.querySelectorAll('[data-card-id]')]
          .map((element) => [element.dataset.cardId, element]),
      );

      for (const card of Object.values(state.cards)) {
        let element = existing.get(card.id);
        if (!element) {
          element = this.createCardElement();
          element.dataset.cardId = card.id;
          this.world.append(element);
        }
        existing.delete(card.id);
        this.updateCardElement(element, card, state, linkSourceId);
      }

      for (const element of existing.values()) element.remove();
      return;
    }

    const ids = [...new Set(cardIds.filter(Boolean))];
    for (const id of ids) {
      const card = state.cards[id];
      let element = this.world.querySelector(`[data-card-id="${CSS.escape(id)}"]`);

      if (!card) {
        element?.remove();
        continue;
      }

      if (!element) {
        element = this.createCardElement();
        element.dataset.cardId = card.id;
        this.world.append(element);
      }

      this.updateCardElement(element, card, state, linkSourceId);
    }
  }

  applyCamera() {
    const { camera } = store.getState();
    this.world.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`;
  }

  scheduleCameraSave(camera) {
    clearTimeout(this.cameraSaveTimer);
    this.cameraSaveTimer = setTimeout(() => {
      saveCamera(camera).catch((error) => {
        console.error('Camera save failed:', error);
      });
    }, 180);
  }

  getViewportCenter() {
    const { camera } = store.getState();
    return {
      x: (window.innerWidth / 2 - camera.x) / camera.zoom - 115,
      y: (window.innerHeight / 2 - camera.y) / camera.zoom - 69,
    };
  }

  mountCore() {
    this.gestureMachine = new GestureMachine(this.canvas);
    this.cardController = new CardController(this.world, {
      onCommit: (card) => updateCardNode(card.id, { x: card.x, y: card.y }),
      onTap: (card) => this.cardTapHandler?.(card),
    });
    this.linksRenderer = createLinksRenderer(this.world);
  }

  bindStore() {
    this.unsubscribe = store.subscribe((next, previous) => {
      const changedIds = new Set();

      if (next.cards !== previous.cards) {
        for (const id of collectChangedCardIds(next.cards, previous.cards)) changedIds.add(id);
      }

      if (next.selectedCardId !== previous.selectedCardId) {
        if (previous.selectedCardId) changedIds.add(previous.selectedCardId);
        if (next.selectedCardId) changedIds.add(next.selectedCardId);
      }

      if (changedIds.size > 0) this.renderCards([...changedIds]);

      if (next.camera !== previous.camera) {
        this.applyCamera();
        this.scheduleCameraSave(next.camera);
      }
    });
  }

  bindCanvas() {
    this.canvas.addEventListener('click', (event) => {
      if (event.target.closest('[data-card-id]')) return;
      store.setState({ selectedCardId: null });
      this.backgroundTapHandler?.();
    }, { signal: this.abortController.signal });
  }

  destroy() {
    clearTimeout(this.cameraSaveTimer);
    saveCamera().catch(() => {});
    this.abortController.abort();
    this.unsubscribe?.();
    this.linksRenderer?.destroy();
    this.cardController?.destroy();
    this.gestureMachine?.destroy();
  }
}

export default WorkspaceController;
