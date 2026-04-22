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
await import(moduleUrl('js/modules/core.js'));
await import(moduleUrl('js/modules/ui.js'));
await import(moduleUrl('js/modules/commands.js'));
await import(moduleUrl('js/modules/features.js'));
await import(moduleUrl('js/modules/init.js'));
console.log('esm-ok');
