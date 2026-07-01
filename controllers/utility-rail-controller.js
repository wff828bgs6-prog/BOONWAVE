import store from '../state/store.js';
import storage from '../storage/index.js';

const POSITION_SETTING_KEY = 'utilityRailPosition';
const LEGACY_SIDE_SETTING_KEY = 'utilityRailSide';
const LOCK_SETTING_KEY = 'cardsLocked';
const VALID_POSITIONS = new Set(['right', 'left', 'bottom']);

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

    this.setPosition(initialPosition, { persist: false, announce: false });
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

    for (const button of this.positionButtons) {
      button.addEventListener('click', () => {
        const position = button.dataset.railPosition;
        if (VALID_POSITIONS.has(position)) this.setPosition(position, { persist: true, announce: true });
      }, { signal });
    }
  }

  setPosition(position, { persist = true, announce = false } = {}) {
    const normalized = VALID_POSITIONS.has(position) ? position : 'right';
    this.rail.dataset.position = normalized;
    this.rail.removeAttribute('data-side');
    const label = normalized === 'bottom'
      ? 'Управление одной рукой, снизу'
      : `Управление одной рукой, ${normalized === 'left' ? 'слева' : 'справа'}`;
    this.rail.setAttribute('aria-label', label);

    for (const button of this.positionButtons) {
      const active = button.dataset.railPosition === normalized;
      button.setAttribute('aria-pressed', String(active));
    }

    this.onPositionChange?.(normalized);

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
    this.unsubscribe?.();
    this.abortController.abort();
  }
}

export default UtilityRailController;
