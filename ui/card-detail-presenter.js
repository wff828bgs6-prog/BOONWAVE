const STATUS_LABELS = Object.freeze({
  preparation: 'Подготовка',
  planned: 'Запланировано',
  active: 'Активно',
  draft: 'Черновик',
  in_progress: 'В работе',
  paused: 'На паузе',
  completed: 'Завершено',
});

const PRIORITY_LABELS = Object.freeze({
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
});

const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function addLine(lines, label, value) {
  if (!hasValue(value)) return;
  lines.push(`${label}: ${value}`);
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? numberFormatter.format(number) : null;
}

function formatDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : String(value);
}

function formatStatus(value) {
  return STATUS_LABELS[value] ?? value ?? null;
}

function formatPriority(value) {
  return PRIORITY_LABELS[value] ?? value ?? null;
}

function formatCount(value, singular, plural) {
  const count = Array.isArray(value) ? value.length : Number(value);
  if (!Number.isFinite(count) || count <= 0) return null;
  return `${count} ${count === 1 ? singular : plural}`;
}

function presentProject(data, lines) {
  addLine(lines, 'Статус', formatStatus(data.status));
  addLine(lines, 'Приоритет', formatPriority(data.priority));
  addLine(lines, 'Адрес', data.address);
  addLine(lines, 'Количество позиций', formatNumber(data.itemCount));
  addLine(lines, 'Дата договора', formatDate(data.contractDate));
  addLine(lines, 'Бюджет', formatNumber(data.budget));
  addLine(lines, 'Ожидаемая прибыль', formatNumber(data.expectedProfit));
  addLine(lines, 'Аванс', formatNumber(data.advance?.amount));
  addLine(lines, 'Дата аванса', formatDate(data.advance?.date));
  addLine(lines, 'Остаток', formatNumber(data.balance?.amount));
  addLine(lines, 'Дата остатка', formatDate(data.balance?.date));
  addLine(lines, 'Основной контакт', data.primaryContact?.name);
  addLine(lines, 'Телефон', data.primaryContact?.phone);
  addLine(lines, 'Email', data.primaryContact?.email);
  addLine(lines, 'Предварительная информация', data.preliminaryInfo);
  addLine(lines, 'Изображения', formatCount(data.images, 'файл', 'файлов'));
  addLine(lines, 'Документы', formatCount(data.documents, 'файл', 'файлов'));
  addLine(lines, 'Другие материалы', formatCount(data.files, 'файл', 'файлов'));
}

function presentProcess(data, lines) {
  addLine(lines, 'Статус', formatStatus(data.status));
  addLine(lines, 'Приоритет', formatPriority(data.priority));
  addLine(lines, 'Прогресс', Number.isFinite(Number(data.progress)) ? `${Math.round(Number(data.progress))}%` : null);
  addLine(lines, 'Начало', formatDate(data.startDate));
  addLine(lines, 'Срок', formatDate(data.dueDate));
  addLine(lines, 'Задачи', formatCount(data.tasks, 'задача', 'задач'));
  addLine(lines, 'Заметки', data.notes);
  addLine(lines, 'Вложения', formatCount(data.attachments, 'файл', 'файлов'));
}

function presentPerson(data, lines) {
  addLine(lines, 'Имя', data.fullName);
  addLine(lines, 'Роль', data.role);
  addLine(lines, 'Организация', data.organization);
  addLine(lines, 'Телефон', data.phone);
  addLine(lines, 'Email', data.email);
  addLine(lines, 'Заметки', data.notes);
  addLine(lines, 'Мессенджеры', formatCount(data.messengers, 'контакт', 'контактов'));
  addLine(lines, 'Ссылки', formatCount(data.websites, 'ссылка', 'ссылок'));
  addLine(lines, 'Вложения', formatCount(data.attachments, 'файл', 'файлов'));
}

function presentIdea(data, lines) {
  addLine(lines, 'Статус', formatStatus(data.status));
  addLine(lines, 'Категория', data.category);
  addLine(lines, 'Потенциал', data.impact);
  addLine(lines, 'Заметки', data.notes);
  addLine(lines, 'Вложения', formatCount(data.attachments, 'файл', 'файлов'));
}

function presentGoal(data, lines) {
  addLine(lines, 'Статус', formatStatus(data.status));
  addLine(lines, 'Приоритет', formatPriority(data.priority));
  addLine(lines, 'Целевая дата', formatDate(data.targetDate));
  addLine(lines, 'Прогресс', Number.isFinite(Number(data.progress)) ? `${Math.round(Number(data.progress))}%` : null);
  addLine(lines, 'Метрика', data.metric?.name);
  addLine(lines, 'Текущее значение', formatNumber(data.metric?.current));
  addLine(lines, 'Целевое значение', formatNumber(data.metric?.target));
  addLine(lines, 'Единица измерения', data.metric?.unit);
  addLine(lines, 'Заметки', data.notes);
  addLine(lines, 'Вложения', formatCount(data.attachments, 'файл', 'файлов'));
}

export function getCardDetailLines(card = {}) {
  const data = card.data ?? {};
  const lines = [];

  if (card.type === 'project') presentProject(data, lines);
  else if (card.type === 'process') presentProcess(data, lines);
  else if (card.type === 'person') presentPerson(data, lines);
  else if (card.type === 'idea') presentIdea(data, lines);
  else if (card.type === 'goal') presentGoal(data, lines);

  return lines;
}

export function formatCardDetails(card) {
  return getCardDetailLines(card).join('\n');
}
