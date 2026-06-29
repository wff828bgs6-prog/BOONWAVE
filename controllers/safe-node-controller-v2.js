import store from '../state/store.js';
import { NodeController as BaseNodeController } from './node-controller.js';
import { createCardWithMedia, updateCardWithMedia } from '../services/card-bundle-service.js';
import { normalizeNodeView } from '../domain/node.js';
import { getNodeFormFields } from '../ui/node-form-schema.js';

function readData(container, type) {
  const data = {};
  for (const field of getNodeFormFields(type)) {
    const control = container.querySelector(`[data-node-field="${field.key}"]`);
    if (!control) continue;
    data[field.key] = field.type === 'number'
      ? (Number.isFinite(Number(control.value)) ? Number(control.value) : 0)
      : control.value.trim();
  }
  return data;
}

function readView(container, currentView = {}) {
  const current = normalizeNodeView(currentView);
  const read = (key, fallback) => container.querySelector(`[data-view-field="${key}"]`)?.value ?? fallback;
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

function pendingMedia(container) {
  return [...container.querySelectorAll('[data-media-slot]')].flatMap((input) =>
    [...(input.files ?? [])].map((file) => ({ slot: input.dataset.mediaSlot, file })),
  );
}

export class SafeNodeController extends BaseNodeController {
  async submitCreate(event) {
    event.preventDefault();
    if (!this.elements.createForm.reportValidity()) return;
    try {
      const media = pendingMedia(this.elements.createTypeFields);
      const position = this.getViewportCenter();
      await createCardWithMedia({
        type: this.selectedType,
        title: this.elements.titleInput.value.trim(),
        description: this.elements.descriptionInput.value.trim(),
        x: position.x,
        y: position.y,
        data: readData(this.elements.createTypeFields, this.selectedType),
        view: readView(this.elements.createTypeFields),
      }, media);
      this.closeCreate();
      this.showFeedback(media.length ? 'Карточка и файлы сохранены' : 'Карточка создана');
    } catch (error) {
      console.error('Safe card creation failed:', error);
      this.showFeedback('Сохранение не выполнено — повторите попытку');
    }
  }

  async submitEdit(event) {
    event.preventDefault();
    if (!this.editingCardId || !this.elements.editForm.reportValidity()) return;
    try {
      const media = pendingMedia(this.elements.editTypeFields);
      const card = store.getState().cards[this.editingCardId];
      await updateCardWithMedia(this.editingCardId, {
        title: this.elements.editTitleInput.value.trim(),
        description: this.elements.editDescriptionInput.value.trim(),
        data: readData(this.elements.editTypeFields, card.type),
        view: readView(this.elements.editTypeFields, card.view),
      }, media);
      this.closeEdit();
      this.showFeedback(media.length ? 'Изменения и файлы сохранены' : 'Изменения сохранены');
    } catch (error) {
      console.error('Safe card update failed:', error);
      this.showFeedback('Изменения не применены — повторите попытку');
    }
  }
}

export default SafeNodeController;
