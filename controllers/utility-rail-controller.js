import store from '../state/store.js';
import storage from '../storage/index.js';

const POSITION_SETTING_KEY = 'utilityRailPosition';
const LEGACY_SIDE_SETTING_KEY = 'utilityRailSide';
const LOCK_SETTING_KEY = 'cardsLocked';
const VALID_POSITIONS = new Set(['right', 'left', 'bottom']);
const POSITION_FADE_OUT_MS = 500;
const POSITION_FADE_IN_MS = 500;

export class UtilityRailController {
  constructor({ rail, lockButton, homeButton, positionButtons = [], hint, onHome, onPositionChange } = {}) {
    if (!(rail instanceof Element) || !(lockButton instanceof HTMLButtonElement) || !(homeButton instanceof HTMLButtonElement)) {
      throw new TypeError('UtilityRailController expects a rail and its primary buttons.');
    }

    this.rail = rail;
    this.lockButton = lockButton;
    this.homeButton = homeButton;
    this.positionButtons = [...positionButtons].filter((button) => button instanceof HTMLButtonElement);
    this.hint = hint instanceof Element ? hint : null;
    this.onHome = typeof onHome === 'function' ? onHome : null;
    this.onPositionChange = typeof onPositionChange === 'function' ? onPositionChange : null;
    this.feedbackTimer = null;
    this.positionTimer = null;
    this.positionEndTimer = null;
    this.unsubscribe = null;
    this.abortController = new AbortController();
  }

  async init() {
    const [savedPosition, legacySide, savedLock] = await Promise.all([
      storage.loadSetting(POSITION_SETTING_KEY).catch(() => null),
      storage.loadSetting(LEGACY_SIDE_SETTING_KEY).catch(() => null),
      storage.loadSetting(LOCK_SETTING_KEY).catch(() => null),
    ]);

    const initialPosition = VALID_POSITIONS.has(savedPosition)
      ? savedPosition
      : legacySide === 'left' ? 'left' : 'right';

    this.setPosition(initialPosition, { persist: false, announce: false, animate: false });
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
          ? 'Карточки зафиксированы'
          : 'Карточки можно перемещать');
      } catch (error) {
        console.error('Card lock save failed:', error);
        store.setState({ cardsLocked: previousLocked });
        this.announce('Не удалось сохранить состояние замка');
      }
    }, { signal });

    this.homeButton.addEventListener('click', async () => {
      const focused = await this.onHome?.();
      this.announce(focused === false
        ? 'Главный обзор пока не настроен'
        : 'Возврат к главному обзору');
    }, { signal });

    for (const button of this.positionButtons) {
      button.addEventListener('click', () => {
        const position = button.dataset.railPosition;
        if (VALID_POSITIONS.has(position)) this.setPosition(position, { persist: true, announce: true, animate: true });
      }, { signal });
    }
  }

  applyPosition(position) {
    const normalized = VALID_POSITIONS.has(position) ? position : 'right';
    this.rail.dataset.position = normalized;
    this.rail.removeAttribute('data-side');
    const label = normalized === 'bottom'
      ? 'Панель управления, снизу'
      : `Панель управления, ${normalized === 'left' ? 'слева' : 'справа'}`;
    this.rail.setAttribute('aria-label', label);

    for (const button of this.positionButtons) {
      const active = button.dataset.railPosition === normalized;
      button.setAttribute('aria-pressed', String(active));
    }

    this.onPositionChange?.(normalized);
    return normalized;
  }

  clearTransitionClasses() {
    this.rail.classList.remove('is-position-transitioning', 'is-position-fading', 'is-position-visible');
  }

  setPosition(position, { persist = true, announce = false, animate = false } = {}) {
    const normalized = VALID_POSITIONS.has(position) ? position : 'right';
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    clearTimeout(this.positionTimer);
    clearTimeout(this.positionEndTimer);

    if (animate && !reduceMotion && this.rail.dataset.position !== normalized) {
      this.clearTransitionClasses();
      requestAnimationFrame(() => {
        this.rail.classList.add('is-position-fading');
        this.positionTimer = setTimeout(() => {
          this.applyPosition(normalized);
          this.rail.classList.remove('is-position-fading');
          this.rail.classList.add('is-position-visible');
          this.positionEndTimer = setTimeout(() => {
            this.rail.classList.remove('is-position-visible');
          }, POSITION_FADE_IN_MS);
        }, POSITION_FADE_OUT_MS);
      });
    } else {
      this.clearTransitionClasses();
      this.applyPosition(normalized);
    }

    if (persist) {
      storage.saveSetting(POSITION_SETTING_KEY, normalized).catch((error) => {
        console.error('Utility rail position save failed:', error);
      });
    }

    if (announce) {
      const message = normalized === 'bottom'
        ? 'Панель перемещена вниз'
        : `Панель перемещена ${normalized === 'left' ? 'влево' : 'вправо'}`;
      this.announce(message);
    }
  }

  syncLockState(locked) {
    const isLocked = Boolean(locked);
    this.lockButton.setAttribute('aria-pressed', String(isLocked));
    this.lockButton.dataset.lockState = isLocked ? 'locked' : 'unlocked';
    this.lockButton.setAttribute('aria-label', isLocked
      ? 'Карточки зафиксированы'
      : 'Карточки можно перемещать');
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
    clearTimeout(this.positionTimer);
    clearTimeout(this.positionEndTimer);
    this.unsubscribe?.();
    this.abortController.abort();
  }
}

export default UtilityRailController;
