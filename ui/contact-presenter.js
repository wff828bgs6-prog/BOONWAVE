import { getPrimaryContactActions } from '../domain/contact.js';

const CATEGORY_LABELS = Object.freeze({ contractor: 'Подрядчик', supplier: 'Поставщик', specialist: 'Специалист', partner: 'Партнёр', client: 'Клиент', other: 'Контакт' });
const STATUS_LABELS = Object.freeze({ new: 'Новый', active: 'Активный', trusted: 'Проверенный', inactive: 'Неактивный' });

export function presentContactSummary(card) {
  if (!card || card.type !== 'person') throw new TypeError('Contact presenter requires a person card.');
  const data = card.data ?? {};
  const actions = getPrimaryContactActions(data);
  return {
    id: card.id,
    title: data.fullName || data.organization || card.title,
    subtitle: [data.profession, data.organization].filter(Boolean).join(' · '),
    category: data.category,
    categoryLabel: CATEGORY_LABELS[data.category] ?? data.category,
    status: data.status,
    statusLabel: STATUS_LABELS[data.status] ?? data.status,
    city: data.city || '',
    avatarMediaId: data.avatarMediaId || null,
    avatarPreviewUrl: data.avatarPreviewUrl || '',
    favorite: Boolean(data.favorite),
    rating: data.rating ?? null,
    tags: data.tags ?? [],
    skills: data.skills ?? [],
    website: data.website || '',
    instagram: data.instagram || '',
    phone: actions.phone,
    email: actions.email,
    messenger: actions.messenger,
    messengers: Array.isArray(data.messengers) ? data.messengers : [],
    canCall: Boolean(actions.phone?.value),
    canEmail: Boolean(actions.email?.value),
    canMessage: Boolean(actions.messenger?.value),
  };
}

export function presentContactDetails(card, context = {}) {
  const summary = presentContactSummary(card);
  const data = card.data ?? {};
  const relationships = context.relationships ?? {};
  return {
    ...summary,
    kind: data.kind,
    description: data.description || '',
    address: data.address || '',
    phones: data.phones ?? [],
    emails: data.emails ?? [],
    messengers: data.messengers ?? [],
    websites: data.websites ?? [],
    skills: data.skills ?? [],
    legalDetails: data.legalDetails ?? {},
    notes: data.notes || '',
    attachments: data.attachments ?? [],
    history: {
      projects: relationships.projects ?? [],
      processes: relationships.processes ?? [],
      tasks: relationships.tasks ?? [],
      expenses: relationships.expenses ?? [],
    },
    actions: { assignToProcess: true, assignToTask: true, showOnCanvas: true, archive: true },
  };
}
