import store from '../state/store.js';
import { createLink, deleteLinksBetween } from '../services/link-service.js';

const DEFAULT_HINT = 'Выбери карточку • ✎ редактировать • ⌫ удалить';

export class LinkController {
  constructor({ connectButton, disconnectButton, hint, onStateChange }) {
    this.connectButton = connectButton;
    this.disconnectButton = disconnectButton;
    this.hint = hint;
    this.onStateChange = typeof onStateChange === 'function' ? onStateChange : null;
    this.mode = null;
    this.sourceId = null;
    this.feedbackTimer = null;
    this.abortController = new AbortController();
    this.bindEvents();
  }

  bindEvents() {
    const signal = this.abortController.signal;
    this.connectButton.addEventListener('click', () => this.setMode('connect'), { signal });
    this.disconnectButton.addEventListener('click', () => this.setMode('disconnect'), { signal });
  }

  getSourceId() {
    return this.sourceId;
  }

  isActive() {
    return Boolean(this.mode);
  }

  setMode(mode) {
    this.mode = this.mode === mode ? null : mode;
    this.sourceId = null;
    this.syncButtons();

    if (this.mode === 'connect') {
      this.hint.textContent = 'Связь: выбери исходную карточку';
    } else if (this.mode === 'disconnect') {
      this.hint.textContent = 'Удаление связи: выбери первую карточку';
    } else {
      this.hint.textContent = DEFAULT_HINT;
    }

    this.onStateChange?.();
  }

  cancel() {
    this.mode = null;
    this.sourceId = null;
    this.syncButtons();
    this.hint.textContent = DEFAULT_HINT;
    this.onStateChange?.();
  }

  syncButtons() {
    this.connectButton.setAttribute('aria-pressed', String(this.mode === 'connect'));
    this.disconnectButton.setAttribute('aria-pressed', String(this.mode === 'disconnect'));
  }

  showResult(message) {
    clearTimeout(this.feedbackTimer);
    this.hint.textContent = message;
    this.feedbackTimer = setTimeout(() => {
      if (!this.mode) this.hint.textContent = DEFAULT_HINT;
    }, 1200);
  }

  async handleCardTap(card) {
    store.setState({ selectedCardId: card.id });
    if (!this.mode) return;

    if (!this.sourceId) {
      this.sourceId = card.id;
      this.hint.textContent = this.mode === 'connect'
        ? 'Теперь выбери карточку, к которой идёт связь'
        : 'Теперь выбери вторую карточку связи';
      this.onStateChange?.();
      return;
    }

    if (this.sourceId === card.id) {
      this.hint.textContent = 'Нужно выбрать другую карточку';
      return;
    }

    if (this.mode === 'connect') {
      const previousCount = store.getState().links.length;
      await createLink(this.sourceId, card.id);
      this.showResult(
        store.getState().links.length > previousCount
          ? 'Связь создана'
          : 'Такая связь уже существует',
      );
    } else {
      const deleted = await deleteLinksBetween(this.sourceId, card.id);
      this.showResult(
        deleted.length > 0
          ? 'Связь удалена'
          : 'Между этими карточками связи нет',
      );
    }

    this.mode = null;
    this.sourceId = null;
    this.syncButtons();
    this.onStateChange?.();
  }

  destroy() {
    clearTimeout(this.feedbackTimer);
    this.abortController.abort();
  }
}

export default LinkController;
