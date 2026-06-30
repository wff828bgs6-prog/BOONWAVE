import store from '../state/store.js';
import storage from '../storage/index.js';
import { normalizeNode, NODE_SCHEMA_VERSION } from '../domain/node.js';
import { normalizeLink, LINK_SCHEMA_VERSION } from '../domain/link.js';

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

export function needsLinkMigration(link, cards = {}) {
  if (!link || link.schemaVersion !== LINK_SCHEMA_VERSION || !link.type) return true;
  const normalized = normalizeLink(link, cards);
  return normalized.sourceId !== link.sourceId
    || normalized.targetId !== link.targetId
    || normalized.type !== link.type;
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

export async function migrateStoredLinks(options = {}) {
  const stateStore = options.stateStore ?? store;
  const storageAdapter = options.storageAdapter ?? storage;
  const state = stateStore.getState();
  const nextLinks = [];
  const changed = [];

  for (const link of state.links ?? []) {
    if (!needsLinkMigration(link, state.cards)) {
      nextLinks.push(link);
      continue;
    }
    const normalized = normalizeLink(link, state.cards);
    nextLinks.push(normalized);
    changed.push(normalized);
  }

  if (changed.length === 0) {
    return { migrated: 0, links: state.links };
  }

  await Promise.all(changed.map((link) => storageAdapter.saveLink(link)));
  stateStore.setState({ links: nextLinks });
  return { migrated: changed.length, links: nextLinks };
}

export default migrateStoredNodes;
