import { state, midiState } from '../state/stores.js';
import { el } from '../dom.js';

function isProbablyVirtualMidiInput(input) {
  const text = `${input?.name || ''} ${input?.manufacturer || ''}`.toLowerCase();
  return [
    'midi through',
    'through port',
    'loopmidi',
    'virtual',
    'mapper',
    'microsoft gs',
    'web midi',
    'browser',
    'internal'
  ].some((token) => text.includes(token));
}

function getRealMidiInputs() {
  if (!midiState.access) return [];
  return Array.from(midiState.access.inputs.values()).filter((input) => !isProbablyVirtualMidiInput(input));
}

function hasRealMidiInput() {
  return getRealMidiInputs().length > 0;
}

function isSongTextMidiContext() {
  const songTextModal = el('songTextModal');
  const songTextFullModal = el('songTextFullModal');
  return !!(songTextModal && !songTextModal.classList.contains('hidden'))
    || !!(songTextFullModal && !songTextFullModal.classList.contains('hidden'));
}

function currentMidiFreePlayMode() {
  return isSongTextMidiContext() ? true : state.isMidiFreePlay;
}

export {
  isProbablyVirtualMidiInput,
  getRealMidiInputs,
  hasRealMidiInput,
  isSongTextMidiContext,
  currentMidiFreePlayMode
};
