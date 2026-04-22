import { CHORDS_DATA } from '../data/chords-data.js';
import { NOTE_ORDER, FLAT_MAP, NOTE_DISPLAY_NAMES, CHORD_TYPE_DISPLAY_NAMES } from '../state/constants.js';
import { state } from '../state/stores.js';

function parseNoteToSemitone(note) {
  if (!note) return null;
  const letter = note[0].toUpperCase();
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter];
  if (base === undefined) return null;
  let acc = 0;
  for (let i = 1; i < note.length; i += 1) {
    const ch = note[i];
    if (ch === '#') acc += 1;
    else if (ch === 'b') acc -= 1;
    else break;
  }
  return base + acc;
}

function normalizeToSharp(note) {
  const value = parseNoteToSemitone(note);
  if (value === null) return note;
  const idx = ((value % 12) + 12) % 12;
  return NOTE_ORDER[idx];
}

function transposeNote(note, semitones, preferFlats = null) {
  const value = parseNoteToSemitone(note);
  if (value === null) return note;
  const idx = ((value + semitones) % 12 + 12) % 12;
  const sharp = NOTE_ORDER[idx];
  const useFlats = preferFlats !== null ? preferFlats : (note.includes('b') && semitones <= 0);
  return useFlats && FLAT_MAP[sharp] ? FLAT_MAP[sharp] : sharp;
}

function transposeName(name, semitones) {
  if (!name) return name;
  const root = (name.length > 1 && (name[1] === '#' || name[1] === 'b')) ? name.slice(0, 2) : name.slice(0, 1);
  const suffix = name.slice(root.length);
  return transposeNote(root, semitones) + suffix;
}

function keyboardStartNatural(bassSharp) {
  switch (bassSharp) {
    case 'C#': return 'C';
    case 'D#': return 'D';
    case 'F#': return 'F';
    case 'G#': return 'G';
    case 'A#': return 'A';
    default: return bassSharp ? bassSharp[0] : 'C';
  }
}

function buildAscendingNotePositions(notes) {
  if (!notes || !notes.length) return [];
  const baseValue = parseNoteToSemitone(normalizeToSharp(notes[0]));
  const base = baseValue === null ? 0 : ((baseValue % 12) + 12) % 12;
  const positions = [];
  let previous = null;
  notes.forEach((note) => {
    const value = parseNoteToSemitone(normalizeToSharp(note));
    if (value === null) return;
    let rel = ((value % 12) + 12) % 12 - base;
    while (rel < 0) rel += 12;
    if (previous !== null) {
      while (rel <= previous) rel += 12;
    }
    positions.push(rel);
    previous = rel;
  });
  return positions;
}

function getVisualOctaves(notes) {
  const bass = notes && notes[0] ? normalizeToSharp(notes[0]) : 'C';
  const startNatural = keyboardStartNatural(bass);
  const startSemitone = parseNoteToSemitone(startNatural) ?? 0;
  const bassSemitone = parseNoteToSemitone(bass) ?? startSemitone;
  const offsetFromStart = bassSemitone - startSemitone;
  const positions = buildAscendingNotePositions(notes).map((pos) => pos + offsetFromStart);
  const maxPos = positions.length ? Math.max(...positions) : 0;
  return Math.max(1, Math.floor(maxPos / 12) + 1);
}

function isWideChord(notes) {
  return getVisualOctaves(notes) > 1;
}

