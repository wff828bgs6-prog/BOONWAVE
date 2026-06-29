import store from '../state/store.js';
import { createCardNode, updateCardNode, deleteCardNode } from '../services/node-service.js';
import { createMedia, deleteMediaIfUnreferenced } from '../services/media-service.js';
import { attachMediaToCard, CARD_MEDIA_SLOTS } from '../services/card-media-service.js';
import { normalizeNodeView } from '../domain/node.js';
import { getNodeFormFields } from '../ui/node-form-schema.js';

const DEFAULT_HINT = 'Выбери карточку • ✎ редактировать • ⌫ удалить';

const MEDIA_FIELD_LABELS = Object.freeze({
  cover: 'Обложка', avatar: 'Фото / аватар', images: 'Изображения',
  documents: 'Документы', files: 'Другие файлы', attachments: 'Вложения',
});

const MEDIA_ACCEPT = Object.freeze({
  cover: 'image/*', avatar: 'image/*', images: 'image/*',
  documents: 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
  files: '*/*', attachments: '*/*',
});

function createFieldElement(definition, value = '') {
  const label = document.createElement('label');
  label.className = 'field';
  const caption = document.createElement('span');
  caption.textContent = definition.label;
  label.append(caption);

  let control;
  if (definition.type === 'select') {
    control = document.createElement('select');
    for (const [optionValue, optionLabel] of definition.options) {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionLabel;
      control.append(option);
    }
  } else {
    control = document.createElement('input');
    control.type = definition.type;
    if (definition.maxlength) control.maxLength = definition.maxlength;
    if (definition.min !== undefined) control.min = String(definition.min);
    if (definition.max !== undefined) control.max = String(definition.max);
    if (definition.step !== undefined) control.step = String(definition.step);
  }

  control.dataset.nodeField = definition.key;
  control.name = definition.key;
  control.required = Boolean(definition.required);
  control.value = value ?? '';
  label.append(control);
  return label;
}

function createMediaField(slot, config) {
  const label = document.createElement('label');
  label.className = 'field media-field';
  const caption = document.createElement('span');
  caption.textContent = MEDIA_FIELD_LABELS[slot] ?? slot;
  const input = document.createElement('input');
  input.type = 'file';
  input.dataset.mediaSlot = slot;
  input.accept = MEDIA_ACCEPT[slot] ?? '*/*';
  input.multiple = config.mode === 'multiple';
  label.append(caption, input);
  return label;
}

function createViewField(labelText, key, type, value, options = {}) {
  const label = document.createElement('label');
  label.className = 'field view-field';
  const caption = document.createElement('span');
  caption.textContent = labelText;
  let control;

  if (type === 'select') {
    control = document.createElement('select');
    for (const [optionValue, optionLabel] of options.items ?? []) {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionLabel;
      control.append(option);
    }
  } else {
    control = document.createElement('input');
    control.type = type;
    if (options.min !== undefined) control.min = String(options.min);
    if (options.max !== undefined) control.max = String(options.max);
    if (options.step !== undefined) control.step = String(options.step);
  }

  control.dataset.viewField = key;
  control.value = value ?? '';
  label.append(caption, control);
  return label;
}

function createViewFields(type, rawView = {}) {
  const slots = CARD_MEDIA_SLOTS[type] ?? {};
  if (!slots.cover && !slots.avatar) return [];
  const view = normalizeNodeView(rawView);
  return [
    createViewField('Короткая подпись', 'compactLabel', 'text', view.compactLabel),
    createViewField('Форма обложки', 'shape', 'select', view.cover.shape, {
      items: [['rounded-square', 'Мягкий квадрат'], ['circle', 'Круг'], ['portrait', 'Вертикальная'], ['landscape', 'Горизонтальная']],
    }),
    createViewField('Масштаб изображения', 'scale', 'range', view.cover.scale, { min: 1, max: 3, step: 0.05 }),
    createViewField('Смещение по горизонтали', 'positionX', 'range', view.cover.positionX, { min: 0, max: 100, step: 1 }),
    createViewField('Смещение по вертикали', 'positionY', 'range', view.cover.positionY, { min: 0, max: 100, step: 1 }),
  ];
}

