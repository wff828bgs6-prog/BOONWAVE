import store from '../state/store.js';
import { createCardWithMedia, updateCardWithMedia } from '../services/card-save-service.js';
import { ImageThumbnailEditorController } from './image-thumbnail-editor-controller.js';

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
  if (options.inputMode) control.inputMode = options.inputMode;
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

function messengerFields() {
  const wrapper = document.createElement('fieldset');
  wrapper.className = 'contact-editor__messengers';
  const legend = document.createElement('legend');
  legend.textContent = 'Мессенджеры';
  const hint = document.createElement('p');
  hint.textContent = 'Укажи только те каналы, где реально идёт общение. В карточке они будут отображаться иконками.';
  const channels = document.createElement('div');
  channels.className = 'contact-editor__messenger-grid';
  const items = [['telegram', 'TG', '@username или ссылка'], ['whatsapp', 'WA', 'номер или ссылка'], ['max', 'MAX', 'контакт или ссылка']];
  for (const [name, label, placeholder] of items) {
    const row = document.createElement('label');
    row.className = `contact-editor__messenger contact-editor__messenger--${name}`;
    const badge = document.createElement('span');
    badge.className = 'contact-editor__messenger-badge';
    badge.textContent = label;
    const input = document.createElement('input');
    input.name = name;
    input.placeholder = placeholder;
    row.append(badge, input);
    channels.append(row);
  }
  wrapper.append(legend, hint, channels);
  return wrapper;
}

function fileField() {
  const wrapper = document.createElement('label');
  wrapper.className = 'contact-editor__file';
  const caption = document.createElement('span');
  caption.className = 'contact-editor__file-caption';
  caption.textContent = 'Фото / логотип';
  const box = document.createElement('span');
  box.className = 'contact-editor__file-box';
  const thumb = document.createElement('span');
  thumb.className = 'contact-editor__file-thumb';
  thumb.textContent = '◎';
  const action = document.createElement('span');
  action.className = 'contact-editor__file-action';
  action.textContent = 'Выбрать изображение';
  const state = document.createElement('span');
  state.className = 'contact-editor__file-state';
  state.textContent = 'Файл не выбран';
  const input = document.createElement('input');
  input.type = 'file';
  input.name = 'avatar';
  input.accept = 'image/*';
  box.append(thumb, action, state, input);
  wrapper.append(caption, box);
  return wrapper;
}

function csv(value) { return String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean); }
function primary(items = []) { return items.find((item) => item.primary) ?? items[0] ?? null; }
function messengerValue(data, type) { return data.messengers?.find((item) => item.type === type)?.value ?? ''; }
function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
function setFileControlState(form, { actionText, stateText, previewUrl = null }) {
  const action = form.querySelector('.contact-editor__file-action');
  const state = form.querySelector('.contact-editor__file-state');
  const thumb = form.querySelector('.contact-editor__file-thumb');
  if (action) action.textContent = actionText;
  if (state) state.textContent = stateText;
  if (thumb) {
    thumb.textContent = previewUrl ? '' : '◎';
    thumb.style.backgroundImage = previewUrl ? `url(${previewUrl})` : '';
  }
}

