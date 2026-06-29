import store from '../state/store.js';
import { deleteCardNode } from '../services/node-service.js';
import { loadMedia } from '../services/media-service.js';
import { CARD_MEDIA_SLOTS } from '../domain/card-media.js';
import { normalizeNodeView } from '../domain/node.js';
import { getNodeFormFields } from '../ui/node-form-schema.js';

const DEFAULT_HINT = 'Выбери карточку • ✎ редактировать • ⌫ удалить';
const MEDIA_FIELD_LABELS = Object.freeze({
  cover: 'Обложка', avatar: 'Фото / аватар', images: 'Изображения',
  documents: 'Документы', files: 'Другие файлы', attachments: 'Вложения',
});
const MEDIA_ACCEPT = Object.freeze({
  cover: 'image/*', avatar: 'image/*', images: 'image/*',
  documents: 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
  files: '*/*', attachments: '*/*',
});

function ensureCoverEditorStyles() {
  if (document.getElementById('boonwave-cover-editor-styles')) return;
  const style = document.createElement('style');
  style.id = 'boonwave-cover-editor-styles';
  style.textContent = `
    .cover-settings-button{width:100%;min-height:42px;margin-top:8px;border:1px solid var(--bw-border-soft);border-radius:14px;background:var(--bw-bg-control);color:var(--bw-text-primary)}
    .cover-editor[hidden]{display:none}.cover-editor{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:18px;background:rgba(3,4,10,.74);backdrop-filter:blur(12px)}
    .cover-editor-panel{width:min(100%,620px);max-height:88svh;overflow:auto;padding:22px;border:1px solid var(--bw-border-soft);border-radius:28px;background:var(--bw-bg-surface-strong);box-shadow:0 28px 80px rgba(0,0,0,.5)}
    .cover-editor-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.cover-editor-head h2{margin:0;font-size:22px}.cover-editor-close{width:44px;height:44px;border:0;border-radius:50%;background:var(--bw-bg-control);color:var(--bw-text-primary);font-size:26px}
    .cover-mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:18px 0;padding:6px;border:1px solid var(--bw-border-soft);border-radius:18px;background:var(--bw-bg-control)}
    .cover-mode-switch button{min-height:48px;border:0;border-radius:14px;background:transparent;color:var(--bw-text-secondary)}.cover-mode-switch button[aria-pressed="true"]{background:var(--bw-bg-control-active);color:var(--bw-text-primary);box-shadow:inset 0 0 0 1px var(--bw-border-medium)}
    .cover-preview{position:relative;width:100%;height:220px;overflow:hidden;border:1px solid var(--bw-border-soft);border-radius:24px;background:var(--bw-bg-control);touch-action:none}.cover-preview[data-mode="compact"]{width:min(68vw,260px);height:min(68vw,260px);margin-inline:auto}.cover-preview img{width:100%;height:100%;object-fit:cover;transform-origin:center;user-select:none;-webkit-user-drag:none}
    .cover-preview-placeholder{position:absolute;inset:0;display:grid;place-items:center;color:var(--bw-text-muted);font-size:13px}.cover-preview img[src]+.cover-preview-placeholder{display:none}
    .cover-controls{display:grid;gap:14px;margin-top:18px}.cover-controls label span{display:block;margin-bottom:7px;color:var(--bw-text-muted);font-size:12px}.cover-controls input,.cover-controls select{width:100%}
    .cover-editor-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}.cover-editor-actions button{min-height:50px;border-radius:16px;border:1px solid var(--bw-border-soft);background:var(--bw-bg-control);color:var(--bw-text-primary);font-weight:700}.cover-editor-actions .save{border:0;background:linear-gradient(135deg,rgb(var(--bw-brand-violet)),rgb(var(--bw-brand-cyan)));color:white}
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

function createMediaField(slot, config) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field media-field';
  const caption = document.createElement('span');
  caption.textContent = MEDIA_FIELD_LABELS[slot] ?? slot;
  const input = document.createElement('input');
  input.type = 'file';
  input.dataset.mediaSlot = slot;
  input.accept = MEDIA_ACCEPT[slot] ?? '*/*';
  input.multiple = config.mode === 'multiple';
  wrapper.append(caption, input);

  if (slot === 'cover' || slot === 'avatar') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cover-settings-button';
    button.dataset.openCoverEditor = 'true';
    button.dataset.mediaSlotTarget = slot;
    button.textContent = 'Настроить обложку';
    wrapper.append(button);
  }

  return wrapper;
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

function readViewData(container, currentView = {}) {
  const current = normalizeNodeView(currentView);
  const read = (key, fallback) => container.querySelector(`[data-view-field="${key}"]`)?.value ?? fallback;
  return normalizeNodeView({
    ...current,
    compactLabel: read('compactLabel', current.compactLabel),
    coverFrames: {
      compact: {
        shape: read('compact.shape', current.coverFrames.compact.shape),
        scale: Number(read('compact.scale', current.coverFrames.compact.scale)),
        positionX: Number(read('compact.positionX', current.coverFrames.compact.positionX)),
        positionY: Number(read('compact.positionY', current.coverFrames.compact.positionY)),
      },
      working: {
        shape: read('working.shape', current.coverFrames.working.shape),
        scale: Number(read('working.scale', current.coverFrames.working.scale)),
        positionX: Number(read('working.positionX', current.coverFrames.working.positionX)),
        positionY: Number(read('working.positionY', current.coverFrames.working.positionY)),
      },
    },
  });
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

    ensureCoverEditorStyles();
    this.elements = {
      addButton, editButton, deleteButton, createSheet, closeCreateButton, createForm,
      typeGrid, titleInput, descriptionInput, createTypeFields, editSheet, closeEditButton,
      editForm, editTitleInput, editDescriptionInput, editTypeFields, hint,
    };
    this.getViewportCenter = getViewportCenter;
    this.selectedType = 'project';
    this.editingCardId = null;
    this.feedbackTimer = null;
    this.coverObjectUrl = null;
    this.coverEditorState = null;
    this.abortController = new AbortController();
    this.coverEditor = this.createCoverEditor();
    this.renderTypeFields(this.elements.createTypeFields, this.selectedType);
    this.bindEvents();
  }

  createCoverEditor() {
    const editor = document.createElement('div');
    editor.className = 'cover-editor';
    editor.hidden = true;
    editor.innerHTML = '<section class="cover-editor-panel"><div class="cover-editor-head"><h2>Настроить фото</h2><button class="cover-editor-close" type="button" aria-label="Закрыть">×</button></div><div class="cover-mode-switch"><button type="button" data-cover-mode="compact" aria-pressed="true">Компактный</button><button type="button" data-cover-mode="working" aria-pressed="false">Рабочий</button></div><div class="cover-preview" data-mode="compact"><img alt="Предпросмотр обложки"><div class="cover-preview-placeholder">Выберите изображение</div></div><div class="cover-controls"><label><span>Форма</span><select data-cover-control="shape"><option value="rounded-square">Мягкий квадрат</option><option value="circle">Круг</option><option value="portrait">Вертикальная</option><option value="landscape">Горизонтальная</option></select></label><label><span>Масштаб</span><input data-cover-control="scale" type="range" min="1" max="3" step="0.05"></label><label><span>Смещение по горизонтали</span><input data-cover-control="positionX" type="range" min="0" max="100" step="1"></label><label><span>Смещение по вертикали</span><input data-cover-control="positionY" type="range" min="0" max="100" step="1"></label></div><div class="cover-editor-actions"><button type="button" data-cover-reset>Сбросить</button><button type="button" class="save" data-cover-save>Сохранить</button></div></section>';
    document.body.append(editor);
    return editor;
  }

  renderTypeFields(container, type, data = {}, view = {}) {
    if (!container) return;
    const typedFields = getNodeFormFields(type)
      .map((definition) => createFieldElement(definition, data[definition.key]));
    const mediaFields = Object.entries(CARD_MEDIA_SLOTS[type] ?? {})
      .map(([slot, config]) => createMediaField(slot, config));
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
    e.createSheet.addEventListener('click', (event) => {
      if (event.target === e.createSheet) this.closeCreate();
    }, { signal });
    e.editSheet.addEventListener('click', (event) => {
      if (event.target === e.editSheet) this.closeEdit();
    }, { signal });
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
      container.addEventListener('click', (event) => {
        const button = event.target.closest('[data-open-cover-editor]');
        if (button) this.openCoverEditor(container, button.dataset.mediaSlotTarget);
      }, { signal });
    }

    e.createForm.addEventListener('submit', (event) => this.submitCreate(event), { signal });
    e.editForm.addEventListener('submit', (event) => this.submitEdit(event), { signal });
    this.coverEditor.querySelector('.cover-editor-close')
      .addEventListener('click', () => this.closeCoverEditor(), { signal });
    this.coverEditor.addEventListener('click', (event) => {
      if (event.target === this.coverEditor) this.closeCoverEditor();
    }, { signal });
    for (const button of this.coverEditor.querySelectorAll('[data-cover-mode]')) {
      button.addEventListener('click', () => this.setCoverEditorMode(button.dataset.coverMode), { signal });
    }
    for (const control of this.coverEditor.querySelectorAll('[data-cover-control]')) {
      control.addEventListener('input', () => this.updateCoverEditorFromControls(), { signal });
    }
    this.coverEditor.querySelector('[data-cover-reset]')
      .addEventListener('click', () => this.resetCoverEditorMode(), { signal });
    this.coverEditor.querySelector('[data-cover-save]')
      .addEventListener('click', () => this.saveCoverEditor(), { signal });
    this.bindCoverPreviewDrag(signal);
  }

  bindCoverPreviewDrag(signal) {
    const preview = this.coverEditor.querySelector('.cover-preview');
    let start = null;
    preview.addEventListener('pointerdown', (event) => {
      if (!this.coverEditorState) return;
      preview.setPointerCapture(event.pointerId);
      const frame = this.coverEditorState.frames[this.coverEditorState.mode];
      start = {
        x: event.clientX,
        y: event.clientY,
        positionX: frame.positionX,
        positionY: frame.positionY,
      };
    }, { signal });
    preview.addEventListener('pointermove', (event) => {
      if (!start || !this.coverEditorState) return;
      const rect = preview.getBoundingClientRect();
      const frame = this.coverEditorState.frames[this.coverEditorState.mode];
      frame.positionX = Math.min(100, Math.max(0, start.positionX - ((event.clientX - start.x) / rect.width) * 100));
      frame.positionY = Math.min(100, Math.max(0, start.positionY - ((event.clientY - start.y) / rect.height) * 100));
      this.syncCoverEditorControls();
      this.renderCoverEditorPreview();
    }, { signal });
    preview.addEventListener('pointerup', () => { start = null; }, { signal });
    preview.addEventListener('pointercancel', () => { start = null; }, { signal });
  }

  async openCoverEditor(container, slot) {
    const view = readViewData(container);
    const input = container.querySelector(`[data-media-slot="${slot}"]`);
    let url = null;
    if (input?.files?.[0]) {
      url = URL.createObjectURL(input.files[0]);
    } else if (this.editingCardId) {
      const card = store.getState().cards[this.editingCardId];
      const mediaId = slot === 'avatar' ? card?.data?.avatarMediaId : card?.data?.coverMediaId;
      if (mediaId) {
        const loaded = await loadMedia(mediaId);
        if (loaded?.blob) url = URL.createObjectURL(loaded.blob);
      }
    }

    if (this.coverObjectUrl) URL.revokeObjectURL(this.coverObjectUrl);
    this.coverObjectUrl = url;
    this.coverEditorState = {
      container,
      mode: 'compact',
      frames: structuredClone(view.coverFrames),
    };
    this.coverEditor.hidden = false;
    this.setCoverEditorMode('compact');
  }

  setCoverEditorMode(mode) {
    if (!this.coverEditorState) return;
    this.coverEditorState.mode = mode;
    for (const button of this.coverEditor.querySelectorAll('[data-cover-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.coverMode === mode));
    }
    this.coverEditor.querySelector('.cover-preview').dataset.mode = mode;
    this.syncCoverEditorControls();
    this.renderCoverEditorPreview();
  }

  syncCoverEditorControls() {
    const frame = this.coverEditorState.frames[this.coverEditorState.mode];
    for (const [key, value] of Object.entries(frame)) {
      const control = this.coverEditor.querySelector(`[data-cover-control="${key}"]`);
      if (control) control.value = String(value);
    }
  }

  updateCoverEditorFromControls() {
    const frame = this.coverEditorState.frames[this.coverEditorState.mode];
    frame.shape = this.coverEditor.querySelector('[data-cover-control="shape"]').value;
    frame.scale = Number(this.coverEditor.querySelector('[data-cover-control="scale"]').value);
    frame.positionX = Number(this.coverEditor.querySelector('[data-cover-control="positionX"]').value);
    frame.positionY = Number(this.coverEditor.querySelector('[data-cover-control="positionY"]').value);
    this.renderCoverEditorPreview();
  }

  renderCoverEditorPreview() {
    const frame = this.coverEditorState.frames[this.coverEditorState.mode];
    const preview = this.coverEditor.querySelector('.cover-preview');
    const image = preview.querySelector('img');
    preview.style.borderRadius = frame.shape === 'circle'
      ? '50%'
      : frame.shape === 'portrait' ? '20px' : '24px';
    if (this.coverObjectUrl) image.src = this.coverObjectUrl;
    else image.removeAttribute('src');
    image.style.transform = `scale(${frame.scale})`;
    image.style.objectPosition = `${frame.positionX}% ${frame.positionY}%`;
  }

  resetCoverEditorMode() {
    this.coverEditorState.frames[this.coverEditorState.mode] = {
      shape: 'rounded-square', scale: 1, positionX: 50, positionY: 50,
    };
    this.syncCoverEditorControls();
    this.renderCoverEditorPreview();
  }

  saveCoverEditor() {
    const { container, frames } = this.coverEditorState;
    for (const mode of ['compact', 'working']) {
      for (const [key, value] of Object.entries(frames[mode])) {
        const input = container.querySelector(`[data-view-field="${mode}.${key}"]`);
        if (input) input.value = String(value);
      }
    }
    this.closeCoverEditor();
  }

  closeCoverEditor() {
    this.coverEditor.hidden = true;
    this.coverEditorState = null;
    if (this.coverObjectUrl) URL.revokeObjectURL(this.coverObjectUrl);
    this.coverObjectUrl = null;
  }

  showFeedback(message, timeout = 1200) {
    clearTimeout(this.feedbackTimer);
    this.elements.hint.textContent = message;
    if (timeout > 0) {
      this.feedbackTimer = setTimeout(() => {
        this.elements.hint.textContent = DEFAULT_HINT;
      }, timeout);
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
    if (!card) {
      this.showFeedback('Сначала выбери карточку');
      return;
    }
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
    if (!card) {
      this.showFeedback('Сначала выбери карточку');
      return;
    }
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
    this.closeCoverEditor();
    this.coverEditor.remove();
    this.abortController.abort();
  }
}

export default NodeController;
