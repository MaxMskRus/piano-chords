import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOM_IDS } from '../js/modules/dom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

const missing = DOM_IDS.filter((id) => !html.includes(`id="${id}"`));
if (missing.length) {
  throw new Error(`Missing ids: ${missing.join(', ')}`);
}
console.log('dom-ok');
