import store from '../state/store.js';
import { GestureMachine } from '../canvas/gesture-machine.js';
import { CardController } from '../canvas/card-controller.js';
import { createLinksRenderer } from '../canvas/links.js';
import { NODE_TYPE_LABELS } from '../domain/node-schemas.js';
import { normalizeNodeView } from '../domain/node.js';
import { updateCardNode } from '../services/node-service.js';
import { cycleCardView } from '../services/card-view-service.js';
import { loadMedia } from '../services/media-service.js';
import { loadWorkspace, saveCamera } from '../services/workspace-service.js';

const STATUS_LABELS = Object.freeze({
  preparation: 'Подготовка', planned: 'Запланировано', active: 'Активно', draft: 'Черновик',
  in_progress: 'В работе', paused: 'На паузе', completed: 'Завершено',
});
const VIEW_LABELS = Object.freeze({ compact: 'Компактно', standard: 'Стандартно', full: 'Полностью' });

function ensureViewStyles() {
  if (document.getElementById('boonwave-card-view-styles')) return;
  const style = document.createElement('style');
  style.id = 'boonwave-card-view-styles';
  style.textContent = `
    .card { overflow:visible; padding-bottom:52px; }
    .card-cover { display:none; overflow:hidden; background:rgba(var(--node-rgb),.12); }
    .card-cover img { width:100%; height:100%; object-fit:cover; transform-origin:center; pointer-events:none; }
    .card-view-button { position:absolute; right:10px; bottom:10px; z-index:4; width:32px; height:32px; padding:0; border:1px solid rgba(var(--node-rgb),.35); border-radius:50%; background:rgba(9,12,25,.72); color:white; display:grid; place-items:center; }
    .card-view-button svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
    .card-full { display:none; margin-top:14px; padding-top:12px; border-top:1px solid rgba(var(--node-rgb),.22); color:var(--bw-text-secondary); font-size:11px; line-height:1.5; white-space:pre-wrap; }
    .card-progress { position:absolute; left:16px; right:52px; bottom:18px; height:5px; border-radius:999px; background:rgba(143,151,184,.18); overflow:hidden; }
    .card-progress > span { display:block; height:100%; width:0; border-radius:inherit; background:linear-gradient(90deg,rgb(var(--bw-brand-violet)),rgb(var(--bw-brand-cyan))); }
    .card[data-view-mode="compact"] { width:132px; min-height:156px; padding:8px 8px 42px; border-radius:26px; }
    .card[data-view-mode="compact"] .card-cover { display:block; width:116px; height:116px; }
    .card[data-view-mode="compact"] .card-head, .card[data-view-mode="compact"] p, .card[data-view-mode="compact"] .card-meta, .card[data-view-mode="compact"] .card-full, .card[data-view-mode="compact"] .card-progress { display:none; }
    .card[data-view-mode="compact"] h2 { margin:8px 2px 2px; font-size:14px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center; }
    .card[data-view-mode="compact"] .card-view-button { right:8px; bottom:8px; }
    .card[data-view-mode="standard"] .card-cover { display:block; width:100%; height:92px; margin:-18px -18px 14px; width:calc(100% + 36px); border-radius:var(--bw-radius-card) var(--bw-radius-card) 0 0; }
    .card[data-view-mode="full"] { width:330px; min-height:250px; }
    .card[data-view-mode="full"] .card-cover { display:block; width:100%; height:150px; margin-bottom:14px; border-radius:18px; }
    .card[data-view-mode="full"] .card-full { display:block; }
    .card[data-cover-shape="rounded-square"] .card-cover { border-radius:24px; }
    .card[data-cover-shape="circle"] .card-cover { border-radius:50%; }
    .card[data-cover-shape="portrait"][data-view-mode="compact"] .card-cover { width:90px; height:116px; margin-inline:auto; border-radius:20px; }
    .card[data-cover-shape="landscape"][data-view-mode="compact"] .card-cover { width:116px; height:82px; margin:17px 0; border-radius:18px; }
  `;
  document.head.append(style);
}

function getNodeMeta(card) {
  const data = card.data ?? {};
  if (card.type === 'project') return [STATUS_LABELS[data.status] ?? data.status, data.address].filter(Boolean);
  if (card.type === 'process' || card.type === 'goal') {
    const progress = Number.isFinite(data.progress) ? `${Math.round(data.progress)}%` : null;
    return [STATUS_LABELS[data.status] ?? data.status, progress].filter(Boolean);
  }
  if (card.type === 'person') return [data.role, data.organization].filter(Boolean);
  if (card.type === 'idea') return [STATUS_LABELS[data.status] ?? data.status, data.category].filter(Boolean);
  return [];
}

