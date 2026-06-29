import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('public index starts only the modular app', () => {
  const index = read('index.html');
  assert.match(index, /<script type="module" src="app\.js"><\/script>/);
  assert.doesNotMatch(index, /boonwave\.v8\.js/);
  assert.match(index, /id="canvas"/);
  assert.match(index, /id="world"/);
  assert.match(index, /id="legacyFallback"/);
});

test('legacy v8 remains available only through its rollback entry', () => {
  const legacy = read('legacy-v8.html');
  assert.match(legacy, /boonwave\.v8\.js\?v=8\.0\.0/);
  assert.match(legacy, /boonwave\.v8\.css\?v=8\.0\.0/);
});

test('preview delegates to the same modular app without demo seeding', () => {
  const preview = read('preview.js');
  assert.match(preview, /import\('\.\/app\.js'\)/);
  assert.doesNotMatch(preview, /seedCards|seedPreview|saveCard\(/);
});

test('production bootstrap owns all interactive controllers and migration', () => {
  const bootstrap = read('bootstrap/boonwave-bootstrap.js');
  assert.match(bootstrap, /TransactionalNodeController/);
  assert.match(bootstrap, /LinkController/);
  assert.match(bootstrap, /ZoomController/);
  assert.match(bootstrap, /migrateLegacyV8Workspace/);
  assert.match(bootstrap, /workspace\.destroy\(\)/);
});

test('service worker caches modular and rollback entries', () => {
  const worker = read('sw.js');
  assert.match(worker, /\.\/index\.html/);
  assert.match(worker, /\.\/app\.js/);
  assert.match(worker, /\.\/legacy-v8\.html/);
  assert.match(worker, /\.\/styles\/production-shell\.css/);
});
