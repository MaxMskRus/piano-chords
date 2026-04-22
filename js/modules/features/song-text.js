import { state, songTextState } from '../state/stores.js';
import { el } from '../dom.js';
import { updateBodyModalOpen } from '../core/ui-state.js';
import { scheduleMidiEvaluation, syncUiState } from '../core/midi.js';
import { getFullChordName, buildChord, updateChord, resetChord } from '../core/chords.js';
import { buildSongTextHtml, formatChordForText, extractChordOccurrences } from '../core/text.js';
import { buildVoicingForMode, voicingCost } from './smart-inversion.js';
import { renderAll } from '../commands.js';
import { t } from '../i18n.js';
function renderSongTextView(targetId = 'songTextView') {
  const view = el(targetId);
  if (!songTextState.rawText) {
    if (view) view.innerHTML = '';
    syncUiState();
    return;
  }
  if (!songTextState.occurrences.length) {
    if (view) view.textContent = songTextState.rawText;
    syncUiState();
    return;
  }
  if (view) view.innerHTML = buildSongTextHtml(songTextState.rawText, songTextState.occurrences);
  syncUiState();
}

function updateSongTextPreview() {
  const preview = document.querySelector('.song-text-preview');
  if (!preview) return;
  songTextState.lastAddedSignature = null;
  preview.innerHTML = '';
  if (!songTextState.occurrences.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('chordsNotFound');
    preview.appendChild(empty);
    return;
  }
  songTextState.occurrences.forEach(occ => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const base = occ.base;
    chip.textContent = formatChordForText(occ);
    const ru = document.createElement('span');
    ru.className = 'ru';
    ru.textContent = getFullChordName(base);
    chip.appendChild(ru);
    preview.appendChild(chip);
  });
}

function addSongTextOccurrencesToSelected() {
  if (!songTextState.occurrences.length) {
    songTextState.rawText = el('songTextInput').value || songTextState.rawText || '';
    songTextState.softMode = !!el('songTextSoftMode')?.checked;
    songTextState.occurrences = extractChordOccurrences(songTextState.rawText, songTextState.softMode);
  }
  const currentSignature = songTextState.occurrences
    .map((occ) => `${occ.base}:${occ.item.mode}:${occ.item.transposeOffset}`)
    .join('|');
  if (currentSignature && currentSignature === songTextState.lastAddedSignature) {
    showAppToast(t('chordsAlreadyAdded'));
    return;
  }
  songTextState.occurrences.forEach(occ => {
    const item = buildChord(occ.base, occ.item.mode, occ.item.transposeOffset);
    if (item) state.selected.push(item);
  });
  if (currentSignature) {
    songTextState.lastAddedSignature = currentSignature;
  }
  renderAll();
  showAppToast(songTextState.occurrences.length ? t('chordsAdded') : t('chordsNotFound'));
}

let toastTimer = null;
function showAppToast(message) {
  const toast = el('appToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 1600);
}

function openSongTextModal(title = '', text = '', viewOnly = false) {
  songTextState.title = title || '';
  songTextState.rawText = text || '';
  songTextState.occurrences = [];
  songTextState.softMode = false;
  songTextState.viewMode = 'piano';
  songTextState.lastAddedSignature = null;

  el('songTextTitle').value = songTextState.title;
  el('songTextInput').value = songTextState.rawText;
  el('songTextSoftMode').checked = false;

  const modal = el('songTextModal');
  modal.classList.toggle('view-only', !!viewOnly);
  modal.classList.toggle('edit-mode', !viewOnly);
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  if (songTextState.rawText.trim()) {
    songTextState.occurrences = extractChordOccurrences(songTextState.rawText, false);
    updateSongTextPreview();
    renderSongTextView('songTextView');
  } else {
    updateSongTextPreview();
    renderSongTextView('songTextView');
  }
  scheduleMidiEvaluation();
}

function closeSongTextModal() {
  const modal = el('songTextModal');
  modal.classList.add('hidden');
  modal.classList.remove('view-only', 'edit-mode');
  el('songName').value = '';
  songTextState.title = '';
  songTextState.rawText = '';
  songTextState.occurrences = [];
  updateBodyModalOpen();
  scheduleMidiEvaluation();
}

function openSongTextFullModal() {
  el('songTextFullModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  renderSongTextView('songTextFullView');
  scheduleMidiEvaluation();
}

function closeSongTextFullModal() {
  el('songTextFullModal').classList.add('hidden');
  updateBodyModalOpen();
  scheduleMidiEvaluation();
}

function applyGlobalModeToSongText(mode) {
  songTextState.occurrences.forEach(occ => {
    resetChord(occ.item);
    occ.item.mode = mode;
    updateChord(occ.item);
  });
  renderSongTextView();
  updateSongTextPreview();
}

function transposeSongText(semi) {
  songTextState.occurrences.forEach(occ => {
    occ.item.transposeOffset += semi;
    updateChord(occ.item);
  });
  renderSongTextView();
  updateSongTextPreview();
}

function smartInversionSongText() {
  if (!songTextState.occurrences.length) return;
  let prevVoicing = null;
  songTextState.occurrences.forEach(occ => {
    const chord = occ.item;
    const candidates = [0,1,2].map(mode => {
      const v = buildVoicingForMode(chord, mode, prevVoicing, 48);
      return { mode, v, cost: voicingCost(prevVoicing, v) };
    }).filter(x => x.v);
    if (!candidates.length) return;
    candidates.sort((a,b)=>a.cost-b.cost);
    chord.mode = candidates[0].mode;
    updateChord(chord);
    prevVoicing = candidates[0].v;
  });
  renderSongTextView();
  updateSongTextPreview();
}

export {
  renderSongTextView,
  updateSongTextPreview,
  addSongTextOccurrencesToSelected,
  showAppToast,
  openSongTextModal,
  closeSongTextModal,
  openSongTextFullModal,
  closeSongTextFullModal,
  applyGlobalModeToSongText,
  transposeSongText,
  smartInversionSongText
};
