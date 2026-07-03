import store from '../state/store.js';
import { deleteCardNode } from '../services/node-service.js';
import { CARD_MEDIA_SLOTS } from '../domain/card-media.js';
import { normalizeNodeView } from '../domain/node.js';
import { getNodeFormFields } from '../ui/node-form-schema.js';
import { ImageThumbnailEditorController } from './image-thumbnail-editor-controller.js';

const DEFAULT_HINT = 'Выбери карточку • ✎ редактировать • ⌫ удалить';
const MEDIA_FIELD_LABELS = Object.freeze({
  cover: 'Главное фото / обложка', avatar: 'Фото / аватар', images: 'Изображения',
  documents: 'Документы', files: 'Другие файлы', attachments: 'Вложения',
});
const MEDIA_ACCEPT = Object.freeze({
  cover: 'image/*', coverWide: 'image/*', avatar: 'image/*', avatarWide: 'image/*', images: 'image/*',
  documents: 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
  files: '*/*', attachments: '*/*',
});
const MEDIA_PICKER_LABELS = Object.freeze({
  cover: 'Выбрать изображение', avatar: 'Выбрать изображение', images: 'Добавить изображения',
  documents: 'Добавить документы', files: 'Добавить файлы', attachments: 'Добавить вложения',
});
const MEDIA_EMPTY_LABELS = Object.freeze({
  cover: 'Миниатюра не настроена', avatar: 'Миниатюра не настроена', images: 'Изображения не выбраны',
  documents: 'Документы не выбраны', files: 'Файлы не выбраны', attachments: 'Вложения не выбраны',
});
const MEDIA_ICONS = Object.freeze({ cover: '◎', avatar: '◎', images: 'IMG', documents: 'DOC', files: '+', attachments: '+' });
const PRIMARY_THUMBNAIL_SLOTS = new Set(['cover', 'avatar']);
const WIDE_SLOT_BY_PRIMARY = Object.freeze({ cover: 'coverWide', avatar: 'avatarWide' });
const DATA_KEYS_BY_PRIMARY = Object.freeze({
  cover: { squarePreview: 'coverPreviewUrl', widePreview: 'coverWidePreviewUrl', crops: 'coverCrops' },
  avatar: { squarePreview: 'avatarPreviewUrl', widePreview: 'avatarWidePreviewUrl', crops: 'avatarCrops' },
});
const FILE_OVERRIDES = new WeakMap();

function ensureMediaPickerStyles() {
  if (document.getElementById('boonwave-card-media-picker-styles')) return;
  const style = document.createElement('style');
  style.id = 'boonwave-card-media-picker-styles';
  style.textContent = `
    .media-field{display:grid;gap:8px;min-width:0}
    .media-field>span{font-size:var(--bw-font-xs,12px);color:var(--bw-text-muted)}
    .media-picker{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:12px;min-height:64px;padding:9px 12px;border:1px solid rgba(94,116,192,.36);border-radius:20px;background:rgba(13,20,48,.82);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.018);transition:border-color var(--bw-motion-fast,180ms),box-shadow var(--bw-motion-fast,180ms),transform var(--bw-motion-fast,180ms)}
    .media-picker:active{transform:translateY(1px);border-color:rgba(73,205,255,.64);box-shadow:0 0 20px rgba(32,207,255,.12),inset 0 0 0 1px rgba(255,255,255,.03)}
    .media-picker:focus-within{border-color:rgba(62,198,255,.72);box-shadow:0 0 0 4px rgba(63,162,255,.08)}
    .media-picker__thumb{width:46px;height:46px;border-radius:14px;border:1px solid rgba(89,207,255,.3);background:rgba(15,22,52,.72) center/cover no-repeat;display:grid;place-items:center;color:#61d7ff;font-weight:800;font-size:11px;letter-spacing:.04em;box-shadow:0 0 14px rgba(70,198,255,.08)}
    .media-picker__body{min-width:0;display:grid;gap:3px}.media-picker__action{justify-self:start;max-width:100%;padding:10px 16px;border-radius:15px;background:linear-gradient(135deg,#7753ff,#21c9ff);color:#fff;font-weight:800;font-size:14px;line-height:1.08;box-shadow:0 0 20px rgba(65,154,255,.2);white-space:normal;text-align:center}
    .media-picker__state{min-height:18px;color:#aeb7d2;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.media-picker__input{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;opacity:0!important;cursor:pointer}.media-picker--generic .media-picker__action{background:rgba(23,29,54,.92);border:1px solid rgba(105,150,255,.28);box-shadow:none}.media-picker--generic .media-picker__thumb{color:#9bdfff}
  `;
  document.head.append(style);
}