function readTypedData(container, type) {
  const data = {};
  for (const definition of getNodeFormFields(type)) {
    const control = container.querySelector(`[data-node-field="${definition.key}"]`);
    if (!control) continue;
    if (definition.type === 'number') {
      const value = Number(control.value);
      data[definition.key] = Number.isFinite(value) ? value : 0;
    } else data[definition.key] = control.value.trim();
  }
  return data;
}

function readViewData(container, currentView = {}) {
  const current = normalizeNodeView(currentView);
  const read = (key, fallback) => container.querySelector(`[data-view-field="${key}"]`)?.value ?? fallback;
  return normalizeNodeView({
    ...current,
    compactLabel: read('compactLabel', current.compactLabel),
    cover: {
      ...current.cover,
      shape: read('shape', current.cover.shape),
      scale: Number(read('scale', current.cover.scale)),
      positionX: Number(read('positionX', current.cover.positionX)),
      positionY: Number(read('positionY', current.cover.positionY)),
    },
  });
}

function collectPendingMedia(container) {
  return [...container.querySelectorAll('[data-media-slot]')].flatMap((input) => (
    [...(input.files ?? [])].map((file) => ({ slot: input.dataset.mediaSlot, file }))
  ));
}

export class NodeController {
  constructor({
    addButton, editButton, deleteButton, createSheet, closeCreateButton, createForm,
    typeGrid, titleInput, descriptionInput, createTypeFields, editSheet, closeEditButton,
    editForm, editTitleInput, editDescriptionInput, editTypeFields, hint, getViewportCenter,
  }) {
    this.elements = { addButton, editButton, deleteButton, createSheet, closeCreateButton, createForm, typeGrid, titleInput, descriptionInput, createTypeFields, editSheet, closeEditButton, editForm, editTitleInput, editDescriptionInput, editTypeFields, hint };
    this.getViewportCenter = getViewportCenter;
    this.selectedType = 'project';
    this.editingCardId = null;
    this.feedbackTimer = null;
    this.abortController = new AbortController();
    this.renderTypeFields(this.elements.createTypeFields, this.selectedType);
    this.bindEvents();
  }

  renderTypeFields(container, type, data = {}, view = {}) {
    if (!container) return;
    const typedFields = getNodeFormFields(type).map((definition) => createFieldElement(definition, data[definition.key]));
    const mediaFields = Object.entries(CARD_MEDIA_SLOTS[type] ?? {}).map(([slot, config]) => createMediaField(slot, config));
    container.replaceChildren(...typedFields, ...mediaFields, ...createViewFields(type, view));
  }

