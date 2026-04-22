import * as renderers from './ui/renderers.js';
import * as interactions from './ui/interactions.js';
import { renderAll } from './commands.js';

function renderChordsList(prevSearchLen) {
  return renderers.renderChordsList((name) => {
    renderers.addChord(name);
    renderAll();
  }, prevSearchLen);
}

function renderSelected(targetId) {
  return renderers.renderSelected(targetId, interactions.attachDragListeners);
}

function addChord(name) {
  renderers.addChord(name);
  renderAll();
}

export * from './ui/renderers.js';
export * from './ui/interactions.js';
export { renderChordsList, renderSelected, addChord };