function createFieldElement(definition, value = '') {
  const label = document.createElement('label');
  label.className = 'field';
  const caption = document.createElement('span');
  caption.textContent = definition.label;
  label.append(caption);

  let control;
  if (definition.type === 'select') {
    control = document.createElement('select');
    for (const [optionValue, optionLabel] of definition.options) {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionLabel;
      control.append(option);
    }
  } else {
    control = document.createElement('input');
    control.type = definition.type;
    if (definition.maxlength) control.maxLength = definition.maxlength;
    if (definition.min !== undefined) control.min = String(definition.min);
    if (definition.max !== undefined) control.max = String(definition.max);
    if (definition.step !== undefined) control.step = String(definition.step);
  }

  control.dataset.nodeField = definition.key;
  control.name = definition.key;
  control.required = Boolean(definition.required);
  control.value = value ?? '';
  label.append(control);
  return label;
}

function addThumbnailData(container, slot, key, value = '') {
  let input = container.querySelector(`[data-thumbnail-data="${slot}.${key}"]`);
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.dataset.thumbnailData = `${slot}.${key}`;
    container.append(input);
  }
  input.value = typeof value === 'string' ? value : JSON.stringify(value ?? '');
}

function readThumbnailData(container) {
  const data = {};
  for (const input of container.querySelectorAll('[data-thumbnail-data]')) {
    const [, key] = input.dataset.thumbnailData.split('.');
    if (!key || !input.value) continue;
    if (key.endsWith('Crops')) {
      try { data[key] = JSON.parse(input.value); } catch { data[key] = null; }
    } else {
      data[key] = input.value;
    }
  }
  return data;
}

function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getFileNameLabel(file) {
  return file?.name ? file.name : 'Миниатюра настроена';
}

function formatFilesState(files, slot) {
  const count = files.length;
  if (!count) return MEDIA_EMPTY_LABELS[slot] ?? 'Файлы не выбраны';
  if (count === 1) return files[0]?.name ?? '1 файл выбран';
  if (slot === 'images') return `${count} изображений выбрано`;
  if (slot === 'documents') return `${count} документа выбрано`;
  if (slot === 'attachments') return `${count} вложения выбрано`;
  return `${count} файла выбрано`;
}

function setPickerState(wrapper, { actionText, stateText = '', previewUrl = '', icon = '' } = {}) {
  wrapper.querySelector('.media-picker__action').textContent = actionText || 'Выбрать';
  wrapper.querySelector('.media-picker__state').textContent = stateText;
  const thumb = wrapper.querySelector('.media-picker__thumb');
  thumb.textContent = previewUrl ? '' : icon;
  thumb.style.backgroundImage = previewUrl ? `url(${previewUrl})` : '';
}

function createPicker(input, slot, { isThumbnail = false, previewUrl = '' } = {}) {
  const picker = document.createElement('label');
  picker.className = `media-picker ${isThumbnail ? 'media-picker--thumbnail' : 'media-picker--generic'}`;
  const thumb = document.createElement('span');
  thumb.className = 'media-picker__thumb';
  const body = document.createElement('span');
  body.className = 'media-picker__body';
  const action = document.createElement('span');
  action.className = 'media-picker__action';
  const state = document.createElement('span');
  state.className = 'media-picker__state';
  input.className = 'media-picker__input';
  body.append(action, state);
  picker.append(thumb, body, input);
  setPickerState(picker, {
    actionText: previewUrl ? 'Заменить изображение' : (MEDIA_PICKER_LABELS[slot] ?? 'Добавить файл'),
    stateText: previewUrl ? 'Изображение уже добавлено' : (MEDIA_EMPTY_LABELS[slot] ?? 'Файлы не выбраны'),
    previewUrl,
    icon: MEDIA_ICONS[slot] ?? '+',
  });
  return picker;
}

function createMediaField(slot, config, type, data = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `field media-field media-field--${slot}`;
  const caption = document.createElement('span');
  caption.textContent = MEDIA_FIELD_LABELS[slot] ?? slot;
  wrapper.append(caption);

  const input = document.createElement('input');
  input.type = 'file';
  input.dataset.mediaSlot = slot;
  input.accept = MEDIA_ACCEPT[slot] ?? '*/*';
  input.multiple = config.mode === 'multiple';

  if (PRIMARY_THUMBNAIL_SLOTS.has(slot) && config.mode === 'single') {
    input.dataset.thumbnailPrimarySlot = slot;
    const keys = DATA_KEYS_BY_PRIMARY[slot];
    const previewUrl = data[keys.squarePreview] || data[keys.widePreview] || '';
    wrapper.append(createPicker(input, slot, { isThumbnail: true, previewUrl }));
    if (data[keys.squarePreview]) addThumbnailData(wrapper, slot, keys.squarePreview, data[keys.squarePreview]);
    if (data[keys.widePreview]) addThumbnailData(wrapper, slot, keys.widePreview, data[keys.widePreview]);
    if (data[keys.crops]) addThumbnailData(wrapper, slot, keys.crops, data[keys.crops]);
    const wideSlot = WIDE_SLOT_BY_PRIMARY[slot];
    if (CARD_MEDIA_SLOTS[type]?.[wideSlot]) {
      const hiddenWideInput = document.createElement('input');
      hiddenWideInput.type = 'file';
      hiddenWideInput.dataset.mediaSlot = wideSlot;
      hiddenWideInput.accept = MEDIA_ACCEPT[wideSlot] ?? 'image/*';
      hiddenWideInput.hidden = true;
      wrapper.append(hiddenWideInput);
    }
    return wrapper;
  }

  wrapper.append(createPicker(input, slot));
  return wrapper;
}

