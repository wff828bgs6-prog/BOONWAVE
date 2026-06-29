import store from '../state/store.js';
import storage from '../storage/index.js';
import { createNode, normalizeNode } from '../domain/node.js';
import { mergeNodeData } from '../domain/node-schemas.js';
import { createMediaRecord } from '../domain/media-record.js';
import { CARD_MEDIA_SLOTS, getCardMediaIds } from '../domain/card-media.js';

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

function getSlot(card, slotName) {
  const slot = CARD_MEDIA_SLOTS[card.type]?.[slotName];
  if (!slot) throw new TypeError(`Unsupported media slot "${slotName}" for card type "${card.type}".`);
  return slot;
}

function createRecord(cardId, file) {
  return createMediaRecord({
    name: file.name,
    mimeType: file.type,
    size: file.size,
    ownerIds: [cardId],
  });
}

function prepareUpdatedCard(card, patch = {}) {
  return normalizeNode({
    ...card,
    ...patch,
    id: card.id,
    type: card.type,
    data: patch.data === undefined
      ? card.data
      : mergeNodeData(card.type, card.data, patch.data),
    createdAt: card.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

export function prepareCardMediaBundle(card, pendingMedia = []) {
  const nextData = structuredClone(card.data ?? {});
  const mediaItems = [];
  const replacedIds = [];

  for (const item of pendingMedia) {
    if (!item?.file) continue;
    const slot = getSlot(card, item.slot);
    const record = createRecord(card.id, item.file);
    if (!slot.kinds.includes(record.kind)) {
      throw new TypeError(`Media kind "${record.kind}" is not allowed for slot "${item.slot}".`);
    }

    const current = nextData[slot.field];
    if (slot.mode === 'single') {
      if (typeof current === 'string' && current && current !== record.id) replacedIds.push(current);
      nextData[slot.field] = record.id;
    } else {
      nextData[slot.field] = [...new Set([...(Array.isArray(current) ? current : []), record.id])];
    }
    mediaItems.push({ record, blob: item.file });
  }

  const updatedCard = normalizeNode({
    ...card,
    data: nextData,
    updatedAt: new Date().toISOString(),
  });
  const activeIds = new Set(getCardMediaIds(updatedCard));
  const detachMediaIds = [...new Set(replacedIds)].filter((id) => !activeIds.has(id));
  return { card: updatedCard, mediaItems, detachMediaIds };
}

async function persistBundle(storageAdapter, bundle) {
  const createdIds = [];
  try {
    for (const item of bundle.mediaItems) {
      await storageAdapter.saveMedia(item.record, item.blob);
      createdIds.push(item.record.id);
    }
    await storageAdapter.saveCard(bundle.card);
  } catch (error) {
    await Promise.all(createdIds.map((id) => storageAdapter.deleteMedia(id).catch(() => {})));
    throw error;
  }
  return bundle;
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
  const baseCard = createNode(input);
  const bundle = prepareCardMediaBundle(baseCard, pendingMedia);
  await persistBundle(storageAdapter, bundle);
  commitCardToStore(stateStore, bundle.card);
  return bundle.card;
}

export async function updateCardWithMedia(cardId, patch = {}, pendingMedia = [], options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const current = stateStore.getState().cards[cardId];
  if (!current) throw new Error(`Card not found: ${cardId}`);
  const baseCard = prepareUpdatedCard(current, patch);
  const bundle = prepareCardMediaBundle(baseCard, pendingMedia);
  await persistBundle(storageAdapter, bundle);
  commitCardToStore(stateStore, bundle.card);
  return bundle.card;
}
