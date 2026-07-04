import store from '../state/store.js';
import { NodeController } from './node-controller.js';
import { normalizeNodeView } from '../domain/node.js';
import { getNodeFormFields } from '../ui/node-form-schema.js';
import {
  createCardWithMedia,
  updateCardWithMedia,
} from '../services/card-save-service.js';
import { collectPendingFormMedia, readThumbnailFormData } from './node-controller.js';

export { collectPendingFormMedia, readThumbnailFormData };

const WORKSPACE_HINT = 'Удерживай карточку для редактирования • двойной тап — открыть';

export function readTypedFormData(container, type) {
  const data = {};
  for (const definition of getNodeFormFields(type)) {
    const control = container.querySelector(`[data-node-field="${definition.key}"]`);
    if (!control) continue;
    if (definition.type === 'number') {
      const value = Number(control.value);
      data[definition.key] = Number.isFinite(value) ? value : 0;
    } else {
      data[definition.key] = String(control.value ?? '').trim();
    }
  }
  return data;
}

export function readViewFormData(container, currentView = {}) {
  const current = normalizeNodeView(currentView);
  const read = (key, fallback) => (
    container.querySelector(`[data-view-field="${key}"]`)?.value ?? fallback
  );

  return normalizeNodeView({
    ...current,
    compactLabel: read('compactLabel', current.compactLabel),
    coverFrames: {
      compact: {
        shape: read('compact.shape', current.coverFrames.compact.shape),
        scale: Number(read('compact.scale', current.coverFrames.compact.scale)),
        positionX: Number(read('compact.positionX', current.coverFrames.compact.positionX)),
        positionY: Number(read('compact.positionY', current.coverFrames.compact.positionY)),
      },
      working: {
        shape: read('working.shape', current.coverFrames.working.shape),
        scale: Number(read('working.scale', current.coverFrames.working.scale)),
        positionX: Number(read('working.positionX', current.coverFrames.working.positionX)),
        positionY: Number(read('working.positionY', current.coverFrames.working.positionY)),
      },
    },
  });
}

export class TransactionalNodeController extends NodeController {
  showFeedback(message, timeout = 1200) {
    clearTimeout(this.feedbackTimer);
    this.elements.hint.textContent = message;
    if (timeout > 0) {
      this.feedbackTimer = setTimeout(() => {
        this.elements.hint.textContent = WORKSPACE_HINT;
      }, timeout);
    }
  }

  async submitCreate(event) {
    event.preventDefault();
    if (!this.elements.createForm.reportValidity()) return;

    try {
      const pendingMedia = collectPendingFormMedia(this.elements.createTypeFields);
      const position = this.getViewportCenter();
      await createCardWithMedia({
        type: this.selectedType,
        title: this.elements.titleInput.value.trim(),
        description: this.elements.descriptionInput.value.trim(),
        x: position.x,
        y: position.y,
        data: {
          ...readTypedFormData(this.elements.createTypeFields, this.selectedType),
          ...readThumbnailFormData(this.elements.createTypeFields),
        },
        view: readViewFormData(this.elements.createTypeFields),
      }, pendingMedia);

      this.closeCreate();
      this.showFeedback(pendingMedia.length
        ? 'Карточка и миниатюры сохранены'
        : 'Карточка создана');
    } catch (error) {
      console.error('Atomic card creation failed:', error);
      this.showFeedback('Ничего не сохранено — проверь файл и повтори');
    }
  }

  async submitEdit(event) {
    event.preventDefault();
    if (!this.editingCardId || !this.elements.editForm.reportValidity()) return;

    try {
      const currentCard = store.getState().cards[this.editingCardId];
      if (!currentCard) throw new Error(`Card not found: ${this.editingCardId}`);
      const pendingMedia = collectPendingFormMedia(this.elements.editTypeFields);

      await updateCardWithMedia(this.editingCardId, {
        title: this.elements.editTitleInput.value.trim(),
        description: this.elements.editDescriptionInput.value.trim(),
        data: {
          ...readTypedFormData(this.elements.editTypeFields, currentCard.type),
          ...readThumbnailFormData(this.elements.editTypeFields),
        },
        view: readViewFormData(this.elements.editTypeFields, currentCard.view),
      }, pendingMedia);

      this.closeEdit();
      this.showFeedback(pendingMedia.length
        ? 'Изменения и миниатюры сохранены'
        : 'Изменения сохранены');
    } catch (error) {
      console.error('Atomic card update failed:', error);
      this.showFeedback('Изменения не применены — проверь файл и повтори');
    }
  }
}

export default TransactionalNodeController;
