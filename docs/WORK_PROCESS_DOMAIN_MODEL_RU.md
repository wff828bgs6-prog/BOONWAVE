# BOONWAVE — доменная модель рабочего процесса

Статус: проектирование перед runtime-реализацией.
Ветка: `codex/work-process-domain-model`.
Основа: текущий `main` и функциональный реестр карточки «Рабочий процесс».

## 1. Общие правила

- `WorkProcess` остаётся карточкой типа `process` в общей модели `Node`.
- Этапы, задачи, расходы, участники и назначения материалов являются дочерними сущностями процесса.
- Все изменения выполняются через service/controller слой и storage adapter.
- Архивирование не удаляет связанные данные.
- Ссылки на материалы не создают физические копии файлов.
- Порядок этапов и задач хранится явно.

## 2. WorkProcessData

```ts
interface WorkProcessData {
  projectId?: string | null;
  parentProcessId?: string | null;
  sourceStageId?: string | null;
  status: ProcessStatus;
  priority: Priority;
  startDate?: string | null;
  deadline?: string | null;
  budgetAmount?: number | null;
  progressMode: "manual" | "from-stages";
  manualProgress?: number | null;
  selectedStageId?: string | null;
  taskViewMode: "selected-stage" | "all";
  expenseViewMode: "selected-stage" | "all";
  notes?: string;
  risks?: string;
}

type ProcessStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

type Priority = "low" | "medium" | "high";
```

## 3. Stage

```ts
interface Stage {
  id: string;
  processId: string;
  title: string;
  description?: string;
  status: StageStatus;
  priority?: Priority;
  order: number;
  startDate?: string | null;
  deadline?: string | null;
  progressMode: "manual" | "from-tasks" | "from-child-process";
  manualProgress?: number | null;
  childProcessId?: string | null;
  responsiblePersonId?: string | null;
  participantIds: string[];
  notes?: string;
  lifecycleStatus: LifecycleStatus;
  archivedAt?: string | null;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type StageStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";
```

### Правила Stage

- `order` уникален только внутри одного процесса.
- Выбранный этап хранится в `WorkProcessData.selectedStageId`.
- Если этап вынесен в дочерний процесс, `childProcessId` обязателен.
- Для этапа-ссылки используется `progressMode = "from-child-process"`.
- Архивный или удалённый этап не может оставаться выбранным.

## 4. Task

```ts
interface Task {
  id: string;
  processId: string;
  stageId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  order: number;
  deadline?: string | null;
  reminderAt?: string | null;
  assigneePersonId?: string | null;
  progress?: number | null;
  isCurrent: boolean;
  notes?: string;
  lifecycleStatus: LifecycleStatus;
  archivedAt?: string | null;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type TaskStatus =
  | "todo"
  | "in-progress"
  | "blocked"
  | "completed"
  | "cancelled";
```

### Правила Task

- `stageId` обязателен.
- `order` уникален только внутри одного этапа.
- Перенос внутри этапа меняет `order`.
- Перенос между этапами меняет `stageId` и `order`.
- Подзадачи, назначения материалов, исполнитель, заметки и история сохраняются.
- В одном workspace может быть одна главная задача с `isCurrent = true`; очередь «Дальше» хранится отдельным порядком или отдельной моделью фокуса.

## 5. Subtask

```ts
interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
  deadline?: string | null;
  assigneePersonId?: string | null;
  comment?: string;
  lifecycleStatus: LifecycleStatus;
  createdAt: string;
  updatedAt: string;
}
```

## 6. Expense

