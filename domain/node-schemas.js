import { normalizeTaskList, validateTask } from './task.js';
import { normalizeProcessData } from './work-process.js';
import { normalizeContactData } from './contact.js';

export const NODE_SCHEMA_VERSION = 9;

export const NODE_TYPES = Object.freeze(['self', 'project', 'process', 'person', 'persona', 'idea', 'goal']);

export const NODE_TYPE_LABELS = Object.freeze({
  self: 'Моя вселенная',
  project: 'Проект',
  process: 'Процесс',
  person: 'Контакт',
  persona: 'Персона',
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
    preliminaryInfo: '', nextAction: '', blockers: [], contactAssignments: [],
    coverMediaId: null, images: [], documents: [], files: [],
  },
  process: {
    projectId: null, parentProcessId: null, sourceStageId: null,
    status: 'planned', priority: 'medium', progress: 0, progressMode: 'from-stages',
    startDate: null, dueDate: null, budget: null,
    selectedStageId: null, taskViewMode: 'selected-stage', expenseViewMode: 'selected-stage',
    stages: [], tasks: [], expenses: [], participants: [], mediaAssignments: [], contactAssignments: [],
    nextAction: '', blockers: [], notes: '', attachments: [],
  },
  person: {
    kind: 'person', fullName: '', organization: '', profession: '', description: '',
    category: 'specialist', status: 'active', city: '', address: '',
    phones: [], emails: [], messengers: [], websites: [], tags: [], skills: [], assignments: [],
    website: '', instagram: '',
    favorite: false, rating: null,
    legalDetails: {
      legalName: '', taxId: '', registrationId: '', bankName: '', bankAccount: '',
      correspondentAccount: '', bankCode: '', legalAddress: '',
    },
    phone: '', email: '', role: '', notes: '',
    avatarMediaId: null, avatarWideMediaId: null,
    avatarPreviewUrl: '', avatarWidePreviewUrl: '', avatarCrops: {},
    attachments: [], showOnCanvas: false,
  },
  persona: {
    role: '', archetype: '', domain: '', status: 'active', notes: '',
    coverMediaId: null, attachments: [],
  },
  idea: {
    status: 'draft', category: '', impact: '', notes: '', contactAssignments: [],
    coverMediaId: null, attachments: [],
  },
  goal: {
    status: 'active', priority: 'medium', targetDate: null, progress: 0,
    metric: { name: '', target: null, current: null, unit: '' },
    nextAction: '', blockers: [], notes: '', contactAssignments: [], coverMediaId: null, attachments: [],
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

function normalizeTypeSpecificData(type, data, nodeId = '') {
  if (type === 'process') {
    const normalizedTasks = normalizeTaskList(data.tasks, { processId: nodeId });
    return normalizeProcessData({ ...data, tasks: normalizedTasks }, nodeId);
  }
  if (type === 'person') return normalizeContactData(data);
  return data;
}

export function getNodeDataDefaults(type, nodeId = '') {
  if (!NODE_TYPES.includes(type)) throw new TypeError(`Unsupported BOONWAVE node type: ${type}`);
  return normalizeTypeSpecificData(type, clone(TYPE_DEFAULTS[type]), nodeId);
}

export function normalizeNodeData(type, data, nodeId = '') {
  if (!NODE_TYPES.includes(type)) throw new TypeError(`Unsupported BOONWAVE node type: ${type}`);
  return normalizeTypeSpecificData(type, mergeDefaults(TYPE_DEFAULTS[type], data), nodeId);
}

export function mergeNodeData(type, current, patch, nodeId = '') {
  return normalizeNodeData(type, mergePatch(current, patch), nodeId);
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
  if (!node.data || typeof node.data !== 'object' || Array.isArray(node.data)) errors.push('Node data must be an object.');

  if ((node.type === 'process' || node.type === 'goal')
    && (!Number.isFinite(node.data?.progress) || node.data.progress < 0 || node.data.progress > 100)) errors.push('Progress must be between 0 and 100.');

  if (node.type === 'process') {
    if (!Array.isArray(node.data?.stages)) errors.push('Process stages must be an array.');
    if (!Array.isArray(node.data?.expenses)) errors.push('Process expenses must be an array.');
    if (!Array.isArray(node.data?.participants)) errors.push('Process participants must be an array.');
    if (!Array.isArray(node.data?.mediaAssignments)) errors.push('Process media assignments must be an array.');
    if (Array.isArray(node.data?.tasks)) {
      for (const task of node.data.tasks) {
        const validation = validateTask(task);
        if (!validation.valid) errors.push(...validation.errors.map((error) => `Task: ${error}`));
      }
    }
    const stageIds = new Set((node.data?.stages ?? []).map((stage) => stage.id));
    if (node.data?.selectedStageId && !stageIds.has(node.data.selectedStageId)) errors.push('Selected stage must belong to the process.');
  }

  if (node.type === 'person') {
    if (!Array.isArray(node.data?.phones)) errors.push('Contact phones must be an array.');
    if (!Array.isArray(node.data?.emails)) errors.push('Contact emails must be an array.');
    if (!Array.isArray(node.data?.messengers)) errors.push('Contact messengers must be an array.');
    if (!Array.isArray(node.data?.tags)) errors.push('Contact tags must be an array.');
    if (!Array.isArray(node.data?.assignments)) errors.push('Contact assignments must be an array.');
  }

  return { valid: errors.length === 0, errors };
}
