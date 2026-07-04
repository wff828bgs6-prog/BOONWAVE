import store from '../state/store.js';
import storage from '../storage/index.js';

const POSITION_SETTING_KEY = 'utilityRailPosition';
const LEGACY_SIDE_SETTING_KEY = 'utilityRailSide';
const LOCK_SETTING_KEY = 'cardsLocked';
const VALID_POSITIONS = new Set(['right', 'left', 'bottom']);
const GHOST_FADE_OUT_MS = 308;
const REAL_FADE_IN_MS = 376;
const PANEL_FADE_EASING = 'cubic-bezier(.37,0,.63,1)';
const PANEL_FADE_FLOOR = '0.08';
const THUMB_HIDDEN_CLASS = 'is-zoom-thumb-hidden';
const THUMB_APPEARING_CLASS = 'is-zoom-thumb-appearing';
const THUMB_REVEAL_DELAY_MS = 36;
const THUMB_REVEAL_END_MS = 316;

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
    this.switchTimer = null;
    this.switchEndTimer = null;
    this.thumbRevealTimer = null;
    this.thumbRevealEndTimer = null;
    this.transitionGhost = null;
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

  removeTransitionGhost() {
    this.transitionGhost?.remove();
    this.transitionGhost = null;
  }

  clearThumbTimers() {
    clearTimeout(this.thumbRevealTimer);
    clearTimeout(this.thumbRevealEndTimer);
    this.thumbRevealTimer = null;
    this.thumbRevealEndTimer = null;
  }

  hideZoomThumbEarly(target = this.rail) {
    target?.classList?.remove(THUMB_APPEARING_CLASS);
    target?.classList?.add(THUMB_HIDDEN_CLASS);
  }

  revealZoomThumbLate() {
    this.rail.classList.remove(THUMB_APPEARING_CLASS);
    this.rail.classList.add(THUMB_HIDDEN_CLASS);
    this.thumbRevealTimer = setTimeout(() => {
      this.rail.classList.add(THUMB_APPEARING_CLASS);
      this.rail.classList.remove(THUMB_HIDDEN_CLASS);
      this.thumbRevealEndTimer = setTimeout(() => {
        this.rail.classList.remove(THUMB_APPEARING_CLASS);
      }, THUMB_REVEAL_END_MS);
    }, THUMB_REVEAL_DELAY_MS);
  }

  resetPanelStyles() {
    this.rail.classList.remove('is-position-transitioning', 'is-position-fading', 'is-position-visible', 'is-switching-position', THUMB_HIDDEN_CLASS, THUMB_APPEARING_CLASS);
    this.rail.style.removeProperty('display');
    this.rail.style.removeProperty('visibility');
    this.rail.style.removeProperty('opacity');
    this.rail.style.removeProperty('transition');
    this.rail.style.setProperty('transform', 'none', 'important');
  }

  syncGhostLockIcons(ghost) {
    const lockButton = ghost.querySelector('.rail-lock');
    if (!(lockButton instanceof HTMLElement)) return;
    const locked = lockButton.getAttribute('aria-pressed') === 'true';
    const closed = lockButton.querySelector('.lock-closed');
    const open = lockButton.querySelector('.lock-open');
    if (closed instanceof HTMLElement) closed.style.setProperty('display', locked ? 'block' : 'none', 'important');
    if (open instanceof HTMLElement) open.style.setProperty('display', locked ? 'none' : 'block', 'important');
  }

  createTransitionGhost() {
    const rect = this.rail.getBoundingClientRect();
    const ghost = this.rail.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.classList.add('rail-transition-ghost');
    this.hideZoomThumbEarly(ghost);
    ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    ghost.querySelectorAll('button,input').forEach((element) => {
      element.setAttribute('tabindex', '-1');
      element.setAttribute('disabled', 'true');
    });
    this.syncGhostLockIcons(ghost);
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      opacity: '1',
      transform: 'none',
      pointerEvents: 'none',
    });
    ghost.style.setProperty('transition', `opacity ${GHOST_FADE_OUT_MS}ms ${PANEL_FADE_EASING}`, 'important');
    document.body.append(ghost);
    this.transitionGhost = ghost;
    return ghost;
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

  setPosition(position, { persist = true, announce = false, animate = false } = {}) {
    const normalized = VALID_POSITIONS.has(position) ? position : 'right';
    const current = this.rail.dataset.position;
    clearTimeout(this.switchTimer);
    clearTimeout(this.switchEndTimer);
    this.clearThumbTimers();
    this.removeTransitionGhost();

    if (animate && current !== normalized) {
      this.resetPanelStyles();
      this.hideZoomThumbEarly(this.rail);
      const ghost = this.createTransitionGhost();

      this.rail.style.visibility = 'hidden';
      this.rail.style.opacity = PANEL_FADE_FLOOR;
      this.rail.style.setProperty('transition', 'none', 'important');
      this.applyPosition(normalized);
      this.rail.offsetHeight;

      requestAnimationFrame(() => {
        ghost.style.opacity = PANEL_FADE_FLOOR;
      });

      this.switchTimer = setTimeout(() => {
        this.removeTransitionGhost();
        this.rail.style.visibility = 'visible';
        this.rail.style.opacity = PANEL_FADE_FLOOR;
        this.rail.style.setProperty('transition', `opacity ${REAL_FADE_IN_MS}ms ${PANEL_FADE_EASING}`, 'important');
        this.rail.offsetHeight;
        requestAnimationFrame(() => {
          this.rail.style.opacity = '1';
          this.revealZoomThumbLate();
        });
        this.switchEndTimer = setTimeout(() => {
          this.resetPanelStyles();
        }, REAL_FADE_IN_MS + THUMB_REVEAL_DELAY_MS + THUMB_REVEAL_END_MS + 68);
      }, GHOST_FADE_OUT_MS + 51);
    } else {
      this.resetPanelStyles();
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
    clearTimeout(this.switchTimer);
    clearTimeout(this.switchEndTimer);
    this.clearThumbTimers();
    this.removeTransitionGhost();
    this.resetPanelStyles();
    this.unsubscribe?.();
    this.abortController.abort();
  }
}

export default UtilityRailController;
