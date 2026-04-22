import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const moduleUrl = (relativePath) => pathToFileURL(path.join(projectRoot, relativePath)).href;

globalThis.window = globalThis;
await import(moduleUrl('js/modules/state/constants.js'));
await import(moduleUrl('js/modules/state/stores.js'));
await import(moduleUrl('js/modules/dom.js'));
await import(moduleUrl('js/modules/storage.js'));
const core = await import(moduleUrl('js/modules/core.js'));
const checks = [
  core.classifyChordFilter('C13') === 'dominant',
  core.classifyChordFilter('Cm11') === 'm7',
  core.classifyChordFilter('Cmaj9') === 'maj7',
  Array.isArray(core.extractChordsFromText('Am F C G', false)),
  typeof core.buildChord('C', 0, 0) === 'object'
];
if (checks.some((x) => !x)) {
  throw new Error('logic validation failed');
}
console.log('logic-ok');
