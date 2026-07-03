import store from '../state/store.js';
import { presentContactsScreen } from '../ui/contacts-screen-presenter.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function initials(title = '') {
  return String(title).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '•';
}

export class ContactsScreenController {
  constructor({ openButton, createContact } = {}) {
    if (!(openButton instanceof HTMLButtonElement)) {
      throw new TypeError('ContactsScreenController expects an open button.');
    }
    this.openButton = openButton;
    this.createContact = typeof createContact === 'function' ? createContact : null;
    this.selectedContactId = null;
    this.query = '';
    this.abortController = new AbortController();
    this.build();
    this.bind();
    this.unsubscribe = store.subscribe(() => {
      if (!this.overlay.hidden) this.render();
    });
  }

  build() {
    this.overlay = el('section', 'contacts-screen');
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');

    const panel = el('div', 'contacts-screen__panel');
    const head = el('div', 'contacts-screen__head');
    const titleWrap = el('div');
    titleWrap.append(el('div', 'contacts-screen__kicker', 'ЛЮДИ И КОМПАНИИ'), el('h2', '', 'Контакты'));
    this.closeButton = el('button', 'contacts-screen__close', '×');
    this.closeButton.type = 'button';
    this.closeButton.setAttribute('aria-label', 'Закрыть контакты');
    head.append(titleWrap, this.closeButton);

    const toolbar = el('div', 'contacts-screen__toolbar');
    this.searchInput = el('input', 'contacts-screen__search');
    this.searchInput.type = 'search';
    this.searchInput.placeholder = 'Имя, профессия, город или тег';
    this.addButton = el('button', 'contacts-screen__add', 'Добавить');
    this.addButton.type = 'button';
    toolbar.append(this.searchInput, this.addButton);

    this.body = el('div', 'contacts-screen__body');
    this.list = el('div', 'contacts-screen__list');
    this.details = el('aside', 'contacts-screen__details');
    this.body.append(this.list, this.details);

    panel.append(head, toolbar, this.body);
    this.overlay.append(panel);
    document.body.append(this.overlay);
  }

  bind() {
    const signal = this.abortController.signal;
    this.openButton.addEventListener('click', () => this.open(), { signal });
    this.closeButton.addEventListener('click', () => this.close(), { signal });
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    }, { signal });
    this.searchInput.addEventListener('input', () => {
      this.query = this.searchInput.value;
      this.render();
    }, { signal });
    this.addButton.addEventListener('click', () => {
      this.close();
      this.createContact?.();
    }, { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.overlay.hidden) this.close();
    }, { signal });
  }

  open() {
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.openButton.setAttribute('aria-expanded', 'true');
    this.render();
  }

  close() {
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.openButton.setAttribute('aria-expanded', 'false');
  }

  render() {
    const model = presentContactsScreen({
      stateStore: store,
      query: this.query,
      selectedContactId: this.selectedContactId,
    });

    this.list.replaceChildren();
    this.details.replaceChildren();

    if (model.emptyState) {
      const empty = el('div', 'contacts-screen__empty');
      empty.append(el('div', 'contacts-screen__empty-mark', '◎'), el('h3', '', model.emptyState.title), el('p', '', 'Добавляйте людей и компании и связывайте их с проектами, процессами и задачами.'));
      this.list.append(empty);
      this.details.hidden = true;
      return;
    }

    for (const item of model.items) {
      const row = el('button', `contact-row${item.id === this.selectedContactId ? ' is-selected' : ''}`);
      row.type = 'button';
      row.addEventListener('click', () => {
        this.selectedContactId = item.id;
        this.render();
      }, { signal: this.abortController.signal });
      row.append(el('span', 'contact-row__avatar', initials(item.title)));
      const copy = el('span', 'contact-row__copy');
      copy.append(el('strong', '', item.title), el('small', '', item.subtitle || 'Контакт'), el('span', '', `${item.activeTaskCount} активных задач · ${item.processCount} процессов`));
      row.append(copy, el('span', 'contact-row__arrow', '›'));
      this.list.append(row);
    }

    const contact = model.selectedContact;
    if (!contact) {
      this.details.hidden = true;
      return;
    }

    this.details.hidden = false;
    const hero = el('div', 'contact-detail__hero');
    hero.append(el('div', 'contact-detail__avatar', initials(contact.title)));
    const heroCopy = el('div');
    heroCopy.append(el('div', 'contacts-screen__kicker', 'КОНТАКТ'), el('h3', '', contact.title), el('p', '', contact.subtitle || ''));
    hero.append(heroCopy);

    const actions = el('div', 'contact-detail__actions');
    for (const label of ['Позвонить', 'Написать', 'Назначить']) actions.append(el('button', '', label));

    const stats = el('div', 'contact-detail__stats');
    const values = [
      [contact.history?.processes?.length ?? 0, 'Процессы'],
      [contact.history?.tasks?.length ?? 0, 'Задачи'],
      [contact.history?.projects?.length ?? 0, 'Проекты'],
    ];
    for (const [value, label] of values) {
      const stat = el('div', 'contact-detail__stat');
      stat.append(el('strong', '', String(value)), el('span', '', label));
      stats.append(stat);
    }

    this.details.append(hero, el('div', 'contact-detail__flow'), actions, stats);
  }

  destroy() {
    this.unsubscribe?.();
    this.abortController.abort();
    this.overlay.remove();
  }
}

export default ContactsScreenController;
