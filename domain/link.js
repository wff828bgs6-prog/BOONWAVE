export const LINK_SCHEMA_VERSION = 2;

export const LINK_TYPES = Object.freeze([
  'self_goal',
  'self_project',
  'goal_project',
  'project_process',
  'idea_goal',
  'idea_project',
  'responsible',
  'client',
  'contractor',
  'blocks',
  'depends_on',
  'awaiting_response',
  'related',
]);

export const LINK_TYPE_LABELS = Object.freeze({
  self_goal: 'цель пользователя',
  self_project: 'активный проект пользователя',
  goal_project: 'реализует цель',
  project_process: 'рабочий процесс проекта',
  idea_goal: 'идея развита в цель',
  idea_project: 'идея развита в проект',
  responsible: 'ответственный',
  client: 'клиент',
  contractor: 'подрядчик',
  blocks: 'блокирует',
  depends_on: 'зависит от',
  awaiting_response: 'ожидаем ответ',
  related: 'связано',
});

const CORE_RELATIONS = Object.freeze([
  { type: 'self_goal', sourceType: 'self', targetType: 'goal' },
  { type: 'self_project', sourceType: 'self', targetType: 'project' },
  { type: 'goal_project', sourceType: 'goal', targetType: 'project' },
  { type: 'project_process', sourceType: 'project', targetType: 'process' },
  { type: 'idea_goal', sourceType: 'idea', targetType: 'goal' },
  { type: 'idea_project', sourceType: 'idea', targetType: 'project' },
  { type: 'responsible', sourceType: 'process', targetType: 'person' },
]);

const makeId = () => `link_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;

function findCoreRelation(sourceType, targetType, requestedType = null) {
  const candidates = requestedType
    ? CORE_RELATIONS.filter((definition) => definition.type === requestedType)
    : CORE_RELATIONS;

  for (const definition of candidates) {
    if (definition.sourceType === sourceType && definition.targetType === targetType) {
      return { ...definition, reverse: false };
    }
    if (definition.sourceType === targetType && definition.targetType === sourceType) {
      return { ...definition, reverse: true };
    }
  }
  return null;
}

export function inferLinkType(sourceCard, targetCard) {
  const definition = findCoreRelation(sourceCard?.type, targetCard?.type);
  if (definition) return definition.type;
  if (sourceCard?.type === 'project' && targetCard?.type === 'person') return 'client';
  if (sourceCard?.type === 'person' && targetCard?.type === 'project') return 'client';
  return 'related';
}

export function normalizeLink(raw = {}, cards = {}) {
  let sourceId = String(raw.sourceId ?? raw.fromId ?? '').trim();
  let targetId = String(raw.targetId ?? raw.toId ?? '').trim();
  const sourceCard = cards?.[sourceId];
  const targetCard = cards?.[targetId];
  const requestedType = LINK_TYPES.includes(raw.type) ? raw.type : null;
  const inferredType = requestedType ?? inferLinkType(sourceCard, targetCard);
  const core = findCoreRelation(sourceCard?.type, targetCard?.type, inferredType);

  if (core?.reverse) {
    [sourceId, targetId] = [targetId, sourceId];
  }

  return {
    ...raw,
    id: String(raw.id ?? '').trim() || makeId(),
    schemaVersion: LINK_SCHEMA_VERSION,
    sourceId,
    targetId,
    type: inferredType,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function createLinkRecord({ sourceId, targetId, type } = {}, cards = {}) {
  return normalizeLink({ sourceId, targetId, type }, cards);
}

export function getLinkTypeLabel(type) {
  return LINK_TYPE_LABELS[type] ?? LINK_TYPE_LABELS.related;
}

export function validateLink(link, cards = null) {
  const errors = [];
  if (!link || typeof link !== 'object') return { valid: false, errors: ['Link must be an object.'] };
  if (!link.id || typeof link.id !== 'string') errors.push('Link id is required.');
  if (!link.sourceId || !link.targetId || link.sourceId === link.targetId) {
    errors.push('Link endpoints must be different.');
  }
  if (!LINK_TYPES.includes(link.type)) errors.push('Unsupported link type.');
  if (cards && (!cards[link.sourceId] || !cards[link.targetId])) {
    errors.push('Link endpoint card is missing.');
  }
  return { valid: errors.length === 0, errors };
}
