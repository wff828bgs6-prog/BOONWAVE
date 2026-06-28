import store from "../state/store.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const CARD_SIZES = {
  1: { width: 96, height: 96 },
  2: { width: 280, height: 180 },
  3: { width: 360, height: 300 },
};

const createSvgElement = (tag, attributes = {}) => {
  const element = document.createElementNS(SVG_NS, tag);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }

  return element;
};

const getCardSize = (card) => {
  const fallback = CARD_SIZES[card.visualLevel] ?? CARD_SIZES[2];

  return {
    width: Number.isFinite(card.width) ? card.width : fallback.width,
    height: Number.isFinite(card.height) ? card.height : fallback.height,
  };
};

const getCardCenter = (card) => {
  const { width, height } = getCardSize(card);

  return {
    x: card.x + width / 2,
    y: card.y + height / 2,
  };
};

const toScreenPoint = (point, camera) => ({
  x: point.x * camera.zoom + camera.x,
  y: point.y * camera.zoom + camera.y,
});

const createCurve = (source, target) => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  const bend = Math.max(48, Math.min(distance * 0.42, 220));

  const control1 = {
    x: source.x + Math.sign(dx || 1) * bend,
    y: source.y,
  };

  const control2 = {
    x: target.x - Math.sign(dx || 1) * bend,
    y: target.y,
  };

  return [
    `M ${source.x} ${source.y}`,
    `C ${control1.x} ${control1.y}`,
    `${control2.x} ${control2.y}`,
    `${target.x} ${target.y}`,
  ].join(" ");
};

export class LinksRenderer {
  constructor(svgElement) {
    if (!(svgElement instanceof SVGElement)) {
      throw new TypeError("LinksRenderer requires an SVG element.");
    }

    this.svg = svgElement;
    this.items = new Map();
    this.unsubscribe = null;

    this.svg.setAttribute("aria-hidden", "true");
    this.svg.style.pointerEvents = "none";

    this.createDefinitions();
  }

  createDefinitions() {
    const defs = createSvgElement("defs");

    const gradient = createSvgElement("linearGradient", {
      id: "boonwave-link-gradient",
      x1: "0%",
      y1: "0%",
      x2: "100%",
      y2: "0%",
    });

    gradient.append(
      createSvgElement("stop", {
        offset: "0%",
        "stop-color": "#7657ff",
      }),
      createSvgElement("stop", {
        offset: "100%",
        "stop-color": "#35b8ff",
      }),
    );

    const marker = createSvgElement("marker", {
      id: "boonwave-link-arrow",
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      markerWidth: "6",
      markerHeight: "6",
      orient: "auto-start-reverse",
    });

    marker.append(
      createSvgElement("path", {
        d: "M 0 0 L 10 5 L 0 10 z",
        fill: "#58a8ff",
      }),
    );

    defs.append(gradient, marker);
    this.svg.append(defs);
  }

  createLinkItem(link) {
    const group = createSvgElement("g", {
      "data-link-id": link.id,
    });

    const hitArea = createSvgElement("path", {
      fill: "none",
      stroke: "transparent",
      "stroke-width": "18",
      "pointer-events": "stroke",
    });

    const path = createSvgElement("path", {
      fill: "none",
      stroke: "url(#boonwave-link-gradient)",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "vector-effect": "non-scaling-stroke",
    });

    const label = createSvgElement("text", {
      fill: "#aeb7d8",
      "font-size": "12",
      "text-anchor": "middle",
      "dominant-baseline": "central",
    });

    group.append(hitArea, path, label);
    this.svg.append(group);

    const item = { group, hitArea, path, label };
    this.items.set(link.id, item);

    return item;
  }

  updateLinkItem(item, link, source, target, camera) {
    const sourcePoint = toScreenPoint(getCardCenter(source), camera);
    const targetPoint = toScreenPoint(getCardCenter(target), camera);
    const pathData = createCurve(sourcePoint, targetPoint);

    item.hitArea.setAttribute("d", pathData);
    item.path.setAttribute("d", pathData);

    const direction = link.direction ?? "none";

    item.path.removeAttribute("marker-start");
    item.path.removeAttribute("marker-end");

    if (direction === "source-to-target") {
      item.path.setAttribute(
        "marker-end",
        "url(#boonwave-link-arrow)",
      );
    }

    if (direction === "target-to-source") {
      item.path.setAttribute(
        "marker-start",
        "url(#boonwave-link-arrow)",
      );
    }

    const labelX = (sourcePoint.x + targetPoint.x) / 2;
    const labelY = (sourcePoint.y + targetPoint.y) / 2;

    item.label.textContent = link.label ?? "";
    item.label.setAttribute("x", labelX);
    item.label.setAttribute("y", labelY - 10);
    item.label.hidden = !link.label;
  }

  render() {
    const state = store.getState();
    const cards = Array.isArray(state.cards) ? state.cards : [];
    const links = Array.isArray(state.links) ? state.links : [];

    const camera = {
      x: state.camera?.x ?? 0,
      y: state.camera?.y ?? 0,
      zoom: state.camera?.zoom ?? 1,
    };

    const cardMap = new Map(
      cards
        .filter((card) => !card.archived)
        .map((card) => [card.id, card]),
    );

    const visibleLinkIds = new Set();

    for (const link of links) {
      const source = cardMap.get(link.sourceNodeId);
      const target = cardMap.get(link.targetNodeId);

      if (!source || !target) continue;

      const item =
        this.items.get(link.id) ?? this.createLinkItem(link);

      this.updateLinkItem(
        item,
        link,
        source,
        target,
        camera,
      );

      visibleLinkIds.add(link.id);
    }

    for (const [linkId, item] of this.items) {
      if (visibleLinkIds.has(linkId)) continue;

      item.group.remove();
      this.items.delete(linkId);
    }
  }

  start() {
    if (this.unsubscribe) return;

    this.render();
    this.unsubscribe = store.subscribe(() => this.render());
  }

  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  destroy() {
    this.stop();

    for (const item of this.items.values()) {
      item.group.remove();
    }

    this.items.clear();
  }
}

export default LinksRenderer;
