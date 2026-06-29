import store from '../state/store.js';
import { createCardNode, updateCardNode, deleteCardNode } from '../services/node-service.js';

const DEFAULT_HINT = 'Выбери карточку • ✎ редактировать • ⌫ удалить';

export class NodeController {
  constructor({
    addButton,
    editButton,
    deleteButton,
    createSheet,
    closeCreateButton,
    createForm,
    typeGrid,
    titleInput,
    descriptionInput,
    editSheet,
    closeEditButton,
    editForm,
    editTitleInput,
    editDescriptionInput,
    hint,
    getViewportCenter,
  }) {
    this.elements = {
      addButton,
      editButton,
      deleteButton,
      createSheet,
      closeCreateButton,
      createForm,
      typeGrid,
      titleInput,
      descriptionInput,
      editSheet,
      closeEditButton,
      editForm,
      editTitleInput,
      editDescriptionInput,
      hint,
    };
    this.getViewportCenter = getViewportCenter;
    this.selectedType = 'project';
    this.editingCardId = null;
    this.feedbackTimer = null;
    this.abortController = new AbortController();
    this.bindEvents();
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
    this.elements.editSheet.hidden = false;
    this.elements.editTitleInput.focus();
  }

  closeEdit() {
    this.elements.editSheet.hidden = true;
    this.editingCardId = null;
    this.elements.editForm.reset();
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
    });
    this.closeCreate();
  }

  async submitEdit(event) {
    event.preventDefault();
    if (!this.editingCardId) return;

    await updateCardNode(this.editingCardId, {
      title: this.elements.editTitleInput.value.trim(),
      description: this.elements.editDescriptionInput.value.trim(),
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
