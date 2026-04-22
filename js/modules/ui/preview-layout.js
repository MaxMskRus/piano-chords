import { state } from '../state/stores.js';
import { el } from '../dom.js';
import { hasRealMidiInput, isSongTextMidiContext } from '../core/midi-shared.js';
import { measureMidiPreviewMetrics } from './card-factory.js';

function shouldShowMidiPreview() {
  return state.isMidiFreePlay
    && state.selected.length === 0
    && !isSongTextMidiContext()
    && hasRealMidiInput()
    && Array.isArray(state.midiPreviewChords);
}

function syncSelectedMidiPreviewLayout() {
  const selectedWrap = el('selectedChords');
  const selectedGrid = el('selectedGrid');
  const fullGrid = el('fullGrid');
  const isActive = shouldShowMidiPreview();
  const selectedMetrics = isActive ? measureMidiPreviewMetrics('selectedGrid') : null;
  const fullMetrics = isActive ? measureMidiPreviewMetrics('fullGrid') : null;
  if (selectedWrap) {
    selectedWrap.classList.toggle('empty-midi-active', isActive);
    selectedWrap.style.minHeight = isActive && selectedMetrics ? `${Math.ceil(selectedMetrics.height) + 16}px` : '';
  }
  if (selectedGrid) {
    selectedGrid.classList.toggle('empty-midi-active-grid', isActive);
    selectedGrid.style.minHeight = isActive && selectedMetrics ? `${Math.ceil(selectedMetrics.height)}px` : '';
  }
  if (fullGrid) {
    fullGrid.classList.toggle('empty-midi-active-grid', isActive);
    fullGrid.style.minHeight = isActive && fullMetrics ? `${Math.ceil(fullMetrics.height)}px` : '';
  }
}

export { shouldShowMidiPreview, syncSelectedMidiPreviewLayout };
