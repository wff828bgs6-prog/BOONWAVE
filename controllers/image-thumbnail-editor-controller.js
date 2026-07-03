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

function makeFileName(file) {
  const base = String(file?.name || 'thumbnail').replace(/\.[^.]+$/, '');
  return `${base}-thumbnail.jpg`;
}

export class ImageThumbnailEditorController {
  constructor({ title = 'Настройка миниатюры', outputSize = 512 } = {}) {
    this.titleText = title;
    this.outputSize = outputSize;
    this.abortController = new AbortController();
    this.resolve = null;
    this.reject = null;
    this.file = null;
    this.image = null;
    this.imageSrc = '';
    this.state = { scale: 1, x: 0, y: 0 };
    this.build();
    this.bind();
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

    this.preview = document.createElement('div');
    this.preview.className = 'thumbnail-editor__preview';
    this.previewInner = document.createElement('div');
    this.previewInner.className = 'thumbnail-editor__preview-inner';
    this.previewImage = document.createElement('img');
    this.previewImage.alt = '';
    this.previewInner.append(this.previewImage);
    this.preview.append(this.previewInner);

    const controls = document.createElement('div');
    controls.className = 'thumbnail-editor__controls';
    this.zoom = this.range('Масштаб', '0.8', '3', '0.01', '1');
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
    this.confirmButton.textContent = 'Подтвердить миниатюру';
    actions.append(this.cancelButton, this.confirmButton);

    this.panel.append(head, this.preview, controls, actions);
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
  }

  async open(file) {
    if (!file) return null;
    this.file = file;
    this.imageSrc = await readFileAsDataUrl(file);
    this.image = await loadImage(this.imageSrc);
    this.state = { scale: 1, x: 0, y: 0 };
    this.zoom.input.value = '1';
    this.x.input.value = '0';
    this.y.input.value = '0';
    this.previewImage.src = this.imageSrc;
    this.applyPreview();
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  syncFromControls() {
    this.state.scale = Number(this.zoom.input.value);
    this.state.x = Number(this.x.input.value);
    this.state.y = Number(this.y.input.value);
    this.applyPreview();
  }

  applyPreview() {
    this.previewImage.style.transform = `translate(${this.state.x}%, ${this.state.y}%) scale(${this.state.scale})`;
  }

  cancel() {
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.resolve?.(null);
    this.cleanup();
  }

  async confirm() {
    try {
      const file = await this.renderCroppedFile();
      this.overlay.hidden = true;
      this.overlay.setAttribute('aria-hidden', 'true');
      this.resolve?.({ file, previewUrl: URL.createObjectURL(file) });
    } catch (error) {
      this.reject?.(error);
    } finally {
      this.cleanup();
    }
  }

  async renderCroppedFile() {
    const canvas = document.createElement('canvas');
    canvas.width = this.outputSize;
    canvas.height = this.outputSize;
    const context = canvas.getContext('2d');
    const size = this.outputSize;
    context.fillStyle = '#050816';
    context.fillRect(0, 0, size, size);
    context.save();
    context.beginPath();
    context.rect(0, 0, size, size);
    context.clip();

    const image = this.image;
    const coverScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const scale = coverScale * clamp(this.state.scale, 0.8, 3);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const x = (size - drawWidth) / 2 + (this.state.x / 100) * size;
    const y = (size - drawHeight) / 2 + (this.state.y / 100) * size;
    context.drawImage(image, x, y, drawWidth, drawHeight);
    context.restore();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('Thumbnail could not be created.');
    return new File([blob], makeFileName(this.file), { type: 'image/jpeg' });
  }

  cleanup() {
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
