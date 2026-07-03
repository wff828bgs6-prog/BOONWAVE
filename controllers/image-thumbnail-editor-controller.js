function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image preview could not be loaded.'));
    image.src = src;
  });
}

function makeFileName(file, shape) {
  const base = String(file?.name || 'thumbnail').replace(/\.[^.]+$/, '');
  return `${base}-${shape}-thumbnail.jpg`;
}

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function midpoint(a, b) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

const SHAPES = Object.freeze({
  square: { label: 'Квадратная', width: 512, height: 512, aspect: '1 / 1' },
  wide: { label: 'Прямоугольная', width: 768, height: 432, aspect: '16 / 9' },
});

function normalizeCrop(crop = {}) {
  return {
    scale: clamp(Number(crop.scale ?? 1), 0.8, 4),
    x: clamp(Number(crop.x ?? 0), -100, 100),
    y: clamp(Number(crop.y ?? 0), -100, 100),
  };
}

export class ImageThumbnailEditorController {
  constructor({ title = 'Настройка миниатюры' } = {}) {
    this.titleText = title;
    this.abortController = new AbortController();
    this.resolve = null;
    this.reject = null;
    this.file = null;
    this.image = null;
    this.imageSrc = '';
    this.activeShape = 'square';
    this.states = { square: normalizeCrop(), wide: normalizeCrop() };
    this.pointerMap = new Map();
    this.gesture = null;
    this.build();
    this.bind();
  }

  get state() {
    return this.states[this.activeShape];
  }

  set state(value) {
    this.states[this.activeShape] = normalizeCrop(value);
  }

  build() {
    this.overlay = document.createElement('section');
    this.overlay.className = 'thumbnail-editor';
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');

    this.panel = document.createElement('div');
    this.panel.className = 'thumbnail-editor__panel';

    const head = document.createElement('div');
    head.className = 'thumbnail-editor__head';
    this.title = document.createElement('h2');
    this.title.textContent = this.titleText;
    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.textContent = '×';
    this.closeButton.setAttribute('aria-label', 'Закрыть настройку миниатюры');
    head.append(this.title, this.closeButton);

    this.shapeSwitch = document.createElement('div');
    this.shapeSwitch.className = 'thumbnail-editor__shape-switch';
    this.shapeButtons = {};
    for (const [shape, config] of Object.entries(SHAPES)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = config.label;
      button.dataset.shape = shape;
      this.shapeButtons[shape] = button;
      this.shapeSwitch.append(button);
    }

    this.preview = document.createElement('div');
    this.preview.className = 'thumbnail-editor__preview';
    this.previewInner = document.createElement('div');
    this.previewInner.className = 'thumbnail-editor__preview-inner';
    this.previewImage = document.createElement('img');
    this.previewImage.alt = '';
    this.previewInner.append(this.previewImage);
    this.preview.append(this.previewInner);

    const hint = document.createElement('p');
    hint.className = 'thumbnail-editor__hint';
    hint.textContent = 'Настрой квадратную и прямоугольную миниатюры. Двигай фото пальцем, масштабируй двумя пальцами.';

    const controls = document.createElement('div');
    controls.className = 'thumbnail-editor__controls';
    this.zoom = this.range('Масштаб', '0.8', '4', '0.01', '1');
    this.x = this.range('Сдвиг по горизонтали', '-100', '100', '1', '0');
    this.y = this.range('Сдвиг по вертикали', '-100', '100', '1', '0');
    controls.append(this.zoom.wrapper, this.x.wrapper, this.y.wrapper);

    const actions = document.createElement('div');
    actions.className = 'thumbnail-editor__actions';
    this.cancelButton = document.createElement('button');
    this.cancelButton.type = 'button';
    this.cancelButton.textContent = 'Отменить';
    this.confirmButton = document.createElement('button');
    this.confirmButton.type = 'button';
    this.confirmButton.className = 'thumbnail-editor__confirm';
    this.confirmButton.textContent = 'Сохранить миниатюры';
    actions.append(this.cancelButton, this.confirmButton);

    this.panel.append(head, this.shapeSwitch, this.preview, hint, controls, actions);
    this.overlay.append(this.panel);
    document.body.append(this.overlay);
  }

