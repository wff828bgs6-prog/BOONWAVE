import { normalizeNodeView } from '../domain/node.js';

const TRANSITION_MS = 300;
const BACKDROP_GUARD_MS = 140;

function ensureStyles() {
  if (document.getElementById('boonwave-card-detail-styles-v2')) return;
  const style = document.createElement('style');
  style.id = 'boonwave-card-detail-styles-v2';
  style.textContent = `.card-detail-overlay[hidden]{display:none}.card-detail-overlay{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:max(58px,calc(env(safe-area-inset-top) + 44px)) 18px max(18px,calc(env(safe-area-inset-bottom) + 12px));touch-action:none}.card-detail-overlay:not(.is-visible){pointer-events:none}.card-detail-backdrop{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:rgba(4,6,16,.66);opacity:0;transition:opacity 240ms ease-out}.card-detail-stage{--detail-from-x:0px;--detail-from-y:0px;--detail-from-scale-x:.72;--detail-from-scale-y:.72;position:relative;z-index:1;width:min(100%,520px);max-height:100%;opacity:0;pointer-events:none;transform:translate3d(var(--detail-from-x),var(--detail-from-y),0) scale(var(--detail-from-scale-x),var(--detail-from-scale-y));transform-origin:center;transition:transform ${TRANSITION_MS}ms cubic-bezier(.16,1,.3,1),opacity 240ms ease-out;will-change:transform,opacity}.card-detail-content,.card-detail-close{pointer-events:auto}.card-detail-overlay.is-visible .card-detail-backdrop{opacity:1}.card-detail-overlay.is-visible .card-detail-stage{opacity:1;transform:translate3d(0,0,0) scale(1,1)}.card-detail-close{position:absolute;top:-12px;right:-12px;z-index:8;width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(11,14,29,.94);color:#fff;display:grid;place-items:center;font-size:25px;box-shadow:0 12px 32px rgba(0,0,0,.36)}.card-detail-copy.card{position:relative!important;inset:auto!important;width:100%!important;max-width:none;max-height:calc(100svh - 96px);margin:0;overflow:auto;transform:none!important;z-index:1;border-radius:28px;box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 42px rgba(var(--node-rgb),.24);-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}.card-detail-copy.card img{pointer-events:auto}.card-detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(var(--node-rgb),.22)}.card-detail-actions button{min-height:48px;border:1px solid rgba(var(--node-rgb),.32);border-radius:15px;background:rgba(9,12,25,.72);color:var(--bw-text-primary);font-weight:700}.card-detail-actions button:last-child{background:linear-gradient(135deg,rgba(var(--bw-brand-violet),.28),rgba(var(--bw-brand-cyan),.18))}@media(prefers-reduced-motion:reduce){.card-detail-backdrop,.card-detail-stage{transition:none!important}.card-detail-stage{transform:none!important}}`;
  document.head.append(style);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function prepareClone(card, source) {
  const clone = source.cloneNode(true);
  clone.classList.add('card-detail-copy');
  clone.removeAttribute('data-card-id');
  clone.removeAttribute('aria-keyshortcuts');
  clone.dataset.selected = 'false';
  clone.dataset.linkSource = 'false';
  clone.dataset.viewMode = 'detail';
  clone.tabIndex = -1;
  clone.setAttribute('role', 'document');
  clone.setAttribute('aria-label', `${card.title}. Полная карточка`);
  for (const key of ['Cover', 'Type', 'Status', 'Title', 'Description', 'Meta', 'Progress']) {
    clone.dataset[`show${key}`] = 'true';
  }
  const heading = clone.querySelector('h2');
  if (heading) heading.textContent = card.title;
  const frame = normalizeNodeView(card.view).coverFrames.working;
  const image = clone.querySelector('.card-cover img');
  if (image) {
    image.style.transform = `scale(${frame.scale})`;
    image.style.objectPosition = `${frame.positionX}% ${frame.positionY}%`;
  }
  clone.dataset.coverShape = frame.shape;
  clone.querySelectorAll('button').forEach((button) => button.remove());
  const actions = document.createElement('div');
  actions.className = 'card-detail-actions';
  actions.innerHTML = '<button type="button" data-detail-edit>Редактировать</button><button type="button" data-detail-display>Формат отображения</button>';
  clone.append(actions);
  return clone;
}

export class CardDetailController {
  constructor({ root = document.body, onEdit, onDisplay } = {}) {
    if (!(root instanceof Element)) throw new TypeError('CardDetailController expects a root element.');
    ensureStyles();
    this.root = root;
    this.onEdit = typeof onEdit === 'function' ? onEdit : null;
    this.onDisplay = typeof onDisplay === 'function' ? onDisplay : null;
    this.activeCard = null;
    this.sourceElement = null;
    this.phase = 'closed';
    this.closeTimer = null;
    this.openFrame = null;
    this.revealFrame = null;
    this.openedAt = 0;
    this.abortController = new AbortController();
    this.createOverlay();
  }

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'card-detail-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<button class="card-detail-backdrop" type="button" aria-label="Закрыть карточку"></button><section class="card-detail-stage" role="dialog" aria-modal="true" aria-label="Полная карточка"><button class="card-detail-close" type="button" aria-label="Закрыть">×</button><div class="card-detail-content"></div></section>';
    this.root.append(overlay);
    this.overlay = overlay;
    this.stage = overlay.querySelector('.card-detail-stage');
    this.content = overlay.querySelector('.card-detail-content');
    this.closeButton = overlay.querySelector('.card-detail-close');
    const signal = this.abortController.signal;
    overlay.querySelector('.card-detail-backdrop').addEventListener('click', () => {
      if (performance.now() - this.openedAt < BACKDROP_GUARD_MS) return;
      this.close();
    }, { signal });
    this.closeButton.addEventListener('click', () => this.close(), { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) this.close();
    }, { signal });
  }

  isOpen() {
    return this.phase === 'scheduled' || this.phase === 'opening' || this.phase === 'open';
  }

  getSourceRect() {
    if (!this.sourceElement?.isConnected) return null;
    const rect = this.sourceElement.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  }

  setTransform(rect) {
    const target = this.stage.getBoundingClientRect();
    if (!rect || target.width <= 0 || target.height <= 0) return;
    this.stage.style.setProperty('--detail-from-x', `${rect.left + rect.width / 2 - (target.left + target.width / 2)}px`);
    this.stage.style.setProperty('--detail-from-y', `${rect.top + rect.height / 2 - (target.top + target.height / 2)}px`);
    this.stage.style.setProperty('--detail-from-scale-x', String(clamp(rect.width / target.width, .08, 1.2)));
    this.stage.style.setProperty('--detail-from-scale-y', String(clamp(rect.height / target.height, .08, 1.2)));
  }

  open(card, source) {
    if (!card || !(source instanceof Element) || this.phase !== 'closed') return false;
    clearTimeout(this.closeTimer);
    this.phase = 'scheduled';
    this.activeCard = card;
    this.sourceElement = source;
    this.content.replaceChildren(prepareClone(card, source));

    this.openFrame = requestAnimationFrame(() => {
      this.openFrame = null;
      if (this.phase !== 'scheduled') return;
      this.phase = 'opening';
      this.overlay.hidden = false;
      this.overlay.setAttribute('aria-hidden', 'false');
      this.overlay.classList.remove('is-visible');
      this.setTransform(source.getBoundingClientRect());
      this.content.querySelector('[data-detail-edit]').addEventListener('click', () => this.runAction(this.onEdit), { once: true });
      this.content.querySelector('[data-detail-display]').addEventListener('click', () => this.runAction(this.onDisplay), { once: true });

      this.revealFrame = requestAnimationFrame(() => {
        this.revealFrame = null;
        if (this.phase !== 'opening') return;
        this.openedAt = performance.now();
        this.overlay.classList.add('is-visible');
        document.documentElement.classList.add('card-detail-active');
        this.phase = 'open';
        this.closeButton.focus({ preventScroll: true });
      });
    });
    return true;
  }

  runAction(handler) {
    const card = this.activeCard;
    if (!card || !handler) return;
    this.close({ immediate: true });
    handler(card);
  }

  finishClose() {
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.content.replaceChildren();
    this.activeCard = null;
    this.sourceElement = null;
    this.openedAt = 0;
    this.phase = 'closed';
    document.documentElement.classList.remove('card-detail-active');
  }

  close({ immediate = false } = {}) {
    if (this.phase === 'closed' || this.phase === 'closing') return;
    clearTimeout(this.closeTimer);
    if (this.openFrame !== null) {
      cancelAnimationFrame(this.openFrame);
      this.openFrame = null;
    }
    if (this.revealFrame !== null) {
      cancelAnimationFrame(this.revealFrame);
      this.revealFrame = null;
    }

    document.documentElement.classList.remove('card-detail-active');
    if (this.phase === 'scheduled') {
      this.finishClose();
      return;
    }

    this.phase = 'closing';
    this.setTransform(this.getSourceRect());
    this.overlay.classList.remove('is-visible');
    if (immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.finishClose();
      return;
    }
    this.closeTimer = setTimeout(() => this.finishClose(), TRANSITION_MS);
  }

  destroy() {
    clearTimeout(this.closeTimer);
    if (this.openFrame !== null) cancelAnimationFrame(this.openFrame);
    if (this.revealFrame !== null) cancelAnimationFrame(this.revealFrame);
    this.finishClose();
    this.abortController.abort();
    this.overlay.remove();
  }
}

export default CardDetailController;
