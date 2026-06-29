import store from '../state/store.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LAYER_ID = 'boonwave-links-layer';

const asFinite = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

export const resolveCardRect = (card = {}, measuredSize = {}) => {
  const x = asFinite(card.x ?? card.position?.x);
  const y = asFinite(card.y ?? card.position?.y);
  const width = Math.max(asFinite(measuredSize.width, asFinite(card.width ?? card.size?.width, 220)), 1);
  const height = Math.max(asFinite(measuredSize.height, asFinite(card.height ?? card.size?.height, 140)), 1);

  return { x, y, width, height };
};

const getEndpointId = (link, side) => {
  const candidates = side === 'source'
    ? [link.sourceId, link.fromId, link.source, link.from, link.startCardId]
    : [link.targetId, link.toId, link.target, link.to, link.endCardId];

  return candidates.find((value) => typeof value === 'string' && value.length > 0) ?? null;
};

export const getAnchor = (fromRect, toRect) => {
  const fromCenter = {
    x: fromRect.x + fromRect.width / 2,
    y: fromRect.y + fromRect.height / 2,
  };
  const toCenter = {
    x: toRect.x + toRect.width / 2,
    y: toRect.y + toRect.height / 2,
  };

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const halfWidth = fromRect.width / 2;
  const halfHeight = fromRect.height / 2;

  if (dx === 0 && dy === 0) return fromCenter;

  const scale = 1 / Math.max(
    Math.abs(dx) / Math.max(halfWidth, 1),
    Math.abs(dy) / Math.max(halfHeight, 1),
  );

  return {
    x: fromCenter.x + dx * scale,
    y: fromCenter.y + dy * scale,
  };
};

export const createPathData = (start, end) => {
  const dx = end.x - start.x;
  const curve = Math.max(48, Math.abs(dx) * 0.45);
  const direction = dx >= 0 ? 1 : -1;
  const c1x = start.x + curve * direction;
  const c2x = end.x - curve * direction;

  return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
};

const createSvgElement = (name, attributes = {}) => {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
};

function collectChangedCardIds(nextCards = {}, previousCards = {}) {
  const ids = new Set([...Object.keys(nextCards), ...Object.keys(previousCards)]);
  return [...ids].filter((id) => nextCards[id] !== previousCards[id]);
}

