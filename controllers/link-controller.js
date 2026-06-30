import store from '../state/store.js';
import { createLink, deleteLinksBetween } from '../services/link-service.js';
import { getLinkTypeLabel } from '../domain/link.js';

const DEFAULT_HINT = 'Выбери карточку';

function hasLinkBetween(links, firstId, secondId) {
  return links.some((link) => (
    (link.sourceId === firstId && link.targetId === secondId)
    || (link.sourceId === secondId && link.targetId === firstId)
  ));
}

export class LinkController {
  constructor({ linkButton, hint, onStateChange }) {
    this.linkButton = linkButton;
    this.hint = hint;
    this.onStateChange = typeof onStateChange === 'function' ? onStateChange : null;
    this.active = false;
    this.sourceId = null;
    this.feedbackTimer = null;
    this.abortController = new AbortController();
    this.bindEvents();
    this.syncButton();
  }

  bindEvents() {
    this.linkButton.addEventListener('click', () => this.toggle(), {
      signal: this.abortController.signal,
    });
  }

  getSourceId() {
    return this.sourceId;
  }

  isActive() {
    return this.active;
  }

  toggle() {
    if (this.active) {
      this.cancel();
      return;
    }

    this.active = true;
    this.sourceId = null;
    this.syncButton();
    this.hint.textContent = 'Выбери первую карточку связи';
    this.onStateChange?.();
  }

  cancel() {
    this.active = false;
    this.sourceId = null;
    this.syncButton();
    this.hint.textContent = DEFAULT_HINT;
    this.onStateChange?.();
  }

  syncButton() {
    this.linkButton.setAttribute('aria-pressed', String(this.active));
    this.linkButton.setAttribute(
      'aria-label',
      this.active ? 'Отменить выбор связи' : 'Связать или отвязать карточки',
    );
  }

  showResult(message) {
    clearTimeout(this.feedbackTimer);
    this.hint.textContent = message;
    this.feedbackTimer = setTimeout(() => {
      if (!this.active) this.hint.textContent = DEFAULT_HINT;
    }, 1600);
  }

  async handleCardTap(card) {
    store.setState({ selectedCardId: card.id });
    if (!this.active) return;

    if (!this.sourceId) {
      this.sourceId = card.id;
      this.hint.textContent = 'Теперь выбери вторую карточку';
      this.onStateChange?.();
      return;
    }

    if (this.sourceId === card.id) {
      this.hint.textContent = 'Нужно выбрать другую карточку';
      return;
    }

    const links = store.getState().links;
    const linked = hasLinkBetween(links, this.sourceId, card.id);

    try {
      if (linked) {
        const deleted = await deleteLinksBetween(this.sourceId, card.id);
        this.showResult(deleted.length > 0 ? 'Связь удалена' : 'Связь не найдена');
      } else {
        const previousCount = store.getState().links.length;
        const created = await createLink(this.sourceId, card.id);
        this.showResult(
          store.getState().links.length > previousCount
            ? `Связь «${getLinkTypeLabel(created.type)}» создана`
            : 'Такая смысловая связь уже существует',
        );
      }
    } catch (error) {
      console.error('Link toggle failed:', error);
      this.showResult('Не удалось изменить связь');
    }

    this.active = false;
    this.sourceId = null;
    this.syncButton();
    this.onStateChange?.();
  }

  destroy() {
    clearTimeout(this.feedbackTimer);
    this.abortController.abort();
  }
}

export default LinkController;
