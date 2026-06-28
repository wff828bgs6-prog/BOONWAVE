import store from '../state/store.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LAYER_ID = 'boonwave-links-layer';

const asFinite = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const getCardRect = (card = {}) => {
  const x = asFinite(card.x ?? card.position?.x);
  const y = asFinite(card.y ?? card.position?.y);
  const width = Math.max(asFinite(card.width ?? card.size?.width, 220), 1);
  const height = Math.max(asFinite(card.height ?? card.size?.height, 140), 1);

  return { x, y, width, height };
};

const getEndpointId = (link, side) => {
  const candidates = side === 'source'
    ? [link.sourceId, link.fromId, link.source, link.from, link.startCardId]
    : [link.targetId, link.toId, link.target, link.to, link.endCardId];

  return candidates.find((value) => typeof value === 'string' && value.length > 0) ?? null;
};

const getAnchor = (fromRect, toRect) => {
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

const createPathData = (start, end) => {
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

export class LinksRenderer {
  constructor(canvasElement) {
    if (!(canvasElement instanceof Element)) {
      throw new TypeError('LinksRenderer expects a DOM element.');
    }

    this.canvasElement = canvasElement;
    this.svg = this.ensureLayer();
    this.unsubscribe = store.subscribe(() => this.scheduleRender());
    this.frameId = null;
    this.resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this.scheduleRender())
      : null;

    this.resizeObserver?.observe(this.canvasElement);
    this.scheduleRender();
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

  scheduleRender() {
    if (this.frameId !== null) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.render();
    });
  }

  render() {
    const { cards = {}, links = [], selectedCardId = null } = store.getState();
    const cardMap = cards instanceof Map ? Object.fromEntries(cards) : cards;
    const nextIds = new Set();

    for (const link of Array.isArray(links) ? links : []) {
      const sourceId = getEndpointId(link, 'source');
      const targetId = getEndpointId(link, 'target');
      if (!sourceId || !targetId) continue;

      const sourceCard = cardMap?.[sourceId];
      const targetCard = cardMap?.[targetId];
      if (!sourceCard || !targetCard) continue;

      const linkId = String(link.id ?? `${sourceId}__${targetId}`);
      nextIds.add(linkId);

      const sourceRect = getCardRect(sourceCard);
      const targetRect = getCardRect(targetCard);
      const start = getAnchor(sourceRect, targetRect);
      const end = getAnchor(targetRect, sourceRect);
      const isActive = Boolean(link.active || link.selected || sourceId === selectedCardId || targetId === selectedCardId);

      let path = this.svg.querySelector(`[data-link-id="${CSS.escape(linkId)}"]`);
      if (!path) {
        path = createSvgElement('path', {
          'data-link-id': linkId,
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
    }

    for (const path of [...this.svg.querySelectorAll('[data-link-id]')]) {
      if (!nextIds.has(path.getAttribute('data-link-id'))) {
        path.remove();
      }
    }
  }

  destroy() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    this.svg?.remove();
  }
}

export function createLinksRenderer(canvasElement) {
  return new LinksRenderer(canvasElement);
}

export default LinksRenderer;
