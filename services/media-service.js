import storage from '../storage/index.js';
import { createMediaRecord, normalizeMediaRecord } from '../domain/media-record.js';

function resolveStorage(options = {}) {
  return options.storageAdapter ?? storage;
}

export async function createMedia(input, blob, options = {}) {
  const storageAdapter = resolveStorage(options);
  const record = createMediaRecord(input);
  await storageAdapter.saveMedia(record, blob);
  return record;
}

export async function loadMedia(mediaId, options = {}) {
  if (!mediaId) throw new TypeError('loadMedia expects a media id.');
  return resolveStorage(options).loadMedia(mediaId);
}

export async function attachMediaOwner(mediaId, ownerId, options = {}) {
  if (!ownerId) throw new TypeError('attachMediaOwner expects an owner id.');
  const storageAdapter = resolveStorage(options);
  const loaded = await storageAdapter.loadMedia(mediaId);
  if (!loaded?.record) throw new Error(`Media not found: ${mediaId}`);

  const updated = normalizeMediaRecord({
    ...loaded.record,
    ownerIds: [...loaded.record.ownerIds, ownerId],
    updatedAt: new Date().toISOString(),
  });
  await storageAdapter.saveMedia(updated, loaded.blob);
  return updated;
}

export async function detachMediaOwner(mediaId, ownerId, options = {}) {
  const storageAdapter = resolveStorage(options);
  const loaded = await storageAdapter.loadMedia(mediaId);
  if (!loaded?.record) return { deleted: false, record: null };

  const ownerIds = loaded.record.ownerIds.filter((id) => id !== ownerId);
  if (ownerIds.length === 0) {
    await storageAdapter.deleteMedia(mediaId);
    return { deleted: true, record: null };
  }

  const updated = normalizeMediaRecord({
    ...loaded.record,
    ownerIds,
    updatedAt: new Date().toISOString(),
  });
  await storageAdapter.saveMedia(updated, loaded.blob);
  return { deleted: false, record: updated };
}

export async function deleteMediaIfUnreferenced(mediaId, options = {}) {
  const storageAdapter = resolveStorage(options);
  const loaded = await storageAdapter.loadMedia(mediaId);
  if (!loaded?.record) return false;
  if (loaded.record.ownerIds.length > 0) return false;
  await storageAdapter.deleteMedia(mediaId);
  return true;
}
