import { WebPianoEngine } from '../../audio/index.js';
import { MIDI_EVALUATION_DELAY } from '../../config/midi.js';
import { STORAGE_KEYS } from '../state/constants.js';
import { state, songTextState, midiState } from '../state/stores.js';
import { el } from '../dom.js';
import { t } from '../i18n.js';
import { setActiveButtons, setToggleState, setMidiModeButtonState, setMidiStatus } from './ui-state.js';
import { getHeldPitchClasses, findMatchingSelectedIndices, getMidiPreviewCandidates, setMidiMatchedIndices } from './midi-preview.js';
import { isProbablyVirtualMidiInput, getRealMidiInputs, hasRealMidiInput, isSongTextMidiContext, currentMidiFreePlayMode } from './midi-shared.js';
import { renderSelected } from '../ui.js';
import { syncSelectedMidiPreviewLayout } from '../ui/preview-layout.js';

function updateMidiStatusUi() {
  if (!midiState.supported) {
    setMidiStatus(t('midiUnsupported'), 'error');
    return;
  }
  if (midiState.connecting) {
    setMidiStatus(t('midiConnecting'), '');
    return;
  }
  if (midiState.access) {
    const inputs = getRealMidiInputs();
    if (inputs.length > 0) {
      const names = inputs.map((input) => input.name || 'MIDI').join(', ');
      setMidiStatus(t('midiConnected', { names }), 'ready');
      return;
    }
    setMidiStatus(t('midiAccessGranted'), '');
    return;
  }
  if (midiState.permissionDenied) {
    setMidiStatus(t('midiDenied'), 'error');
    return;
  }
  if (midiState.lastError) {
    setMidiStatus(midiState.lastError, 'error');
    return;
  }
  setMidiStatus(t('midiStartHint'), '');
}

function syncUiState() {
  setToggleState('toggleColor', state.isColorMode);
  setToggleState('togglePiano', state.isPianoMode);
  setMidiModeButtonState('midiMode', state.isMidiFreePlay);
  setActiveButtons(['mode0', 'mode1', 'mode2', 'smartInv'], state.lastGlobalAction);
  setActiveButtons(
    ['fullMode0', 'fullMode1', 'fullMode2', 'fullSmartInv'],
    state.lastGlobalAction === 'smartInv' ? 'fullSmartInv' : `fullMode${state.globalMode}`
  );
  setActiveButtons(
    ['songTextViewPiano', 'songTextViewColor', 'songTextViewNormal'],
    songTextState.viewMode === 'piano'
      ? 'songTextViewPiano'
      : songTextState.viewMode === 'color'
        ? 'songTextViewColor'
        : 'songTextViewNormal'
  );
  updateMidiStatusUi();
}

function updateMidiPreviewChord(pitchClasses) {
  if (!(state.isMidiFreePlay && state.selected.length === 0 && hasRealMidiInput() && !isSongTextMidiContext()) || !pitchClasses || pitchClasses.size === 0) {
    state.midiPreviewChords = [];
    return;
  }
  state.midiPreviewChords = getMidiPreviewCandidates(pitchClasses);
}

async function ensureWebAudioReady() {
  if (!midiState.audioEngine) {
    midiState.audioEngine = new WebPianoEngine();
    midiState.audioEngine.setStatusCallback((message) => setMidiStatus(message));
  }
  try {
    await midiState.audioEngine.ensureReady();
    midiState.audioUnlocked = true;
    updateMidiStatusUi();
    return midiState.audioEngine;
  } catch (error) {
    midiState.lastError = t('audioLoadError');
    updateMidiStatusUi();
    console.error('Audio init failed', error);
    return null;
  }
}

async function ensureWebAudioReadyForPreview(midiNotes) {
  if (!midiState.audioEngine) {
    midiState.audioEngine = new WebPianoEngine();
    midiState.audioEngine.setStatusCallback((message) => setMidiStatus(message));
  }
  try {
    await midiState.audioEngine.ensurePreviewReady(midiNotes);
    midiState.audioUnlocked = true;
    return midiState.audioEngine;
  } catch (error) {
    midiState.lastError = t('previewPrepareError');
    updateMidiStatusUi();
    console.error('Preview audio init failed', error);
    return null;
  }
}

async function ensureWebAudioContextUnlocked() {
  if (!midiState.audioEngine) {
    midiState.audioEngine = new WebPianoEngine();
    midiState.audioEngine.setStatusCallback((message) => setMidiStatus(message));
  }
  try {
    await midiState.audioEngine.ensureContextReady();
    midiState.audioUnlocked = true;
    return midiState.audioEngine;
  } catch (error) {
    console.error('Audio context unlock failed', error);
    return null;
  }
}

