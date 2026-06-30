import { normalizeNodeView } from '../domain/node.js';

const TRANSITION_MS = 220;

function ensureFocusStyles() {
  if (document.getElementById('boonwave-card-focus-styles')) return;
  const style = document.createElement('style');
  style.id = 'boonwave-card-focus-styles';
  style.textContent = `
    .card, .card * { -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; }
    .card-focus-overlay[hidden] { display:none; }
    .card-focus-overlay { position:fixed; inset:0; z-index:120; display:grid; place-items:center; padding:max(76px,calc(env(safe-area-inset-top) + 62px)) 18px max(24px,calc(env(safe-area-inset-bottom) + 16px)); }
    .card-focus-backdrop { position:absolute; inset:0; width:100%; height:100%; padding:0; border:0; background:rgba(4,6,16,.68); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); opacity:0; transition:opacity ${TRANSITION_MS}ms ease; }
    .card-focus-stage { --focus-from-x:0px; --focus-from-y:0px; --focus-from-scale:.72; position:relative; z-index:1; max-width:100%; max-height:100%; opacity:0; transform:translate3d(var(--focus-from-x),var(--focus-from-y),0) scale(var(--focus-from-scale)); transform-origin:center; transition:transform ${TRANSITION_MS}ms cubic-bezier(.2,.78,.22,1),opacity ${TRANSITION_MS}ms ease; will-change:transform,opacity; }
    .card-focus-overlay.is-visible .card-focus-backdrop { opacity:1; }
    .card-focus-overlay.is-visible .card-focus-stage { opacity:1; transform:translate3d(0,0,0) scale(1); }
    .card-focus-close { position:absolute; top:-14px; right:-14px; z-index:8; width:44px; height:44px; padding:0; border:1px solid rgba(255,255,255,.18); border-radius:50%; background:rgba(11,14,29,.94); color:#fff; display:grid; place-items:center; font-size:25px; line-height:1; box-shadow:0 12px 32px rgba(0,0,0,.36); }
    .card-focus-overlay .card-focus-copy.card { position:relative!important; inset:auto!important; width:min(86vw,340px)!important; max-width:340px; max-height:calc(100svh - 150px); margin:0; overflow:auto; transform:none!important; z-index:1; box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 42px rgba(var(--node-rgb),.24),inset 0 1px 0 rgba(255,255,255,.08); }
    .card-focus-overlay .card-focus-copy.card[data-view-mode="standard"] { min-height:180px; }
    .card-focus-overlay .card-focus-copy.card .card-view-button { z-index:7; }
    .card-focus-overlay[data-mode="fullscreen"] { padding:max(58px,calc(env(safe-area-inset-top) + 44px)) 10px max(12px,env(safe-area-inset-bottom)); }
    .card-focus-overlay[data-mode="fullscreen"] .card-focus-stage { width:100%; height:100%; display:grid; place-items:center; }
    .card-focus-overlay[data-mode="fullscreen"] .card-focus-copy.card { width:min(100%,520px)!important; max-width:520px; max-height:100%; border-radius:28px; }
    .card-focus-overlay[data-mode="fullscreen"] .card-focus-close { top:4px; right:4px; }
    .card-focus-overlay[data-mode="fullscreen"] .card-focus-copy .card-view-button { display:none; }
    @media (prefers-reduced-motion:reduce) {
      .card-focus-backdrop,.card-focus-stage { transition:none!important; }
      .card-focus-stage { transform:none!important; }
    }
  `;
  document.head.append(style);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function prepareClone(card, sourceElement, fullscreen) {
  const clone = sourceElement.cloneNode(true);
  clone.classList.add('card-focus-copy');
  clone.removeAttribute('data-card-id');
  clone.removeAttribute('aria-keyshortcuts');
  clone.dataset.selected = 'false';
  clone.dataset.linkSource = 'false';
  clone.dataset.viewMode = fullscreen ? 'full' : 'standard';
  clone.tabIndex = -1;
  clone.setAttribute('role', 'document');
  clone.setAttribute('aria-label', `${card.title}. Режим фокуса`);

  const heading = clone.querySelector('h2');
  if (heading) heading.textContent = card.title;

  const view = normalizeNodeView(card.view);
  const frame = view.coverFrames.working;
  const image = clone.querySelector('.card-cover img');
  if (image) {
    image.style.transform = `scale(${frame.scale})`;
    image.style.objectPosition = `${frame.positionX}% ${frame.positionY}%`;
  }
  clone.dataset.coverShape = frame.shape;

  const eyeButton = clone.querySelector('.card-view-button');
  if (eyeButton) {
    eyeButton.setAttribute('aria-label', 'Открыть карточку на весь экран');
    eyeButton.title = 'Открыть карточку на весь экран';
  }

  return clone;
}

export class CardFocusController {
  constructor({ root = document.body, appShell = document.querySelector('.app-shell') } = {}) {
    if (!(root instanceof Element)) throw new TypeError('CardFocusController expects a root element.');
    ensureFocusStyles();
    this.root = root;
    this.appShell = appShell instanceof Element ? appShell : null;
    this.overlay = null;
    this.stage = null;
    this.content = null;
    this.closeButton = null;
    this.sourceElement = null;
    this.activeCardId = null;
    this.previousActiveElement = null;
    this.closeTimer = null;
    this.openToken = 0;
    this.abortController = new AbortController();
    this.createOverlay();
  }

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'card-focus-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <button class="card-focus-backdrop" type="button" aria-label="Закрыть режим фокуса"></button>
      <section class="card-focus-stage" role="dialog" aria-modal="true" aria-label="Карточка в режиме фокуса">
        <button class="card-focus-close" type="button" aria-label="Закрыть">×</button>
        <div class="card-focus-content"></div>
      </section>
    `;
    this.root.append(overlay);
    this.overlay = overlay;
    this.stage = overlay.querySelector('.card-focus-stage');
    this.content = overlay.querySelector('.card-focus-content');
    this.closeButton = overlay.querySelector('.card-focus-close');

    const signal = this.abortController.signal;
    overlay.querySelector('.card-focus-backdrop').addEventListener('click', () => this.close(), { signal });
    this.closeButton.addEventListener('click', () => this.close(), { signal });
    this.stage.addEventListener('click', (event) => event.stopPropagation(), { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) {
        event.preventDefault();
        this.close();
      }
    }, { signal });
  }

  isOpen() {
    return Boolean(this.activeCardId && !this.overlay.hidden);
  }

  open(card, sourceElement, { fullscreen = false } = {}) {
    if (!card || !(sourceElement instanceof Element)) return false;
    clearTimeout(this.closeTimer);
    this.openToken += 1;
    const token = this.openToken;
    const sourceRect = sourceElement.getBoundingClientRect();

    this.activeCardId = card.id;
    this.sourceElement = sourceElement;
    this.previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.content.replaceChildren(prepareClone(card, sourceElement, fullscreen));
    this.overlay.dataset.mode = fullscreen ? 'fullscreen' : 'focus';
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.remove('is-visible');
    if (this.appShell) this.appShell.inert = true;

    const copy = this.content.querySelector('.card-focus-copy');
    const eyeButton = copy?.querySelector('.card-view-button');
    eyeButton?.addEventListener('pointerdown', (event) => event.stopPropagation());
    eyeButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.enterFullscreen();
    });
    copy?.addEventListener('dblclick', (event) => {
      event.preventDefault();
      this.enterFullscreen();
    });

    const targetRect = this.stage.getBoundingClientRect();
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const scale = clamp(sourceRect.width / Math.max(targetRect.width, 1), 0.16, 1.08);
    this.stage.style.setProperty('--focus-from-x', `${sourceCenterX - targetCenterX}px`);
    this.stage.style.setProperty('--focus-from-y', `${sourceCenterY - targetCenterY}px`);
    this.stage.style.setProperty('--focus-from-scale', String(scale));

    requestAnimationFrame(() => {
      if (token !== this.openToken || this.overlay.hidden) return;
      this.overlay.classList.add('is-visible');
      this.closeButton.focus({ preventScroll: true });
    });
    return true;
  }

  enterFullscreen() {
    if (!this.isOpen() || this.overlay.dataset.mode === 'fullscreen') return;
    const copy = this.content.querySelector('.card-focus-copy');
    this.overlay.dataset.mode = 'fullscreen';
    if (copy) copy.dataset.viewMode = 'full';
    this.closeButton.focus({ preventScroll: true });
  }

  close({ immediate = false } = {}) {
    if (!this.isOpen()) return;
    clearTimeout(this.closeTimer);
    this.openToken += 1;
    this.overlay.classList.remove('is-visible');

    const finish = () => {
      this.overlay.hidden = true;
      this.overlay.setAttribute('aria-hidden', 'true');
      this.overlay.dataset.mode = 'focus';
      this.content.replaceChildren();
      this.activeCardId = null;
      this.sourceElement = null;
      if (this.appShell) this.appShell.inert = false;
      this.previousActiveElement?.focus?.({ preventScroll: true });
      this.previousActiveElement = null;
    };

    if (immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    this.closeTimer = setTimeout(finish, TRANSITION_MS);
  }

  destroy() {
    clearTimeout(this.closeTimer);
    this.close({ immediate: true });
    this.abortController.abort();
    this.overlay?.remove();
  }
}

export default CardFocusController;