  bindEvents() {
    const signal = this.abortController.signal;
    const e = this.elements;
    e.addButton.addEventListener('click', () => this.openCreate(), { signal });
    e.editButton.addEventListener('click', () => this.openEdit(), { signal });
    e.deleteButton.addEventListener('click', () => this.deleteSelected(), { signal });
    e.closeCreateButton.addEventListener('click', () => this.closeCreate(), { signal });
    e.closeEditButton.addEventListener('click', () => this.closeEdit(), { signal });
    e.createSheet.addEventListener('click', (event) => { if (event.target === e.createSheet) this.closeCreate(); }, { signal });
    e.editSheet.addEventListener('click', (event) => { if (event.target === e.editSheet) this.closeEdit(); }, { signal });
    e.typeGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-node-type]');
      if (!button) return;
      this.selectedType = button.dataset.nodeType;
      for (const item of e.typeGrid.querySelectorAll('[data-node-type]')) item.setAttribute('aria-pressed', String(item === button));
      this.renderTypeFields(e.createTypeFields, this.selectedType);
    }, { signal });
    e.createForm.addEventListener('submit', (event) => this.submitCreate(event), { signal });
    e.editForm.addEventListener('submit', (event) => this.submitEdit(event), { signal });
  }

  showFeedback(message, timeout = 1200) {
    clearTimeout(this.feedbackTimer);
    this.elements.hint.textContent = message;
    if (timeout > 0) this.feedbackTimer = setTimeout(() => { this.elements.hint.textContent = DEFAULT_HINT; }, timeout);
  }

  openCreate() { this.elements.createSheet.hidden = false; this.elements.titleInput.focus(); }

  closeCreate() {
    this.elements.createSheet.hidden = true;
    this.elements.createForm.reset();
    this.selectedType = 'project';
    for (const item of this.elements.typeGrid.querySelectorAll('[data-node-type]')) item.setAttribute('aria-pressed', String(item.dataset.nodeType === 'project'));
    this.renderTypeFields(this.elements.createTypeFields, this.selectedType);
  }

  openEdit() {
    const { selectedCardId, cards } = store.getState();
    const card = selectedCardId ? cards[selectedCardId] : null;
    if (!card) { this.showFeedback('Сначала выбери карточку'); return; }
    this.editingCardId = card.id;
    this.elements.editTitleInput.value = card.title ?? '';
    this.elements.editDescriptionInput.value = card.description ?? '';
    this.renderTypeFields(this.elements.editTypeFields, card.type, card.data ?? {}, card.view ?? {});
    this.elements.editSheet.hidden = false;
    this.elements.editTitleInput.focus();
  }

  closeEdit() {
    this.elements.editSheet.hidden = true;
    this.editingCardId = null;
    this.elements.editForm.reset();
    this.elements.editTypeFields?.replaceChildren();
  }

  async uploadPendingMedia(cardId, pendingMedia) {
    for (const { slot, file } of pendingMedia) {
      const record = await createMedia({ name: file.name, mimeType: file.type, size: file.size }, file);
      try { await attachMediaToCard(cardId, record.id, slot); }
      catch (error) { await deleteMediaIfUnreferenced(record.id).catch(() => {}); throw error; }
    }
  }

  async submitCreate(event) {
    event.preventDefault();
    if (!this.elements.createForm.reportValidity()) return;
    try {
      const pendingMedia = collectPendingMedia(this.elements.createTypeFields);
      const position = this.getViewportCenter();
      const card = await createCardNode({
        type: this.selectedType,
        title: this.elements.titleInput.value.trim(),
        description: this.elements.descriptionInput.value.trim(),
        x: position.x,
        y: position.y,
        data: readTypedData(this.elements.createTypeFields, this.selectedType),
        view: readViewData(this.elements.createTypeFields),
      });
      await this.uploadPendingMedia(card.id, pendingMedia);
      this.closeCreate();
      this.showFeedback(pendingMedia.length ? 'Карточка и файлы сохранены' : 'Карточка создана');
    } catch (error) {
      console.error('Card creation failed:', error);
      this.showFeedback('Не удалось сохранить карточку или файлы');
    }
  }

  async submitEdit(event) {
    event.preventDefault();
    if (!this.editingCardId || !this.elements.editForm.reportValidity()) return;
    try {
      const pendingMedia = collectPendingMedia(this.elements.editTypeFields);
      const card = store.getState().cards[this.editingCardId];
      await updateCardNode(this.editingCardId, {
        title: this.elements.editTitleInput.value.trim(),
        description: this.elements.editDescriptionInput.value.trim(),
        data: readTypedData(this.elements.editTypeFields, card.type),
        view: readViewData(this.elements.editTypeFields, card.view),
      });
      await this.uploadPendingMedia(this.editingCardId, pendingMedia);
      this.closeEdit();
      this.showFeedback(pendingMedia.length ? 'Изменения и файлы сохранены' : 'Изменения сохранены');
    } catch (error) {
      console.error('Card update failed:', error);
      this.showFeedback('Не удалось сохранить изменения или файлы');
    }
  }

  async deleteSelected() {
    const state = store.getState();
    const cardId = state.selectedCardId;
    const card = cardId ? state.cards[cardId] : null;
    if (!card) { this.showFeedback('Сначала выбери карточку'); return; }
    if (!window.confirm(`Удалить карточку «${card.title}» и все её связи?`)) return;
    try { await deleteCardNode(cardId); this.showFeedback('Карточка и её связи удалены'); }
    catch (error) { console.error('Card deletion failed:', error); this.showFeedback('Не удалось удалить карточку'); }
  }

  destroy() { clearTimeout(this.feedbackTimer); this.abortController.abort(); }
}

export default NodeController;
