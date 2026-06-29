import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readTypedFormData,
  readViewFormData,
  collectPendingFormMedia,
} from '../controllers/transactional-node-controller.js';

function createContainer({ fields = {}, views = {}, mediaInputs = [] } = {}) {
  return {
    querySelector(selector) {
      const nodeMatch = selector.match(/^\[data-node-field="(.+)"\]$/);
      if (nodeMatch) return fields[nodeMatch[1]] ?? null;
      const viewMatch = selector.match(/^\[data-view-field="(.+)"\]$/);
      if (viewMatch) return views[viewMatch[1]] ?? null;
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[data-media-slot]' ? mediaInputs : [];
    },
  };
}

test('typed form extraction preserves active schema strings and numeric values', () => {
  const container = createContainer({
    fields: {
      status: { value: 'active' },
      progress: { value: '64' },
    },
  });

  const data = readTypedFormData(container, 'goal');
  assert.deepEqual(data, {
    status: 'active',
    progress: 64,
  });
});

test('view form extraction keeps independent compact and working frames', () => {
  const container = createContainer({
    views: {
      compactLabel: { value: 'Арт' },
      'compact.shape': { value: 'circle' },
      'compact.scale': { value: '1.4' },
      'compact.positionX': { value: '20' },
      'compact.positionY': { value: '60' },
      'working.shape': { value: 'landscape' },
      'working.scale': { value: '2.1' },
      'working.positionX': { value: '70' },
      'working.positionY': { value: '35' },
    },
  });

  const view = readViewFormData(container);
  assert.equal(view.compactLabel, 'Арт');
  assert.deepEqual(view.coverFrames.compact, {
    shape: 'circle', scale: 1.4, positionX: 20, positionY: 60,
  });
  assert.deepEqual(view.coverFrames.working, {
    shape: 'landscape', scale: 2.1, positionX: 70, positionY: 35,
  });
});

test('pending media extraction keeps file-to-slot mapping', () => {
  const cover = new Blob(['cover'], { type: 'image/png' });
  const attachment = new Blob(['attachment'], { type: 'text/plain' });
  const container = createContainer({
    mediaInputs: [
      { dataset: { mediaSlot: 'cover' }, files: [cover] },
      { dataset: { mediaSlot: 'attachments' }, files: [attachment] },
    ],
  });

  assert.deepEqual(collectPendingFormMedia(container), [
    { slot: 'cover', file: cover },
    { slot: 'attachments', file: attachment },
  ]);
});
