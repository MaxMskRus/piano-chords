import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8');
}

const bindings = read('js/modules/bindings.js');
if (!bindings.includes("el('openImport').addEventListener('click'")) {
  throw new Error('architecture: openImport binding missing');
}
if (!bindings.includes("openSongTextModal((el('songName').value || '').trim(), '', false);")) {
  throw new Error('architecture: openImport no longer opens songTextModal');
}

const featureFiles = [
  'js/modules/features.js',
  'js/modules/bindings.js',
  'js/modules/dom.js',
  'index.html'
];
for (const file of featureFiles) {
  const source = read(file);
  if (source.includes('importModal')) {
    throw new Error(`architecture: stale importModal reference found in ${file}`);
  }
}

const storage = read('js/modules/storage.js');
if (!storage.includes('STORAGE_KEYS')) {
  throw new Error('architecture: storage keys were not centralized');
}

console.log('architecture-ok');
