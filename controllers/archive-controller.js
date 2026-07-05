import store from '../state/store.js';
import { archiveCard, getArchivedCards, restoreCard } from '../services/archive-service.js';

function createButton(label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

export class ArchiveController {
  constructor({ archiveButton, openArchiveButton, sheet, closeButton, list, empty, hint } = {}) {
    if (!(archiveButton instanceof HTMLButtonElement)
      || !(openArchiveButton instanceof HTMLButtonElement)
      || !(sheet instanceof Element)
      || !(closeButton instanceof HTMLButtonElement)
      || !(list instanceof Element)
      || !(empty instanceof Element)) {
      throw new TypeError('ArchiveController expects archive controls.');
    }

    this.archiveButton = archiveButton;
    this.openArchiveButton = openArchiveButton;
    this.sheet = sheet;
    this.closeButton = closeButton;
    this.list = list;
    this.empty = empty;
    this.hint = hint instanceof Element ? hint : null;
    this.unsubscribe = null;
    this.abortController = new AbortController();
  }

  init() {
    this.bind();
    this.sync(store.getState());
    this.unsubscribe = store.subscribe((next, previous) => {
      if (next.selectedCardId !== previous.selectedCardId || next.cards !== previous.cards) this.sync(next);
    });
    return this;
  }

  bind() {
    const signal = this.abortController.signal;
    this.archiveButton.addEventListener('click', () => this.archiveSelected(), { signal });
    this.openArchiveButton.addEventListener('click', () => this.open(), { signal });
    this.closeButton.addEventListener('click', () => this.close(), { signal });
    this.sheet.addEventListener('click', (event) => {
      if (event.target === this.sheet) this.close();
    }, { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.sheet.hidden) this.close();
    }, { signal });
  }

  sync(state = store.getState()) {
    const selected = state.cards[state.selectedCardId];
    const canArchive = Boolean(selected && selected.type !== 'self' && selected.data?.archive?.status !== 'archived');
    this.archiveButton.disabled = !canArchive;
    this.openArchiveButton.disabled = false;
    if (!this.sheet.hidden) this.renderList();
  }

  async archiveSelected() {
    const selectedId = store.getState().selectedCardId;
    if (!selectedId) {
      this.announce('Сначала выбери карточку');
      return;
    }
    try {
      await archiveCard(selectedId);
      this.announce('Карточка перенесена в архив');
    } catch (error) {
      console.error('Archive action failed:', error);
      this.announce('Не удалось архивировать карточку');
    }
  }

  open() {
    this.renderList();
    this.sheet.hidden = false;
    this.sheet.setAttribute('aria-hidden', 'false');
    this.openArchiveButton.setAttribute('aria-expanded', 'true');
    this.closeButton.focus({ preventScroll: true });
  }

  close() {
    this.sheet.hidden = true;
    this.sheet.setAttribute('aria-hidden', 'true');
    this.openArchiveButton.setAttribute('aria-expanded', 'false');
  }

  renderList() {
    const cards = getArchivedCards();
    this.empty.hidden = cards.length > 0;
    this.list.replaceChildren(...cards.map((card) => this.createRow(card)));
  }

  createRow(card) {
    const row = document.createElement('article');
    row.className = 'archive-row';

    const info = document.createElement('div');
    info.className = 'archive-row-info';
    const title = document.createElement('strong');
    title.textContent = card.title;
    const meta = document.createElement('span');
    meta.textContent = card.description || 'Описание пока не заполнено';
    info.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'archive-row-actions';
    const restore = createButton('Восстановить', 'archive-row-restore');
    restore.addEventListener('click', async () => {
      try {
        await restoreCard(card.id);
        this.announce('Карточка восстановлена');
        this.renderList();
      } catch (error) {
        console.error('Restore action failed:', error);
        this.announce('Не удалось восстановить карточку');
      }
    });
    actions.append(restore);

    row.append(info, actions);
    return row;
  }

  announce(message) {
    if (!this.hint) return;
    this.hint.textContent = message;
  }

  destroy() {
    this.unsubscribe?.();
    this.abortController.abort();
  }
}

export default ArchiveController;
