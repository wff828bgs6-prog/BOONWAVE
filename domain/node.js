import {
  NODE_SCHEMA_VERSION,
  NODE_TYPES,
  getNodeDataDefaults,
  normalizeNodeData,
  validateNode,
} from './node-schemas.js';

export { NODE_SCHEMA_VERSION, NODE_TYPES, validateNode };

export const CARD_VIEW_MODES = Object.freeze(['compact', 'standard', 'full']);
export const COVER_SHAPES = Object.freeze(['rounded-square', 'circle', 'portrait', 'landscape']);

const DEFAULT_TITLES = Object.freeze({
  project: 'Новый проект',
  process: 'Новый процесс',
  person: 'Новый человек',
  idea: 'Новая идея',
  goal: 'Новая цель',
});

const finiteNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max, fallback) => Math.min(max, Math.max(min, finiteNumber(value, fallback)));

export function normalizeNodeView(raw = {}) {
  return {
    mode: CARD_VIEW_MODES.includes(raw.mode) ? raw.mode : 'standard',
    compactLabel: String(raw.compactLabel ?? '').trim(),
    cover: {
      shape: COVER_SHAPES.includes(raw.cover?.shape) ? raw.cover.shape : 'rounded-square',
      scale: clamp(raw.cover?.scale, 1, 3, 1),
      positionX: clamp(raw.cover?.positionX, 0, 100, 50),
      positionY: clamp(raw.cover?.positionY, 0, 100, 50),
    },
  };
}

export function normalizeNode(raw = {}) {
  if (!NODE_TYPES.includes(raw.type)) {
    throw new TypeError(`Unsupported BOONWAVE node type: ${raw.type}`);
  }

  const now = new Date().toISOString();
  const node = {
    ...raw,
    id: String(raw.id ?? '').trim(),
    type: raw.type,
    schemaVersion: NODE_SCHEMA_VERSION,
    title: String(raw.title ?? '').trim() || DEFAULT_TITLES[raw.type],
    description: String(raw.description ?? '').trim(),
    x: Math.round(finiteNumber(raw.x, 0)),
    y: Math.round(finiteNumber(raw.y, 0)),
    width: Math.max(1, Math.round(finiteNumber(raw.width, 230))),
    height: Math.max(1, Math.round(finiteNumber(raw.height, 138))),
    data: normalizeNodeData(raw.type, raw.data),
    view: normalizeNodeView(raw.view),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };

  const validation = validateNode(node);
  if (!validation.valid) {
    throw new TypeError(`Invalid BOONWAVE node: ${validation.errors.join(' ')}`);
  }

  return node;
}

export function createNode({ type, title, description = '', x = 0, y = 0, data, view } = {}) {
  if (!NODE_TYPES.includes(type)) {
    throw new TypeError(`Unsupported BOONWAVE node type: ${type}`);
  }

  const id = `${type}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  const now = new Date().toISOString();

  return normalizeNode({
    id,
    type,
    title,
    description,
    x,
    y,
    width: 230,
    height: 138,
    data: data ?? getNodeDataDefaults(type),
    view,
    createdAt: now,
    updatedAt: now,
  });
}