function updateGenericFilePicker(input) {
  const wrapper = input.closest('.media-field');
  if (!wrapper || input.dataset.thumbnailPrimarySlot) return;
  const files = [...(input.files ?? [])];
  setPickerState(wrapper, {
    actionText: MEDIA_PICKER_LABELS[input.dataset.mediaSlot] ?? 'Добавить файл',
    stateText: formatFilesState(files, input.dataset.mediaSlot),
    icon: MEDIA_ICONS[input.dataset.mediaSlot] ?? '+',
  });
}

function createHiddenViewFields(view) {
  const normalized = normalizeNodeView(view);
  const fields = [];
  const make = (key, value) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.dataset.viewField = key;
    input.value = String(value ?? '');
    fields.push(input);
  };

  make('compactLabel', normalized.compactLabel);
  for (const mode of ['compact', 'working']) {
    const frame = normalized.coverFrames[mode];
    make(`${mode}.shape`, frame.shape);
    make(`${mode}.scale`, frame.scale);
    make(`${mode}.positionX`, frame.positionX);
    make(`${mode}.positionY`, frame.positionY);
  }
  return fields;
}

export function collectPendingFormMedia(container) {
  return [...container.querySelectorAll('[data-media-slot]')].flatMap((input) => {
    const override = FILE_OVERRIDES.get(input);
    const files = override ? [override] : [...(input.files ?? [])];
    return files.map((file) => ({ slot: input.dataset.mediaSlot, file }));
  });
}

export function readThumbnailFormData(container) {
  return readThumbnailData(container);
}

export class NodeController {
  constructor({
    addButton, editButton, deleteButton, createSheet, closeCreateButton, createForm,
    typeGrid, titleInput, descriptionInput, createTypeFields, editSheet, closeEditButton,
    editForm, editTitleInput, editDescriptionInput, editTypeFields, hint, getViewportCenter,
  }) {
    if (new.target === NodeController) {
      throw new TypeError('NodeController is an abstract UI controller. Use TransactionalNodeController.');
    }

    ensureMediaPickerStyles();
    this.elements = {
      addButton, editButton, deleteButton, createSheet, closeCreateButton, createForm,
      typeGrid, titleInput, descriptionInput, createTypeFields, editSheet, closeEditButton,
      editForm, editTitleInput, editDescriptionInput, editTypeFields, hint,
    };
    this.getViewportCenter = getViewportCenter;
    this.selectedType = 'project';
    this.editingCardId = null;
    this.feedbackTimer = null;
    this.thumbnailEditor = new ImageThumbnailEditorController({ title: 'Настройка миниатюры' });
    this.abortController = new AbortController();
    this.renderTypeFields(this.elements.createTypeFields, this.selectedType);
    this.bindEvents();
  }

  renderTypeFields(container, type, data = {}, view = {}) {
    if (!container) return;
    const typedFields = getNodeFormFields(type)
      .map((definition) => createFieldElement(definition, data[definition.key]));
    const mediaFields = Object.entries(CARD_MEDIA_SLOTS[type] ?? {})
      .filter(([slot]) => slot !== 'coverWide' && slot !== 'avatarWide')
      .map(([slot, config]) => createMediaField(slot, config, type, data));
    container.replaceChildren(...typedFields, ...mediaFields, ...createHiddenViewFields(view));
  }

