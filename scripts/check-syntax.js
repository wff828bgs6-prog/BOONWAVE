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
    /\bimport\s+(?:[\s\S]*?\sfrom\s+)?['"](\.[^'"]+)['"]/g,
    /\bexport\s+[\s\S]*?\sfrom\s+['"](\.[^'"]+)['"]/g,
    /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }

  return [...specifiers];
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

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });

  const source = readFileSync(file, 'utf8');
  for (const specifier of collectLocalImportSpecifiers(source)) {
    if (resolveLocalModule(file, specifier)) continue;
    unresolvedImports.push(`${relative(ROOT, file)} -> ${specifier}`);
  }
}

if (unresolvedImports.length > 0) {
  throw new Error(`Unresolved local imports:\n${unresolvedImports.join('\n')}`);
}

console.log(`Syntax and imports OK: ${files.length} JavaScript files checked.`);
console.log(files.map((file) => relative(ROOT, file)).join('\n'));
