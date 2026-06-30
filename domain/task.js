export const TASK_SCHEMA_VERSION = 1;

export const TASK_STATUSES = Object.freeze([
  'planned',
  'in_progress',
  'waiting',
  'completed',
  'cancelled',
]);

export const TASK_PRIORITIES = Object.freeze(['low', 'medium', 'high', 'critical']);

const makeId = () => `task_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean))]
    : [];
}

export function normalizeTask(raw = {}) {
  const status = TASK_STATUSES.includes(raw.status)
    ? raw.status
    : (raw.completed ? 'completed' : 'planned');
  const priority = TASK_PRIORITIES.includes(raw.priority) ? raw.priority : 'medium';
  const createdAt = raw.createdAt || new Date().toISOString();

  return {
    ...raw,
    id: String(raw.id ?? '').trim() || makeId(),
    schemaVersion: TASK_SCHEMA_VERSION,
    title: String(raw.title ?? raw.text ?? '').trim() || 'Новая задача',
    description: String(raw.description ?? '').trim(),
    status,
    priority,
    completed: status === 'completed',
    startDate: raw.startDate || null,
    dueDate: raw.dueDate || null,
    assigneeIds: normalizeStringArray(raw.assigneeIds),
    dependencyIds: normalizeStringArray(raw.dependencyIds),
    attachmentIds: normalizeStringArray(raw.attachmentIds),
    subtasks: normalizeTaskList(raw.subtasks),
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
}

export function normalizeTaskList(tasks) {
  return Array.isArray(tasks) ? tasks.map((task) => normalizeTask(task)) : [];
}

export function createTask(input = {}) {
  return normalizeTask(input);
}

export function validateTask(task) {
  const errors = [];
  if (!task || typeof task !== 'object') return { valid: false, errors: ['Task must be an object.'] };
  if (!task.id || typeof task.id !== 'string') errors.push('Task id is required.');
  if (!task.title || typeof task.title !== 'string') errors.push('Task title is required.');
  if (!TASK_STATUSES.includes(task.status)) errors.push('Unsupported task status.');
  if (!TASK_PRIORITIES.includes(task.priority)) errors.push('Unsupported task priority.');
  if (!Array.isArray(task.subtasks)) errors.push('Task subtasks must be an array.');
  return { valid: errors.length === 0, errors };
}

export function flattenTasks(tasks = []) {
  const result = [];
  const visit = (task, parentId = null, depth = 0) => {
    const normalized = normalizeTask(task);
    result.push({ ...normalized, parentId, depth });
    for (const subtask of normalized.subtasks) visit(subtask, normalized.id, depth + 1);
  };
  for (const task of tasks) visit(task);
  return result;
}
