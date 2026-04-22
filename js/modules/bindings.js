import { state, songTextState, midiState } from './state/stores.js';
import { el } from './dom.js';
import { saveSong, saveSongText } from './storage.js';
import { renderAll, setGlobalMode, transposeAll } from './commands.js';
import { extractChordOccurrences } from './core/text.js';
import { updateBodyModalOpen } from './core/ui-state.js';
import { updateMidiStatusUi, ensureWebAudioContextUnlocked, prepareMidiInteraction, toggleMidiMode, scheduleMidiEvaluation, syncUiState } from './core/midi.js';
import { smartInversionAll } from './features/smart-inversion.js';
import { openSongsModal, closeSongsModal, openFaqModal, closeFaqModal } from './features/songs.js';
import { openSongTextModal, closeSongTextModal, openSongTextFullModal, closeSongTextFullModal, updateSongTextPreview, renderSongTextView, addSongTextOccurrencesToSelected, showAppToast, applyGlobalModeToSongText, smartInversionSongText, transposeSongText } from './features/song-text.js';
import { openChordViewModal } from './features/chord-view.js';
import { setAllGroupsExpanded, hasAnyExpandedGroups, renderChordsList, printPdf } from './ui.js';
import { toggleLanguage, applyStaticTranslations, t } from './i18n.js';
import { updateChord } from './core/chords.js';

function bindUnlockAudio() {
  const unlockAudio = () => {
    ensureWebAudioContextUnlocked();
  };
  ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach((eventName) => {
    document.addEventListener(eventName, unlockAudio, { once: true });
  });
}

function bindSearchAndFilters() {
  el('search').addEventListener('input', (event) => {
    const prevLen = state.lastSearchLen;
    state.lastSearchLen = (event.target.value || '').trim().length;
    renderChordsList(prevLen);
  });
  document.querySelectorAll('.chord-filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.chordFilter = button.dataset.filter || 'all';
      renderAll();
    });
  });
  el('toggleAllGroups').addEventListener('click', () => {
    setAllGroupsExpanded(!hasAnyExpandedGroups());
  });
}

function bindViewAndModeControls() {
  el('toggleColor').addEventListener('click', (event) => {
    state.isColorMode = !state.isColorMode;
    renderAll();
    event.currentTarget?.blur?.();
  });
  el('togglePiano').addEventListener('click', (event) => {
    state.isPianoMode = !state.isPianoMode;
    renderAll();
    event.currentTarget?.blur?.();
  });
  el('clearAll').addEventListener('click', () => {
    state.selected = [];
    state.globalMode = 0;
    state.lastGlobalAction = 'mode0';
    el('songName').value = '';
    renderAll();
  });
  el('mode0').addEventListener('click', () => setGlobalMode(0));
  el('mode1').addEventListener('click', () => setGlobalMode(1));
  el('mode2').addEventListener('click', () => setGlobalMode(2));
  el('smartInv').addEventListener('click', smartInversionAll);
  el('transDown').addEventListener('click', () => transposeAll(-1));
  el('transUp').addEventListener('click', () => transposeAll(1));
  el('fullMode0').addEventListener('click', () => setGlobalMode(0));
  el('fullMode1').addEventListener('click', () => setGlobalMode(1));
  el('fullMode2').addEventListener('click', () => setGlobalMode(2));
  el('fullSmartInv').addEventListener('click', smartInversionAll);
  el('fullTransDown').addEventListener('click', () => transposeAll(-1));
  el('fullTransUp').addEventListener('click', () => transposeAll(1));
}

