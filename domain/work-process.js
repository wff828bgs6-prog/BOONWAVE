export const LIFECYCLE_STATUSES = Object.freeze(['active', 'archived', 'trashed']);
export const PROCESS_STATUSES = Object.freeze(['planned', 'active', 'paused', 'completed', 'cancelled']);
export const STAGE_PROGRESS_MODES = Object.freeze(['manual', 'from-tasks', 'from-child-process']);

const makeId = (prefix) => `${prefix}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, finite(value, min)));

export function normalizeStage(raw = {}, processId = raw.processId) {
  const createdAt = raw.createdAt || new Date().toISOString();
  const lifecycleStatus = LIFECYCLE_STATUSES.includes(raw.lifecycleStatus)
    ? raw.lifecycleStatus
    : (raw.archived ? 'archived' : 'active');
  const progressMode = STAGE_PROGRESS_MODES.includes(raw.progressMode)
    ? raw.progressMode
    : (raw.childProcessId ? 'from-child-process' : 'from-tasks');

  return {
    ...raw,
    id: String(raw.id ?? '').trim() || makeId('stage'),
    processId: String(processId ?? '').trim(),
    title: String(raw.title ?? '').trim() || 'Новый этап',
    description: String(raw.description ?? '').trim(),
    status: PROCESS_STATUSES.includes(raw.status) ? raw.status : 'planned',
    priority: raw.priority ?? 'medium',
    order: Math.max(0, Math.trunc(finite(raw.order, 0))),
    startDate: raw.startDate || null,
    dueDate: raw.dueDate ?? raw.deadline ?? null,
    progressMode,
    manualProgress: raw.manualProgress == null ? null : clamp(raw.manualProgress),
    childProcessId: raw.childProcessId || null,
    responsiblePersonId: raw.responsiblePersonId || null,
    participantIds: Array.isArray(raw.participantIds) ? [...new Set(raw.participantIds.filter(Boolean))] : [],
    notes: String(raw.notes ?? '').trim(),
    lifecycleStatus,
    archivedAt: raw.archivedAt || null,
    trashedAt: raw.trashedAt || null,
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
}

export function normalizeStageList(stages, processId) {
  return (Array.isArray(stages) ? stages : [])
    .map((stage, index) => normalizeStage({ ...stage, order: stage.order ?? index }, processId))
    .sort((a, b) => a.order - b.order)
    .map((stage, order) => ({ ...stage, order }));
}

export function reorderById(items, itemId, targetOrder) {
  const sourceIndex = items.findIndex((item) => item.id === itemId);
  if (sourceIndex < 0) return items.map((item) => ({ ...item }));
  const next = items.map((item) => ({ ...item }));
  const [moved] = next.splice(sourceIndex, 1);
  const destination = Math.max(0, Math.min(next.length, Math.trunc(finite(targetOrder, 0))));
  next.splice(destination, 0, moved);
  return next.map((item, order) => ({ ...item, order }));
}

export function moveTaskToStage(tasks, taskId, targetStageId, targetOrder = Number.MAX_SAFE_INTEGER) {
  const sourceTask = (Array.isArray(tasks) ? tasks : []).find((task) => task.id === taskId);
  if (!sourceTask) return Array.isArray(tasks) ? tasks.map((task) => ({ ...task })) : [];

  const untouched = tasks.filter((task) => task.id !== taskId).map((task) => ({ ...task }));
  const targetTasks = untouched.filter((task) => task.stageId === targetStageId).sort((a, b) => finite(a.order) - finite(b.order));
  const others = untouched.filter((task) => task.stageId !== targetStageId);
  const destination = Math.max(0, Math.min(targetTasks.length, Math.trunc(finite(targetOrder, targetTasks.length))));
  targetTasks.splice(destination, 0, { ...sourceTask, stageId: targetStageId });

  const normalizedTarget = targetTasks.map((task, order) => ({ ...task, order }));
  const normalizedOthers = Object.values(others.reduce((groups, task) => {
    (groups[task.stageId] ??= []).push(task);
    return groups;
  }, {})).flatMap((group) => group.sort((a, b) => finite(a.order) - finite(b.order)).map((task, order) => ({ ...task, order })));

  return [...normalizedOthers, ...normalizedTarget];
}

export function calculateTaskProgress(task) {
  if (task.status === 'completed' || task.completed === true) return 100;
  if (task.status === 'in_progress') return clamp(task.progress ?? 50);
  return clamp(task.progress ?? 0);
}

export function calculateStageProgress(stage, tasks = [], childProcessProgress = null) {
  if (stage.progressMode === 'manual') return clamp(stage.manualProgress ?? 0);
  if (stage.progressMode === 'from-child-process') return clamp(childProcessProgress ?? 0);
  const active = tasks.filter((task) => task.stageId === stage.id && (task.lifecycleStatus ?? 'active') === 'active');
  if (!active.length) return stage.status === 'completed' ? 100 : 0;
  return Math.round(active.reduce((sum, task) => sum + calculateTaskProgress(task), 0) / active.length);
}

export function calculateProcessProgress(stages = [], progressByStageId = {}) {
  const active = stages.filter((stage) => stage.lifecycleStatus === 'active');
  if (!active.length) return 0;
  return Math.round(active.reduce((sum, stage) => sum + clamp(progressByStageId[stage.id] ?? 0), 0) / active.length);
}

export function normalizeProcessData(raw = {}, processId = '') {
  const stages = normalizeStageList(raw.stages, processId);
  const selectedStageId = stages.some((stage) => stage.id === raw.selectedStageId && stage.lifecycleStatus === 'active')
    ? raw.selectedStageId
    : (stages.find((stage) => stage.lifecycleStatus === 'active')?.id ?? null);

  return {
    ...raw,
    projectId: raw.projectId || null,
    parentProcessId: raw.parentProcessId || null,
    sourceStageId: raw.sourceStageId || null,
    status: PROCESS_STATUSES.includes(raw.status) ? raw.status : 'planned',
    priority: raw.priority ?? 'medium',
    startDate: raw.startDate || null,
    dueDate: raw.dueDate ?? raw.deadline ?? null,
    budget: raw.budget ?? raw.budgetAmount ?? null,
    progressMode: raw.progressMode === 'manual' ? 'manual' : 'from-stages',
    progress: clamp(raw.progress ?? raw.manualProgress ?? 0),
    selectedStageId,
    taskViewMode: raw.taskViewMode === 'all' ? 'all' : 'selected-stage',
    expenseViewMode: raw.expenseViewMode === 'all' ? 'all' : 'selected-stage',
    stages,
    expenses: Array.isArray(raw.expenses) ? raw.expenses : [],
    participants: Array.isArray(raw.participants) ? raw.participants : [],
    mediaAssignments: Array.isArray(raw.mediaAssignments) ? raw.mediaAssignments : [],
  };
}