export class ContactEditorController {
  constructor({ onSaved } = {}) {
    this.onSaved = typeof onSaved === 'function' ? onSaved : null;
    this.editingId = null;
    this.pendingAvatarFile = null;
    this.avatarPreviewDataUrl = '';
    this.previewUrl = null;
    this.thumbnailEditor = new ImageThumbnailEditorController();
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
    grid.append(
      selectField('Тип контакта', 'kind', [['person', 'Человек'], ['company', 'Компания']]),
      field('Имя или название', 'fullName', 'text', { required: true }),
      field('Организация', 'organization'),
      field('Профессия / специализация', 'profession'),
      field('Город', 'city'),
      field('Адрес', 'address'),
      field('Телефон', 'phone', 'tel', { placeholder: '+7 000 000-00-00', inputMode: 'tel' }),
      field('Email', 'email', 'email'),
      messengerFields(),
      selectField('Категория', 'category', [['specialist', 'Специалист'], ['contractor', 'Подрядчик'], ['supplier', 'Поставщик'], ['partner', 'Партнёр'], ['client', 'Клиент'], ['other', 'Другое']]),
      selectField('Статус', 'status', [['active', 'Активный'], ['trusted', 'Проверенный'], ['new', 'Новый'], ['inactive', 'Неактивный']]),
      field('Теги через запятую', 'tags'),
      field('Навыки через запятую', 'skills'),
      field('Описание', 'description', 'textarea'),
      field('Заметки', 'notes', 'textarea'),
      fileField(),
    );
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
    this.overlay.addEventListener('click', (event) => { if (event.target === this.overlay) this.close(); }, { signal });
    this.form.addEventListener('submit', (event) => this.submit(event), { signal });
    this.form.elements.namedItem('avatar').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const result = await this.thumbnailEditor.open(file);
      if (!result) return;
      this.pendingAvatarFile = result.file;
      this.avatarPreviewDataUrl = await dataUrlFromFile(result.file);
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = result.previewUrl;
      setFileControlState(this.form, { actionText: 'Изменить миниатюру', stateText: result.file.name, previewUrl: this.previewUrl });
    }, { signal });
  }

  resetAvatarState() {
    this.pendingAvatarFile = null;
    this.avatarPreviewDataUrl = '';
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }

  openCreate() {
    this.editingId = null;
    this.form.reset();
    this.resetAvatarState();
    setFileControlState(this.form, { actionText: 'Выбрать изображение', stateText: 'Файл не выбран' });
    this.title.textContent = 'Новый контакт';
    this.submitButton.textContent = 'Сохранить контакт';
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.form.scrollTop = 0;
  }

  openEdit(contactId) {
    const card = store.getState().cards[contactId];
    if (!card || card.type !== 'person') return;
    this.editingId = contactId;
    this.form.reset();
    this.resetAvatarState();
    const data = card.data ?? {};
    const set = (name, value) => { const control = this.form.elements.namedItem(name); if (control) control.value = value ?? ''; };
    set('kind', data.kind || 'person');
    set('fullName', data.fullName || data.organization || card.title);
    set('organization', data.organization);
    set('profession', data.profession || data.role);
    set('city', data.city);
    set('address', data.address);
    set('phone', primary(data.phones)?.value || data.phone);
    set('email', primary(data.emails)?.value || data.email);
    set('telegram', messengerValue(data, 'telegram'));
    set('whatsapp', messengerValue(data, 'whatsapp'));
    set('max', messengerValue(data, 'max'));
    set('category', data.category || 'specialist');
    set('status', data.status || 'active');
    set('tags', (data.tags || []).join(', '));
    set('skills', (data.skills || []).join(', '));
    set('description', data.description);
    set('notes', data.notes);
    setFileControlState(this.form, { actionText: data.avatarMediaId ? 'Заменить изображение' : 'Выбрать изображение', stateText: data.avatarMediaId ? 'Фото добавлено' : 'Файл не выбран', previewUrl: data.avatarPreviewUrl || null });
    this.title.textContent = 'Редактировать контакт';
    this.submitButton.textContent = 'Сохранить изменения';
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.form.scrollTop = 0;
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
    const messenger = (type, label) => { const messengerValue = value(type); return messengerValue ? { type, value: messengerValue, label, primary: type === 'telegram' } : null; };
    const phone = value('phone');
    const email = value('email');
    const current = this.editingId ? store.getState().cards[this.editingId] : null;
    const data = {
      ...(current?.data ?? {}),
      kind: value('kind') || 'person', fullName: value('fullName'), organization: value('organization'), profession: value('profession'), role: value('profession'), city: value('city'), address: value('address'), category: value('category') || 'specialist', status: value('status') || 'active', description: value('description'), notes: value('notes'), tags: csv(value('tags')), skills: csv(value('skills')),
      phones: phone ? [{ type: 'phone', value: phone, label: 'Основной', primary: true }] : [],
      emails: email ? [{ type: 'email', value: email, label: 'Основной', primary: true }] : [],
      messengers: [messenger('telegram', 'Telegram'), messenger('whatsapp', 'WhatsApp'), messenger('max', 'MAX')].filter(Boolean),
    };
    if (this.avatarPreviewDataUrl) data.avatarPreviewUrl = this.avatarPreviewDataUrl;
    const pendingMedia = this.pendingAvatarFile ? [{ slot: 'avatar', file: this.pendingAvatarFile }] : [];
    const title = data.fullName || data.organization || 'Новый контакт';
    this.submitButton.disabled = true;
    try {
      const result = this.editingId ? await updateCardWithMedia(this.editingId, { title, data }, pendingMedia) : await createCardWithMedia({ type: 'person', title, data, x: 0, y: 0 }, pendingMedia);
      const contactId = result.card.id;
      this.close();
      this.resetAvatarState();
      this.onSaved?.(contactId);
    } finally {
      this.submitButton.disabled = false;
    }
  }

  destroy() {
    this.abortController.abort();
    this.thumbnailEditor.destroy();
    this.resetAvatarState();
    this.overlay.remove();
  }
}

export default ContactEditorController;
