import store from '../state/store.js';
import storage from '../storage/index.js';
import { normalizeNode, NODE_SCHEMA_VERSION } from '../domain/node.js';

export function needsNodeMigration(card) {
  return Boolean(
    !card
    || card.schemaVersion !== NODE_SCHEMA_VERSION
    || !card.data
    || !card.view
    || !card.view.coverFrames?.compact
    || !card.view.coverFrames?.working
  );
}

export async function migrateStoredNodes(options = {}) {
  const stateStore = options.stateStore ?? store;
  const storageAdapter = options.storageAdapter ?? storage;
  const state = stateStore.getState();
  const nextCards = { ...state.cards };
  const changed = [];

  for (const card of Object.values(state.cards)) {
    if (!needsNodeMigration(card)) continue;

    const normalized = normalizeNode(card);
    nextCards[normalized.id] = normalized;
    changed.push(normalized);
  }

  if (changed.length === 0) {
    return { migrated: 0, cards: state.cards };
  }

  await Promise.all(changed.map((card) => storageAdapter.saveCard(card)));
  stateStore.setState({ cards: nextCards });

  return { migrated: changed.length, cards: nextCards };
}

export default migrateStoredNodes;
