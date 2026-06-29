const TYPE_FALLBACKS = Object.freeze({
  project: 'П',
  process: 'Р',
  person: 'Ч',
  idea: 'И',
  goal: 'Ц',
});

export function getCoverMediaId(card = {}) {
  return card.type === 'person'
    ? card.data?.avatarMediaId ?? null
    : card.data?.coverMediaId ?? null;
}

export function hasCoverMedia(card = {}) {
  return Boolean(getCoverMediaId(card));
}

export function getCoverFallback(card = {}) {
  return TYPE_FALLBACKS[card.type] ?? '•';
}

export function getCardProgress(card = {}) {
  const value = Number(card.data?.progress);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
}
