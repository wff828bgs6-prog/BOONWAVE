const COMPLETE_STATUSES = new Set(['completed', 'done', 'cancelled']);

function uniqueCards(cards = []) {
  const map = new Map();
  for (const card of cards) {
    if (card?.id) map.set(card.id, card);
  }
  return [...map.values()];
}

function isActive(card) {
  return card && !COMPLETE_STATUSES.has(card.data?.status);
}

function getOutgoing(state, sourceIds, relationTypes) {
  const sources = new Set(Array.isArray(sourceIds) ? sourceIds : [sourceIds]);
  const types = new Set(Array.isArray(relationTypes) ? relationTypes : [relationTypes]);
  return (state.links ?? [])
    .filter((link) => sources.has(link.sourceId) && types.has(link.type))
    .map((link) => state.cards?.[link.targetId])
    .filter(Boolean);
}

function getIncomingBlockers(state, targetIds) {
  const targets = new Set(Array.isArray(targetIds) ? targetIds : [targetIds]);
  return (state.links ?? [])
    .filter((link) => link.type === 'blocks' && targets.has(link.targetId))
    .map((link) => state.cards?.[link.sourceId])
    .filter(Boolean);
}

function getTaskTitle(task) {
  if (!task || typeof task !== 'object') return null;
  return String(task.title ?? task.text ?? '').trim() || null;
}

function isTaskComplete(task) {
  return Boolean(task?.completed) || COMPLETE_STATUSES.has(task?.status);
}

