import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
} from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const IMPORT_CHECK_DIRS = new Set([
  'bootstrap',
  'canvas',
  'controllers',
  'domain',
  'scripts',
  'services',
  'storage',
  'tests',
  'ui',
]);
const IMPORT_CHECK_ROOT_FILES = new Set(['app.js', 'preview.js']);

function collectJavaScriptFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectLocalImportSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /^\s*import\s+(?:[^;]*?\sfrom\s+)?['"](\.[^'"]+)['"]/gm,
    /^\s*export\s+[^;]*?\sfrom\s+['"](\.[^'"]+)['"]/gm,
    /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }

  return [...specifiers];
}

function shouldCheckImports(file) {
  const path = relative(ROOT, file).replaceAll('\\', '/');
  if (IMPORT_CHECK_ROOT_FILES.has(path)) return true;
  return IMPORT_CHECK_DIRS.has(path.split('/')[0]);
}

function resolveLocalModule(importingFile, specifier) {
  const cleanSpecifier = specifier.split(/[?#]/, 1)[0];
  const basePath = resolve(dirname(importingFile), cleanSpecifier);
  const candidates = extname(basePath)
    ? [basePath]
    : [basePath, `${basePath}.js`, join(basePath, 'index.js')];

  return candidates.find((candidate) => (
    existsSync(candidate) && statSync(candidate).isFile()
  )) ?? null;
}

const files = collectJavaScriptFiles(ROOT);
const unresolvedImports = [];
let importCheckedFiles = 0;

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (!shouldCheckImports(file)) continue;

  importCheckedFiles += 1;
  const source = readFileSync(file, 'utf8');
  for (const specifier of collectLocalImportSpecifiers(source)) {
    if (resolveLocalModule(file, specifier)) continue;
    unresolvedImports.push(`${relative(ROOT, file)} -> ${specifier}`);
  }
}

if (unresolvedImports.length > 0) {
  throw new Error(`Unresolved modular imports:\n${unresolvedImports.join('\n')}`);
}

console.log(`Syntax OK: ${files.length} JavaScript files checked.`);
console.log(`Import graph OK: ${importCheckedFiles} modular files checked.`);
