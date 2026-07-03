import store from '../state/store.js';
import { createLink, deleteLinksBetween } from '../services/link-service.js';
import { getLinkTypeLabel, PRIMARY_LINK_TYPES } from '../domain/link.js';

const DEFAULT_HINT = 'Выбери карточку';

function hasLinkBetween(links, firstId, secondId) {
  return links.some((link) => (
    (link.sourceId === firstId && link.targetId === secondId)
    || (link.sourceId === secondId && link.targetId === firstId)
  ));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export class LinkController {
  constructor({ linkButton, hint, onStateChange }) {
    this.linkButton = linkButton;
    this.hint = hint;
    this.onStateChange = typeof onStateChange === 'function' ? onStateChange : null;
    this.active = false;
    this.sourceId = null;
    this.targetId = null;
    this.feedbackTimer = null;
    this.abortController = new AbortController();
    this.buildTypeSheet();
    this.bindEvents();
    this.syncButton();
  }

  buildTypeSheet() {
    this.typeSheet = el('section', 'link-type-sheet');
    this.typeSheet.hidden = true;
    this.typeSheet.setAttribute('aria-hidden', 'true');
    const panel = el('div', 'link-type-sheet__panel');
    const head = el('div', 'link-type-sheet__head');
    head.append(el('h3', '', 'Тип связи'));
    this.closeTypeButton = el('button', '', '×');
    this.closeTypeButton.type = 'button';
    head.append(this.closeTypeButton);
    const copy = el('p', '', 'Связь — это визуально-смысловая линия. Назначение контакта делается отдельно в разделе контактов.');
    this.typeButtons = el('div', 'link-type-sheet__grid');
    for (const type of PRIMARY_LINK_TYPES) {
      const button = el('button', '', getLinkTypeLabel(type));
      button.type = 'button';
      button.dataset.linkType = type;
      this.typeButtons.append(button);
    }
    panel.append(head, copy, this.typeButtons);
    this.typeSheet.append(panel);
    document.body.append(this.typeSheet);
  }

  bindEvents() {
    const signal = this.abortController.signal;
    this.linkButton.addEventListener('click', () => this.toggle(), { signal });
    this.closeTypeButton.addEventListener('click', () => this.cancel(), { signal });
    this.typeSheet.addEventListener('click', (event) => { if (event.target === this.typeSheet) this.cancel(); }, { signal });
    this.typeButtons.addEventListener('click', (event) => {
      const button = event.target.closest('[data-link-type]');
      if (button) this.commitType(button.dataset.linkType);
    }, { signal });
  }

  getSourceId() { return this.sourceId; }
  isActive() { return this.active; }

  beginFrom(sourceId, message = 'Теперь выбери карточку для связи') {
    const card = store.getState().cards[sourceId];
    if (!card) { this.showResult('Карточка для связи не найдена'); return false; }
    this.active = true;
    this.sourceId = sourceId;
    store.setState({ selectedCardId: sourceId });
    this.syncButton();
    this.hint.textContent = message;
    this.onStateChange?.();
    return true;
  }

  toggle() {
    if (this.active) { this.cancel(); return; }
    this.active = true;
    this.sourceId = null;
    this.targetId = null;
    this.syncButton();
    this.hint.textContent = 'Выбери первую карточку связи';
    this.onStateChange?.();
  }

  hideTypeSheet() {
    this.typeSheet.hidden = true;
    this.typeSheet.setAttribute('aria-hidden', 'true');
    this.targetId = null;
  }

  cancel() {
    this.hideTypeSheet();
    this.active = false;
    this.sourceId = null;
    this.targetId = null;
    this.syncButton();
    this.hint.textContent = DEFAULT_HINT;
    this.onStateChange?.();
  }

  syncButton() {
    this.linkButton.setAttribute('aria-pressed', String(this.active));
    this.linkButton.setAttribute('aria-label', this.active ? 'Отменить выбор связи' : 'Связать или отвязать карточки');
  }

  showResult(message) {
    clearTimeout(this.feedbackTimer);
    this.hint.textContent = message;
    this.feedbackTimer = setTimeout(() => { if (!this.active) this.hint.textContent = DEFAULT_HINT; }, 1600);
  }

  openTypeSheet(sourceId, targetId) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.typeSheet.hidden = false;
    this.typeSheet.setAttribute('aria-hidden', 'false');
  }

  async commitType(relationType) {
    const sourceId = this.sourceId;
    const targetId = this.targetId;
    this.hideTypeSheet();
    if (!sourceId || !targetId) return;
    try {
      const previousCount = store.getState().links.length;
      const created = await createLink(sourceId, targetId, { relationType });
      this.showResult(store.getState().links.length > previousCount ? `Связь «${getLinkTypeLabel(created.type)}» создана` : 'Такая смысловая связь уже существует');
    } catch (error) {
      console.error('Link creation failed:', error);
      this.showResult('Не удалось создать связь');
    }
    this.active = false;
    this.sourceId = null;
    this.syncButton();
    this.onStateChange?.();
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
    if (this.sourceId === card.id) { this.hint.textContent = 'Нужно выбрать другую карточку'; return; }
    const links = store.getState().links;
    const linked = hasLinkBetween(links, this.sourceId, card.id);
    if (linked) {
      try {
        const deleted = await deleteLinksBetween(this.sourceId, card.id);
        this.showResult(deleted.length > 0 ? 'Связь удалена' : 'Связь не найдена');
      } catch (error) {
        console.error('Link delete failed:', error);
        this.showResult('Не удалось удалить связь');
      }
      this.active = false;
      this.sourceId = null;
      this.syncButton();
      this.onStateChange?.();
      return;
    }
    this.openTypeSheet(this.sourceId, card.id);
  }

  destroy() {
    clearTimeout(this.feedbackTimer);
    this.abortController.abort();
    this.typeSheet.remove();
  }
}

export default LinkController;
