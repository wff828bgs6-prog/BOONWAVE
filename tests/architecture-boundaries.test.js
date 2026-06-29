import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RETIRED_PATHS = [
  'controllers/safe-node-controller-v2.js',
  'services/card-bundle-service.js',
  'services/card-media-service.js',
];
const PRODUCTION_DIRS = [
  'bootstrap',
  'canvas',
  'controllers',
  'domain',
  'services',
  'storage',
  'ui',
];
const RETIRED_IMPORTS = [
  'card-bundle-service.js',
  'card-media-service.js',
  'safe-node-controller-v2.js',
];

function collectJavaScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...collectJavaScriptFiles(path));
    else if (entry.endsWith('.js')) files.push(path);
  }
  return files;
}

test('retired parallel save modules are absent', () => {
  for (const path of RETIRED_PATHS) {
    assert.equal(existsSync(join(ROOT, path)), false, `${path} must stay removed`);
  }
});

test('production modules do not import retired save paths', () => {
  const productionFiles = PRODUCTION_DIRS.flatMap((directory) => (
    collectJavaScriptFiles(join(ROOT, directory))
  ));

  for (const file of productionFiles) {
    const source = readFileSync(file, 'utf8');
    for (const retiredImport of RETIRED_IMPORTS) {
      assert.equal(source.includes(retiredImport), false, `${file} references ${retiredImport}`);
    }
  }
});

test('node UI and transactional persistence keep separate responsibilities', () => {
  const nodeController = readFileSync(join(ROOT, 'controllers/node-controller.js'), 'utf8');
  const transactionalController = readFileSync(
    join(ROOT, 'controllers/transactional-node-controller.js'),
    'utf8',
  );
  const cardSaveService = readFileSync(join(ROOT, 'services/card-save-service.js'), 'utf8');

  assert.match(nodeController, /\.\.\/domain\/card-media\.js/);
  assert.doesNotMatch(nodeController, /createCardNode|updateCardNode|createMedia|attachMediaToCard/);
  assert.match(transactionalController, /\.\.\/services\/card-save-service\.js/);
  assert.match(cardSaveService, /saveCardBundle/);
  assert.doesNotMatch(cardSaveService, /storageAdapter\.saveMedia\s*\(/);
});
