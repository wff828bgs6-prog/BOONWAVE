import store from '../state/store.js';
import { createCardWithMedia, updateCardWithMedia } from '../services/card-save-service.js';
import { ContactEditorController } from './contact-editor-controller.js';

function csv(value) {
  return String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

function messengerValue(data, type) {
  return data.messengers?.find((item) => item.type === type)?.value ?? '';
}

function injectField(form, label, name, placeholder = '') {
  if (form.elements.namedItem(name)) return;
  const reference = form.elements.namedItem('telegram')?.closest('.contact-editor__messengers');
  const wrapper = document.createElement('label');
  wrapper.className = 'contact-editor__field contact-editor__field--link';
  const caption = document.createElement('span');
  caption.textContent = label;
  const input = document.createElement('input');
  input.name = name;
  input.placeholder = placeholder;
  wrapper.append(caption, input);
  reference?.before(wrapper);
}

function setValue(form, name, value) {
  const control = form.elements.namedItem(name);
  if (control) control.value = value ?? '';
}

function value(form, name) {
  return String(new FormData(form).get(name) ?? '').trim();
}

const originalBuild = ContactEditorController.prototype.build;
ContactEditorController.prototype.build = function buildWithExtraContactFields() {
  originalBuild.call(this);
  injectField(this.form, 'Сайт', 'website', 'site.ru');
  injectField(this.form, 'Instagram', 'instagram', '@username или ссылка');
};

const originalOpenCreate = ContactEditorController.prototype.openCreate;
ContactEditorController.prototype.openCreate = function openCreateWithExtraContactFields() {
  originalOpenCreate.call(this);
  setValue(this.form, 'website', '');
  setValue(this.form, 'instagram', '');
};

const originalOpenEdit = ContactEditorController.prototype.openEdit;
ContactEditorController.prototype.openEdit = function openEditWithExtraContactFields(contactId) {
  originalOpenEdit.call(this, contactId);
  const card = store.getState().cards[contactId];
  const data = card?.data ?? {};
  setValue(this.form, 'website', data.website);
  setValue(this.form, 'instagram', data.instagram);
};

ContactEditorController.prototype.submit = async function submitContactWithExtraFields(event) {
  event.preventDefault();
  if (!this.form.reportValidity()) return;
  const form = this.form;
  const messenger = (type, label) => {
    const messengerValueText = value(form, type);
    return messengerValueText ? { type, value: messengerValueText, label, primary: type === 'telegram' } : null;
  };
  const phone = value(form, 'phone');
  const email = value(form, 'email');
  const website = value(form, 'website');
  const instagram = value(form, 'instagram');
  const current = this.editingId ? store.getState().cards[this.editingId] : null;
  const data = {
    ...(current?.data ?? {}),
    kind: value(form, 'kind') || 'person',
    fullName: value(form, 'fullName'),
    organization: value(form, 'organization'),
    profession: value(form, 'profession'),
    role: value(form, 'profession'),
    city: value(form, 'city'),
    address: value(form, 'address'),
    category: value(form, 'category') || 'specialist',
    status: value(form, 'status') || 'active',
    description: value(form, 'description'),
    notes: value(form, 'notes'),
    tags: csv(value(form, 'tags')),
    skills: csv(value(form, 'skills')),
    website,
    instagram,
    websites: website ? [{ type: 'website', value: website, label: 'Сайт', primary: true }] : [],
    phones: phone ? [{ type: 'phone', value: phone, label: 'Основной', primary: true }] : [],
    emails: email ? [{ type: 'email', value: email, label: 'Основной', primary: true }] : [],
    messengers: [messenger('telegram', 'Telegram'), messenger('whatsapp', 'WhatsApp'), messenger('max', 'MAX')].filter(Boolean),
  };
  if (this.avatarPreviewDataUrl) data.avatarPreviewUrl = this.avatarPreviewDataUrl;
  const pendingMedia = this.pendingAvatarFile ? [{ slot: 'avatar', file: this.pendingAvatarFile }] : [];
  const title = data.fullName || data.organization || 'Новый контакт';
  this.submitButton.disabled = true;
  try {
    const result = this.editingId
      ? await updateCardWithMedia(this.editingId, { title, data }, pendingMedia)
      : await createCardWithMedia({ type: 'person', title, data, x: 0, y: 0 }, pendingMedia);
    this.close();
    this.resetAvatarState?.();
    this.onSaved?.(result.card.id);
  } finally {
    this.submitButton.disabled = false;
  }
};

export default ContactEditorController;
