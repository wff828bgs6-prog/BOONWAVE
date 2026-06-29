import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createNode } from '../domain/node.js';
import { normalizeMediaRecord } from '../domain/media-record.js';

const withId = (id, type, title) => ({ ...createNode({ type, title }), id });

test('workspace import rolls back on failure and then commits a valid bundle', async () => {
  globalThis.indexedDB = new IDBFactory();
  const { IndexedDBAdapter } = await import('../storage/indexeddb-adapter.js');
  const adapter = new IndexedDBAdapter();
  await adapter.init();

  const rollbackCard = withId('rollback-card', 'goal', 'Rollback');
  await assert.rejects(adapter.importWorkspaceBundle({
    cards: [rollbackCard],
    mediaEntries: [{ record: { name: 'broken' }, blob: new Blob(['x']) }],
    marker: { key: 'legacy-v8-migration', value: { broken: true } },
  }));
  assert.equal((await adapter.loadWorkspace()).cards[rollbackCard.id], undefined);
  assert.equal(await adapter.loadSetting('legacy-v8-migration'), null);

  const project = withId('v8-project', 'project', 'Project');
  const person = withId('v8-person', 'person', 'Person');
  const record = normalizeMediaRecord({
    id: 'media_v8_cover',
    name: 'cover.png',
    mimeType: 'image/png',
    size: 5,
    ownerIds: [project.id],
  });
  project.data.coverMediaId = record.id;
  const link = {
    id: 'v8-link',
    sourceId: project.id,
    targetId: person.id,
    createdAt: new Date().toISOString(),
  };

  await adapter.importWorkspaceBundle({
    cards: [project, person],
    links: [link],
    mediaEntries: [{ record, blob: new Blob(['cover'], { type: 'image/png' }) }],
    marker: { key: 'legacy-v8-migration', value: { cards: 2 } },
  });

  const workspace = await adapter.loadWorkspace();
  const media = await adapter.loadMedia(record.id);
  assert.equal(workspace.cards[project.id].data.coverMediaId, record.id);
  assert.equal(workspace.cards[person.id].title, 'Person');
  assert.deepEqual(workspace.links, [link]);
  assert.equal(await media.blob.text(), 'cover');
  assert.deepEqual(await adapter.loadSetting('legacy-v8-migration'), { cards: 2 });
});
