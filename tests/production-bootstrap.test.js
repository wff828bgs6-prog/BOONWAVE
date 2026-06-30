import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('public index starts only the modular app', () => {
  const index = read('index.html');
  assert.match(index, /<script type="module" src="app\.js"><\/script>/);
  assert.match(index, /id="canvas"/);
  assert.match(index, /id="world"/);
  assert.doesNotMatch(index, /legacy|boonwave\.v8/i);
});

test('preview delegates to the same modular app without demo seeding', () => {
  const preview = read('preview.js');
  assert.match(preview, /import\('\.\/app\.js'\)/);
  assert.doesNotMatch(preview, /seedCards|seedPreview|saveCard\(/);
  assert.doesNotMatch(preview, /legacy/i);
});

test('production bootstrap owns all interactive controllers', () => {
  const bootstrap = read('bootstrap/boonwave-bootstrap.js');
  assert.match(bootstrap, /TransactionalNodeController/);
  assert.match(bootstrap, /LinkController/);
  assert.match(bootstrap, /ZoomController/);
  assert.match(bootstrap, /workspace\.destroy\(\)/);
  assert.doesNotMatch(bootstrap, /legacy|migrateLegacy/i);
});

test('service worker caches only the modular production entry', () => {
  const worker = read('sw.js');
  assert.match(worker, /\.\/index\.html/);
  assert.match(worker, /\.\/app\.js/);
  assert.match(worker, /\.\/styles\/production-shell\.css/);
  assert.doesNotMatch(worker, /legacy|boonwave\.v8/i);
});
