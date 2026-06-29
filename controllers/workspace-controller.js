import store from '../state/store.js';
import { GestureMachine } from '../canvas/gesture-machine.js';
import { CardController } from '../canvas/card-controller.js';
import { createLinksRenderer } from '../canvas/links.js';
import { updateCardNode } from '../services/node-service.js';
import { loadWorkspace, saveCamera } from '../services/workspace-service.js';

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

  createCardElement(card) {
    const element = document.createElement('article');
    element.className = 'card';
    element.dataset.cardId = card.id;
    element.innerHTML = '<div class="card-type"></div><h2></h2><p></p>';
    return element;
  }

  renderCards() {
    const state = store.getState();
    const linkSourceId = this.linkSourceProvider?.() ?? null;
    const existing = new Map(
      [...this.world.querySelectorAll('[data-card-id]')]
        .map((element) => [element.dataset.cardId, element]),
    );

    for (const card of Object.values(state.cards)) {
      let element = existing.get(card.id);
      if (!element) {
        element = this.createCardElement(card);
        this.world.append(element);
      }

      existing.delete(card.id);
      element.dataset.selected = String(state.selectedCardId === card.id);
      element.dataset.linkSource = String(linkSourceId === card.id);
      element.style.transform = `translate3d(${card.x}px, ${card.y}px, 0)`;
      element.querySelector('.card-type').textContent = card.type;
      element.querySelector('h2').textContent = card.title;
      element.querySelector('p').textContent = card.description;
    }

    for (const element of existing.values()) element.remove();
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
      if (next.cards !== previous.cards || next.selectedCardId !== previous.selectedCardId) {
        this.renderCards();
      }
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
