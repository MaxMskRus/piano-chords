import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const scriptMatches = [...html.matchAll(/<script\s+type="module"\s+src="([^"]+)"><\/script>/g)];
if (scriptMatches.length !== 1 || scriptMatches[0][1] !== 'js/main.js') {
  throw new Error('smoke: invalid module entrypoint');
}

const expectedCss = ['css/base.css', 'css/layout.css', 'css/components.css', 'css/modals.css'];
let cursor = -1;
for (const href of expectedCss) {
  const index = html.indexOf(`href="${href}"`);
  if (index === -1 || index < cursor) {
    throw new Error(`smoke: invalid css order (${expectedCss.join(', ')})`);
  }
  cursor = index;
}

globalThis.window = globalThis;
const bootstrap = await import(pathToFileURL(path.join(projectRoot, 'js/modules/bootstrap.js')).href);
if (typeof bootstrap.init !== 'function') {
  throw new Error('smoke: bootstrap init missing');
}

console.log('smoke-ok');
