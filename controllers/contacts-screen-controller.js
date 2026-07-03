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
  constructor({ openButton, beforeOpen, createContact, editContact, deleteContact } = {}) {
    if (!(openButton instanceof HTMLButtonElement)) {
      throw new TypeError('ContactsScreenController expects an open button.');
    }
    this.openButton = openButton;
    this.beforeOpen = typeof beforeOpen === 'function' ? beforeOpen : null;
    this.createContact = typeof createContact === 'function' ? createContact : null;
    this.editContact = typeof editContact === 'function' ? editContact : null;
    this.deleteContact = typeof deleteContact === 'function' ? deleteContact : null;
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
    this.closeButton.addEventListener('click', () => {
      if (this.selectedContactId) this.backToList();
      else this.close();
    }, { signal });
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
      if (event.key !== 'Escape' || this.overlay.hidden) return;
      if (this.selectedContactId) this.backToList();
      else this.close();
    }, { signal });
  }

  open() {
    this.beforeOpen?.();
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.openButton.setAttribute('aria-expanded', 'true');
    this.render();
  }

  close() {
    this.selectedContactId = null;
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.openButton.setAttribute('aria-expanded', 'false');
  }

  backToList() {
    this.selectedContactId = null;
    this.render();
  }

  render() {
    const model = presentContactsScreen({
      stateStore: store,
      query: this.query,
      selectedContactId: this.selectedContactId,
    });

    this.list.replaceChildren();
    this.details.replaceChildren();
    this.closeButton.textContent = this.selectedContactId ? '‹' : '×';
    this.closeButton.setAttribute('aria-label', this.selectedContactId ? 'Назад к списку контактов' : 'Закрыть контакты');

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
    const detailHead = el('div', 'contact-detail__topbar');
    const backButton = el('button', 'contact-detail__back', '‹ Назад');
    backButton.type = 'button';
    backButton.addEventListener('click', () => this.backToList(), { signal: this.abortController.signal });
    const editButton = el('button', 'contact-detail__edit', 'Редактировать');
    editButton.type = 'button';
    editButton.addEventListener('click', () => {
      this.close();
      this.editContact?.(contact.id);
    }, { signal: this.abortController.signal });
    detailHead.append(backButton, editButton);

    const hero = el('div', 'contact-detail__hero');
    hero.append(el('div', 'contact-detail__avatar', initials(contact.title)));
    const heroCopy = el('div');
    heroCopy.append(el('div', 'contacts-screen__kicker', 'КОНТАКТ'), el('h3', '', contact.title), el('p', '', contact.subtitle || ''));
    hero.append(heroCopy);

    const actions = el('div', 'contact-detail__actions');
    const callButton = el('button', '', 'Позвонить');
    callButton.disabled = !contact.canCall;
    callButton.addEventListener('click', () => {
      if (contact.phone?.value) window.location.href = `tel:${contact.phone.value}`;
    }, { signal: this.abortController.signal });
    const messageButton = el('button', '', 'Написать');
    messageButton.disabled = !(contact.canMessage || contact.canEmail);
    messageButton.addEventListener('click', () => {
      if (contact.messenger?.value) window.location.href = contact.messenger.value;
      else if (contact.email?.value) window.location.href = `mailto:${contact.email.value}`;
    }, { signal: this.abortController.signal });
    const assignButton = el('button', '', 'Назначить');
    assignButton.disabled = true;
    actions.append(callButton, messageButton, assignButton);

    const stats = el('div', 'contact-detail__stats');
    const values = [
      [contact.history?.processes?.length ?? 0, 'Процессы'],
      [contact.history?.tasks?.length ?? 0, 'Задачи'],
      [contact.history?.projects?.length ?? 0, 'Проекты'],
    ];
    for (const [value, label] of values) {
      const stat = el('button', 'contact-detail__stat');
      stat.type = 'button';
      stat.disabled = value === 0;
      stat.append(el('strong', '', String(value)), el('span', '', label));
      stats.append(stat);
    }

    const manage = el('div', 'contact-detail__manage');
    const deleteButton = el('button', 'contact-detail__delete', 'Удалить контакт');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', async () => {
      const deleted = await this.deleteContact?.(contact.id);
      if (deleted !== false) this.backToList();
    }, { signal: this.abortController.signal });
    manage.append(deleteButton);

    this.details.append(detailHead, hero, el('div', 'contact-detail__flow'), actions, stats, manage);
  }

  destroy() {
    this.unsubscribe?.();
    this.abortController.abort();
    this.overlay.remove();
  }
}

export default ContactsScreenController;
