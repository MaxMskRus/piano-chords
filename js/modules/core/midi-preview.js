import { CHORDS_DATA } from '../data/chords-data.js';
import { state, midiState } from '../state/stores.js';
import { el } from '../dom.js';
import { MIDI_PREVIEW_SUFFIX_PRIORITY } from '../../config/midi.js';
import { buildChord, parseNoteToSemitone } from './chords.js';

function chordPitchClassSet(chord) {
  return new Set(chord.notes.map((note) => {
    const value = parseNoteToSemitone(note);
    return value === null ? null : ((value % 12) + 12) % 12;
  }).filter((value) => value !== null));
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function getHeldPitchClasses() {
  return new Set(Array.from(midiState.heldNotes).map((note) => ((note % 12) + 12) % 12));
}

function getChordRootName(name) {
  if (!name) return '';
  return (name.length > 1 && (name[1] === '#' || name[1] === 'b')) ? name.slice(0, 2) : name.slice(0, 1);
}

function getChordSuffix(name) {
  return name.slice(getChordRootName(name).length);
}

function getHeldBassPitchClass() {
  if (!midiState.heldNotes.size) return null;
  const lowest = Math.min(...Array.from(midiState.heldNotes));
  return ((lowest % 12) + 12) % 12;
}

function getRankedMidiCandidates(pitchClasses) {
  if (!pitchClasses || pitchClasses.size === 0) return [];
  const bassPc = getHeldBassPitchClass();
  const candidates = CHORDS_DATA.reduce((list, [name]) => {
    const chord = buildChord(name, 0, 0);
    if (!chord || !setsEqual(chordPitchClassSet(chord), pitchClasses)) return list;
    const rootName = getChordRootName(name);
    const rootPc = parseNoteToSemitone(rootName);
    const suffix = getChordSuffix(name);
    let score = MIDI_PREVIEW_SUFFIX_PRIORITY[suffix] || 0;
    if (rootPc === bassPc) score += 100;
    if (suffix === '6/9') score -= 1;
    if (suffix === 'dim7' || suffix === 'aug') score -= 2;
    list.push({ chord, rootName, rootPc, suffix, score });
    return list;
  }, []).sort((a, b) => b.score - a.score || a.chord.originalName.localeCompare(b.chord.originalName));

  if (bassPc === null) return candidates;
  const bassMatched = candidates.filter((candidate) => candidate.rootPc === bassPc);
  return bassMatched.length > 0 ? bassMatched : [];
}

function hasSameEnharmonicIdentity(candidate, chordOrCandidate) {
  const leftRootPc = candidate.rootPc;
  const leftSuffix = candidate.suffix;
  const rightRootName = chordOrCandidate.originalName
    ? getChordRootName(chordOrCandidate.originalName)
    : chordOrCandidate.rootName;
  const rightSuffix = chordOrCandidate.originalName
    ? getChordSuffix(chordOrCandidate.originalName)
    : chordOrCandidate.suffix;
  const rightRootPc = parseNoteToSemitone(rightRootName);
  return leftRootPc === rightRootPc && leftSuffix === rightSuffix;
}

function findMatchingSelectedIndices(pitchClasses) {
  const candidates = getRankedMidiCandidates(pitchClasses);
  if (!candidates.length) return [];
  const primary = candidates[0];

  const enharmonicMatches = state.selected.reduce((matches, chord, index) => {
    if (!setsEqual(chordPitchClassSet(chord), pitchClasses)) return matches;
    if (hasSameEnharmonicIdentity(primary, chord)) {
      matches.push(index);
    }
    return matches;
  }, []);
  if (enharmonicMatches.length > 0) return enharmonicMatches;

  return state.selected.reduce((matches, chord, index) => {
    if (!setsEqual(chordPitchClassSet(chord), pitchClasses)) return matches;
    const rootPc = parseNoteToSemitone(getChordRootName(chord.originalName));
    const suffix = getChordSuffix(chord.originalName);
    if (rootPc === primary.rootPc && suffix === primary.suffix) {
      matches.push(index);
    }
    return matches;
  }, []);
}

function getMidiPreviewCandidates(pitchClasses) {
  const candidates = getRankedMidiCandidates(pitchClasses);
  if (!candidates.length) return [];
  const primary = candidates[0];

  const enharmonicVariants = candidates.filter((candidate) => hasSameEnharmonicIdentity(primary, candidate));
  if (enharmonicVariants.length > 1) {
    return enharmonicVariants
      .map((candidate) => candidate.chord)
      .filter((chord, index, list) => list.findIndex((entry) => entry.originalName === chord.originalName) === index)
      .slice(0, 2);
  }

  const preview = [primary.chord];
  return preview;
}

function applyMidiMatchVisuals() {
  ['selectedGrid', 'fullGrid'].forEach((gridId) => {
    const grid = el(gridId);
    if (!grid) return;
    grid.querySelectorAll('.card').forEach((card) => {
      const index = Number(card.dataset.idx);
      card.classList.toggle('midi-match', state.midiMatchedIndices.has(index));
    });
  });
}

function setMidiMatchedIndices(indices) {
  const next = new Set(indices);
  if (next.size === state.midiMatchedIndices.size) {
    let same = true;
    for (const value of next) {
      if (!state.midiMatchedIndices.has(value)) {
        same = false;
        break;
      }
    }
    if (same) return;
  }
  state.midiMatchedIndices = next;
  applyMidiMatchVisuals();
}

export {
  chordPitchClassSet,
  setsEqual,
  getHeldPitchClasses,
  getChordRootName,
  getChordSuffix,
  getHeldBassPitchClass,
  getRankedMidiCandidates,
  hasSameEnharmonicIdentity,
  findMatchingSelectedIndices,
  getMidiPreviewCandidates,
  applyMidiMatchVisuals,
  setMidiMatchedIndices
};
