import { WorkspaceController } from './workspace-controller.js';
import { formatCardDetails } from '../ui/card-detail-presenter.js';

export class TypedWorkspaceController extends WorkspaceController {
  updateCardElement(element, card, state, linkSourceId) {
    super.updateCardElement(element, card, state, linkSourceId);
    const detailsElement = element.querySelector('.card-full');
    if (!detailsElement) return;
    detailsElement.textContent = formatCardDetails(card)
      || 'Дополнительная информация пока не заполнена';
  }
}

export default TypedWorkspaceController;
