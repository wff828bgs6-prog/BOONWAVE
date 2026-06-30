import { WorkspaceController } from './workspace-controller.js';
import { formatCardDetails } from '../ui/card-detail-presenter.js';
import { formatSelfSummary } from '../services/self-node-service.js';

export class TypedWorkspaceController extends WorkspaceController {
  updateCardElement(element, card, state, linkSourceId) {
    super.updateCardElement(element, card, state, linkSourceId);
    element.dataset.systemCard = String(card.type === 'self');
    const detailsElement = element.querySelector('.card-full');
    if (!detailsElement) return;
    detailsElement.textContent = card.type === 'self'
      ? formatSelfSummary(card, state)
      : (formatCardDetails(card) || 'Дополнительная информация пока не заполнена');
  }
}

export default TypedWorkspaceController;
