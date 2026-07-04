import store from '../state/store.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getContact(state, contactId) {
  const contact = state.cards?.[contactId];
  if (!contact || contact.type !== 'person') throw new Error(`Contact not found: ${contactId}`);
  return contact;
}

function sortByUpdatedAt(items) {
  return items.slice().sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });
}

export function buildContactHistory(contactId, options = {}) {
  const stateStore = options.stateStore ?? store;
  const state = stateStore.getState();
  getContact(state, contactId);

  const projects = [];
  const processes = [];
  const tasks = [];
  const expenses = [];

  for (const card of Object.values(state.cards ?? {})) {
    if (card.type === 'project') {
      const primary = card.data?.primaryContact;
      if (primary?.personId === contactId || primary?.contactId === contactId) {
        projects.push({
          id: card.id,
          title: card.title,
          status: card.data?.status ?? null,
          role: 'Основной контакт',
          updatedAt: card.updatedAt,
        });
      }
      continue;
    }

    if (card.type !== 'process') continue;

    const participantLinks = asArray(card.data?.participants)
      .filter((item) => item.personId === contactId);

    if (participantLinks.length > 0) {
      processes.push({
        id: card.id,
        title: card.title,
        status: card.data?.status ?? null,
        roles: participantLinks.map((item) => item.role).filter(Boolean),
        participationStatuses: participantLinks.map((item) => item.participationStatus).filter(Boolean),
        projectId: card.data?.projectId ?? null,
        updatedAt: card.updatedAt,
      });
    }

    for (const task of asArray(card.data?.tasks)) {
      const assigneeIds = asArray(task.assigneeIds);
      if (!assigneeIds.includes(contactId)) continue;
      tasks.push({
        id: task.id,
        processId: card.id,
        processTitle: card.title,
        stageId: task.stageId ?? null,
        title: task.title,
        status: task.status ?? null,
        dueDate: task.dueDate ?? null,
        completed: task.status === 'completed' || task.completed === true,
        updatedAt: task.updatedAt ?? card.updatedAt,
      });
    }

    for (const expense of asArray(card.data?.expenses)) {
      if (expense.personId !== contactId && expense.recipientContactId !== contactId) continue;
      expenses.push({
        id: expense.id,
        processId: card.id,
        processTitle: card.title,
        title: expense.title,
        amount: Number(expense.amount) || 0,
        currency: expense.currency || 'RUB',
        paymentStatus: expense.paymentStatus ?? null,
        expenseDate: expense.expenseDate ?? null,
        updatedAt: expense.updatedAt ?? card.updatedAt,
      });
    }
  }

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const totalPaid = expenses
    .filter((expense) => expense.paymentStatus === 'paid')
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    contactId,
    summary: {
      projectCount: projects.length,
      processCount: processes.length,
      taskCount: tasks.length,
      activeTaskCount: activeTasks.length,
      completedTaskCount: completedTasks.length,
      expenseCount: expenses.length,
      totalPaid,
    },
    projects: sortByUpdatedAt(projects),
    processes: sortByUpdatedAt(processes),
    tasks: sortByUpdatedAt(tasks),
    expenses: sortByUpdatedAt(expenses),
    recentActivity: sortByUpdatedAt([
      ...projects.map((item) => ({ type: 'project', ...item })),
      ...processes.map((item) => ({ type: 'process', ...item })),
      ...tasks.map((item) => ({ type: 'task', ...item })),
      ...expenses.map((item) => ({ type: 'expense', ...item })),
    ]).slice(0, 20),
  };
}
