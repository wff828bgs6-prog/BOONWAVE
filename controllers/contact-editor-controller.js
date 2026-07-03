import store from '../state/store.js';
import { createCardWithMedia, updateCardWithMedia } from '../services/card-save-service.js';

function field(label, name, type = 'text', options = {}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'contact-editor__field';
  const caption = document.createElement('span');
  caption.textContent = label;
  const control = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
  if (type !== 'textarea') control.type = type;
  control.name = name;
  if (options.placeholder) control.placeholder = options.placeholder;
  if (options.required) control.required = true;
  if (options.accept) control.accept = options.accept;
  wrapper.append(caption, control);
  return wrapper;
}

function selectField(label, name, values) {
  const wrapper = document.createElement('label');
  wrapper.className = 'contact-editor__field';
  const caption = document.createElement('span');
  caption.textContent = label;
  const select = document.createElement('select');
  select.name = name;
  for (const [value, text] of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  wrapper.append(caption, select);
  return wrapper;
}

function csv(value) {
  return String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

function primary(items = []) {
  return items.find((item) => item.primary) ?? items[0] ?? null;
}

export class ContactEditorController {
  constructor({ onSaved } = {}) {
    this.onSaved = typeof onSaved === 'function' ? onSaved : null;
    this.editingId = null;
    this.abortController = new AbortController();
    this.build();
    this.bind();
  }

  build() {
    this.overlay = document.createElement('section');
    this.overlay.className = 'contact-editor';
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');

    const form = document.createElement('form');
    form.className = 'contact-editor__panel';
    this.form = form;

    const head = document.createElement('div');
    head.className = 'contact-editor__head';
    this.title = document.createElement('h2');
    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.textContent = '×';
    this.closeButton.setAttribute('aria-label', 'Закрыть форму контакта');
    head.append(this.title, this.closeButton);

    const grid = document.createElement('div');
    grid.className = 'contact-editor__grid';
    const fields = [
      selectField('Тип контакта', 'kind', [['person', 'Человек'], ['company', 'Компания']]),
      field('Имя или название', 'fullName', 'text', { required: true }),
      field('Организация', 'organization'),
      field('Профессия / специализация', 'profession'),
      field('Город', 'city'),
      field('Адрес', 'address'),
      field('Телефон', 'phone', 'tel', { placeholder: '+7...' }),
      field('Email', 'email', 'email'),
      field('Telegram', 'telegram', 'text', { placeholder: '@username или ссылка' }),
      field('WhatsApp', 'whatsapp', 'text', { placeholder: 'номер или ссылка' }),
      field('MAX', 'max', 'text', { placeholder: 'контакт или ссылка' }),
      selectField('Категория', 'category', [['specialist', 'Специалист'], ['contractor', 'Подрядчик'], ['supplier', 'Поставщик'], ['partner', 'Партнёр'], ['client', 'Клиент'], ['other', 'Другое']]),
      selectField('Статус', 'status', [['active', 'Активный'], ['trusted', 'Проверенный'], ['new', 'Новый'], ['inactive', 'Неактивный']]),
      field('Теги через запятую', 'tags'),
      field('Навыки через запятую', 'skills'),
      field('Описание', 'description', 'textarea'),
      field('Заметки', 'notes', 'textarea'),
      field('Фото / логотип', 'avatar', 'file', { accept: 'image/*' }),
    ];
    grid.append(...fields);

    this.submitButton = document.createElement('button');
    this.submitButton.type = 'submit';
    this.submitButton.className = 'contact-editor__submit';
    form.append(head, grid, this.submitButton);
    this.overlay.append(form);
    document.body.append(this.overlay);
  }

  bind() {
    const signal = this.abortController.signal;
    this.closeButton.addEventListener('click', () => this.close(), { signal });
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    }, { signal });
    this.form.addEventListener('submit', (event) => this.submit(event), { signal });
  }

  openCreate() {
    this.editingId = null;
    this.form.reset();
    this.title.textContent = 'Новый контакт';
    this.submitButton.textContent = 'Сохранить контакт';
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
  }

  openEdit(contactId) {
    const card = store.getState().cards[contactId];
    if (!card || card.type !== 'person') return;
    this.editingId = contactId;
    const data = card.data ?? {};
    const set = (name, value) => {
      const control = this.form.elements.namedItem(name);
      if (control) control.value = value ?? '';
    };
    set('kind', data.kind || 'person');
    set('fullName', data.fullName || data.organization || card.title);
    set('organization', data.organization);
    set('profession', data.profession || data.role);
    set('city', data.city);
    set('address', data.address);
    set('phone', primary(data.phones)?.value || data.phone);
    set('email', primary(data.emails)?.value || data.email);
    set('telegram', data.messengers?.find((item) => item.type === 'telegram')?.value);
    set('whatsapp', data.messengers?.find((item) => item.type === 'whatsapp')?.value);
    set('max', data.messengers?.find((item) => item.type === 'max')?.value);
    set('category', data.category || 'specialist');
    set('status', data.status || 'active');
    set('tags', (data.tags || []).join(', '));
    set('skills', (data.skills || []).join(', '));
    set('description', data.description);
    set('notes', data.notes);
    this.title.textContent = 'Редактировать контакт';
    this.submitButton.textContent = 'Сохранить изменения';
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
  }

  close() {
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.editingId = null;
  }

  async submit(event) {
    event.preventDefault();
    if (!this.form.reportValidity()) return;
    const formData = new FormData(this.form);
    const value = (name) => String(formData.get(name) ?? '').trim();
    const messenger = (type) => {
      const messengerValue = value(type);
      return messengerValue ? { type, value: messengerValue, label: type.toUpperCase(), primary: type === 'telegram' } : null;
    };
    const phone = value('phone');
    const email = value('email');
    const current = this.editingId ? store.getState().cards[this.editingId] : null;
    const data = {
      ...(current?.data ?? {}),
      kind: value('kind') || 'person',
      fullName: value('fullName'),
      organization: value('organization'),
      profession: value('profession'),
      role: value('profession'),
      city: value('city'),
      address: value('address'),
      category: value('category') || 'specialist',
      status: value('status') || 'active',
      description: value('description'),
      notes: value('notes'),
      tags: csv(value('tags')),
      skills: csv(value('skills')),
      phones: phone ? [{ type: 'phone', value: phone, label: 'Основной', primary: true }] : [],
      emails: email ? [{ type: 'email', value: email, label: 'Основной', primary: true }] : [],
      messengers: [messenger('telegram'), messenger('whatsapp'), messenger('max')].filter(Boolean),
    };
    const avatar = this.form.elements.namedItem('avatar')?.files?.[0];
    const pendingMedia = avatar ? [{ slot: 'avatar', file: avatar }] : [];
    const title = data.fullName || data.organization || 'Новый контакт';

    this.submitButton.disabled = true;
    try {
      const result = this.editingId
        ? await updateCardWithMedia(this.editingId, { title, data }, pendingMedia)
        : await createCardWithMedia({ type: 'person', title, data, x: 0, y: 0 }, pendingMedia);
      const contactId = result.card.id;
      this.close();
      this.onSaved?.(contactId);
    } finally {
      this.submitButton.disabled = false;
    }
  }

  destroy() {
    this.abortController.abort();
    this.overlay.remove();
  }
}

export default ContactEditorController;