  bindEvents() {
    const signal = this.abortController.signal;
    const e = this.elements;
    e.addButton.addEventListener('click', () => this.openCreate(), { signal });
    e.editButton.addEventListener('click', () => this.openEdit(), { signal });
    e.deleteButton.addEventListener('click', () => this.deleteSelected(), { signal });
    e.closeCreateButton.addEventListener('click', () => this.closeCreate(), { signal });
    e.closeEditButton.addEventListener('click', () => this.closeEdit(), { signal });
    e.createSheet.addEventListener('click', (event) => { if (event.target === e.createSheet) this.closeCreate(); }, { signal });
    e.editSheet.addEventListener('click', (event) => { if (event.target === e.editSheet) this.closeEdit(); }, { signal });
    e.typeGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-node-type]');
      if (!button) return;
      this.selectedType = button.dataset.nodeType;
      for (const item of e.typeGrid.querySelectorAll('[data-node-type]')) {
        item.setAttribute('aria-pressed', String(item === button));
      }
      this.renderTypeFields(e.createTypeFields, this.selectedType);
    }, { signal });

    for (const container of [e.createTypeFields, e.editTypeFields]) {
      container.addEventListener('change', (event) => {
        const input = event.target.closest?.('[data-media-slot]');
        if (!input) return;
        if (input.dataset.thumbnailPrimarySlot) {
          this.handleThumbnailFile(container, input).catch((error) => {
            console.error('Thumbnail editor failed:', error);
            this.showFeedback('Не удалось настроить изображение');
          });
          return;
        }
        updateGenericFilePicker(input);
      }, { signal });
    }

    e.createForm.addEventListener('submit', (event) => this.submitCreate(event), { signal });
    e.editForm.addEventListener('submit', (event) => this.submitEdit(event), { signal });
  }

  async handleThumbnailFile(container, input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const slot = input.dataset.thumbnailPrimarySlot;
    const keys = DATA_KEYS_BY_PRIMARY[slot];
    const currentCropsInput = container.querySelector(`[data-thumbnail-data="${slot}.${keys.crops}"]`);
    let crops = null;
    try { crops = currentCropsInput?.value ? JSON.parse(currentCropsInput.value) : null; } catch { crops = null; }
    const result = await this.thumbnailEditor.open(file, { crops });
    if (!result) return;
    FILE_OVERRIDES.set(input, result.square.file);
    const wideSlot = WIDE_SLOT_BY_PRIMARY[slot];
    const wideInput = container.querySelector(`[data-media-slot="${wideSlot}"]`);
    if (wideInput) FILE_OVERRIDES.set(wideInput, result.wide.file);
    const squarePreview = await dataUrlFromFile(result.square.file);
    const widePreview = await dataUrlFromFile(result.wide.file);
    const field = input.closest('.media-field');
    addThumbnailData(field, slot, keys.squarePreview, squarePreview);
    addThumbnailData(field, slot, keys.widePreview, widePreview);
    addThumbnailData(field, slot, keys.crops, result.crops);
    setPickerState(field, {
      actionText: 'Заменить изображение',
      stateText: getFileNameLabel(result.square.file),
      previewUrl: squarePreview,
      icon: MEDIA_ICONS[slot] ?? '◎',
    });
  }

  showFeedback(message, timeout = 1200) {
    clearTimeout(this.feedbackTimer);
    this.elements.hint.textContent = message;
    if (timeout > 0) {
      this.feedbackTimer = setTimeout(() => { this.elements.hint.textContent = DEFAULT_HINT; }, timeout);
    }
  }

  openCreate() {
    this.elements.createSheet.hidden = false;
    this.elements.titleInput.focus();
  }

  closeCreate() {
    this.elements.createSheet.hidden = true;
    this.elements.createForm.reset();
    this.selectedType = 'project';
    for (const item of this.elements.typeGrid.querySelectorAll('[data-node-type]')) {
      item.setAttribute('aria-pressed', String(item.dataset.nodeType === 'project'));
    }
    this.renderTypeFields(this.elements.createTypeFields, this.selectedType);
  }

  openEdit() {
    const { selectedCardId, cards } = store.getState();
    const card = selectedCardId ? cards[selectedCardId] : null;
    if (!card) { this.showFeedback('Сначала выбери карточку'); return; }
    this.editingCardId = card.id;
    this.elements.editTitleInput.value = card.title ?? '';
    this.elements.editDescriptionInput.value = card.description ?? '';
    this.renderTypeFields(this.elements.editTypeFields, card.type, card.data ?? {}, card.view ?? {});
    this.elements.editSheet.hidden = false;
    this.elements.editTitleInput.focus();
  }

  closeEdit() {
    this.elements.editSheet.hidden = true;
    this.editingCardId = null;
    this.elements.editForm.reset();
    this.elements.editTypeFields?.replaceChildren();
  }

  async deleteSelected() {
    const state = store.getState();
    const cardId = state.selectedCardId;
    const card = cardId ? state.cards[cardId] : null;
    if (!card) { this.showFeedback('Сначала выбери карточку'); return; }
    if (!window.confirm(`Удалить карточку «${card.title}» и все её связи?`)) return;
    try {
      await deleteCardNode(cardId);
      this.showFeedback('Карточка и её связи удалены');
    } catch (error) {
      console.error('Card deletion failed:', error);
      this.showFeedback('Не удалось удалить карточку');
    }
  }

  destroy() {
    clearTimeout(this.feedbackTimer);
    this.thumbnailEditor.destroy();
    this.abortController.abort();
  }
}

export default NodeController;
