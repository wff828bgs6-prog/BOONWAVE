import store from '../state/store.js';
import storage from '../storage/index.js';
import { normalizeNode, NODE_SCHEMA_VERSION } from '../domain/node.js';

function needsMigration(card) {
  return card?.schemaVersion !== NODE_SCHEMA_VERSION || !card?.data;
}

export async function migrateStoredNodes() {
  const state = store.getState();
  const nextCards = { ...state.cards };
  const changed = [];

  for (const card of Object.values(state.cards)) {
    if (!needsMigration(card)) continue;

    const normalized = normalizeNode(card);
    nextCards[normalized.id] = normalized;
    changed.push(normalized);
  }

  if (changed.length === 0) {
    return { migrated: 0, cards: state.cards };
  }

  await Promise.all(changed.map((card) => storage.saveCard(card)));
  store.setState({ cards: nextCards });

  return { migrated: changed.length, cards: nextCards };
}

export default migrateStoredNodes;
