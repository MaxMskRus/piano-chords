import { loadLastState } from './storage.js';
import { verifyRequiredDomIds } from './dom.js';
import { renderAll } from './commands.js';
import { updateMidiStatusUi } from './core/midi.js';
import { bindApplicationEvents } from './bindings.js';
import { applyStaticTranslations } from './i18n.js';

function init() {
  verifyRequiredDomIds();
  loadLastState();
  applyStaticTranslations();
  renderAll();
  updateMidiStatusUi();
  bindApplicationEvents();
}

export { init };
