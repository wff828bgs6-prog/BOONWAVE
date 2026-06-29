export const MEDIA_SCHEMA_VERSION = 1;
export const MEDIA_KINDS = Object.freeze(['image', 'document', 'file']);

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/rtf',
  'text/plain',
  'text/csv',
]);

const toFiniteSize = (value) => {
  const size = Number(value);
  return Number.isFinite(size) && size >= 0 ? Math.round(size) : 0;
};

export function inferMediaKind(kind, mimeType = '') {
  if (MEDIA_KINDS.includes(kind)) return kind;
  const mime = String(mimeType).toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (DOCUMENT_MIME_TYPES.has(mime)
    || mime.startsWith('application/vnd.openxmlformats-officedocument')
    || mime.startsWith('application/vnd.ms-')) return 'document';
  return 'file';
}

export function validateMediaRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['Media record must be an object.'] };
  }

  if (typeof record.id !== 'string' || record.id.length === 0) errors.push('Media id is required.');
  if (!MEDIA_KINDS.includes(record.kind)) errors.push('Unsupported media kind.');
  if (typeof record.name !== 'string' || record.name.length === 0) errors.push('Media name is required.');
  if (typeof record.mimeType !== 'string') errors.push('Media mimeType must be a string.');
  if (!Number.isFinite(record.size) || record.size < 0) errors.push('Media size must be non-negative.');
  if (!Array.isArray(record.ownerIds)) errors.push('Media ownerIds must be an array.');

  return { valid: errors.length === 0, errors };
}

export function normalizeMediaRecord(raw = {}) {
  const now = new Date().toISOString();
  const mimeType = String(raw.mimeType ?? raw.type ?? '').trim();
  const record = {
    ...raw,
    id: String(raw.id ?? '').trim(),
    schemaVersion: MEDIA_SCHEMA_VERSION,
    kind: inferMediaKind(raw.kind, mimeType),
    name: String(raw.name ?? '').trim() || 'Без названия',
    mimeType,
    size: toFiniteSize(raw.size),
    ownerIds: [...new Set((Array.isArray(raw.ownerIds) ? raw.ownerIds : [])
      .map((value) => String(value).trim())
      .filter(Boolean))],
    checksum: raw.checksum ? String(raw.checksum) : null,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };

  const validation = validateMediaRecord(record);
  if (!validation.valid) {
    throw new TypeError(`Invalid BOONWAVE media record: ${validation.errors.join(' ')}`);
  }

  return record;
}

export function createMediaRecord({ name, mimeType = '', size = 0, kind, ownerIds = [], checksum = null } = {}) {
  const id = `media_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  const now = new Date().toISOString();

  return normalizeMediaRecord({
    id,
    name,
    mimeType,
    size,
    kind,
    ownerIds,
    checksum,
    createdAt: now,
    updatedAt: now,
  });
}
