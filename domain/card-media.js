export const CARD_MEDIA_SLOTS = Object.freeze({
  self: Object.freeze({
    avatar: Object.freeze({ field: 'avatarMediaId', mode: 'single', kinds: ['image'] }),
    documents: Object.freeze({ field: 'documents', mode: 'multiple', kinds: ['document'] }),
    files: Object.freeze({ field: 'files', mode: 'multiple', kinds: ['image', 'document', 'file'] }),
  }),
  project: Object.freeze({
    cover: Object.freeze({ field: 'coverMediaId', mode: 'single', kinds: ['image'] }),
    images: Object.freeze({ field: 'images', mode: 'multiple', kinds: ['image'] }),
    documents: Object.freeze({ field: 'documents', mode: 'multiple', kinds: ['document'] }),
    files: Object.freeze({ field: 'files', mode: 'multiple', kinds: ['image', 'document', 'file'] }),
  }),
  process: Object.freeze({
    attachments: Object.freeze({ field: 'attachments', mode: 'multiple', kinds: ['image', 'document', 'file'] }),
  }),
  person: Object.freeze({
    avatar: Object.freeze({ field: 'avatarMediaId', mode: 'single', kinds: ['image'] }),
    attachments: Object.freeze({ field: 'attachments', mode: 'multiple', kinds: ['image', 'document', 'file'] }),
  }),
  idea: Object.freeze({
    cover: Object.freeze({ field: 'coverMediaId', mode: 'single', kinds: ['image'] }),
    attachments: Object.freeze({ field: 'attachments', mode: 'multiple', kinds: ['image', 'document', 'file'] }),
  }),
  goal: Object.freeze({
    cover: Object.freeze({ field: 'coverMediaId', mode: 'single', kinds: ['image'] }),
    attachments: Object.freeze({ field: 'attachments', mode: 'multiple', kinds: ['image', 'document', 'file'] }),
  }),
});

export function getCardMediaIds(card = {}) {
  const config = CARD_MEDIA_SLOTS[card.type] ?? {};
  const ids = [];

  for (const slot of Object.values(config)) {
    const value = card.data?.[slot.field];
    if (slot.mode === 'single') {
      if (typeof value === 'string' && value) ids.push(value);
    } else if (Array.isArray(value)) {
      ids.push(...value.filter((id) => typeof id === 'string' && id));
    }
  }

  return [...new Set(ids)];
}