function getFullChordName(chordName, language = state.language || 'ru') {
  if (!chordName) return '';
  const root = chordName.startsWith('C#') ? 'C#' : chordName.startsWith('Db') ? 'Db' :
    chordName.startsWith('D#') ? 'D#' : chordName.startsWith('Eb') ? 'Eb' :
    chordName.startsWith('F#') ? 'F#' : chordName.startsWith('Gb') ? 'Gb' :
    chordName.startsWith('G#') ? 'G#' : chordName.startsWith('Ab') ? 'Ab' :
    chordName.startsWith('A#') ? 'A#' : chordName.startsWith('Bb') ? 'Bb' :
    chordName[0];
  const suffix = chordName.slice(root.length);
  const rootName = NOTE_DISPLAY_NAMES[language]?.[root] || NOTE_DISPLAY_NAMES.ru[root] || root;
  const typeName = Object.prototype.hasOwnProperty.call(CHORD_TYPE_DISPLAY_NAMES[language] || {}, suffix)
    ? CHORD_TYPE_DISPLAY_NAMES[language][suffix]
    : Object.prototype.hasOwnProperty.call(CHORD_TYPE_DISPLAY_NAMES.ru, suffix)
      ? CHORD_TYPE_DISPLAY_NAMES.ru[suffix]
    : suffix;
  return `${rootName} ${typeName}`.trim();
}

function getFullRussianName(chordName) {
  return getFullChordName(chordName, 'ru');
}

function inversionSuffix(mode, language = state.language || 'ru') {
  if (mode === 1) return language === 'en' ? ' 1st inv.' : ' 1 обр.';
  if (mode === 2) return language === 'en' ? ' 2nd inv.' : ' 2 обр.';
  return '';
}

function bassSuffix(bass, language = state.language || 'ru') {
  if (!bass) return '';
  return language === 'en' ? ` (Bass ${bass})` : ` (Бас ${bass})`;
}

function parseNotes(notesStr, mode, offset) {
  let result = notesStr.split(', ').slice();
  if (result.length >= 3) {
    if (mode === 1) {
      const first = result.shift();
      result.push(first);
    } else if (mode === 2) {
      const first = result.shift();
      const second = result.shift();
      result.push(first);
      result.push(second);
    }
  }
  return result.map((note) => transposeNote(note, offset));
}

function getRootBassNote(originalName, offset) {
  const base = CHORDS_DATA.find((entry) => entry[0] === originalName);
  if (!base) return '';
  const notes = parseNotes(base[1], 0, offset);
  return notes && notes.length > 0 ? notes[0] : '';
}

function buildChord(name, mode, offset) {
  const base = CHORDS_DATA.find((entry) => entry[0] === name);
  if (!base) return null;
  const originalName = name;
  const notes = parseNotes(base[1], mode, offset);
  let displayName = name;
  if (offset !== 0) displayName = transposeName(name, offset);
  displayName += inversionSuffix(mode);
  if (mode !== 0) {
    const bass = getRootBassNote(originalName, offset);
    displayName += bassSuffix(bass);
  }
  return { originalName, name: displayName, mode, transposeOffset: offset, notes };
}

function resetChord(chord) {
  chord.mode = 0;
  chord.transposeOffset = 0;
  const base = CHORDS_DATA.find((entry) => entry[0] === chord.originalName);
  if (base) {
    chord.notes = parseNotes(base[1], chord.mode, chord.transposeOffset);
  }
  chord.name = chord.originalName;
}

function updateChord(chord) {
  const base = CHORDS_DATA.find((entry) => entry[0] === chord.originalName);
  if (!base) return;
  chord.notes = parseNotes(base[1], chord.mode, chord.transposeOffset);
  let displayName = chord.originalName;
  if (chord.transposeOffset !== 0) displayName = transposeName(displayName, chord.transposeOffset);
  displayName += inversionSuffix(chord.mode);
  if (chord.mode !== 0) {
    const bass = getRootBassNote(chord.originalName, chord.transposeOffset);
    displayName += bassSuffix(bass);
  }
  chord.name = displayName;
}

export {
  parseNoteToSemitone,
  normalizeToSharp,
  transposeNote,
  transposeName,
  keyboardStartNatural,
  buildAscendingNotePositions,
  getVisualOctaves,
  isWideChord,
  getFullChordName,
  getFullRussianName,
  parseNotes,
  getRootBassNote,
  buildChord,
  resetChord,
  updateChord
};