  range(label, min, max, step, value) {
    const wrapper = document.createElement('label');
    wrapper.className = 'thumbnail-editor__range';
    const caption = document.createElement('span');
    caption.textContent = label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    wrapper.append(caption, input);
    return { wrapper, input };
  }

  bind() {
    const signal = this.abortController.signal;
    this.closeButton.addEventListener('click', () => this.cancel(), { signal });
    this.cancelButton.addEventListener('click', () => this.cancel(), { signal });
    this.confirmButton.addEventListener('click', () => this.confirm(), { signal });
    this.zoom.input.addEventListener('input', () => this.syncFromControls(), { signal });
    this.x.input.addEventListener('input', () => this.syncFromControls(), { signal });
    this.y.input.addEventListener('input', () => this.syncFromControls(), { signal });
    for (const [shape, button] of Object.entries(this.shapeButtons)) {
      button.addEventListener('click', () => this.setShape(shape), { signal });
    }
    this.preview.addEventListener('pointerdown', (event) => this.onPointerDown(event), { signal });
    this.preview.addEventListener('pointermove', (event) => this.onPointerMove(event), { signal });
    this.preview.addEventListener('pointerup', (event) => this.onPointerEnd(event), { signal });
    this.preview.addEventListener('pointercancel', (event) => this.onPointerEnd(event), { signal });
  }

