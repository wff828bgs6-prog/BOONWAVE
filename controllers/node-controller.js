import store from '../state/store.js';
import { createCardNode, updateCardNode, deleteCardNode } from '../services/node-service.js';

const DEFAULT_HINT = 'Выбери карточку • ✎ редактировать • ⌫ удалить';

const TYPE_FIELDS = Object.freeze({
  project: [
    { key: 'status', label: 'Статус', type: 'select', options: [['preparation', 'Подготовка'], ['in_progress', 'В работе'], ['paused', 'На паузе'], ['completed', 'Завершено']] },
    { key: 'address', label: 'Адрес', type: 'text', maxlength: 120 },
  ],
  process: [
    { key: 'status', label: 'Статус', type: 'select', options: [['planned', 'Запланировано'], ['in_progress', 'В работе'], ['paused', 'На паузе'], ['completed', 'Завершено']] },
    { key: 'progress', label: 'Прогресс, %', type: 'number', min: 0, max: 100, step: 1 },
  ],
  person: [
    { key: 'role', label: 'Роль', type: 'text', maxlength: 80 },
    { key: 'organization', label: 'Организация', type: 'text', maxlength: 100 },
  ],
  idea: [
    { key: 'status', label: 'Статус', type: 'select', options: [['draft', 'Черновик'], ['active', 'Активно'], ['completed', 'Реализовано']] },
    { key: 'category', label: 'Категория', type: 'text', maxlength: 80 },
  ],
  goal: [
    { key: 'status', label: 'Статус', type: 'select', options: [['active', 'Активно'], ['paused', 'На паузе'], ['completed', 'Достигнута']] },
    { key: 'progress', label: 'Прогресс, %', type: 'number', min: 0, max: 100, step: 1 },
  ],
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
  control.value = value ?? '';
  label.append(control);
  return label;
}

function readTypedData(container, type) {
  const data = {};
  const definitions = TYPE_FIELDS[type] ?? [];

  for (const definition of definitions) {
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
    container.replaceChildren(...(TYPE_FIELDS[type] ?? []).map((definition) => (
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
    const position = this.getViewportCenter();
    await createCardNode({
      type: this.selectedType,
      title: this.elements.titleInput.value,
      description: this.elements.descriptionInput.value,
      x: position.x,
      y: position.y,
      data: readTypedData(this.elements.createTypeFields, this.selectedType),
    });
    this.closeCreate();
    this.showFeedback('Карточка создана');
  }

  async submitEdit(event) {
    event.preventDefault();
    if (!this.editingCardId) return;

    const card = store.getState().cards[this.editingCardId];
    await updateCardNode(this.editingCardId, {
      title: this.elements.editTitleInput.value.trim(),
      description: this.elements.editDescriptionInput.value.trim(),
      data: readTypedData(this.elements.editTypeFields, card.type),
    });

    this.closeEdit();
    this.showFeedback('Изменения сохранены');
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

    await deleteCardNode(cardId);
    this.showFeedback('Карточка и её связи удалены');
  }

  destroy() {
    clearTimeout(this.feedbackTimer);
    this.abortController.abort();
  }
}

export default NodeController;
