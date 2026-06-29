import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEGACY_V8_MIGRATION_KEY,
  convertLegacyV8Snapshot,
  findLegacyV8Snapshot,
  migrateLegacyV8Workspace,
} from '../services/legacy-v8-migration-service.js';

function createLocalStorage(values = {}) {
  const data = new Map(Object.entries(values));
  return {
    get length() { return data.size; },
    key(index) { return [...data.keys()][index] ?? null; },
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    snapshot() { return Object.fromEntries(data); },
  };
}

function createLegacySnapshot() {
  return {
    key: 'bw8_data_user-1',
    userId: 'user-1',
    data: {
      schema: 8,
      updatedAt: 1710000000000,
      nodes: [
        {
          id: 'project-1',
          type: 'project',
          title: 'Legacy project',
          description: 'Migrated safely',
          x: 120,
          y: 180,
          level: 3,
          priority: 'Высокий',
          budget: 500000,
          assets: [{ id: 'cover-a', name: 'cover.png', type: 'image/png' }],
        },
        {
          id: 'person-1',
          type: 'person',
          title: 'Legacy person',
          x: 500,
          y: 240,
          level: 1,
          phone: '+70000000000',
          assets: [{ id: 'avatar-b', name: 'avatar.jpg', type: 'image/jpeg' }],
        },
      ],
      links: [{ id: 'legacy-link', from: 'project-1', to: 'person-1' }],
    },
  };
}

test('active v8 session is preferred without modifying legacy storage', () => {
  const active = createLegacySnapshot();
  const localStorageLike = createLocalStorage({
    bw8_session: 'user-1',
    'bw8_data_user-1': JSON.stringify(active.data),
    'bw8_data_older': JSON.stringify({ nodes: [], updatedAt: 1 }),
  });
  const before = localStorageLike.snapshot();

  const found = findLegacyV8Snapshot(localStorageLike);

  assert.equal(found.key, 'bw8_data_user-1');
  assert.deepEqual(localStorageLike.snapshot(), before);
});

test('v8 nodes, links, view modes, and media ownership convert to canonical models', () => {
  const snapshot = createLegacySnapshot();
  const resolvedAssets = new Map([
    ['cover-a', new Blob(['cover'], { type: 'image/png' })],
    ['avatar-b', new Blob(['avatar'], { type: 'image/jpeg' })],
  ]);

  const bundle = convertLegacyV8Snapshot(snapshot, resolvedAssets);
  const project = bundle.cards.find((card) => card.id === 'project-1');
  const person = bundle.cards.find((card) => card.id === 'person-1');

  assert.equal(bundle.cards.length, 2);
  assert.equal(bundle.links.length, 1);
  assert.equal(bundle.links[0].sourceId, 'project-1');
  assert.equal(bundle.links[0].targetId, 'person-1');
  assert.equal(project.view.mode, 'full');
  assert.equal(person.view.mode, 'compact');
  assert.equal(project.data.priority, 'high');
  assert.equal(project.data.coverMediaId, 'media_v8_cover-a');
  assert.equal(person.data.avatarMediaId, 'media_v8_avatar-b');
  assert.deepEqual(
    bundle.mediaEntries.find((entry) => entry.record.id === 'media_v8_cover-a').record.ownerIds,
    ['project-1'],
  );
});

test('migration imports one atomic bundle and leaves source data untouched', async () => {
  const snapshot = createLegacySnapshot();
  const localStorageLike = createLocalStorage({
    bw8_session: 'user-1',
    'bw8_data_user-1': JSON.stringify(snapshot.data),
  });
  const sourceBefore = localStorageLike.snapshot();
  let imported = null;
  const storageAdapter = {
    async loadWorkspace() { return { cards: {}, links: [] }; },
    async loadSetting() { return null; },
    async importWorkspaceBundle(bundle) { imported = bundle; },
  };

  const result = await migrateLegacyV8Workspace({
    storageAdapter,
    localStorageLike,
    resolvedAssets: new Map([
      ['cover-a', new Blob(['cover'], { type: 'image/png' })],
      ['avatar-b', new Blob(['avatar'], { type: 'image/jpeg' })],
    ]),
  });

  assert.equal(result.status, 'migrated');
  assert.equal(imported.cards.length, 2);
  assert.equal(imported.links.length, 1);
  assert.equal(imported.mediaEntries.length, 2);
  assert.equal(imported.marker.key, LEGACY_V8_MIGRATION_KEY);
  assert.deepEqual(localStorageLike.snapshot(), sourceBefore);
});

test('migration never overlays a non-empty canonical workspace', async () => {
  let importCalled = false;
  const result = await migrateLegacyV8Workspace({
    storageAdapter: {
      async loadWorkspace() { return { cards: { existing: { id: 'existing' } }, links: [] }; },
      async importWorkspaceBundle() { importCalled = true; },
    },
    localStorageLike: createLocalStorage(),
  });

  assert.equal(result.status, 'skipped-non-empty');
  assert.equal(importCalled, false);
});