function evaluateMidiState() {
  const pitchClasses = getHeldPitchClasses();
  const isFreePlay = currentMidiFreePlayMode();
  const hasSongTextContext = isSongTextMidiContext();
  let desiredHeld = new Set();
  let matched = [];

  if (isFreePlay) {
    desiredHeld = new Set(midiState.heldNotes);
    if (!hasSongTextContext && pitchClasses.size > 0) {
      matched = findMatchingSelectedIndices(pitchClasses);
    }
  } else if (state.selected.length > 0 && pitchClasses.size > 0) {
    matched = findMatchingSelectedIndices(pitchClasses);
    if (matched.length > 0) desiredHeld = new Set(midiState.heldNotes);
  }

  setMidiMatchedIndices(matched);
  updateMidiPreviewChord(pitchClasses);
  const engine = midiState.audioEngine;
  if (engine && midiState.audioUnlocked) {
    engine.syncHeldNotes(desiredHeld, midiState.velocities);
  }
  syncSelectedMidiPreviewLayout();
  renderSelected('selectedGrid');
  renderSelected('fullGrid');
}

function scheduleMidiEvaluation() {
  if (midiState.evaluationTimer) {
    clearTimeout(midiState.evaluationTimer);
    midiState.evaluationTimer = null;
  }
  const delay = currentMidiFreePlayMode() ? MIDI_EVALUATION_DELAY.freePlay : MIDI_EVALUATION_DELAY.training;
  midiState.evaluationTimer = setTimeout(() => {
    midiState.evaluationTimer = null;
    evaluateMidiState();
  }, delay);
}

function handleMidiMessage(message) {
  const [status, data1, data2] = message.data;
  const command = status & 0xf0;
  if (command === 0x90 && data2 > 0) {
    midiState.heldNotes.add(data1);
    midiState.velocities.set(data1, data2);
  } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
    midiState.heldNotes.delete(data1);
    midiState.velocities.delete(data1);
  } else {
    return;
  }
  if (!currentMidiFreePlayMode()) {
    const pitchClasses = getHeldPitchClasses();
    const exactMatches = pitchClasses.size > 0 ? findMatchingSelectedIndices(pitchClasses) : [];
    if (exactMatches.length === 0) {
      setMidiMatchedIndices([]);
      if (midiState.audioEngine && midiState.audioUnlocked) {
        midiState.audioEngine.syncHeldNotes(new Set(), midiState.velocities);
      }
    }
  }
  scheduleMidiEvaluation();
}

function bindMidiInputs() {
  if (!midiState.access) return;
  midiState.access.inputs.forEach((input) => {
    input.onmidimessage = handleMidiMessage;
  });
  midiState.access.onstatechange = () => {
    bindMidiInputs();
    updateMidiStatusUi();
    if (!hasRealMidiInput()) state.midiPreviewChords = [];
    syncSelectedMidiPreviewLayout();
    renderSelected('selectedGrid');
    renderSelected('fullGrid');
    scheduleMidiEvaluation();
  };
  updateMidiStatusUi();
}

async function ensureMidiInitialized() {
  if (!midiState.supported) {
    updateMidiStatusUi();
    return null;
  }
  if (midiState.access) return midiState.access;
  if (midiState.connecting) return null;
  midiState.connecting = true;
  midiState.lastError = '';
  midiState.permissionDenied = false;
  updateMidiStatusUi();
  try {
    midiState.access = await navigator.requestMIDIAccess({ sysex: false });
    midiState.initialized = true;
    bindMidiInputs();
    return midiState.access;
  } catch (error) {
    midiState.initialized = false;
    midiState.access = null;
    const name = error && error.name ? String(error.name) : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      midiState.permissionDenied = true;
      midiState.lastError = t('midiAccessBrowserDenied');
    } else if (name === 'NotSupportedError') {
      midiState.lastError = t('midiUnavailable');
    } else {
      midiState.lastError = t('midiConnectError');
    }
    console.warn('MIDI access denied or unavailable', error);
    return null;
  } finally {
    midiState.connecting = false;
    updateMidiStatusUi();
  }
}

async function prepareMidiInteraction() {
  await ensureWebAudioContextUnlocked();
  const access = await ensureMidiInitialized();
  if (!access) return false;
  const engine = await ensureWebAudioReady();
  if (!engine) return false;
  scheduleMidiEvaluation();
  return true;
}

function toggleMidiMode() {
  state.isMidiFreePlay = !state.isMidiFreePlay;
  localStorage.setItem(STORAGE_KEYS.MIDI_FREE_PLAY, state.isMidiFreePlay ? '1' : '0');
  syncUiState();
  scheduleMidiEvaluation();
}

export {
  isProbablyVirtualMidiInput,
  getRealMidiInputs,
  hasRealMidiInput,
  updateMidiStatusUi,
  syncUiState,
  isSongTextMidiContext,
  currentMidiFreePlayMode,
  updateMidiPreviewChord,
  ensureWebAudioReady,
  ensureWebAudioReadyForPreview,
  ensureWebAudioContextUnlocked,
  evaluateMidiState,
  scheduleMidiEvaluation,
  handleMidiMessage,
  bindMidiInputs,
  ensureMidiInitialized,
  prepareMidiInteraction,
  toggleMidiMode
};
