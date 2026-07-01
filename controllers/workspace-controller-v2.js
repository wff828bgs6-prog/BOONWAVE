import store from '../state/store.js';
import { WorkspaceController as BaseWorkspaceController } from './workspace-controller.js';
import { GestureMachine } from '../canvas/gesture-machine.js';
import { CardController } from '../canvas/card-controller.js';
import { createLinksRenderer } from '../canvas/links.js';
import { CardDetailController } from './card-detail-controller.js';
import { updateCardNode } from '../services/node-service.js';
import { formatCardDetails } from '../ui/card-detail-presenter.js';
import { formatSelfSummary } from '../services/self-node-service.js';
import { formatProjectGraphSummary, formatGoalGraphSummary } from '../services/graph-summary-service.js';

function joinSections(...sections) {
  return sections.filter((section) => typeof section === 'string' && section.trim()).join('\n\n');
}

export class WorkspaceController extends BaseWorkspaceController {
  updateCardElement(element, card, state, linkSourceId) {
    super.updateCardElement(element, card, state, linkSourceId);
    element.dataset.systemCard = String(card.type === 'self');
    element.setAttribute('aria-label', `${card.title}. Одно нажатие открывает карточку. Удерживание открывает редактирование.`);

    const detailsElement = element.querySelector('.card-full');
    if (!detailsElement) return;
    if (card.type === 'self') {
      detailsElement.textContent = formatSelfSummary(card, state);
      return;
    }
    const graphSummary = card.type === 'project'
      ? formatProjectGraphSummary(card, state)
      : card.type === 'goal'
        ? formatGoalGraphSummary(card, state)
        : '';
    detailsElement.textContent = joinSections(formatCardDetails(card), graphSummary)
      || 'Дополнительная информация пока не заполнена';
  }

  activateCard(cardId, element) {
    const card = this.getCard(cardId);
    if (!card || !(element instanceof Element)) return false;

    store.setState({ selectedCardId: card.id });
    if (this.linkModeProvider?.()) return this.cardTapHandler?.(card);

    this.gestureMachine?.cancelInteraction();
    return this.detailController.open(card, element);
  }

  handleCardEdit(cardId) {
    const card = this.getCard(cardId);
    if (!card || this.linkModeProvider?.()) return false;
    store.setState({ selectedCardId: card.id });
    return this.cardEditHandler?.(card);
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
      onInteractiveLongPress: (cardId) => this.handleCardEdit(cardId),
    });

    this.cardController = new CardController(this.world, {
      onCommit: (card) => updateCardNode(card.id, { x: card.x, y: card.y }),
      onTap: (card, element) => this.activateCard(card.id, element),
      onLongPress: (card) => {
        if (this.linkModeProvider?.()) return false;
        this.gestureMachine?.cancelInteraction();
        store.setState({ selectedCardId: card.id });
        return this.cardEditHandler?.(card);
      },
      canMoveCard: () => !store.getState().cardsLocked,
    });

    this.linksRenderer = createLinksRenderer(this.world);
  }

  bindCanvas() {
    this.canvas.addEventListener('pointerdown', () => this.cancelCameraAnimation(), {
      capture: true,
      signal: this.abortController.signal,
    });
    this.canvas.addEventListener('click', (event) => {
      if (event.target.closest('[data-card-id]')) return;
      this.backgroundTapHandler?.();
    }, { signal: this.abortController.signal });
  }
}

export default WorkspaceController;
