import store from '../state/store.js';
import { isArchivedCard } from '../services/archive-service.js';

export class ArchiveWorkspaceFilter {
  constructor({ root = document } = {}) {
    this.root = root;
    this.unsubscribe = null;
    this.frameId = null;
    this.observer = typeof MutationObserver === 'function'
      ? new MutationObserver(() => this.schedule())
      : null;
  }

  init() {
    this.unsubscribe = store.subscribe((next, previous) => {
      if (next.cards !== previous.cards || next.links !== previous.links) this.schedule();
    });
    this.observer?.observe(this.root.body ?? this.root, { childList: true, subtree: true });
    this.schedule();
    return this;
  }

  schedule() {
    if (this.frameId !== null) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.apply();
    });
  }

  apply() {
    const state = store.getState();
    const archivedIds = new Set(Object.values(state.cards ?? {}).filter(isArchivedCard).map((card) => card.id));

    for (const element of this.root.querySelectorAll('[data-card-id]')) {
      const archived = archivedIds.has(element.dataset.cardId);
      element.dataset.archived = String(archived);
      element.style.display = archived ? 'none' : '';
      element.setAttribute('aria-hidden', String(archived));
    }

    for (const element of this.root.querySelectorAll('[data-link-id]')) {
      const sourceId = element.getAttribute('data-source-id');
      const targetId = element.getAttribute('data-target-id');
      const archived = archivedIds.has(sourceId) || archivedIds.has(targetId);
      element.dataset.archived = String(archived);
      element.style.display = archived ? 'none' : '';
    }

    if (state.selectedCardId && archivedIds.has(state.selectedCardId)) {
      store.setState({ selectedCardId: null });
    }
  }

  destroy() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.unsubscribe?.();
    this.observer?.disconnect();
  }
}

export default ArchiveWorkspaceFilter;