```ts
interface Expense {
  id: string;
  processId: string;
  stageId: string;
  title: string;
  amount: number;
  currency: string;
  expenseDate: string;
  category?: string;
  recipient?: string;
  comment?: string;
  paymentStatus: "expected" | "paid";
  receiptMediaId?: string | null;
  lifecycleStatus: LifecycleStatus;
  archivedAt?: string | null;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Правила Expense

- Быстро добавленный расход получает текущий `selectedStageId`.
- Если этап не выбран, интерфейс обязан запросить этап до сохранения.
- Удаление подтверждающего файла не удаляет оригинал из проекта.
- Общие расходы процесса — сумма активных расходов всех этапов.

## 7. ProcessParticipant

```ts
interface ProcessParticipant {
  id: string;
  processId: string;
  personId: string;
  role?: string;
  responsibility?: string;
  participationStatus: "invited" | "active" | "paused" | "completed";
  stageIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Правила ProcessParticipant

- Верхний показатель «Участники» считает уникальных активных `personId`.
- Роль не является отдельным участником.
- Один человек может участвовать в нескольких этапах.

## 8. MediaAssignment

```ts
interface MediaAssignment {
  id: string;
  mediaId: string;
  projectId: string;
  processId?: string | null;
  stageId?: string | null;
  taskId?: string | null;
  purpose?: string;
  order?: number;
  createdAt: string;
}
```

### Правила MediaAssignment

- `mediaId` указывает на оригинал в библиотеке проекта.
- Назначение может относиться к процессу, этапу или задаче.
- Удаление назначения удаляет только запись `MediaAssignment`.
- Полное удаление оригинала выполняется только из проекта после проверки зависимостей.

## 9. LifecycleStatus

```ts
type LifecycleStatus = "active" | "archived" | "trashed";
```

Окончательно удалённые записи физически отсутствуют в storage.

Правила переходов:

- `active → archived`;
- `archived → active`;
- `archived → trashed`;
- `trashed → active` или `trashed → archived`;
- `trashed → permanent delete` только после подтверждения.

## 10. Команды

Минимальный командный контракт:

```ts
createStage(processId, input)
updateStage(stageId, patch)
selectStage(processId, stageId)
reorderStage(stageId, targetOrder)
archiveStage(stageId)
restoreStage(stageId)
trashStage(stageId)
permanentlyDeleteStage(stageId)

createTask(stageId, input)
updateTask(taskId, patch)
reorderTask(taskId, targetOrder)
moveTaskToStage(taskId, targetStageId, targetOrder)
archiveTask(taskId)
restoreTask(taskId)
trashTask(taskId)
permanentlyDeleteTask(taskId)

createExpense(stageId, input)
updateExpense(expenseId, patch)
deleteExpense(expenseId)

addProcessParticipant(processId, personId, input)
updateProcessParticipant(participantId, patch)
removeProcessParticipant(participantId)

assignMedia(target, mediaId, input)
unassignMedia(assignmentId)

convertStageToChildProcess(stageId, input)
createChildProcess(parentProcessId, input)
```

## 11. Преобразование этапа в дочерний процесс

Команда `convertStageToChildProcess` выполняется транзакционно:

1. Проверяет этап и родительский процесс.
2. Создаёт новый `process` Node.
3. Устанавливает `parentProcessId` нового процесса.
4. Устанавливает `sourceStageId` нового процесса.
5. Записывает `childProcessId` в исходный этап.
6. Переключает этап на `progressMode = "from-child-process"`.
7. Создаёт направленную связь между процессами.
8. Переносит выбранные задачи и материалы по подтверждённым правилам.
9. Сохраняет всё одной транзакцией.
10. Возвращает созданный процесс и обновлённый этап.

Операция должна поддерживать undo до появления внешней синхронизации.

## 12. Пересчёт прогресса

Предварительное правило:

- прогресс задачи задаётся статусом или вручную;
- прогресс этапа `from-tasks` — среднее активных задач этапа;
- этап без задач имеет 0%, если не завершён вручную;
- прогресс этапа-ссылки равен прогрессу дочернего процесса;
- прогресс процесса `from-stages` — среднее активных этапов;
- архивные и удалённые элементы не участвуют в расчёте.

Формула должна быть вынесена в чистые функции и покрыта unit-тестами.

## 13. Инварианты

- задача принадлежит одному процессу и одному этапу;
- этап принадлежит одному процессу;
- расход принадлежит одному этапу и процессу;
- `selectedStageId` указывает только на активный этап этого процесса;
- `childProcessId` не может указывать на родительский процесс;
- циклы родительства процессов запрещены;
- `order` нормализуется после перемещения и удаления;
- удаление назначения материала не удаляет media record;
- permanent delete не допускается вне корзины;
- системная карточка «Я Есмь» не участвует в этой модели удаления.

## 14. Следующий шаг

После утверждения документа:

1. сверить модель с существующими domain schemas и migrations;
2. адаптировать названия полей к текущему runtime;
3. добавить команды service-слоя;
4. добавить unit-тесты инвариантов и прогресса;
5. затем переходить к UI выбора этапа и фильтрации задач/расходов.