function getProgress(card) {
  const value = Number(card.data?.progress);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
}

function getCoverMediaId(card) {
  return card.type === 'person' ? card.data?.avatarMediaId : card.data?.coverMediaId;
}

function getCompactLabel(card, view) {
  return view.compactLabel || String(card.title ?? '').trim().split(/\s+/)[0] || NODE_TYPE_LABELS[card.type];
}

function formatFullData(card) {
  const entries = Object.entries(card.data ?? {})
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .filter(([key]) => !['coverMediaId', 'avatarMediaId', 'images', 'documents', 'files', 'attachments'].includes(key));
  return entries.map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`).join('\n');
}

function collectChangedCardIds(nextCards = {}, previousCards = {}) {
  const ids = new Set([...Object.keys(nextCards), ...Object.keys(previousCards)]);
  return [...ids].filter((id) => nextCards[id] !== previousCards[id]);
}

export class WorkspaceController {
  constructor({ canvas, world, initialSelectedCardId = null }) {
    if (!(canvas instanceof Element) || !(world instanceof Element)) throw new TypeError('WorkspaceController expects canvas and world elements.');
    ensureViewStyles();
    this.canvas = canvas;
    this.world = world;
    this.initialSelectedCardId = initialSelectedCardId;
    this.cardTapHandler = null;
    this.backgroundTapHandler = null;
    this.linkSourceProvider = null;
    this.cameraSaveTimer = null;
    this.gestureMachine = null;
    this.cardController = null;
    this.linksRenderer = null;
    this.unsubscribe = null;
    this.mediaUrls = new Map();
    this.abortController = new AbortController();
  }

  setCardTapHandler(handler) { this.cardTapHandler = typeof handler === 'function' ? handler : null; }
  setBackgroundTapHandler(handler) { this.backgroundTapHandler = typeof handler === 'function' ? handler : null; }
  setLinkSourceProvider(provider) { this.linkSourceProvider = typeof provider === 'function' ? provider : null; }

  async init({ onEmpty } = {}) {
    await loadWorkspace();
    if (Object.keys(store.getState().cards).length === 0 && typeof onEmpty === 'function') {
      await onEmpty();
      await loadWorkspace();
    }
    const cards = store.getState().cards;
    const selectedCardId = this.initialSelectedCardId && cards[this.initialSelectedCardId] ? this.initialSelectedCardId : null;
    store.setState({ selectedCardId });
    this.renderCards();
    this.applyCamera();
    this.mountCore();
    this.bindStore();
    this.bindCanvas();
    return this;
  }

  createCardElement() {
    const element = document.createElement('article');
    element.className = 'card';
    element.innerHTML = '<button class="card-view-button" type="button" aria-label="Изменить вид карточки"><svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg></button><div class="card-cover"><img alt=""></div><div class="card-head"><div class="card-type"></div><div class="card-status"></div></div><h2></h2><p></p><div class="card-meta"></div><div class="card-full"></div><div class="card-progress"><span></span></div>';
    const button = element.querySelector('.card-view-button');
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const cardId = element.dataset.cardId;
      if (cardId) cycleCardView(cardId).catch((error) => console.error('Card view change failed:', error));
    });
    return element;
  }

  async applyCover(element, card, view) {
    const image = element.querySelector('.card-cover img');
    const mediaId = getCoverMediaId(card);
    const frame = view.mode === 'compact' ? view.coverFrames.compact : view.coverFrames.working;
    image.style.transform = `scale(${frame.scale})`;
    image.style.objectPosition = `${frame.positionX}% ${frame.positionY}%`;
    element.dataset.coverShape = frame.shape;
    if (!mediaId) { image.removeAttribute('src'); return; }
    let url = this.mediaUrls.get(mediaId);
    if (!url) {
      const loaded = await loadMedia(mediaId);
      if (!loaded?.blob) return;
      url = URL.createObjectURL(loaded.blob);
      this.mediaUrls.set(mediaId, url);
    }
    if (element.dataset.cardId === card.id) image.src = url;
  }

  updateCardElement(element, card, state, linkSourceId) {
    const meta = getNodeMeta(card);
    const view = normalizeNodeView(card.view);
    const progress = getProgress(card);
    element.dataset.nodeType = card.type;
    element.dataset.viewMode = view.mode;
    element.dataset.selected = String(state.selectedCardId === card.id);
    element.dataset.linkSource = String(linkSourceId === card.id);
    element.style.transform = `translate3d(${card.x}px, ${card.y}px, 0)`;
    element.querySelector('.card-type').textContent = NODE_TYPE_LABELS[card.type] ?? card.type;
    element.querySelector('.card-status').textContent = meta[0] ?? '';
    element.querySelector('h2').textContent = view.mode === 'compact' ? getCompactLabel(card, view) : card.title;
    element.querySelector('p').textContent = card.description;
    element.querySelector('.card-meta').textContent = meta.slice(1).join(' • ');
    element.querySelector('.card-full').textContent = formatFullData(card) || 'Дополнительная информация пока не заполнена';
    element.querySelector('.card-view-button').title = `${VIEW_LABELS[view.mode]}. Нажми для следующего режима`;
    const progressElement = element.querySelector('.card-progress');
    progressElement.hidden = progress === null;
    progressElement.querySelector('span').style.width = `${progress ?? 0}%`;
    this.applyCover(element, card, view).catch((error) => console.error('Cover render failed:', error));
  }

  renderCards(cardIds = null) {
    const state = store.getState();
    const linkSourceId = this.linkSourceProvider?.() ?? null;
    if (cardIds === null) {
      const existing = new Map([...this.world.querySelectorAll('[data-card-id]')].map((element) => [element.dataset.cardId, element]));
      for (const card of Object.values(state.cards)) {
        let element = existing.get(card.id);
        if (!element) { element = this.createCardElement(); element.dataset.cardId = card.id; this.world.append(element); }
        existing.delete(card.id);
        this.updateCardElement(element, card, state, linkSourceId);
      }
      for (const element of existing.values()) element.remove();
      return;
    }
    for (const id of [...new Set(cardIds.filter(Boolean))]) {
      const card = state.cards[id];
      let element = this.world.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
      if (!card) { element?.remove(); continue; }
      if (!element) { element = this.createCardElement(); element.dataset.cardId = card.id; this.world.append(element); }
      this.updateCardElement(element, card, state, linkSourceId);
    }
  }

  applyCamera() { const { camera } = store.getState(); this.world.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`; }
  scheduleCameraSave(camera) { clearTimeout(this.cameraSaveTimer); this.cameraSaveTimer = setTimeout(() => saveCamera(camera).catch((error) => console.error('Camera save failed:', error)), 180); }
  getViewportCenter() { const { camera } = store.getState(); return { x: (window.innerWidth / 2 - camera.x) / camera.zoom - 115, y: (window.innerHeight / 2 - camera.y) / camera.zoom - 69 }; }

  mountCore() {
    this.gestureMachine = new GestureMachine(this.canvas);
    this.cardController = new CardController(this.world, {
      onCommit: (card) => updateCardNode(card.id, { x: card.x, y: card.y }),
      onTap: (card) => this.cardTapHandler?.(card),
    });
    this.linksRenderer = createLinksRenderer(this.world);
  }

  bindStore() {
    this.unsubscribe = store.subscribe((next, previous) => {
      const changedIds = new Set();
      if (next.cards !== previous.cards) for (const id of collectChangedCardIds(next.cards, previous.cards)) changedIds.add(id);
      if (next.selectedCardId !== previous.selectedCardId) {
        if (previous.selectedCardId) changedIds.add(previous.selectedCardId);
        if (next.selectedCardId) changedIds.add(next.selectedCardId);
      }
      if (changedIds.size > 0) this.renderCards([...changedIds]);
      if (next.camera !== previous.camera) { this.applyCamera(); this.scheduleCameraSave(next.camera); }
    });
  }

  bindCanvas() {
    this.canvas.addEventListener('click', (event) => {
      if (event.target.closest('[data-card-id]')) return;
      store.setState({ selectedCardId: null });
      this.backgroundTapHandler?.();
    }, { signal: this.abortController.signal });
  }

  destroy() {
    clearTimeout(this.cameraSaveTimer);
    saveCamera().catch(() => {});
    this.abortController.abort();
    this.unsubscribe?.();
    this.linksRenderer?.destroy();
    this.cardController?.destroy();
    this.gestureMachine?.destroy();
    for (const url of this.mediaUrls.values()) URL.revokeObjectURL(url);
    this.mediaUrls.clear();
  }
}

export default WorkspaceController;
