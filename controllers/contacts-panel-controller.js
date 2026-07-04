import store from '../state/store.js';

function getContactMeta(card) {
  const data = card.data ?? {};
  return [data.role, data.organization].filter(Boolean).join(' • ');
}

function getContactLines(card) {
  const data = card.data ?? {};
  return [data.phone, data.email, data.telegram].filter(Boolean);
}

function sortContacts(a, b) {
  return String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ru', { sensitivity: 'base' });
}

export class ContactsPanelController {
  constructor({ openButton, sheet, closeButton, list, empty, createButton, hint, onSelect, onCreate } = {}) {
    if (!(openButton instanceof HTMLButtonElement)
      || !(sheet instanceof Element)
      || !(closeButton instanceof HTMLButtonElement)
      || !(list instanceof Element)
      || !(empty instanceof Element)
      || !(createButton instanceof HTMLButtonElement)) {
      throw new TypeError('ContactsPanelController expects contacts panel elements.');
    }

    this.openButton = openButton;
    this.sheet = sheet;
    this.closeButton = closeButton;
    this.list = list;
    this.empty = empty;
    this.createButton = createButton;
    this.hint = hint instanceof Element ? hint : null;
    this.onSelect = typeof onSelect === 'function' ? onSelect : null;
    this.onCreate = typeof onCreate === 'function' ? onCreate : null;
    this.abortController = new AbortController();
    this.unsubscribe = null;
  }

  init() {
    const signal = this.abortController.signal;

    this.openButton.disabled = false;
    this.openButton.addEventListener('click', () => this.open(), { signal });
    this.closeButton.addEventListener('click', () => this.close(), { signal });
    this.sheet.addEventListener('click', (event) => {
      if (event.target === this.sheet) this.close();
    }, { signal });
    this.createButton.addEventListener('click', () => {
      this.close();
      this.onCreate?.();
    }, { signal });
    this.list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-contact-id]');
      if (!button) return;
      const selected = this.onSelect?.(button.dataset.contactId);
      this.close();
      if (this.hint) this.hint.textContent = selected === false ? 'Контакт не найден' : 'Контакт выбран';
    }, { signal });

    this.unsubscribe = store.subscribe((next, previous) => {
      if (!this.sheet.hidden && next.cards !== previous.cards) this.render();
    });
    this.render();
    return this;
  }

  getContacts() {
    return Object.values(store.getState().cards ?? {})
      .filter((card) => card?.type === 'person')
      .sort(sortContacts);
  }

  render() {
    const contacts = this.getContacts();
    this.empty.hidden = contacts.length > 0;
    this.list.replaceChildren(...contacts.map((card) => this.renderContact(card)));
  }

  renderContact(card) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'contact-row';
    button.dataset.contactId = card.id;

    const title = document.createElement('strong');
    title.textContent = card.title || 'Без имени';

    const meta = document.createElement('span');
    meta.textContent = getContactMeta(card) || 'Контакт';

    const lines = document.createElement('small');
    const contactLines = getContactLines(card);
    lines.textContent = contactLines.length ? contactLines.join(' • ') : 'Телефон и email не заполнены';

    button.append(title, meta, lines);
    return button;
  }

  open() {
    this.render();
    this.sheet.hidden = false;
    this.sheet.setAttribute('aria-hidden', 'false');
    this.openButton.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.sheet.hidden = true;
    this.sheet.setAttribute('aria-hidden', 'true');
    this.openButton.setAttribute('aria-expanded', 'false');
  }

  destroy() {
    this.unsubscribe?.();
    this.abortController.abort();
  }
}

export default ContactsPanelController;
