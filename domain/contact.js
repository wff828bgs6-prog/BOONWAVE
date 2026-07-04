export const CONTACT_KINDS = Object.freeze(['person', 'company']);
export const CONTACT_CATEGORIES = Object.freeze([
  'contractor',
  'supplier',
  'specialist',
  'partner',
  'client',
  'other',
]);
export const CONTACT_STATUSES = Object.freeze(['new', 'active', 'trusted', 'inactive']);

function uniq(values) {
  return Array.isArray(values)
    ? [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))]
    : [];
}

function makeChannelId(type) {
  const randomUUID = globalThis.crypto?.randomUUID;
  return `${type}_${typeof randomUUID === 'function' ? randomUUID.call(globalThis.crypto) : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

function normalizeChannel(item = {}, fallbackType = '') {
  return {
    id: String(item.id ?? '').trim() || makeChannelId(fallbackType),
    type: String(item.type ?? fallbackType).trim(),
    value: String(item.value ?? item.phone ?? item.email ?? item.url ?? '').trim(),
    label: String(item.label ?? '').trim(),
    primary: Boolean(item.primary),
  };
}

function normalizeChannels(items, fallbackType, legacyValue = '') {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => normalizeChannel(item, fallbackType))
    .filter((item) => item.value);

  if (normalized.length === 0 && legacyValue) {
    normalized.push(normalizeChannel({ value: legacyValue, primary: true }, fallbackType));
  }

  if (normalized.length > 0 && !normalized.some((item) => item.primary)) {
    normalized[0] = { ...normalized[0], primary: true };
  }

  let primarySeen = false;
  return normalized.map((item) => {
    if (!item.primary) return item;
    if (primarySeen) return { ...item, primary: false };
    primarySeen = true;
    return item;
  });
}

export function normalizeContactData(raw = {}) {
  const legacyPhone = String(raw.phone ?? '').trim();
  const legacyEmail = String(raw.email ?? '').trim();

  const phones = normalizeChannels(raw.phones, 'phone', legacyPhone);
  const emails = normalizeChannels(raw.emails, 'email', legacyEmail);
  const messengers = normalizeChannels(raw.messengers, 'messenger');
  const websites = normalizeChannels(raw.websites, 'website');

  return {
    ...raw,
    kind: CONTACT_KINDS.includes(raw.kind) ? raw.kind : 'person',
    fullName: String(raw.fullName ?? '').trim(),
    organization: String(raw.organization ?? '').trim(),
    profession: String(raw.profession ?? raw.role ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    category: CONTACT_CATEGORIES.includes(raw.category) ? raw.category : 'specialist',
    status: CONTACT_STATUSES.includes(raw.status) ? raw.status : 'active',
    city: String(raw.city ?? '').trim(),
    address: String(raw.address ?? '').trim(),
    phones,
    emails,
    messengers,
    websites,
    tags: uniq(raw.tags),
    skills: uniq(raw.skills),
    favorite: Boolean(raw.favorite),
    rating: raw.rating == null ? null : Math.max(0, Math.min(5, Number(raw.rating) || 0)),
    legalDetails: {
      legalName: String(raw.legalDetails?.legalName ?? '').trim(),
      taxId: String(raw.legalDetails?.taxId ?? '').trim(),
      registrationId: String(raw.legalDetails?.registrationId ?? '').trim(),
      bankName: String(raw.legalDetails?.bankName ?? '').trim(),
      bankAccount: String(raw.legalDetails?.bankAccount ?? '').trim(),
      correspondentAccount: String(raw.legalDetails?.correspondentAccount ?? '').trim(),
      bankCode: String(raw.legalDetails?.bankCode ?? '').trim(),
      legalAddress: String(raw.legalDetails?.legalAddress ?? '').trim(),
    },
    notes: String(raw.notes ?? '').trim(),
    avatarMediaId: raw.avatarMediaId || null,
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    phone: phones.find((item) => item.primary)?.value ?? phones[0]?.value ?? '',
    email: emails.find((item) => item.primary)?.value ?? emails[0]?.value ?? '',
    role: String(raw.role ?? raw.profession ?? '').trim(),
  };
}

export function getPrimaryContactActions(contactData = {}) {
  const data = normalizeContactData(contactData);
  const phone = data.phones.find((item) => item.primary) ?? data.phones[0] ?? null;
  const email = data.emails.find((item) => item.primary) ?? data.emails[0] ?? null;
  const messenger = data.messengers.find((item) => item.primary) ?? data.messengers[0] ?? null;
  return { phone, email, messenger };
}

export function matchesContact(contactData, query = '') {
  const data = normalizeContactData(contactData);
  const needle = String(query).trim().toLocaleLowerCase('ru-RU');
  if (!needle) return true;
  const haystack = [
    data.fullName,
    data.organization,
    data.profession,
    data.category,
    data.city,
    ...data.tags,
    ...data.skills,
    ...data.phones.map((item) => item.value),
    ...data.emails.map((item) => item.value),
  ].join(' ').toLocaleLowerCase('ru-RU');
  return haystack.includes(needle);
}
