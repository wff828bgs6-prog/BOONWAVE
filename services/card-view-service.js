import store from '../state/store.js';
import storage from '../storage/index.js';
import { CARD_VIEW_MODES, COVER_SHAPES, normalizeNodeView } from '../domain/node.js';
import { updateCardNode } from './node-service.js';

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

function definedEntries(object = {}) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

export function getNextCardViewMode(mode) {
  const index = CARD_VIEW_MODES.indexOf(mode);
  return CARD_VIEW_MODES[(index + 1 + CARD_VIEW_MODES.length) % CARD_VIEW_MODES.length];
}

export async function updateCardView(cardId, patch = {}, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const card = stateStore.getState().cards[cardId];
  if (!card) throw new Error(`Card not found: ${cardId}`);

  const current = normalizeNodeView(card.view);
  const next = normalizeNodeView({
    ...current,
    ...definedEntries(patch),
    cover: {
      ...current.cover,
      ...definedEntries(patch.cover),
    },
  });

  return updateCardNode(cardId, { view: next }, { stateStore, storageAdapter });
}

export function cycleCardView(cardId, options = {}) {
  const { stateStore } = resolveDependencies(options);
  const card = stateStore.getState().cards[cardId];
  if (!card) throw new Error(`Card not found: ${cardId}`);
  return updateCardView(cardId, { mode: getNextCardViewMode(card.view?.mode) }, options);
}

export function setCoverFraming(cardId, { shape, scale, positionX, positionY } = {}, options = {}) {
  if (shape !== undefined && !COVER_SHAPES.includes(shape)) {
    throw new TypeError(`Unsupported cover shape: ${shape}`);
  }
  return updateCardView(cardId, {
    cover: definedEntries({ shape, scale, positionX, positionY }),
  }, options);
}
