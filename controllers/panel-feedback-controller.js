const FEEDBACK_SELECTOR = [
  '.one-hand-rail .rail-button',
  '.tools-action',
  '.rail-position-button',
  '.archive-row-restore',
  '.tools-close',
  '.archive-close',
].join(',');

const FEEDBACK_CLASS = 'bw-press-feedback';
const FEEDBACK_DURATION_MS = 280;
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

function shouldSkipVisualFeedback(button) {
  const rail = button.closest('.one-hand-rail');
  return rail instanceof HTMLElement
    && rail.dataset.position === 'bottom'
    && button.classList.contains('rail-button');
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

  play(button) {
    triggerHaptic();
    if (shouldSkipVisualFeedback(button)) return;

    button.classList.remove(FEEDBACK_CLASS);
    void button.offsetWidth;
    button.classList.add(FEEDBACK_CLASS);

    const previousTimer = this.timers.get(button);
    clearTimeout(previousTimer);
    const timer = setTimeout(() => button.classList.remove(FEEDBACK_CLASS), FEEDBACK_DURATION_MS);
    this.timers.set(button, timer);
  }

  destroy() {
    this.abortController.abort();
  }
}

export default PanelFeedbackController;
