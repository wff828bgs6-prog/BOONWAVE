import store from '../state/store.js';
import { createCardNode, updateCardNode, deleteCardNode } from '../services/node-service.js';
import { getNodeFormFields } from '../ui/node-form-schema.js';

const DEFAULT_HINT = 'Выбери карточку • ✎ редактировать • ⌫ удалить';

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

function readTypedData(container, type) {
  const data = {};
  for (const definition of getNodeFormFields(type)) {
    const control = container.querySelector(`[data-node-field="${definition.key}"]`);
    if (!control) continue;
    if (definition.type === 'number') {
      const value = Number(control.value);
      data[definition.key] = Number.isFinite(value) ? value : 0;
    } else {
      data[definition.key] = control.value.trim();
    }
  }
  return data;
}

export class NodeController {
  constructor({
    addButton, editButton, deleteButton, createSheet, closeCreateButton, createForm,
    typeGrid, titleInput, descriptionInput, createTypeFields, editSheet, closeEditButton,
    editForm, editTitleInput, editDescriptionInput, editTypeFields, hint, getViewportCenter,
  }) {
    this.elements = {
      addButton, editButton, deleteButton, createSheet, closeCreateButton, createForm,
      typeGrid, titleInput, descriptionInput, createTypeFields, editSheet, closeEditButton,
      editForm, editTitleInput, editDescriptionInput, editTypeFields, hint,
    };
    this.getViewportCenter = getViewportCenter;
    this.selectedType = 'project';
    this.editingCardId = null;
    this.feedbackTimer = null;
    this.abortController = new AbortController();
    this.renderTypeFields(this.elements.createTypeFields, this.selectedType);
    this.bindEvents();
  }

  renderTypeFields(container, type, data = {}) {
    if (!container) return;
    container.replaceChildren(...getNodeFormFields(type).map((definition) => (
      createFieldElement(definition, data[definition.key])
    )));
  }

  bindEvents() {
    const signal = this.abortController.signal;
    const e = this.elements;

    e.addButton.addEventListener('click', () => this.openCreate(), { signal });
    e.editButton.addEventListener('click', () => this.openEdit(), { signal });
    e.deleteButton.addEventListener('click', () => this.deleteSelected(), { signal });
    e.closeCreateButton.addEventListener('click', () => this.closeCreate(), { signal });
    e.closeEditButton.addEventListener('click', () => this.closeEdit(), { signal });

    e.createSheet.addEventListener('click', (event) => {
      if (event.target === e.createSheet) this.closeCreate();
    }, { signal });

    e.editSheet.addEventListener('click', (event) => {
      if (event.target === e.editSheet) this.closeEdit();
    }, { signal });

    e.typeGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-node-type]');
      if (!button) return;
      this.selectedType = button.dataset.nodeType;
      for (const item of e.typeGrid.querySelectorAll('[data-node-type]')) {
        item.setAttribute('aria-pressed', String(item === button));
      }
      this.renderTypeFields(e.createTypeFields, this.selectedType);
    }, { signal });

    e.createForm.addEventListener('submit', (event) => this.submitCreate(event), { signal });
    e.editForm.addEventListener('submit', (event) => this.submitEdit(event), { signal });
  }

  showFeedback(message, timeout = 1200) {
    clearTimeout(this.feedbackTimer);
    this.elements.hint.textContent = message;
    if (timeout > 0) {
      this.feedbackTimer = setTimeout(() => {
        this.elements.hint.textContent = DEFAULT_HINT;
      }, timeout);
    }
  }

  openCreate() {
    this.elements.createSheet.hidden = false;
    this.elements.titleInput.focus();
  }

  closeCreate() {
    this.elements.createSheet.hidden = true;
    this.elements.createForm.reset();
    this.selectedType = 'project';
    for (const item of this.elements.typeGrid.querySelectorAll('[data-node-type]')) {
      item.setAttribute('aria-pressed', String(item.dataset.nodeType === 'project'));
    }
    this.renderTypeFields(this.elements.createTypeFields, this.selectedType);
  }

  openEdit() {
    const { selectedCardId, cards } = store.getState();
    const card = selectedCardId ? cards[selectedCardId] : null;
    if (!card) {
      this.showFeedback('Сначала выбери карточку');
      return;
    }

    this.editingCardId = card.id;
    this.elements.editTitleInput.value = card.title ?? '';
    this.elements.editDescriptionInput.value = card.description ?? '';
    this.renderTypeFields(this.elements.editTypeFields, card.type, card.data ?? {});
    this.elements.editSheet.hidden = false;
    this.elements.editTitleInput.focus();
  }

  closeEdit() {
    this.elements.editSheet.hidden = true;
    this.editingCardId = null;
    this.elements.editForm.reset();
    this.elements.editTypeFields?.replaceChildren();
  }

  async submitCreate(event) {
    event.preventDefault();
    if (!this.elements.createForm.reportValidity()) return;

    try {
      const position = this.getViewportCenter();
      await createCardNode({
        type: this.selectedType,
        title: this.elements.titleInput.value.trim(),
        description: this.elements.descriptionInput.value.trim(),
        x: position.x,
        y: position.y,
        data: readTypedData(this.elements.createTypeFields, this.selectedType),
      });
      this.closeCreate();
      this.showFeedback('Карточка создана');
    } catch (error) {
      console.error('Card creation failed:', error);
      this.showFeedback('Не удалось создать карточку');
    }
  }

  async submitEdit(event) {
    event.preventDefault();
    if (!this.editingCardId || !this.elements.editForm.reportValidity()) return;

    try {
      const card = store.getState().cards[this.editingCardId];
      await updateCardNode(this.editingCardId, {
        title: this.elements.editTitleInput.value.trim(),
        description: this.elements.editDescriptionInput.value.trim(),
        data: readTypedData(this.elements.editTypeFields, card.type),
      });
      this.closeEdit();
      this.showFeedback('Изменения сохранены');
    } catch (error) {
      console.error('Card update failed:', error);
      this.showFeedback('Не удалось сохранить изменения');
    }
  }

  async deleteSelected() {
    const state = store.getState();
    const cardId = state.selectedCardId;
    const card = cardId ? state.cards[cardId] : null;

    if (!card) {
      this.showFeedback('Сначала выбери карточку');
      return;
    }

    const confirmed = window.confirm(`Удалить карточку «${card.title}» и все её связи?`);
    if (!confirmed) return;

    try {
      await deleteCardNode(cardId);
      this.showFeedback('Карточка и её связи удалены');
    } catch (error) {
      console.error('Card deletion failed:', error);
      this.showFeedback('Не удалось удалить карточку');
    }
  }

  destroy() {
    clearTimeout(this.feedbackTimer);
    this.abortController.abort();
  }
}

export default NodeController;
