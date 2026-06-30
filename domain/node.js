import {
  NODE_SCHEMA_VERSION,
  NODE_TYPES,
  getNodeDataDefaults,
  normalizeNodeData,
  validateNode,
} from './node-schemas.js';

export { NODE_SCHEMA_VERSION, NODE_TYPES, validateNode };

export const CARD_VIEW_MODES = Object.freeze(['compact', 'standard']);
export const CARD_VIEW_SECTIONS = Object.freeze([
  'cover', 'type', 'status', 'title', 'description', 'meta', 'progress',
]);
export const COVER_SHAPES = Object.freeze(['rounded-square', 'circle', 'portrait', 'landscape']);

export const DEFAULT_CARD_VIEW_VISIBILITY = Object.freeze({
  compact: Object.freeze({
    cover: true,
    type: false,
    status: false,
    title: true,
    description: false,
    meta: false,
    progress: false,
  }),
  standard: Object.freeze({
    cover: true,
    type: true,
    status: true,
    title: true,
    description: true,
    meta: true,
    progress: true,
  }),
});

const DEFAULT_TITLES = Object.freeze({
  self: 'Я Есмь',
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

function normalizeCoverFrame(raw = {}, fallback = {}) {
  return {
    shape: COVER_SHAPES.includes(raw.shape)
      ? raw.shape
      : (COVER_SHAPES.includes(fallback.shape) ? fallback.shape : 'rounded-square'),
    scale: clamp(raw.scale, 1, 3, fallback.scale ?? 1),
    positionX: clamp(raw.positionX, 0, 100, fallback.positionX ?? 50),
    positionY: clamp(raw.positionY, 0, 100, fallback.positionY ?? 50),
  };
}

function normalizeVisibility(raw = {}, fallback = {}) {
  return Object.fromEntries(CARD_VIEW_SECTIONS.map((section) => [
    section,
    typeof raw[section] === 'boolean' ? raw[section] : Boolean(fallback[section]),
  ]));
}

export function normalizeNodeView(raw = {}) {
  const legacyCover = raw.cover && typeof raw.cover === 'object' ? raw.cover : {};
  const compact = normalizeCoverFrame(raw.coverFrames?.compact ?? legacyCover);
  const working = normalizeCoverFrame(raw.coverFrames?.working ?? legacyCover, compact);
  const rawMode = raw.mode === 'full' ? 'standard' : raw.mode;

  return {
    mode: CARD_VIEW_MODES.includes(rawMode) ? rawMode : 'standard',
    compactLabel: String(raw.compactLabel ?? '').trim(),
    coverFrames: { compact, working },
    visible: {
      compact: normalizeVisibility(raw.visible?.compact, DEFAULT_CARD_VIEW_VISIBILITY.compact),
      standard: normalizeVisibility(raw.visible?.standard, DEFAULT_CARD_VIEW_VISIBILITY.standard),
    },
  };
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
