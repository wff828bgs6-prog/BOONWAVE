const TYPE_FALLBACKS = Object.freeze({
  self: 'Я',
  project: 'П',
  process: 'Р',
  person: 'К',
  persona: 'Пе',
  idea: 'И',
  goal: 'Ц',
});

function prefersWide(mode) {
  return mode === 'working' || mode === 'detail' || mode === 'wide';
}

export function getCoverMediaId(card = {}, mode = 'compact') {
  const data = card.data || {};
  if (card.type === 'person' || card.type === 'self') {
    if (prefersWide(mode)) return data.avatarWideMediaId || data.avatarMediaId || null;
    return data.avatarMediaId || data.avatarWideMediaId || null;
  }
  if (prefersWide(mode)) return data.coverWideMediaId || data.coverMediaId || null;
  return data.coverMediaId || data.coverWideMediaId || null;
}

export function getCoverPreviewUrl(card = {}, mode = 'compact') {
  const data = card.data || {};
  if (card.type === 'person' || card.type === 'self') {
    if (prefersWide(mode)) return data.avatarWidePreviewUrl || data.avatarPreviewUrl || '';
    return data.avatarPreviewUrl || data.avatarWidePreviewUrl || '';
  }
  if (prefersWide(mode)) return data.coverWidePreviewUrl || data.coverPreviewUrl || '';
  return data.coverPreviewUrl || data.coverWidePreviewUrl || '';
}

export function hasCoverMedia(card = {}) {
  return Boolean(getCoverMediaId(card, 'compact') || getCoverPreviewUrl(card, 'compact'));
}

export function collectActiveCoverMediaIds(cards = {}) {
  const ids = [];
  for (const card of Object.values(cards)) {
    ids.push(getCoverMediaId(card, 'compact'));
    ids.push(getCoverMediaId(card, 'working'));
  }
  return new Set(ids.filter(Boolean));
}

export function getCoverFallback(card = {}) {
  return TYPE_FALLBACKS[card.type] || '•';
}

export function getCardProgress(card = {}) {
  const value = Number(card.data && card.data.progress);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
}
