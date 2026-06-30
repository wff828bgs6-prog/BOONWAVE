import { WorkspaceController } from './workspace-controller.js';
import { formatCardDetails } from '../ui/card-detail-presenter.js';
import { formatSelfSummary } from '../services/self-node-service.js';
import {
  formatProjectGraphSummary,
  formatGoalGraphSummary,
} from '../services/graph-summary-service.js';

function joinSections(...sections) {
  return sections.filter((section) => typeof section === 'string' && section.trim()).join('\n\n');
}

export class TypedWorkspaceController extends WorkspaceController {
  updateCardElement(element, card, state, linkSourceId) {
    super.updateCardElement(element, card, state, linkSourceId);
    element.dataset.systemCard = String(card.type === 'self');
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
}

export default TypedWorkspaceController;