  async open(file, options = {}) {
    if (!file) return null;
    this.file = file;
    this.imageSrc = await readFileAsDataUrl(file);
    this.image = await loadImage(this.imageSrc);
    const crops = options.crops && typeof options.crops === 'object' ? options.crops : {};
    this.states = {
      square: normalizeCrop(crops.square ?? options.crop),
      wide: normalizeCrop(crops.wide ?? options.crop),
    };
    this.previewImage.src = this.imageSrc;
    this.setShape('square');
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  setShape(shape) {
    if (!SHAPES[shape]) return;
    this.activeShape = shape;
    this.preview.dataset.shape = shape;
    this.preview.style.aspectRatio = SHAPES[shape].aspect;
    for (const [key, button] of Object.entries(this.shapeButtons)) button.dataset.active = String(key === shape);
    this.syncControlsFromState();
    this.applyPreview();
  }

  syncFromControls() {
    this.states[this.activeShape] = normalizeCrop({
      scale: this.zoom.input.value,
      x: this.x.input.value,
      y: this.y.input.value,
    });
    this.applyPreview();
  }

  syncControlsFromState() {
    this.zoom.input.value = String(this.state.scale);
    this.x.input.value = String(this.state.x);
    this.y.input.value = String(this.state.y);
  }

  applyPreview() {
    this.previewImage.style.transform = `translate(${this.state.x}%, ${this.state.y}%) scale(${this.state.scale})`;
  }

  onPointerDown(event) {
    this.preview.setPointerCapture?.(event.pointerId);
    this.pointerMap.set(event.pointerId, event);
    if (this.pointerMap.size === 1) {
      this.gesture = { type: 'pan', start: event, initial: { ...this.state } };
    } else if (this.pointerMap.size >= 2) {
      const points = [...this.pointerMap.values()].slice(0, 2);
      this.gesture = {
        type: 'pinch',
        startDistance: distance(points[0], points[1]),
        startMidpoint: midpoint(points[0], points[1]),
        initial: { ...this.state },
      };
    }
  }

  onPointerMove(event) {
    if (!this.pointerMap.has(event.pointerId)) return;
    this.pointerMap.set(event.pointerId, event);
    if (!this.gesture) return;
    const rect = this.preview.getBoundingClientRect();
    const nextState = { ...this.state };
    if (this.gesture.type === 'pan' && this.pointerMap.size === 1) {
      const dx = ((event.clientX - this.gesture.start.clientX) / rect.width) * 100;
      const dy = ((event.clientY - this.gesture.start.clientY) / rect.height) * 100;
      nextState.x = this.gesture.initial.x + dx;
      nextState.y = this.gesture.initial.y + dy;
    } else if (this.pointerMap.size >= 2) {
      const points = [...this.pointerMap.values()].slice(0, 2);
      const nextDistance = distance(points[0], points[1]);
      const nextMidpoint = midpoint(points[0], points[1]);
      const ratio = this.gesture.startDistance ? nextDistance / this.gesture.startDistance : 1;
      nextState.scale = this.gesture.initial.scale * ratio;
      nextState.x = this.gesture.initial.x + ((nextMidpoint.x - this.gesture.startMidpoint.x) / rect.width) * 100;
      nextState.y = this.gesture.initial.y + ((nextMidpoint.y - this.gesture.startMidpoint.y) / rect.height) * 100;
    }
    this.state = nextState;
    this.syncControlsFromState();
    this.applyPreview();
  }

  onPointerEnd(event) {
    this.pointerMap.delete(event.pointerId);
    if (this.pointerMap.size === 0) {
      this.gesture = null;
      return;
    }
    const points = [...this.pointerMap.values()];
    if (points.length === 1) this.gesture = { type: 'pan', start: points[0], initial: { ...this.state } };
  }

  cancel() {
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.resolve?.(null);
    this.cleanup();
  }

  async confirm() {
    try {
      const squareFile = await this.renderCroppedFile('square');
      const wideFile = await this.renderCroppedFile('wide');
      this.overlay.hidden = true;
      this.overlay.setAttribute('aria-hidden', 'true');
      this.resolve?.({
        file: squareFile,
        previewUrl: URL.createObjectURL(squareFile),
        crop: { ...this.states.square, outputSize: SHAPES.square.width, shape: 'square' },
        square: { file: squareFile, crop: { ...this.states.square, outputSize: SHAPES.square.width, shape: 'square' } },
        wide: { file: wideFile, previewUrl: URL.createObjectURL(wideFile), crop: { ...this.states.wide, width: SHAPES.wide.width, height: SHAPES.wide.height, shape: 'wide' } },
        crops: {
          square: { ...this.states.square, outputSize: SHAPES.square.width, shape: 'square' },
          wide: { ...this.states.wide, width: SHAPES.wide.width, height: SHAPES.wide.height, shape: 'wide' },
        },
      });
    } catch (error) {
      this.reject?.(error);
    } finally {
      this.cleanup();
    }
  }

  async renderCroppedFile(shape = 'square') {
    const config = SHAPES[shape] ?? SHAPES.square;
    const state = this.states[shape] ?? this.states.square;
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#050816';
    context.fillRect(0, 0, config.width, config.height);
    context.save();
    context.beginPath();
    context.rect(0, 0, config.width, config.height);
    context.clip();

    const image = this.image;
    const coverScale = Math.max(config.width / image.naturalWidth, config.height / image.naturalHeight);
    const scale = coverScale * clamp(state.scale, 0.8, 4);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const x = (config.width - drawWidth) / 2 + (state.x / 100) * config.width;
    const y = (config.height - drawHeight) / 2 + (state.y / 100) * config.height;
    context.drawImage(image, x, y, drawWidth, drawHeight);
    context.restore();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('Thumbnail could not be created.');
    return new File([blob], makeFileName(this.file, shape), { type: 'image/jpeg' });
  }

  cleanup() {
    this.pointerMap.clear();
    this.gesture = null;
    this.resolve = null;
    this.reject = null;
    this.file = null;
    this.image = null;
    this.imageSrc = '';
  }

  destroy() {
    this.abortController.abort();
    this.overlay.remove();
  }
}

export default ImageThumbnailEditorController;
