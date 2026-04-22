import { state } from './state/stores.js';
import { renderChordFilterState } from './core/filter-state.js';
import { syncUiState } from './core/midi.js';
import { syncSelectedMidiPreviewLayout } from './core.js';
import { scheduleMidiEvaluation } from './core/midi.js';
import { resetChord, updateChord } from './core/chords.js';
import { saveLastState } from './storage.js';
import { renderSelected, renderChordsList } from './ui.js';

function renderAll() {
  renderSelected('selectedGrid');
  renderSelected('fullGrid');
  renderChordsList();
  renderChordFilterState();
  syncUiState();
  syncSelectedMidiPreviewLayout();
  saveLastState();
  scheduleMidiEvaluation();
}

function setGlobalMode(mode) {
  state.globalMode = mode;
  state.lastGlobalAction = `mode${mode}`;
  state.selected.forEach(c => { resetChord(c); c.mode = mode; updateChord(c); });
  renderAll();
}

function transposeAll(semi) {
  state.selected.forEach(c => { c.transposeOffset += semi; updateChord(c); });
  renderAll();
}

export { renderAll, setGlobalMode, transposeAll };
