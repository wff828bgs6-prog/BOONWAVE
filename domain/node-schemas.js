import { normalizeTaskList, validateTask } from './task.js';

export const NODE_SCHEMA_VERSION = 5;

export const NODE_TYPES = Object.freeze(['self', 'project', 'process', 'person', 'idea', 'goal']);

export const NODE_TYPE_LABELS = Object.freeze({
  self: 'Я Есмь',
  project: 'Проект',
  process: 'Процесс',
  person: 'Человек',
  idea: 'Идея',
  goal: 'Цель',
});

const TYPE_DEFAULTS = Object.freeze({
  self: {
    fullName: '', currentState: '', currentFocus: '', attentionStatus: 'stable',
    focusItems: [], lifeAreas: [],
    profile: { bio: '', profession: '', location: '' },
    avatarMediaId: null, documents: [], files: [],
  },
  project: {
    priority: 'medium', status: 'preparation', address: '', itemCount: null,
    contractDate: null, budget: null, expectedProfit: null,
    advance: { amount: null, date: null },
    balance: { amount: null, date: null },
    primaryContact: { name: '', phone: '', email: '' },
    preliminaryInfo: '', nextAction: '', blockers: [],
    coverMediaId: null, images: [], documents: [], files: [],
  },
  process: {
    status: 'planned', priority: 'medium', progress: 0,
    startDate: null, dueDate: null, tasks: [], nextAction: '', blockers: [],
    notes: '', attachments: [],
  },
  person: {
    fullName: '', phone: '', email: '', organization: '', role: '', notes: '',
    avatarMediaId: null, attachments: [], messengers: [], websites: [],
  },
  idea: {
    status: 'draft', category: '', impact: '', notes: '',
    coverMediaId: null, attachments: [],
  },
  goal: {
    status: 'active', priority: 'medium', targetDate: null, progress: 0,
    metric: { name: '', target: null, current: null, unit: '' },
    nextAction: '', blockers: [], notes: '', coverMediaId: null, attachments: [],
  },
});

function clone(value) {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function mergeDefaults(defaults, value) {
  if (Array.isArray(defaults)) return Array.isArray(value) ? clone(value) : clone(defaults);
  if (!defaults || typeof defaults !== 'object') return value === undefined ? defaults : value;

  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    result[key] = mergeDefaults(defaultValue, source[key]);
  }
  for (const [key, sourceValue] of Object.entries(source)) {
    if (!(key in result)) result[key] = clone(sourceValue);
  }
  return result;
}

function mergePatch(current, patch) {
  if (patch === undefined) return clone(current);
  if (Array.isArray(patch)) return clone(patch);
  if (!patch || typeof patch !== 'object') return patch;

  const base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
  const result = { ...clone(base) };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = mergePatch(base[key], value);
  }
  return result;
}

function normalizeTypeSpecificData(type, data) {
  if (type !== 'process') return data;
  return { ...data, tasks: normalizeTaskList(data.tasks) };
}

export function getNodeDataDefaults(type) {
  if (!NODE_TYPES.includes(type)) throw new TypeError(`Unsupported BOONWAVE node type: ${type}`);
  return normalizeTypeSpecificData(type, clone(TYPE_DEFAULTS[type]));
}

export function normalizeNodeData(type, data) {
  if (!NODE_TYPES.includes(type)) throw new TypeError(`Unsupported BOONWAVE node type: ${type}`);
  return normalizeTypeSpecificData(type, mergeDefaults(TYPE_DEFAULTS[type], data));
}

export function mergeNodeData(type, current, patch) {
  return normalizeNodeData(type, mergePatch(current, patch));
}

export function validateNode(node) {
  const errors = [];
  if (!node || typeof node !== 'object') {
    return { valid: false, errors: ['Node must be an object.'] };
  }

  if (!NODE_TYPES.includes(node.type)) errors.push('Unsupported node type.');
  if (typeof node.id !== 'string' || !node.id) errors.push('Node id is required.');
  if (typeof node.title !== 'string' || !node.title.trim()) errors.push('Node title is required.');
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) errors.push('Node position must be finite.');
  if (!Number.isFinite(node.width) || node.width <= 0) errors.push('Node width must be positive.');
  if (!Number.isFinite(node.height) || node.height <= 0) errors.push('Node height must be positive.');
  if (!node.data || typeof node.data !== 'object' || Array.isArray(node.data)) {
    errors.push('Node data must be an object.');
  }

  if ((node.type === 'process' || node.type === 'goal')
    && (!Number.isFinite(node.data?.progress) || node.data.progress < 0 || node.data.progress > 100)) {
    errors.push('Progress must be between 0 and 100.');
  }

  if (node.type === 'process' && Array.isArray(node.data?.tasks)) {
    for (const task of node.data.tasks) {
      const validation = validateTask(task);
      if (!validation.valid) errors.push(...validation.errors.map((error) => `Task: ${error}`));
    }
  }

  return { valid: errors.length === 0, errors };
}