export class LinksRenderer {
  constructor(canvasElement) {
    if (!(canvasElement instanceof Element)) {
      throw new TypeError('LinksRenderer expects a DOM element.');
    }

    this.canvasElement = canvasElement;
    this.svg = this.ensureLayer();
    this.frameId = null;
    this.pendingFullRender = false;
    this.pendingCardIds = new Set();
    this.observedCards = new Map();
    this.unsubscribe = store.subscribe((next, previous) => this.handleStoreChange(next, previous));
    this.cardResizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
        const cardIds = entries
          .map((entry) => entry.target.dataset.cardId)
          .filter(Boolean);
        if (cardIds.length > 0) this.scheduleRender({ cardIds });
      })
      : null;
    this.canvasResizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this.scheduleRender({ full: true }))
      : null;
    this.mutationObserver = typeof MutationObserver === 'function'
      ? new MutationObserver(() => {
        this.syncObservedCards();
        this.scheduleRender({ full: true });
      })
      : null;

    this.canvasResizeObserver?.observe(this.canvasElement);
    this.mutationObserver?.observe(this.canvasElement, { childList: true, subtree: true });
    this.syncObservedCards();
    this.scheduleRender({ full: true });
  }

  ensureLayer() {
    const existing = this.canvasElement.querySelector(`#${LAYER_ID}`);
    if (existing) return existing;

    const svg = createSvgElement('svg', {
      id: LAYER_ID,
      'aria-hidden': 'true',
      focusable: 'false',
    });

    Object.assign(svg.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: '0',
    });

    const style = getComputedStyle(this.canvasElement);
    if (style.position === 'static') {
      this.canvasElement.style.position = 'relative';
    }

    this.canvasElement.prepend(svg);
    return svg;
  }

  syncObservedCards() {
    const current = new Map(
      [...this.canvasElement.querySelectorAll('[data-card-id]')]
        .map((element) => [element.dataset.cardId, element])
        .filter(([id]) => Boolean(id)),
    );

    for (const [id, element] of this.observedCards) {
      if (current.get(id) === element) continue;
      this.cardResizeObserver?.unobserve(element);
      this.observedCards.delete(id);
    }

    for (const [id, element] of current) {
      if (this.observedCards.get(id) === element) continue;
      this.observedCards.set(id, element);
      this.cardResizeObserver?.observe(element);
    }
  }

  handleStoreChange(next, previous) {
    if (next.links !== previous.links) {
      this.scheduleRender({ full: true });
      return;
    }

    const cardIds = new Set();

    if (next.cards !== previous.cards) {
      for (const id of collectChangedCardIds(next.cards, previous.cards)) cardIds.add(id);
    }

    if (next.selectedCardId !== previous.selectedCardId) {
      if (previous.selectedCardId) cardIds.add(previous.selectedCardId);
      if (next.selectedCardId) cardIds.add(next.selectedCardId);
    }

    if (cardIds.size > 0) this.scheduleRender({ cardIds });
  }

  scheduleRender({ full = false, cardIds = [] } = {}) {
    if (full) {
      this.pendingFullRender = true;
      this.pendingCardIds.clear();
    } else if (!this.pendingFullRender) {
      for (const id of cardIds) this.pendingCardIds.add(id);
    }

    if (this.frameId !== null) return;

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      const renderFull = this.pendingFullRender;
      const changedCardIds = new Set(this.pendingCardIds);
      this.pendingFullRender = false;
      this.pendingCardIds.clear();
      this.syncObservedCards();
      this.render({ full: renderFull, cardIds: changedCardIds });
    });
  }

  getPath(linkId) {
    return this.svg.querySelector(`[data-link-id="${CSS.escape(linkId)}"]`);
  }

  getMeasuredRect(cardId, card) {
    const element = this.observedCards.get(cardId)
      ?? this.canvasElement.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`);
    return resolveCardRect(card, {
      width: element?.offsetWidth,
      height: element?.offsetHeight,
    });
  }

  renderLink(link, cardMap, selectedCardId) {
    const sourceId = getEndpointId(link, 'source');
    const targetId = getEndpointId(link, 'target');
    if (!sourceId || !targetId) return null;

    const linkId = String(link.id ?? `${sourceId}__${targetId}`);
    const sourceCard = cardMap?.[sourceId];
    const targetCard = cardMap?.[targetId];
    let path = this.getPath(linkId);

    if (!sourceCard || !targetCard) {
      path?.remove();
      return linkId;
    }

    const sourceRect = this.getMeasuredRect(sourceId, sourceCard);
    const targetRect = this.getMeasuredRect(targetId, targetCard);
    const start = getAnchor(sourceRect, targetRect);
    const end = getAnchor(targetRect, sourceRect);
    const isActive = Boolean(
      link.active
      || link.selected
      || sourceId === selectedCardId
      || targetId === selectedCardId
    );

    if (!path) {
      path = createSvgElement('path', {
        'data-link-id': linkId,
        'data-source-id': sourceId,
        'data-target-id': targetId,
        fill: 'none',
        'vector-effect': 'non-scaling-stroke',
      });
      this.svg.append(path);
    }

    path.setAttribute('d', createPathData(start, end));
    path.setAttribute('stroke', link.color || (isActive ? '#9d8cff' : 'rgba(160, 170, 210, 0.42)'));
    path.setAttribute('stroke-width', isActive ? '3' : '1.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', isActive ? '1' : '0.82');
    return linkId;
  }

  render({ full, cardIds }) {
    const { cards = {}, links = [], selectedCardId = null } = store.getState();
    const cardMap = cards instanceof Map ? Object.fromEntries(cards) : cards;
    const linkList = Array.isArray(links) ? links : [];

    if (full) {
      const nextIds = new Set();
      for (const link of linkList) {
        const linkId = this.renderLink(link, cardMap, selectedCardId);
        if (linkId) nextIds.add(linkId);
      }

      for (const path of [...this.svg.querySelectorAll('[data-link-id]')]) {
        if (!nextIds.has(path.getAttribute('data-link-id'))) path.remove();
      }
      return;
    }

    if (cardIds.size === 0) return;

    for (const link of linkList) {
      const sourceId = getEndpointId(link, 'source');
      const targetId = getEndpointId(link, 'target');
      if (!cardIds.has(sourceId) && !cardIds.has(targetId)) continue;
      this.renderLink(link, cardMap, selectedCardId);
    }
  }

  destroy() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.unsubscribe?.();
    this.cardResizeObserver?.disconnect();
    this.canvasResizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.observedCards.clear();
    this.svg?.remove();
  }
}

export function createLinksRenderer(canvasElement) {
  return new LinksRenderer(canvasElement);
}

export default LinksRenderer;
