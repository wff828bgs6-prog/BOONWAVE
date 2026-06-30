import store from '../state/store.js';
import storage from '../storage/index.js';
import { COVER_SHAPES, normalizeNodeView } from '../domain/node.js';
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

export async function updateCardView(cardId, patch = {}, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const card = stateStore.getState().cards[cardId];
  if (!card) throw new Error(`Card not found: ${cardId}`);

  const current = normalizeNodeView(card.view);
  const next = normalizeNodeView({
    ...current,
    ...definedEntries(patch),
    coverFrames: {
      compact: {
        ...current.coverFrames.compact,
        ...definedEntries(patch.coverFrames?.compact),
      },
      working: {
        ...current.coverFrames.working,
        ...definedEntries(patch.coverFrames?.working),
      },
    },
    visible: {
      compact: {
        ...current.visible.compact,
        ...definedEntries(patch.visible?.compact),
      },
      standard: {
        ...current.visible.standard,
        ...definedEntries(patch.visible?.standard),
      },
    },
  });

  return updateCardNode(cardId, { view: next }, { stateStore, storageAdapter });
}

export function setCoverFraming(cardId, mode, { shape, scale, positionX, positionY } = {}, options = {}) {
  if (!['compact', 'working'].includes(mode)) {
    throw new TypeError(`Unsupported cover framing mode: ${mode}`);
  }
  if (shape !== undefined && !COVER_SHAPES.includes(shape)) {
    throw new TypeError(`Unsupported cover shape: ${shape}`);
  }
  return updateCardView(cardId, {
    coverFrames: {
      [mode]: definedEntries({ shape, scale, positionX, positionY }),
    },
  }, options);
}
