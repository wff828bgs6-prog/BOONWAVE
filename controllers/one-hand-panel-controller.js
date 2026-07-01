export class OneHandPanelController {
  constructor({ openButton, sheet, closeButton } = {}) {
    if (!(openButton instanceof HTMLButtonElement) || !(sheet instanceof Element) || !(closeButton instanceof HTMLButtonElement)) {
      throw new TypeError('OneHandPanelController expects an open button, sheet, and close button.');
    }

    this.openButton = openButton;
    this.sheet = sheet;
    this.closeButton = closeButton;
    this.abortController = new AbortController();
    this.bind();
  }

  bind() {
    const signal = this.abortController.signal;
    this.openButton.addEventListener('click', () => this.open(), { signal });
    this.closeButton.addEventListener('click', () => this.close(), { signal });
    this.sheet.addEventListener('click', (event) => {
      if (event.target === this.sheet) this.close();
      if (event.target.closest('[data-close-tools-after-action]')) this.close();
    }, { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.sheet.hidden) this.close();
    }, { signal });
  }

  open() {
    this.sheet.hidden = false;
    this.sheet.setAttribute('aria-hidden', 'false');
    this.openButton.setAttribute('aria-expanded', 'true');
    this.closeButton.focus({ preventScroll: true });
  }

  close() {
    this.sheet.hidden = true;
    this.sheet.setAttribute('aria-hidden', 'true');
    this.openButton.setAttribute('aria-expanded', 'false');
  }

  destroy() {
    this.abortController.abort();
  }
}

export default OneHandPanelController;
