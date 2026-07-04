import { normalizeNodeView } from '../domain/node.js';
import { presentWorkProcess } from './work-process-presenter.js';
import { getCoverMediaId, getCoverPreviewUrl } from './card-presentation.js';

const STATUS_LABELS = Object.freeze({
  preparation: 'Подготовка',
  planned: 'Запланировано',
  active: 'Активно',
  draft: 'Черновик',
  in_progress: 'В работе',
  paused: 'На паузе',
  completed: 'Завершено',
  cancelled: 'Отменено',
  waiting: 'Ожидание',
});

const FIELD_LABELS = Object.freeze({
  status: 'Статус',
  address: 'Адрес',
  city: 'Город',
  role: 'Роль',
  profession: 'Профессия',
  organization: 'Организация',
  phone: 'Телефон',
  email: 'Email',
  website: 'Сайт',
  instagram: 'Instagram',
  telegram: 'Telegram',
  category: 'Категория',
  priority: 'Приоритет',
  progress: 'Прогресс',
  budget: 'Бюджет',
});

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

function esc(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[ch]));
}

function htmlToElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function formatStatus(value) {
  return STATUS_LABELS[value] ?? value ?? '—';
}

function formatMoney(value, currency = 'RUB') {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${moneyFormatter.format(number)}${currency === 'RUB' ? ' ₽' : ` ${currency}`}`;
}

function formatDate(value) {
  if (!value) return '—';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : String(value);
}

function clampProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function activeOnly(items = []) {
  return items.filter((item) => (item.lifecycleStatus ?? 'active') === 'active');
}

function sumExpenses(expenses = []) {
  return expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
}

function getCardTypeLabel(card) {
  if (card.type === 'project') return 'Проект';
  if (card.type === 'process') return 'Рабочий процесс';
  if (card.type === 'person') return 'Контакт';
  if (card.type === 'persona') return 'Персона';
  if (card.type === 'goal') return 'Цель';
  if (card.type === 'idea') return 'Идея';
  if (card.type === 'self') return 'Моя вселенная';
  return card.type ?? 'Карточка';
}

function getHero(card) {
  const previewUrl = getCoverPreviewUrl(card, 'detail') || getCoverPreviewUrl(card, 'working') || getCoverPreviewUrl(card, 'compact');
  const mediaId = getCoverMediaId(card, 'detail') || getCoverMediaId(card, 'working') || getCoverMediaId(card, 'compact');
  return {
    src: previewUrl || 'assets/boonwave-logo.svg',
    mediaId: previewUrl ? null : mediaId,
    isFallback: !previewUrl && !mediaId,
    fitClass: (!previewUrl && !mediaId) ? 'bw-v3-card__hero-img--logo' : 'bw-v3-card__hero-img--photo',
  };
}

function stat(label, value, important = false) {
  return `<div class="bw-v3-stat${important ? ' is-important' : ''}"><div class="bw-v3-stat__label">${esc(label)}</div><div class="bw-v3-stat__value">${esc(value)}</div></div>`;
}

function progressBar(value) {
  const progress = clampProgress(value);
  return `<div class="bw-v3-bar" aria-hidden="true"><span style="width:${progress}%"></span></div>`;
}

function findProjectProcess(project, cards) {
  const processes = Object.values(cards).filter((card) => card.type === 'process');
  return processes.find((card) => card.data?.projectId === project.id) ?? null;
}

function getProjectExpenses(process) {
  return sumExpenses(process?.data?.expenses ?? []);
}

function materialItems(card, hero) {
  const data = card.data ?? {};
  const rawItems = [
    ...(data.images ?? []),
    ...(data.documents ?? []),
    ...(data.files ?? []),
    ...(data.attachments ?? []),
  ];
  return rawItems.slice(0, 12).map((item, index) => ({
    name: item.name || item.fileName || item.title || `Материал ${index + 1}`,
    src: item.previewUrl || hero.src,
    mediaId: item.previewUrl ? null : item.mediaId,
  }));
}

function heroSection(card, hero, title, meta) {
  return `<section class="bw-v3-card__hero">
    <img class="bw-v3-card__hero-img ${hero.fitClass}" src="${esc(hero.src)}" ${hero.mediaId ? `data-v3-media-id="${esc(hero.mediaId)}"` : ''} alt="Обложка: ${esc(title)}">
    <div class="bw-v3-card__hero-text"><div class="bw-v3-card__hero-title">${esc(title)}</div>${meta ? `<div class="bw-v3-card__hero-meta">${esc(meta)}</div>` : ''}</div>
  </section>`;
}

function actionBar({ processId = null, canDisplay = true } = {}) {
  return `<div class="bw-v3-actions">
    ${processId ? `<button class="bw-v3-action" type="button" data-v3-open-card="${esc(processId)}">Рабочий процесс</button>` : `<button class="bw-v3-action bw-v3-disabled" type="button" disabled>Рабочий процесс</button>`}
    <button class="bw-v3-action bw-v3-action--primary" type="button" data-v3-edit>Редактировать</button>
    ${canDisplay ? '<button class="bw-v3-action" type="button" data-v3-display>Формат</button>' : ''}
    <button class="bw-v3-action bw-v3-action--danger" type="button" data-v3-archive>В архив</button>
    <button class="bw-v3-action bw-v3-action--danger" type="button" data-v3-delete>Удалить</button>
  </div>`;
}

export function createProjectDetailV3(card, context = {}) {
  const data = card.data ?? {};
  const cards = context.cards ?? {};
  const process = findProjectProcess(card, cards);
  const processData = process?.data ?? {};
  const hero = getHero(card);
  const materials = materialItems(card, hero);
  const stageCount = activeOnly(processData.stages ?? []).length;
  const taskCount = activeOnly(processData.tasks ?? []).filter((task) => task.status !== 'completed').length;
  const participantCount = new Set((processData.participants ?? []).map((item) => item.personId).filter(Boolean)).size;
  const summary = process ? `${stageCount} этапа · ${taskCount} открытых задач · ${participantCount} человек` : 'Рабочий процесс ещё не связан';
  const materialCount = (data.images?.length ?? 0) + (data.documents?.length ?? 0) + (data.files?.length ?? 0) + (data.attachments?.length ?? 0);
  const meta = [data.address || data.city || 'Вселенная', data.category].filter(Boolean).join(' · ');

  return htmlToElement(`<article class="bw-v3-card bw-v3-card--project" role="document" data-v3-card-id="${esc(card.id)}" data-v3-card-type="project">
    <header><div class="bw-v3-card__eyebrow">Проект</div><h1 class="bw-v3-card__title">${esc(card.title)}</h1></header>
    ${heroSection(card, hero, card.title, meta)}
    <section class="bw-v3-grid">
      ${stat('Статус', formatStatus(data.status), true)}
      ${stat('Ближайший срок', formatDate(processData.dueDate || data.balance?.date || data.contractDate))}
      ${stat('Бюджет', formatMoney(data.budget, data.currency || 'RUB'))}
      ${stat('Аванс / Остаток', `${formatMoney(data.advance?.amount, data.currency || 'RUB')} / ${formatMoney(data.balance?.amount, data.currency || 'RUB')}`)}
      ${stat('Позиции', data.itemCount ?? '—')}
      ${stat('Затраты', formatMoney(getProjectExpenses(process), data.currency || 'RUB'))}
    </section>
    <section class="bw-v3-section"><h3>О проекте</h3><div class="bw-v3-box">${esc(card.description || data.preliminaryInfo || 'Описание проекта пока не заполнено.')}</div></section>
    <section class="bw-v3-section"><div class="bw-v3-section__head"><h3>Основные материалы · ${materialCount || materials.length}</h3><button class="bw-v3-pill" type="button" data-v3-action="add-material">+ Добавить</button></div><div class="bw-v3-scroll">${materials.length ? materials.map((item) => `<div class="bw-v3-material"><img src="${esc(item.src)}" ${item.mediaId ? `data-v3-media-id="${esc(item.mediaId)}"` : ''} alt=""><span>${esc(item.name)}</span></div>`).join('') : '<div class="bw-v3-empty">Материалы пока не добавлены</div>'}</div></section>
    <section class="bw-v3-section"><div class="bw-v3-section__head"><h3>Рабочий процесс</h3>${process ? `<button class="bw-v3-pill" type="button" data-v3-open-card="${esc(process.id)}">Открыть</button>` : ''}</div><div class="bw-v3-summary">${esc(summary)}</div></section>
    ${actionBar({ processId: process?.id })}
  </article>`);
}

export function createProcessDetailV3(card, context = {}) {
  const cards = context.cards ?? {};
  const data = card.data ?? {};
  const hero = getHero(card);
  const project = data.projectId ? cards[data.projectId] : null;
  const presented = presentWorkProcess(card, { cardsById: cards, mediaById: context.mediaById ?? {} });
  const selectedStage = presented.selectedStage ?? presented.stages[0] ?? null;

  return htmlToElement(`<article class="bw-v3-card bw-v3-card--process" role="document" data-v3-card-id="${esc(card.id)}" data-v3-card-type="process">
    <header><div class="bw-v3-card__eyebrow">Рабочий процесс</div><h1 class="bw-v3-card__title">${esc(card.title)}</h1></header>
    ${heroSection(card, hero, card.title, `Проект: ${project?.title ?? 'не выбран'}`)}
    <section class="bw-v3-grid bw-v3-grid--process">
      ${stat('Бюджет', presented.summary.budgetLabel ?? formatMoney(data.budget, data.currency || 'RUB'), true)}
      ${stat('Расходы', presented.summary.expensesLabel ?? '—')}
      ${stat('Этапы', presented.summary.stageCount)}
      ${stat('Задачи', presented.summary.taskCount)}
      ${stat('Роли', presented.summary.participantCount, true)}
    </section>
    <section class="bw-v3-progress"><span class="bw-v3-kicker">Прогресс</span><strong>${presented.summary.progress}%</strong>${progressBar(presented.summary.progress)}</section>
    <section class="bw-v3-section"><div class="bw-v3-section__head"><h3>Этапы</h3><button class="bw-v3-icon-btn" type="button" data-v3-action="add-stage">+</button></div><div class="bw-v3-rows">${presented.stages.length ? presented.stages.map((stage) => `<button class="bw-v3-row${stage.isSelected ? ' is-selected' : ''}" type="button" data-v3-stage-id="${esc(stage.id)}"><span><span class="bw-v3-row__title">${esc(stage.title)}</span><span class="bw-v3-row__meta">${esc(stage.dueDateLabel ?? 'Без срока')}</span></span>${progressBar(stage.progress)}</button>`).join('') : '<div class="bw-v3-empty">Этапы пока не добавлены</div>'}</div></section>
    <section class="bw-v3-section"><div class="bw-v3-section__head"><div><div class="bw-v3-kicker">Задачи конкретного этапа</div><h3>${esc(selectedStage?.title ?? 'Без этапа')}</h3></div><button class="bw-v3-icon-btn" type="button" data-v3-action="add-task">+</button></div><div class="bw-v3-rows">${presented.tasks.length ? presented.tasks.map((task) => `<div class="bw-v3-task"><span class="bw-v3-check">${task.completed ? '✓' : ''}</span><span><span class="bw-v3-row__title">${esc(task.title)}</span><span class="bw-v3-row__meta">${esc(task.priorityLabel || task.statusLabel || '')}</span></span><span class="bw-v3-dot" aria-hidden="true"></span></div>`).join('') : '<div class="bw-v3-empty">Задачи выбранного этапа пока не добавлены</div>'}</div></section>
    <section class="bw-v3-section"><div class="bw-v3-section__head"><div><div class="bw-v3-kicker">Финансы рабочего процесса</div><h3>Затраты</h3></div><button class="bw-v3-icon-btn" type="button" data-v3-action="add-expense">+</button></div><div class="bw-v3-rows">${presented.expenses.length ? presented.expenses.map((expense) => `<div class="bw-v3-row"><span><span class="bw-v3-row__title">${esc(expense.title)}</span><span class="bw-v3-row__meta">${esc(expense.category || expense.paymentStatusLabel || '')}</span></span><strong>${esc(expense.amountLabel ?? '—')}</strong></div>`).join('') : '<div class="bw-v3-empty">Затраты пока не добавлены</div>'}</div></section>
    <div class="bw-v3-actions"><button class="bw-v3-action" type="button" data-v3-action="create-branch">Создать ветвь</button><button class="bw-v3-action bw-v3-action--primary" type="button" data-v3-edit>Редактировать</button><button class="bw-v3-action" type="button" data-v3-display>Формат</button><button class="bw-v3-action bw-v3-action--danger" type="button" data-v3-archive>В архив</button><button class="bw-v3-action bw-v3-action--danger" type="button" data-v3-delete>Удалить</button></div>
  </article>`);
}

export function createGenericDetailV3(card) {
  const hero = getHero(card);
  const view = normalizeNodeView(card.view);
  const fields = Object.entries(card.data ?? {})
    .filter(([key, value]) => value !== '' && value !== null && value !== undefined && !key.includes('MediaId') && !key.includes('PreviewUrl') && !key.includes('Crop') && !['images', 'documents', 'files', 'attachments'].includes(key))
    .slice(0, 14);
  return htmlToElement(`<article class="bw-v3-card bw-v3-card--generic" role="document" data-v3-card-id="${esc(card.id)}" data-v3-card-type="${esc(card.type)}">
    <header><div class="bw-v3-card__eyebrow">${esc(getCardTypeLabel(card))}</div><h1 class="bw-v3-card__title">${esc(card.title)}</h1></header>
    ${heroSection(card, hero, card.title, view.compactLabel || card.description || '')}
    <section class="bw-v3-section"><h3>Описание</h3><div class="bw-v3-box">${esc(card.description || 'Описание пока не заполнено.')}</div></section>
    <section class="bw-v3-section"><h3>Заполненные поля</h3><div class="bw-v3-generic-fields">${fields.length ? fields.map(([key, value]) => `<div class="bw-v3-field"><span>${esc(FIELD_LABELS[key] ?? key)}</span><span>${esc(typeof value === 'object' ? JSON.stringify(value) : value)}</span></div>`).join('') : '<div class="bw-v3-empty">Заполненных дополнительных полей пока нет</div>'}</div></section>
    <div class="bw-v3-actions"><button class="bw-v3-action bw-v3-action--primary" type="button" data-v3-edit>Редактировать</button><button class="bw-v3-action" type="button" data-v3-display>Формат</button><button class="bw-v3-action bw-v3-action--danger" type="button" data-v3-archive>В архив</button><button class="bw-v3-action bw-v3-action--danger" type="button" data-v3-delete>Удалить</button></div>
  </article>`);
}

export function createCardDetailV3(card, context = {}) {
  if (card.type === 'project') return createProjectDetailV3(card, context);
  if (card.type === 'process') return createProcessDetailV3(card, context);
  return createGenericDetailV3(card, context);
}
