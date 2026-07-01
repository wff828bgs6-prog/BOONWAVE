import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const failures = [];
const warnings = [];

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }
function read(path) { return readFileSync(join(ROOT, path), 'utf8'); }
function exists(path) { return existsSync(join(ROOT, path)); }

function walk(directory, results = []) {
  if (!exists(directory)) return results;
  for (const name of readdirSync(join(ROOT, directory))) {
    const relative = join(directory, name);
    const stats = statSync(join(ROOT, relative));
    if (stats.isDirectory()) walk(relative, results);
    else results.push(relative.replaceAll('\\', '/'));
  }
  return results;
}

function localReferences(text) {
  const references = new Set();
  const patterns = [
    /(?:src|href)=["']([^"']+)["']/g,
    /(?:import\s+(?:[^"']+?\s+from\s+)?|import\s*\()["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1];
      if (!value || /^(?:https?:|data:|#)/.test(value)) continue;
      references.add(value.replace(/^\.\//, ''));
    }
  }
  return [...references];
}

const required = [
  'index.html',
  'app.js',
  'package.json',
  'manifest.webmanifest',
  'sw.js',
  'styles/boonwave-tokens.css',
  'styles/production-shell.css',
  'styles/card-views.css',
  'styles/one-hand-rail-v3.css',
  'storage/storage-adapter.js',
  'storage/indexeddb-adapter.js',
  'storage/migrations.js',
  'state/store.js',
  'domain/node.js',
  'canvas/gesture-machine.js',
  'controllers/workspace-controller-v2.js',
  '.github/workflows/core-quality.yml',
];

for (const path of required) if (!exists(path)) fail(`Missing required file: ${path}`);

const forbiddenFiles = [
  'sw-v2.js',
  'boonwave.v8.js',
  'boonwave.v8.css',
  'canvas/card-interaction-policy.js',
];
for (const path of forbiddenFiles) if (exists(path)) fail(`Retired artifact is still present: ${path}`);

const index = read('index.html');
const app = read('app.js');
const worker = read('sw.js');

if (!app.includes("register('./sw.js'")) fail('app.js must register the canonical ./sw.js worker.');
if (/sw-v\d+\.js/.test(app)) fail('Versioned service-worker script is referenced by app.js.');
if (/one-hand-rail-v2\.css|boonwave\.v8\.(?:js|css)/.test(index + worker)) {
  fail('Active shell or worker references a retired UI artifact.');
}

for (const reference of localReferences(index)) {
  if (!exists(reference)) fail(`index.html references a missing local file: ${reference}`);
}

const workerAssets = [...worker.matchAll(/["'](\.\/[A-Za-z0-9_./-]+)["']/g)]
  .map((match) => match[1].replace(/^\.\//, ''))
  .filter((path) => extname(path));
for (const asset of workerAssets) if (!exists(asset)) fail(`sw.js precaches a missing asset: ${asset}`);

const activeFiles = walk('canvas')
  .concat(walk('controllers'), walk('bootstrap'), walk('services'), walk('state'), walk('storage'))
  .filter((path) => path.endsWith('.js'));
for (const path of activeFiles) {
  const text = read(path);
  if (/onInteractiveDoubleTap|DOUBLE_TAP|longPressTimer|onInteractiveLongPress/.test(text)) {
    warn(`Legacy gesture terminology remains in ${path}; review before reusing it.`);
  }
}

const storageIndex = read('storage/index.js');
if (storageIndex.includes('Native storage adapter is not connected yet')) {
  warnings.push('Native SQLite adapter is not connected; App Store packaging is not yet ready.');
}
if (!exists('capacitor.config.ts') && !exists('capacitor.config.json')) {
  warnings.push('Capacitor configuration is absent; native iOS packaging has not started.');
}

for (const message of warnings) console.warn(`WARN: ${message}`);
if (failures.length) {
  for (const message of failures) console.error(`ERROR: ${message}`);
  process.exitCode = 1;
} else {
  console.log(`Repository integrity passed with ${warnings.length} warning(s).`);
}
