import store from '../state/store.js';
import storage from '../storage/index.js';

const SIDE_SETTING_KEY = 'utilityRailSide';
const LOCK_SETTING_KEY = 'cardsLocked';
const HOLD_MS = 480;
const SWIPE_THRESHOLD_PX = 28;

export class UtilityRailController {
  constructor({ rail, grip, lockButton, homeButton, hint, onHome } = {}) {
    if (!(rail instanceof Element) || !(grip instanceof HTMLButtonElement) || !(lockButton instanceof HTMLButtonElement) || !(homeButton instanceof HTMLButtonElement)) {
      throw new TypeError('UtilityRailController expects rail, grip, and button elements.');
    }

    this.rail = rail;
    this.grip = grip;
    this.lockButton = lockButton;
    this.homeButton = homeButton;
    this.hint = hint instanceof Element ? hint : null;
    this.onHome = typeof onHome === 'function' ? onHome : null;
    this.feedbackTimer = null;
    this.holdTimer = null;
    this.activePointer = null;
    this.unsubscribe = null;
    this.abortController = new AbortController();
  }

  async init() {
    const [savedSide, savedLock] = await Promise.all([
      storage.loadSetting(SIDE_SETTING_KEY).catch(() => null),
      storage.loadSetting(LOCK_SETTING_KEY).catch(() => null),
    ]);

    this.setSide(savedSide === 'left' ? 'left' : 'right', { persist: false, announce: false });
    store.setState({ cardsLocked: savedLock === true });
    this.bind();
    this.syncLockState(store.getState().cardsLocked);
    this.unsubscribe = store.subscribe((next, previous) => {
      if (next.cardsLocked !== previous.cardsLocked) this.syncLockState(next.cardsLocked);
    });
    return this;
  }

  bind() {
    const signal = this.abortController.signal;

    this.lockButton.addEventListener('click', async () => {
      const previousLocked = Boolean(store.getState().cardsLocked);
      const nextLocked = !previousLocked;
      store.setState({ cardsLocked: nextLocked });
      try {
        await storage.saveSetting(LOCK_SETTING_KEY, nextLocked);
        this.announce(nextLocked
          ? 'Расположение карточек зафиксировано'
          : 'Перемещение карточек разблокировано');
      } catch (error) {
        console.error('Card lock save failed:', error);
        store.setState({ cardsLocked: previousLocked });
        this.announce('Не удалось сохранить состояние замка');
      }
    }, { signal });

    this.homeButton.addEventListener('click', async () => {
      const focused = await this.onHome?.();
      this.announce(focused === false
        ? 'Карточка «Я Есмь» не найдена'
        : 'Возврат к карточке «Я Есмь»');
    }, { signal });

    this.grip.addEventListener('pointerdown', (event) => this.startGrip(event), { signal });
    this.grip.addEventListener('pointermove', (event) => this.moveGrip(event), { signal });
    this.grip.addEventListener('pointerup', (event) => this.endGrip(event), { signal });
    this.grip.addEventListener('pointercancel', (event) => this.endGrip(event), { signal });
    this.grip.addEventListener('click', () => this.mirror(), { signal });
    this.grip.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
  }

  startGrip(event) {
    if (event.button !== undefined && event.button !== 0) return;
    this.clearGrip();
    this.activePointer = {
      pointerId: event.pointerId,
      startX: event.clientX,
      currentX: event.clientX,
      mirrored: false,
    };
    this.grip.setPointerCapture?.(event.pointerId);
    this.holdTimer = setTimeout(() => {
      if (!this.activePointer || this.activePointer.pointerId !== event.pointerId) return;
      this.activePointer.mirrored = true;
      this.mirror();
    }, HOLD_MS);
  }

  moveGrip(event) {
    if (!this.activePointer || this.activePointer.pointerId !== event.pointerId) return;
    this.activePointer.currentX = event.clientX;
    const delta = event.clientX - this.activePointer.startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX || this.activePointer.mirrored) return;
    clearTimeout(this.holdTimer);
    this.activePointer.mirrored = true;
    this.setSide(delta < 0 ? 'left' : 'right', { persist: true, announce: true });
  }

  endGrip(event) {
    if (!this.activePointer || this.activePointer.pointerId !== event.pointerId) return;
    try {
      this.grip.releasePointerCapture?.(event.pointerId);
    } catch {
      // Safari may already have released capture.
    }
    const mirrored = this.activePointer.mirrored;
    this.clearGrip();
    if (mirrored) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  clearGrip() {
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.activePointer = null;
  }

  mirror() {
    const nextSide = this.rail.dataset.side === 'left' ? 'right' : 'left';
    this.setSide(nextSide, { persist: true, announce: true });
    this.rail.dataset.mirrored = 'true';
    setTimeout(() => delete this.rail.dataset.mirrored, 220);
  }

  setSide(side, { persist = true, announce = false } = {}) {
    const normalized = side === 'left' ? 'left' : 'right';
    this.rail.dataset.side = normalized;
    this.rail.setAttribute('aria-label', `Управление одной рукой, ${normalized === 'left' ? 'слева' : 'справа'}`);
    if (persist) {
      storage.saveSetting(SIDE_SETTING_KEY, normalized).catch((error) => {
        console.error('Utility rail side save failed:', error);
      });
    }
    if (announce) this.announce(`Панель перенесена ${normalized === 'left' ? 'влево' : 'вправо'}`);
  }

  syncLockState(locked) {
    const isLocked = Boolean(locked);
    this.lockButton.setAttribute('aria-pressed', String(isLocked));
    this.lockButton.dataset.lockState = isLocked ? 'locked' : 'unlocked';
    this.lockButton.setAttribute('aria-label', isLocked
      ? 'Разблокировать перемещение карточек'
      : 'Зафиксировать расположение карточек');
    this.lockButton.title = isLocked
      ? 'Карточки зафиксированы'
      : 'Карточки можно перемещать';
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
    this.clearGrip();
    this.unsubscribe?.();
    this.abortController.abort();
  }
}

export default UtilityRailController;
