import store from '../state/store.js';
import storage from '../storage/index.js';

const SIDE_SETTING_KEY = 'utilityRailSide';
const LONG_PRESS_MS = 520;
const MOVE_TOLERANCE_PX = 9;

function distance(start, current) {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

export class UtilityRailController {
  constructor({ rail, lockButton, homeButton, hint, onHome } = {}) {
    if (!(rail instanceof Element) || !(lockButton instanceof HTMLButtonElement) || !(homeButton instanceof HTMLButtonElement)) {
      throw new TypeError('UtilityRailController expects rail and button elements.');
    }

    this.rail = rail;
    this.lockButton = lockButton;
    this.homeButton = homeButton;
    this.hint = hint instanceof Element ? hint : null;
    this.onHome = typeof onHome === 'function' ? onHome : null;
    this.longPressTimer = null;
    this.feedbackTimer = null;
    this.activePointer = null;
    this.suppressNextClick = false;
    this.unsubscribe = null;
    this.abortController = new AbortController();
  }

  async init() {
    const savedSide = await storage.loadSetting(SIDE_SETTING_KEY).catch(() => null);
    this.setSide(savedSide === 'left' ? 'left' : 'right', { persist: false, announce: false });
    this.bind();
    this.syncLockState(store.getState().cardsLocked);
    this.unsubscribe = store.subscribe((next, previous) => {
      if (next.cardsLocked !== previous.cardsLocked) this.syncLockState(next.cardsLocked);
    });
    return this;
  }

  bind() {
    const signal = this.abortController.signal;

    this.lockButton.addEventListener('click', (event) => {
      if (this.consumeSuppressedClick(event)) return;
      const nextLocked = !store.getState().cardsLocked;
      store.setState({ cardsLocked: nextLocked });
      this.announce(nextLocked
        ? 'Расположение карточек зафиксировано'
        : 'Перемещение карточек разблокировано');
    }, { signal });

    this.homeButton.addEventListener('click', async (event) => {
      if (this.consumeSuppressedClick(event)) return;
      const focused = await this.onHome?.();
      this.announce(focused === false
        ? 'Карточка «Я Есмь» не найдена'
        : 'Возврат к карточке «Я Есмь»');
    }, { signal });

    for (const button of [this.lockButton, this.homeButton]) {
      button.addEventListener('pointerdown', (event) => this.startLongPress(event), { signal });
      button.addEventListener('pointermove', (event) => this.moveLongPress(event), { signal });
      button.addEventListener('pointerup', (event) => this.endLongPress(event), { signal });
      button.addEventListener('pointercancel', (event) => this.endLongPress(event), { signal });
      button.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
    }
  }

  releaseActivePointer() {
    const active = this.activePointer;
    if (!active) return;
    try {
      if (!active.button.hasPointerCapture || active.button.hasPointerCapture(active.pointerId)) {
        active.button.releasePointerCapture?.(active.pointerId);
      }
    } catch {
      // Capture may already be released by Safari.
    }
  }

  startLongPress(event) {
    if (event.button !== undefined && event.button !== 0) return;
    this.clearLongPress();
    this.activePointer = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      button: event.currentTarget,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    this.longPressTimer = setTimeout(() => {
      if (!this.activePointer || this.activePointer.pointerId !== event.pointerId) return;
      this.suppressNextClick = true;
      this.releaseActivePointer();
      const nextSide = this.rail.dataset.side === 'left' ? 'right' : 'left';
      this.setSide(nextSide, { persist: true, announce: true });
      this.rail.dataset.mirrored = 'true';
      setTimeout(() => delete this.rail.dataset.mirrored, 260);
      this.clearLongPress();
    }, LONG_PRESS_MS);
  }

  moveLongPress(event) {
    if (!this.activePointer || this.activePointer.pointerId !== event.pointerId) return;
    if (distance(this.activePointer, { x: event.clientX, y: event.clientY }) > MOVE_TOLERANCE_PX) {
      this.releaseActivePointer();
      this.clearLongPress();
    }
  }

  endLongPress(event) {
    if (!this.activePointer || this.activePointer.pointerId !== event.pointerId) return;
    this.releaseActivePointer();
    this.clearLongPress();
  }

  clearLongPress() {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
    this.activePointer = null;
  }

  consumeSuppressedClick(event) {
    if (!this.suppressNextClick) return false;
    this.suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  setSide(side, { persist = true, announce = false } = {}) {
    const normalized = side === 'left' ? 'left' : 'right';
    this.rail.dataset.side = normalized;
    this.rail.setAttribute('aria-label', `Быстрые действия, ${normalized === 'left' ? 'слева' : 'справа'}`);
    if (persist) storage.saveSetting(SIDE_SETTING_KEY, normalized).catch((error) => {
      console.error('Utility rail side save failed:', error);
    });
    if (announce) this.announce(`Панель перенесена ${normalized === 'left' ? 'влево' : 'вправо'}`);
  }

  syncLockState(locked) {
    this.lockButton.setAttribute('aria-pressed', String(Boolean(locked)));
    this.lockButton.setAttribute('aria-label', locked
      ? 'Разблокировать перемещение карточек'
      : 'Зафиксировать расположение карточек');
    this.lockButton.title = locked
      ? 'Карточки зафиксированы'
      : 'Зафиксировать карточки';
  }

  announce(message) {
    if (!this.hint) return;
    clearTimeout(this.feedbackTimer);
    this.hint.textContent = message;
    this.feedbackTimer = setTimeout(() => {
      this.hint.textContent = 'Выбери карточку';
    }, 1700);
  }

  destroy() {
    clearTimeout(this.feedbackTimer);
    this.releaseActivePointer();
    this.clearLongPress();
    this.unsubscribe?.();
    this.abortController.abort();
  }
}

export default UtilityRailController;