function bindFullscreenAndMidi() {
  el('fullScreen').addEventListener('click', () => {
    el('fullModal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    scheduleMidiEvaluation();
  });
  el('fullClose').addEventListener('click', () => {
    el('fullModal').classList.add('hidden');
    updateBodyModalOpen();
    scheduleMidiEvaluation();
  });
  const bindMidiButton = (id) => {
    const button = el(id);
    if (!button) return;
    button.addEventListener('click', async () => {
      const hadMidiAccess = !!midiState.access;
      if (!await prepareMidiInteraction()) return;
      if (!hadMidiAccess) {
        updateMidiStatusUi();
        return;
      }
      toggleMidiMode();
    });
  };
  bindMidiButton('midiMode');
}

function bindSongsAndFaq() {
  el('printPdf').addEventListener('click', printPdf);
  el('saveSong').addEventListener('click', () => {
    const name = el('songName').value.trim();
    if (!name) {
      showAppToast(t('enterSongName'));
      return;
    }
    saveSong(name);
    el('songName').value = '';
    showAppToast(t('songSaved'));
  });
  el('openSongs').addEventListener('click', openSongsModal);
  el('songsClose').addEventListener('click', closeSongsModal);
  const openFaqBtn = el('openFaqTop');
  if (openFaqBtn) openFaqBtn.addEventListener('click', openFaqModal);
  const faqClose = el('faqClose');
  if (faqClose) faqClose.addEventListener('click', closeFaqModal);
}

function bindLanguageToggle() {
  const button = el('langToggle');
  if (!button) return;
  button.addEventListener('click', () => {
    toggleLanguage();
    state.selected.forEach(updateChord);
    state.midiPreviewChords.forEach(updateChord);
    songTextState.occurrences.forEach((occ) => updateChord(occ.item));
    applyStaticTranslations();
    renderAll();
    updateSongTextPreview();
    renderSongTextView('songTextView');
    renderSongTextView('songTextFullView');
    if (!el('songsModal').classList.contains('hidden')) openSongsModal();
    updateMidiStatusUi();
  });
}

function bindSongText() {
  el('openImport').addEventListener('click', () => {
    openSongTextModal((el('songName').value || '').trim(), '', false);
  });
  el('songTextFull').addEventListener('click', openSongTextFullModal);
  el('songTextFullClose').addEventListener('click', closeSongTextFullModal);
  el('songTextClose').addEventListener('click', closeSongTextModal);
  el('songTextFind').addEventListener('click', () => {
    songTextState.rawText = el('songTextInput').value || '';
    songTextState.softMode = el('songTextSoftMode').checked;
    songTextState.occurrences = extractChordOccurrences(songTextState.rawText, songTextState.softMode);
    updateSongTextPreview();
    renderSongTextView();
  });
  el('songTextAdd').addEventListener('click', addSongTextOccurrencesToSelected);
  el('songTextAddSaved').addEventListener('click', addSongTextOccurrencesToSelected);
  el('songTextSave').addEventListener('click', () => {
    const title = (el('songTextTitle').value || '').trim();
    if (!title) {
      showAppToast(t('enterSongName'));
      return;
    }
    saveSongText(title, el('songTextInput').value || '');
    showAppToast(t('songSaved'));
  });
  el('songTextMode0').addEventListener('click', () => applyGlobalModeToSongText(0));
  el('songTextMode1').addEventListener('click', () => applyGlobalModeToSongText(1));
  el('songTextMode2').addEventListener('click', () => applyGlobalModeToSongText(2));
  el('songTextSmart').addEventListener('click', smartInversionSongText);
  el('songTextDown').addEventListener('click', () => transposeSongText(-1));
  el('songTextUp').addEventListener('click', () => transposeSongText(1));
  el('songTextViewPiano').addEventListener('click', () => { songTextState.viewMode = 'piano'; syncUiState(); });
  el('songTextViewColor').addEventListener('click', () => { songTextState.viewMode = 'color'; syncUiState(); });
  el('songTextViewNormal').addEventListener('click', () => { songTextState.viewMode = 'normal'; syncUiState(); });

  const bindChordView = (id, full = false) => {
    const view = el(id);
    view.addEventListener('click', (event) => {
      const target = event.target.closest('.song-chord');
      if (!target) return;
      const idx = Number(target.dataset.idx);
      const occ = songTextState.occurrences[idx];
      if (!occ) return;
      openChordViewModal(occ.item, {
        showActions: true,
        onChange: () => {
          renderSongTextView('songTextView');
          updateSongTextPreview();
          if (full) renderSongTextView('songTextFullView');
        }
      });
    });
  };
  bindChordView('songTextView', true);
  bindChordView('songTextFullView', true);
}

function bindApplicationEvents() {
  bindUnlockAudio();
  bindLanguageToggle();
  bindSearchAndFilters();
  bindViewAndModeControls();
  bindFullscreenAndMidi();
  bindSongsAndFaq();
  bindSongText();
}

export { bindApplicationEvents };
