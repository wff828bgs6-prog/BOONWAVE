import { CARD_MEDIA_SLOTS } from './card-media.js';
import { inferMediaKind } from './media-record.js';

const MEBIBYTE = 1024 * 1024;

export const MEDIA_FILE_LIMITS = Object.freeze({
  image: 30 * MEBIBYTE,
  document: 100 * MEBIBYTE,
  file: 250 * MEBIBYTE,
});

export const MAX_MEDIA_FILES_PER_SAVE = 30;
export const MAX_MEDIA_BUNDLE_BYTES = 300 * MEBIBYTE;

export class MediaPolicyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'MediaPolicyError';
    this.code = code;
    this.details = details;
  }
}

function getSlotConfig(type, slot) {
  const config = CARD_MEDIA_SLOTS[type]?.[slot];
  if (!config) {
    throw new MediaPolicyError(
      'UNSUPPORTED_MEDIA_SLOT',
      `Этот тип карточки не поддерживает поле файла «${slot}».`,
      { type, slot },
    );
  }
  return config;
}

function resolveKind(config, file) {
  if (config.kinds.length === 1) return config.kinds[0];
  return inferMediaKind(undefined, file?.type ?? '');
}

function toFileSize(file) {
  const size = Number(file?.size);
  if (!Number.isFinite(size) || size < 0) {
    throw new MediaPolicyError(
      'INVALID_MEDIA_SIZE',
      'Не удалось определить размер выбранного файла.',
    );
  }
  return Math.round(size);
}

function formatLimit(bytes) {
  return `${Math.round(bytes / MEBIBYTE)} МБ`;
}

export function validatePendingMediaBundle(type, pendingMedia = []) {
  if (!Array.isArray(pendingMedia)) {
    throw new MediaPolicyError('INVALID_MEDIA_BUNDLE', 'Список файлов повреждён.');
  }
  if (pendingMedia.length > MAX_MEDIA_FILES_PER_SAVE) {
    throw new MediaPolicyError(
      'TOO_MANY_MEDIA_FILES',
      `За один раз можно сохранить не более ${MAX_MEDIA_FILES_PER_SAVE} файлов.`,
      { count: pendingMedia.length, limit: MAX_MEDIA_FILES_PER_SAVE },
    );
  }

  let totalSize = 0;
  const items = pendingMedia.map((pending) => {
    const config = getSlotConfig(type, pending.slot);
    const kind = resolveKind(config, pending.file);
    const size = toFileSize(pending.file);

    if (!config.kinds.includes(kind)) {
      throw new MediaPolicyError(
        'UNSUPPORTED_MEDIA_KIND',
        `Файл «${pending.file?.name || 'Без названия'}» не подходит для этого поля.`,
        { type, slot: pending.slot, kind },
      );
    }

    const fileLimit = MEDIA_FILE_LIMITS[kind];
    if (size > fileLimit) {
      throw new MediaPolicyError(
        'MEDIA_FILE_TOO_LARGE',
        `Файл «${pending.file?.name || 'Без названия'}» слишком большой. Максимум — ${formatLimit(fileLimit)}.`,
        { type, slot: pending.slot, kind, size, limit: fileLimit },
      );
    }

    totalSize += size;
    return { ...pending, config, kind, size };
  });

  if (totalSize > MAX_MEDIA_BUNDLE_BYTES) {
    throw new MediaPolicyError(
      'MEDIA_BUNDLE_TOO_LARGE',
      `Общий размер выбранных файлов превышает ${formatLimit(MAX_MEDIA_BUNDLE_BYTES)}.`,
      { totalSize, limit: MAX_MEDIA_BUNDLE_BYTES },
    );
  }

  return { items, totalSize };
}

export function normalizeStorageError(error) {
  if (error instanceof MediaPolicyError) return error;
  if (error?.name === 'QuotaExceededError' || error?.cause?.name === 'QuotaExceededError') {
    return new MediaPolicyError(
      'STORAGE_QUOTA_EXCEEDED',
      'Недостаточно свободного места для сохранения файлов. Удали ненужные материалы и повтори попытку.',
      {},
    );
  }
  return error;
}

export function getMediaErrorMessage(error) {
  const normalized = normalizeStorageError(error);
  return normalized instanceof MediaPolicyError
    ? normalized.message
    : 'Не удалось сохранить данные. Изменения не применены.';
}
