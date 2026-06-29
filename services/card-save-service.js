import store from '../state/store.js';
import storage from '../storage/index.js';
import StorageAdapter from '../storage/storage-adapter.js';
import { createNode, normalizeNode } from '../domain/node.js';
import { mergeNodeData } from '../domain/node-schemas.js';
import { getCardMediaIds } from '../domain/card-media.js';
import { createMediaRecord } from '../domain/media-record.js';
import {
  validatePendingMediaBundle,
  normalizeStorageError,
} from '../domain/media-policy.js';

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

function supportsAtomicBundleSave(storageAdapter) {
  return typeof storageAdapter?.saveCardBundle === 'function'
    && storageAdapter.saveCardBundle !== StorageAdapter.prototype.saveCardBundle;
}

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function assertFileLike(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new TypeError('Pending media must contain a File or Blob.');
  }
}

export function buildUpdatedCard(current, patch = {}) {
  return normalizeNode({
    ...current,
    ...patch,
    id: current.id,
    type: current.type,
    data: patch.data === undefined
      ? current.data
      : mergeNodeData(current.type, current.data, patch.data),
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

export function stageCardMedia(card, pendingMedia = []) {
  const { items } = validatePendingMediaBundle(card.type, pendingMedia);
  const data = clone(card.data);
  const mediaEntries = [];

  for (const pending of items) {
    assertFileLike(pending.file);
    const { config, kind, size } = pending;
    const record = createMediaRecord({
      name: pending.file.name || 'Без названия',
      mimeType: pending.file.type || '',
      size,
      kind,
      ownerIds: [card.id],
    });

    const currentValue = data[config.field];
    data[config.field] = config.mode === 'single'
      ? record.id
      : [...new Set([...(Array.isArray(currentValue) ? currentValue : []), record.id])];

    mediaEntries.push({ slot: pending.slot, record, blob: pending.file });
  }

  const stagedCard = normalizeNode({
    ...card,
    data,
    updatedAt: new Date().toISOString(),
  });
  const activeIds = new Set(getCardMediaIds(stagedCard));
  const removedMediaIds = getCardMediaIds(card)
    .filter((mediaId) => !activeIds.has(mediaId));

  return { card: stagedCard, mediaEntries, removedMediaIds };
}

async function persistStagedCard(staged, storageAdapter) {
  try {
    const hasMediaChanges = staged.mediaEntries.length > 0 || staged.removedMediaIds.length > 0;
    if (!hasMediaChanges) {
      await storageAdapter.saveCard(staged.card);
      return staged;
    }
    if (!supportsAtomicBundleSave(storageAdapter)) {
      throw new Error('Atomic card and media save is not implemented for this storage adapter.');
    }
    await storageAdapter.saveCardBundle(staged);
    return staged;
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

function commitCardToStore(stateStore, card) {
  const state = stateStore.getState();
  stateStore.setState({
    cards: { ...state.cards, [card.id]: card },
    selectedCardId: card.id,
  });
}

export async function createCardWithMedia(input, pendingMedia = [], options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const staged = stageCardMedia(createNode(input), pendingMedia);
  await persistStagedCard(staged, storageAdapter);
  commitCardToStore(stateStore, staged.card);
  return staged;
}

export async function updateCardWithMedia(cardId, patch = {}, pendingMedia = [], options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const current = stateStore.getState().cards[cardId];
  if (!current) throw new Error(`Card not found: ${cardId}`);

  const staged = stageCardMedia(buildUpdatedCard(current, patch), pendingMedia);
  const activeIds = new Set(getCardMediaIds(staged.card));
  staged.removedMediaIds = getCardMediaIds(current)
    .filter((mediaId) => !activeIds.has(mediaId));

  await persistStagedCard(staged, storageAdapter);
  commitCardToStore(stateStore, staged.card);
  return staged;
}
