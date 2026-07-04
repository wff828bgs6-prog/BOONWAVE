import store from '../state/store.js';
import { archiveCardNode, deleteCardNode } from '../services/node-service.js';
import { loadMedia } from '../services/media-service.js';
import { selectProcessStage, addProcessStage, addProcessTask } from '../services/work-process-service.js';
import { createCardDetailV3 } from '../ui/card-detail-v3-presenter.js';

const TRANSITION_MS = 300;
const OPEN_GUARD_MS = 140;

function ensureStylesheet() {
  if (document.querySelector('link[data-bw-v3-detail-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles/card-detail-v3.css';
  link.dataset.bwV3DetailStyle = 'true';
  document.head.append(link);
}

function confirmDelete(card) {
  return window.confirm(`Удалить карточку «${card.title}»? Это действие удалит её связи.`);
}

export class CardDetailController {
  constructor({ root = document.body, onEdit, onDisplay, onMessage } = {}) {
    if (!(root instanceof Element)) throw new TypeError('CardDetailController expects a root element.');
    ensureStylesheet();
    this.root = root;
    this.onEdit = typeof onEdit === 'function' ? onEdit : null;
    this.onDisplay = typeof onDisplay === 'function' ? onDisplay : null;
    this.onMessage = typeof onMessage === 'function' ? onMessage : null;
    this.phase = 'closed';
    this.activeCardId = null;
    this.openedAt = 0;
    this.closeTimer = null;
    this.mediaUrls = new Map();
    this.abortController = new AbortController();
    this.createOverlay();
  }

  createOverlay() {
    const overlay = document.createElement('section');
    overlay.className = 'bw-v3-detail';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<button class="bw-v3-detail__backdrop" type="button" aria-label="Закрыть карточку"></button><div class="bw-v3-detail__stage" role="dialog" aria-modal="true" aria-label="Карточка BOONWAVE"><button class="bw-v3-detail__close" type="button" aria-label="Закрыть">×</button><div class="bw-v3-detail__content"></div></div>';
    this.root.append(overlay);
    this.overlay = overlay;
    this.stage = overlay.querySelector('.bw-v3-detail__stage');
    this.content = overlay.querySelector('.bw-v3-detail__content');
    this.closeButton = overlay.querySelector('.bw-v3-detail__close');
    const signal = this.abortController.signal;
    overlay.querySelector('.bw-v3-detail__backdrop').addEventListener('click', () => {
      if (performance.now() - this.openedAt < OPEN_GUARD_MS) return;
      this.close();
    }, { signal });
    this.closeButton.addEventListener('click', () => this.close(), { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) this.close();
    }, { signal });
  }

  isOpen() {
    return this.phase !== 'closed';
  }

  get activeCard() {
    return this.activeCardId ? store.getState().cards[this.activeCardId] ?? null : null;
  }

  showMessage(message) {
    if (this.onMessage) this.onMessage(message);
    const hint = document.getElementById('hint');
    if (hint) hint.textContent = message;
  }

  render(card) {
    this.revokeMediaUrls();
    this.activeCardId = card.id;
    const element = createCardDetailV3(card, { cards: store.getState().cards });
    this.content.replaceChildren(element);
    this.content.scrollTop = 0;
    this.bindActions();
    this.hydrateMediaImages().catch((error) => console.error('V3 detail media hydrate failed:', error));
  }

  async hydrateMediaImages() {
    const images = [...this.content.querySelectorAll('img[data-v3-media-id]')];
    for (const image of images) {
      const mediaId = image.dataset.v3MediaId;
      if (!mediaId || this.mediaUrls.has(mediaId)) {
        if (mediaId && this.mediaUrls.has(mediaId)) image.src = this.mediaUrls.get(mediaId);
        continue;
      }
      const loaded = await loadMedia(mediaId);
      if (!loaded?.blob || !this.isOpen()) continue;
      const url = URL.createObjectURL(loaded.blob);
      this.mediaUrls.set(mediaId, url);
      this.content.querySelectorAll(`img[data-v3-media-id="${CSS.escape(mediaId)}"]`).forEach((item) => { item.src = url; });
    }
  }

  bindActions() {
    this.content.querySelectorAll('[data-v3-open-card]').forEach((button) => {
      button.addEventListener('click', () => this.openById(button.dataset.v3OpenCard));
    });
    this.content.querySelectorAll('[data-v3-edit]').forEach((button) => {
      button.addEventListener('click', () => this.runEdit());
    });
    this.content.querySelectorAll('[data-v3-display]').forEach((button) => {
      button.addEventListener('click', () => this.runDisplay());
    });
    this.content.querySelectorAll('[data-v3-archive]').forEach((button) => {
      button.addEventListener('click', () => this.archiveActive());
    });
    this.content.querySelectorAll('[data-v3-delete]').forEach((button) => {
      button.addEventListener('click', () => this.deleteActive());
    });
    this.content.querySelectorAll('[data-v3-stage-id]').forEach((button) => {
      button.addEventListener('click', () => this.selectStage(button.dataset.v3StageId));
    });
    this.content.querySelectorAll('[data-v3-action]').forEach((button) => {
      button.addEventListener('click', () => this.handleAction(button.dataset.v3Action));
    });
  }

  open(card) {
    if (!card || this.phase !== 'closed') return false;
    clearTimeout(this.closeTimer);
    this.phase = 'opening';
    this.render(card);
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      if (this.phase !== 'opening') return;
      this.openedAt = performance.now();
      this.overlay.classList.add('is-visible');
      document.documentElement.classList.add('card-detail-active');
      this.phase = 'open';
      this.closeButton.focus({ preventScroll: true });
    });
    return true;
  }

  openById(cardId) {
    const card = store.getState().cards[cardId];
    if (!card) return false;
    this.render(card);
    return true;
  }

  rerender() {
    const card = this.activeCard;
    if (card) this.render(card);
  }

  runEdit() {
    const card = this.activeCard;
    if (!card || !this.onEdit) return false;
    this.close({ immediate: true });
    this.onEdit(card);
    return true;
  }

  runDisplay() {
    const card = this.activeCard;
    if (!card || !this.onDisplay) return false;
    this.close({ immediate: true });
    this.onDisplay(card);
    return true;
  }

  async archiveActive() {
    const card = this.activeCard;
    if (!card) return false;
    try {
      await archiveCardNode(card.id);
      this.close({ immediate: true });
      this.showMessage('Карточка перемещена в архив');
      return true;
    } catch (error) {
      console.error('V3 archive failed:', error);
      this.showMessage('Не удалось переместить карточку в архив');
      return false;
    }
  }

  async deleteActive() {
    const card = this.activeCard;
    if (!card || !confirmDelete(card)) return false;
    try {
      await deleteCardNode(card.id);
      this.close({ immediate: true });
      this.showMessage('Карточка удалена');
      return true;
    } catch (error) {
      console.error('V3 delete failed:', error);
      this.showMessage('Не удалось удалить карточку');
      return false;
    }
  }

  async selectStage(stageId) {
    const card = this.activeCard;
    if (!card || card.type !== 'process' || !stageId) return false;
    try {
      await selectProcessStage(card.id, stageId);
      this.rerender();
      this.showMessage('Этап выбран');
      return true;
    } catch (error) {
      console.error('V3 stage select failed:', error);
      this.showMessage('Не удалось выбрать этап');
      return false;
    }
  }

  async handleAction(action) {
    const card = this.activeCard;
    if (!card) return false;
    try {
      if (card.type === 'process' && action === 'add-stage') {
        await addProcessStage(card.id, { title: `Новый этап ${(card.data?.stages?.length ?? 0) + 1}` });
        this.rerender();
        this.showMessage('Этап добавлен');
        return true;
      }
      if (card.type === 'process' && action === 'add-task') {
        const selectedStageId = card.data?.selectedStageId || activeStageId(card);
        if (!selectedStageId) {
          this.showMessage('Сначала добавь этап');
          return false;
        }
        await addProcessTask(card.id, { title: `Новая задача ${(card.data?.tasks?.length ?? 0) + 1}`, stageId: selectedStageId });
        this.rerender();
        this.showMessage('Задача добавлена');
        return true;
      }
      this.showMessage('Действие будет подключено в следующем проходе');
      return false;
    } catch (error) {
      console.error('V3 action failed:', error);
      this.showMessage('Действие не выполнено');
      return false;
    }
  }

  close({ immediate = false } = {}) {
    if (this.phase === 'closed' || this.phase === 'closing') return;
    clearTimeout(this.closeTimer);
    document.documentElement.classList.remove('card-detail-active');
    this.overlay.classList.remove('is-visible');
    this.phase = 'closing';
    if (immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.finishClose();
      return;
    }
    this.closeTimer = setTimeout(() => this.finishClose(), TRANSITION_MS);
  }

  finishClose() {
    this.phase = 'closed';
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.activeCardId = null;
    this.content.replaceChildren();
    this.revokeMediaUrls();
  }

  revokeMediaUrls() {
    for (const url of this.mediaUrls.values()) URL.revokeObjectURL(url);
    this.mediaUrls.clear();
  }

  destroy() {
    clearTimeout(this.closeTimer);
    this.abortController.abort();
    this.revokeMediaUrls();
    this.overlay.remove();
    document.documentElement.classList.remove('card-detail-active');
  }
}

function activeStageId(card) {
  return (card.data?.stages ?? []).find((stage) => (stage.lifecycleStatus ?? 'active') === 'active')?.id ?? null;
}

export default CardDetailController;
