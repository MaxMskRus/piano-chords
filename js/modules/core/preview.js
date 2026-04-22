import { state } from '../state/stores.js';
import { PREVIEW_AUDIO_CONFIG, PREVIEW_VISUAL_DURATION_MS } from '../../config/audio.js';
import { CHORDS_DATA } from '../data/chords-data.js';
import { buildChord, parseNotes, parseNoteToSemitone, normalizeToSharp, buildAscendingNotePositions } from './chords.js';
import { ensureWebAudioReadyForPreview } from './midi.js';
import { t } from '../i18n.js';

function getChordPreviewMidiNotes(name) {
  const chord = buildChord(name, state.globalMode, 0);
  return getPreviewMidiNotesForChord(chord);
}

function getPreviewMidiNotesForChord(chord) {
  if (!chord || !chord.originalName) return [];
  const base = CHORDS_DATA.find((entry) => entry[0] === chord.originalName);
  if (!base) return [];
  const baseNotes = parseNotes(base[1], 0, chord.transposeOffset);
  if (!baseNotes.length) return [];
  const rootNote = normalizeToSharp(baseNotes[0]);
  const rootSemitone = parseNoteToSemitone(rootNote);
  if (rootSemitone === null) return [];
  const pitchClass = ((rootSemitone % 12) + 12) % 12;
  const rootMidi = 48 + pitchClass;
  const basePositions = buildAscendingNotePositions(baseNotes);
  let positions = basePositions.slice();
  if (chord.mode === 1 || chord.mode === 2) {
    for (let i = 0; i < chord.mode; i += 1) {
      if (!positions.length) break;
      const moved = positions.shift();
      positions.push(moved + 12);
    }
  }
  const upperVoicing = positions.map((offset) => rootMidi + offset);
  const bassMidi = Math.max(24, rootMidi - 12);
  return [bassMidi, ...upperVoicing];
}

function getPreviewMidiNotesFromNotes(notes) {
  if (!notes || !notes.length) return [];
  const bassNote = normalizeToSharp(notes[0]);
  const bassSemitone = parseNoteToSemitone(bassNote);
  if (bassSemitone === null) return [];
  const pitchClass = ((bassSemitone % 12) + 12) % 12;
  const baseMidi = 48 + pitchClass;
  const positions = buildAscendingNotePositions(notes);
  const upperVoicing = positions.map((offset) => baseMidi + offset);
  const bassMidi = Math.max(24, baseMidi - 12);
  return [bassMidi, ...upperVoicing];
}

async function previewGroupChord(name, button = null) {
  const midiNotes = getChordPreviewMidiNotes(name);
  if (!midiNotes.length) return false;
  const engine = await ensureWebAudioReadyForPreview(midiNotes);
  if (!engine) return false;
  button?.classList.add('is-playing');
  engine.previewChord(midiNotes, PREVIEW_AUDIO_CONFIG.velocity, PREVIEW_AUDIO_CONFIG);
  window.setTimeout(() => button?.classList.remove('is-playing'), PREVIEW_VISUAL_DURATION_MS);
  return true;
}

async function previewChordNotes(notes, surface = null) {
  const midiNotes = Array.isArray(notes?.notes)
    ? getPreviewMidiNotesForChord(notes)
    : getPreviewMidiNotesFromNotes(notes);
  if (!midiNotes.length) return false;
  const engine = await ensureWebAudioReadyForPreview(midiNotes);
  if (!engine) return false;
  surface?.classList.add('is-playing');
  engine.previewChord(midiNotes, PREVIEW_AUDIO_CONFIG.velocity, PREVIEW_AUDIO_CONFIG);
  window.setTimeout(() => surface?.classList.remove('is-playing'), PREVIEW_VISUAL_DURATION_MS);
  return true;
}

function attachChordPreviewSurface(surface, chord) {
  if (!surface || !chord || !Array.isArray(chord.notes) || !chord.notes.length) return;
  surface.classList.add('play-surface');
  surface.title = `${t('previewVerb')} ${chord.name}`;
  surface.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await previewChordNotes(chord, surface);
  });
}

export {
  getChordPreviewMidiNotes,
  getPreviewMidiNotesForChord,
  getPreviewMidiNotesFromNotes,
  previewGroupChord,
  previewChordNotes,
  attachChordPreviewSurface
};
