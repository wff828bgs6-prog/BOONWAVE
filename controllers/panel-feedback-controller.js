const FEEDBACK_SELECTOR = [
  '.one-hand-rail .rail-button',
  '.tools-action',
  '.rail-position-button',
  '.archive-row-restore',
  '.tools-close',
  '.archive-close',
].join(',');

const FEEDBACK_CLASS = 'bw-press-feedback';
const FEEDBACK_DURATION_MS = 620;
const VIBRATION_PATTERN = 8;

function canUseHaptics() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function triggerHaptic() {
  if (!canUseHaptics()) return;
  try {
    navigator.vibrate(VIBRATION_PATTERN);
  } catch {
    // Haptics are optional. Unsupported browsers should silently fall back to visual feedback.
  }
}

export class PanelFeedbackController {
  constructor({ root = document } = {}) {
    this.root = root;
    this.abortController = new AbortController();
    this.timers = new WeakMap();
  }

  init() {
    this.root.addEventListener('pointerdown', (event) => {
      const button = event.target.closest(FEEDBACK_SELECTOR);
      if (!(button instanceof HTMLElement) || button.disabled) return;
      this.play(button);
    }, { signal: this.abortController.signal, passive: true });
    return this;
  }

  clear(button) {
    const previousTimer = this.timers.get(button);
    clearTimeout(previousTimer);
    button.classList.remove(FEEDBACK_CLASS);
  }

  play(button) {
    triggerHaptic();
    this.clear(button);
    void button.offsetWidth;
    button.classList.add(FEEDBACK_CLASS);

    const timer = setTimeout(() => button.classList.remove(FEEDBACK_CLASS), FEEDBACK_DURATION_MS);
    this.timers.set(button, timer);
  }

  destroy() {
    this.abortController.abort();
  }
}

export default PanelFeedbackController;
