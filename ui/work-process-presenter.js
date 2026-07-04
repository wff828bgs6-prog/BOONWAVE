import {
  calculateProcessProgress,
  calculateStageProgress,
  calculateTaskProgress,
} from '../domain/work-process.js';

const STATUS_LABELS = Object.freeze({
  planned: 'Запланировано',
  active: 'Активно',
  paused: 'На паузе',
  completed: 'Завершено',
  cancelled: 'Отменено',
  in_progress: 'В работе',
  waiting: 'Ожидание',
});

const PRIORITY_LABELS = Object.freeze({
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
});

const PAYMENT_STATUS_LABELS = Object.freeze({
  expected: 'Ожидается',
  paid: 'Оплачено',
});

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
});

function activeOnly(items = []) {
  return items.filter((item) => (item.lifecycleStatus ?? 'active') === 'active');
}

function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

function formatDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : String(value);
}

function formatMoney(value, currency = 'RUB') {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const suffix = currency === 'RUB' ? ' ₽' : ` ${currency}`;
  return `${moneyFormatter.format(number)}${suffix}`;
}

function resolveNearestDeadline(stages, tasks) {
  const dates = [...stages, ...tasks]
    .map((item) => item.dueDate)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a - b);
  return dates[0]?.toISOString() ?? null;
}

function resolveStageProgress(stage, tasks, cardsById) {
  const childProcessProgress = stage.childProcessId
    ? cardsById?.[stage.childProcessId]?.data?.progress
    : null;
  return calculateStageProgress(stage, tasks, childProcessProgress);
}

function presentTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    stageId: task.stageId,
    order: task.order ?? 0,
    status: task.status,
    statusLabel: STATUS_LABELS[task.status] ?? task.status,
    priority: task.priority,
    priorityLabel: PRIORITY_LABELS[task.priority] ?? task.priority,
    completed: task.status === 'completed' || task.completed === true,
    progress: calculateTaskProgress(task),
    assigneeIds: task.assigneeIds ?? [],
    attachmentIds: task.attachmentIds ?? [],
    mediaAssignmentIds: task.mediaAssignmentIds ?? [],
    dueDate: task.dueDate ?? null,
    dueDateLabel: formatDate(task.dueDate),
    isCurrent: Boolean(task.isCurrent),
    subtaskCount: Array.isArray(task.subtasks) ? task.subtasks.length : 0,
  };
}

function presentExpense(expense) {
  return {
    id: expense.id,
    title: expense.title,
    stageId: expense.stageId,
    amount: Number(expense.amount) || 0,
    currency: expense.currency || 'RUB',
    amountLabel: formatMoney(expense.amount, expense.currency || 'RUB'),
    expenseDate: expense.expenseDate ?? null,
    expenseDateLabel: formatDate(expense.expenseDate),
    category: expense.category || '',
    recipient: expense.recipient || '',
    paymentStatus: expense.paymentStatus || 'expected',
    paymentStatusLabel: PAYMENT_STATUS_LABELS[expense.paymentStatus || 'expected'],
    receiptMediaId: expense.receiptMediaId || null,
  };
}

function presentParticipant(participant, cardsById) {
  const person = cardsById?.[participant.personId] ?? null;
  return {
    id: participant.id,
    personId: participant.personId,
    name: person?.data?.fullName || person?.title || 'Участник',
    role: participant.role || '',
    responsibility: participant.responsibility || '',
    participationStatus: participant.participationStatus || 'active',
    stageIds: participant.stageIds ?? [],
  };
}

function presentMaterial(assignment, mediaById) {
  const media = mediaById?.[assignment.mediaId] ?? null;
  return {
    id: assignment.id,
    mediaId: assignment.mediaId,
    processId: assignment.processId ?? null,
    stageId: assignment.stageId ?? null,
    taskId: assignment.taskId ?? null,
    purpose: assignment.purpose || '',
    order: assignment.order ?? 0,
    name: media?.name || media?.fileName || 'Файл',
    mimeType: media?.mimeType || media?.type || '',
    size: media?.size ?? null,
    isAvailable: Boolean(media),
  };
}

