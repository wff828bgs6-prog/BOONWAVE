import store from '../state/store.js';
import storage from '../storage/index.js';
import { CARD_MEDIA_SLOTS, getCardMediaIds } from '../domain/card-media.js';
import { updateCardNode } from './node-service.js';
import { attachMediaOwner, detachMediaOwner, loadMedia } from './media-service.js';

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

function getSlotConfig(card, slot) {
  const config = CARD_MEDIA_SLOTS[card.type]?.[slot];
  if (!config) throw new TypeError(`Unsupported media slot "${slot}" for card type "${card.type}".`);
  return config;
}

export async function attachMediaToCard(cardId, mediaId, slot, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const card = stateStore.getState().cards[cardId];
  if (!card) throw new Error(`Card not found: ${cardId}`);

  const config = getSlotConfig(card, slot);
  const loaded = await loadMedia(mediaId, { storageAdapter });
  if (!loaded?.record) throw new Error(`Media not found: ${mediaId}`);
  if (!config.kinds.includes(loaded.record.kind)) {
    throw new TypeError(`Media kind "${loaded.record.kind}" is not allowed for slot "${slot}".`);
  }

  const wasAlreadyOwned = loaded.record.ownerIds.includes(cardId);
  if (!wasAlreadyOwned) {
    await attachMediaOwner(mediaId, cardId, { storageAdapter });
  }

  const currentValue = card.data?.[config.field];
  const previousMediaId = config.mode === 'single' ? currentValue : null;
  const nextValue = config.mode === 'single'
    ? mediaId
    : [...new Set([...(Array.isArray(currentValue) ? currentValue : []), mediaId])];

  try {
    const updatedCard = await updateCardNode(
      cardId,
      { data: { [config.field]: nextValue } },
      { stateStore, storageAdapter },
    );

    if (previousMediaId && previousMediaId !== mediaId
      && !getCardMediaIds(updatedCard).includes(previousMediaId)) {
      await detachMediaOwner(previousMediaId, cardId, { storageAdapter });
    }

    return updatedCard;
  } catch (error) {
    if (!wasAlreadyOwned) {
      await detachMediaOwner(mediaId, cardId, { storageAdapter }).catch(() => {});
    }
    throw error;
  }
}

export async function detachMediaFromCard(cardId, mediaId, slot, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const card = stateStore.getState().cards[cardId];
  if (!card) throw new Error(`Card not found: ${cardId}`);

  const config = getSlotConfig(card, slot);
  const currentValue = card.data?.[config.field];
  const nextValue = config.mode === 'single'
    ? (currentValue === mediaId ? null : currentValue)
    : (Array.isArray(currentValue) ? currentValue.filter((id) => id !== mediaId) : []);

  const updatedCard = await updateCardNode(
    cardId,
    { data: { [config.field]: nextValue } },
    { stateStore, storageAdapter },
  );

  if (!getCardMediaIds(updatedCard).includes(mediaId)) {
    await detachMediaOwner(mediaId, cardId, { storageAdapter });
  }

  return updatedCard;
}

export { CARD_MEDIA_SLOTS, getCardMediaIds };
