import store from '../state/store.js';
import { WorkspaceController as BaseWorkspaceController } from './workspace-controller.js';
import { GestureMachine } from '../canvas/gesture-machine.js';
import { CardController } from '../canvas/card-controller.js';
import { createLinksRenderer } from '../canvas/links.js';
import { CardDetailController } from './card-detail-controller.js';
import { updateCardNode } from '../services/node-service.js';

function clearDocumentSelection() {
  try { window.getSelection?.()?.removeAllRanges(); } catch {}
}

export class WorkspaceController extends BaseWorkspaceController {
  renderCards() {
    this.world.querySelectorAll('[data-card-id]').forEach((element) => element.remove());
    this.linksRenderer?.render?.([]);
  }

  focusSelfCard() {
    return false;
  }

  updateCardElement(element, card, state, linkSourceId) {
    super.updateCardElement(element, card, state, linkSourceId);
  }

  activateCard(cardId) {
    const card = this.getCard(cardId);
    if (!card) return false;
    store.setState({ selectedCardId: card.id });
    if (this.linkModeProvider?.()) return this.cardTapHandler?.(card);
    return false;
  }

  mountCore() {
    this.detailController = new CardDetailController({
      root: document.body,
      onEdit: (card) => this.cardEditHandler?.(card),
      onDisplay: (card) => this.cardDisplayHandler?.(card),
    });

    this.gestureMachine = new GestureMachine(this.canvas, {
      allowPanFromInteractive: () => Boolean(store.getState().cardsLocked),
      onInteractiveTap: (cardId, element) => this.activateCard(cardId, element),
    });

    this.cardController = new CardController(this.world, {
      onCommit: (card) => updateCardNode(card.id, { x: card.x, y: card.y }),
      onTap: (card, element) => this.activateCard(card.id, element),
      canMoveCard: () => !store.getState().cardsLocked,
    });

    this.linksRenderer = createLinksRenderer(this.world);
  }

  bindCanvas() {
    const signal = this.abortController.signal;
    this.canvas.addEventListener('pointerdown', () => {
      clearDocumentSelection();
      this.cancelCameraAnimation();
    }, { capture: true, signal });
    this.canvas.addEventListener('selectstart', (event) => event.preventDefault(), { signal });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
    this.canvas.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
    this.canvas.addEventListener('click', (event) => {
      if (event.target.closest('[data-card-id]')) return;
      if (this.linkModeProvider?.()) this.backgroundTapHandler?.();
      store.setState({ selectedCardId: null });
    }, { signal });
  }
}

export default WorkspaceController;