export function presentWorkProcess(card, context = {}) {
  if (!card || card.type !== 'process') {
    throw new TypeError('Work process presenter requires a process card.');
  }

  const data = card.data ?? {};
  const cardsById = context.cardsById ?? {};
  const mediaById = context.mediaById ?? {};
  const stages = activeOnly(data.stages ?? []).sort(byOrder);
  const tasks = activeOnly(data.tasks ?? []).sort(byOrder);
  const expenses = activeOnly(data.expenses ?? []);
  const participants = (data.participants ?? []).filter((item) => item.participationStatus !== 'completed');
  const selectedStage = stages.find((stage) => stage.id === data.selectedStageId) ?? stages[0] ?? null;

  const stageProgressById = Object.fromEntries(stages.map((stage) => [
    stage.id,
    resolveStageProgress(stage, tasks, cardsById),
  ]));

  const processProgress = data.progressMode === 'manual'
    ? Math.round(Number(data.progress) || 0)
    : calculateProcessProgress(stages, stageProgressById);

  const visibleTasks = data.taskViewMode === 'all'
    ? tasks
    : tasks.filter((task) => task.stageId === selectedStage?.id);
  const visibleExpenses = data.expenseViewMode === 'all'
    ? expenses
    : expenses.filter((expense) => expense.stageId === selectedStage?.id);

  const totalExpenses = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const budget = Number(data.budget);
  const hasBudget = Number.isFinite(budget);
  const balance = hasBudget ? budget - totalExpenses : null;

  return {
    id: card.id,
    title: card.title,
    description: card.description || '',
    status: data.status,
    statusLabel: STATUS_LABELS[data.status] ?? data.status,
    priority: data.priority,
    priorityLabel: PRIORITY_LABELS[data.priority] ?? data.priority,
    projectId: data.projectId ?? null,
    parentProcessId: data.parentProcessId ?? null,
    sourceStageId: data.sourceStageId ?? null,
    selectedStageId: selectedStage?.id ?? null,
    taskViewMode: data.taskViewMode,
    expenseViewMode: data.expenseViewMode,
    summary: {
      progress: processProgress,
      stageCount: stages.length,
      taskCount: tasks.length,
      participantCount: new Set(participants.map((item) => item.personId)).size,
      nearestDeadline: resolveNearestDeadline(stages, tasks),
      nearestDeadlineLabel: formatDate(resolveNearestDeadline(stages, tasks)),
      budget: hasBudget ? budget : null,
      budgetLabel: hasBudget ? formatMoney(budget, data.currency || 'RUB') : null,
      expenses: totalExpenses,
      expensesLabel: formatMoney(totalExpenses, data.currency || 'RUB'),
      balance,
      balanceLabel: balance == null ? null : formatMoney(balance, data.currency || 'RUB'),
      isOverBudget: balance != null && balance < 0,
    },
    stages: stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: stage.description || '',
      status: stage.status,
      statusLabel: STATUS_LABELS[stage.status] ?? stage.status,
      priority: stage.priority,
      priorityLabel: PRIORITY_LABELS[stage.priority] ?? stage.priority,
      order: stage.order,
      progress: stageProgressById[stage.id],
      dueDate: stage.dueDate ?? null,
      dueDateLabel: formatDate(stage.dueDate),
      taskCount: tasks.filter((task) => task.stageId === stage.id).length,
      activeTaskCount: tasks.filter((task) => task.stageId === stage.id && task.status !== 'completed').length,
      childProcessId: stage.childProcessId ?? null,
      isSelected: stage.id === selectedStage?.id,
    })),
    selectedStage: selectedStage ? {
      id: selectedStage.id,
      title: selectedStage.title,
      description: selectedStage.description || '',
      progress: stageProgressById[selectedStage.id],
      dueDate: selectedStage.dueDate ?? null,
      dueDateLabel: formatDate(selectedStage.dueDate),
      childProcessId: selectedStage.childProcessId ?? null,
    } : null,
    tasks: visibleTasks.map(presentTask),
    expenses: visibleExpenses.map(presentExpense),
    participants: participants.map((item) => presentParticipant(item, cardsById)),
    materials: (data.mediaAssignments ?? [])
      .slice()
      .sort(byOrder)
      .map((item) => presentMaterial(item, mediaById)),
    emptyStates: {
      stages: stages.length === 0,
      tasks: visibleTasks.length === 0,
      expenses: visibleExpenses.length === 0,
      participants: participants.length === 0,
      materials: (data.mediaAssignments ?? []).length === 0,
    },
  };
}