function getProgress(values, fallback = null) {
  const valid = values.map(Number).filter(Number.isFinite);
  if (valid.length === 0) return fallback;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function isOverdue(card, now = new Date()) {
  if (!isActive(card) || !card.data?.dueDate) return false;
  const due = new Date(card.data.dueDate);
  return Number.isFinite(due.getTime()) && due.getTime() < now.getTime();
}

export function buildProcessSummary(process, state = {}, now = new Date()) {
  const tasks = Array.isArray(process?.data?.tasks) ? process.data.tasks : [];
  const completeTasks = tasks.filter(isTaskComplete);
  const nextTask = tasks.find((task) => !isTaskComplete(task));
  const explicitProgress = Number(process?.data?.progress);
  const calculatedProgress = tasks.length > 0
    ? Math.round((completeTasks.length / tasks.length) * 100)
    : 0;
  const blockers = getIncomingBlockers(state, process?.id);

  return {
    id: process?.id ?? null,
    title: process?.title ?? '',
    progress: Number.isFinite(explicitProgress) ? explicitProgress : calculatedProgress,
    tasksTotal: tasks.length,
    tasksCompleted: completeTasks.length,
    nextAction: getTaskTitle(nextTask),
    dueDate: process?.data?.dueDate ?? null,
    overdue: isOverdue(process, now),
    blockers,
  };
}

export function buildProjectSummary(project, state = {}, now = new Date()) {
  const processes = getOutgoing(state, project?.id, 'project_process')
    .filter((card) => card.type === 'process' && isActive(card));
  const processSummaries = processes.map((process) => buildProcessSummary(process, state, now));
  const blockers = getIncomingBlockers(state, [project?.id, ...processes.map((card) => card.id)]);
  const next = processSummaries.find((summary) => summary.nextAction)
    ?? processSummaries.find((summary) => summary.overdue)
    ?? processSummaries[0]
    ?? null;

  return {
    id: project?.id ?? null,
    title: project?.title ?? '',
    processes,
    processSummaries,
    progress: getProgress(processSummaries.map((summary) => summary.progress), null),
    overdueProcesses: processSummaries.filter((summary) => summary.overdue).length,
    blockers: uniqueCards(blockers),
    nextAction: next?.nextAction ?? next?.title ?? null,
  };
}

export function buildGoalSummary(goal, state = {}, now = new Date()) {
  const projects = getOutgoing(state, goal?.id, 'goal_project')
    .filter((card) => card.type === 'project' && isActive(card));
  const projectSummaries = projects.map((project) => buildProjectSummary(project, state, now));
  const explicitProgress = Number(goal?.data?.progress);
  const linkedProgress = getProgress(
    projectSummaries.map((summary) => summary.progress).filter(Number.isFinite),
    null,
  );
  const next = projectSummaries.find((summary) => summary.nextAction) ?? projectSummaries[0] ?? null;

  return {
    id: goal?.id ?? null,
    title: goal?.title ?? '',
    projects,
    projectSummaries,
    progress: linkedProgress ?? (Number.isFinite(explicitProgress) ? explicitProgress : 0),
    blockers: uniqueCards(projectSummaries.flatMap((summary) => summary.blockers)),
    nextAction: next?.nextAction ?? next?.title ?? null,
  };
}

export function buildSelfHierarchy(selfCard, state = {}, now = new Date()) {
  const directGoals = getOutgoing(state, selfCard?.id, 'self_goal')
    .filter((card) => card.type === 'goal' && isActive(card));
  const directProjects = getOutgoing(state, selfCard?.id, 'self_project')
    .filter((card) => card.type === 'project' && isActive(card));
  const goalSummaries = directGoals.map((goal) => buildGoalSummary(goal, state, now));
  const projectsFromGoals = goalSummaries.flatMap((summary) => summary.projects);
  const projects = uniqueCards([...directProjects, ...projectsFromGoals]);
  const projectSummaries = projects.map((project) => buildProjectSummary(project, state, now));
  const processes = uniqueCards(projectSummaries.flatMap((summary) => summary.processes));
  const hasHierarchyLinks = (state.links ?? []).some((link) => (
    link.sourceId === selfCard?.id && (link.type === 'self_goal' || link.type === 'self_project')
  ));

  if (!hasHierarchyLinks) {
    const fallbackGoals = Object.values(state.cards ?? {}).filter((card) => card.type === 'goal' && isActive(card));
    const fallbackProjects = Object.values(state.cards ?? {}).filter((card) => card.type === 'project' && isActive(card));
    const fallbackProcesses = Object.values(state.cards ?? {}).filter((card) => card.type === 'process' && isActive(card));
    return {
      goals: fallbackGoals,
      projects: fallbackProjects,
      processes: fallbackProcesses,
      goalSummaries: fallbackGoals.map((goal) => buildGoalSummary(goal, state, now)),
      projectSummaries: fallbackProjects.map((project) => buildProjectSummary(project, state, now)),
      structured: false,
    };
  }

  return {
    goals: directGoals,
    projects,
    processes,
    goalSummaries,
    projectSummaries,
    structured: true,
  };
}

export function formatProjectGraphSummary(project, state = {}) {
  const summary = buildProjectSummary(project, state);
  if (summary.processes.length === 0) return '';
  const lines = [
    `Рабочие процессы: ${summary.processes.length}`,
    `Сводный прогресс: ${summary.progress ?? 0}%`,
  ];
  if (summary.overdueProcesses > 0) lines.push(`Просрочено процессов: ${summary.overdueProcesses}`);
  if (summary.blockers.length > 0) lines.push(`Блокеры: ${summary.blockers.map((card) => card.title).join(', ')}`);
  if (summary.nextAction) lines.push(`Следующий шаг: ${summary.nextAction}`);
  return lines.join('\n');
}

export function formatGoalGraphSummary(goal, state = {}) {
  const summary = buildGoalSummary(goal, state);
  if (summary.projects.length === 0) return '';
  const lines = [
    `Связанные проекты: ${summary.projects.length}`,
    `Расчётный прогресс: ${summary.progress}%`,
  ];
  if (summary.blockers.length > 0) lines.push(`Блокеры: ${summary.blockers.map((card) => card.title).join(', ')}`);
  if (summary.nextAction) lines.push(`Следующий шаг: ${summary.nextAction}`);
  return lines.join('\n');
}
