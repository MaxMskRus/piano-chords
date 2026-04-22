import { CHORDS_DATA } from '../data/chords-data.js';
import { ROMAN_NUMERAL_RE, STOP_WORDS, CHORD_SUFFIXES } from '../state/constants.js';
import { state } from '../state/stores.js';
import { parseNotes, transposeName, transposeNote, buildChord } from './chords.js';

const CHORDS_SET = new Set(CHORDS_DATA.map((entry) => entry[0]));
const CHORD_REGEX = new RegExp(
  `[A-GH](?:#|b)?(?:${CHORD_SUFFIXES.join('|')})?(?:\\/[A-GH](?:#|b)?)?`,
  'g'
);

function normalizeChordToken(token) {
  if (!token) return token;
  if (token[0] === 'H') return `B${token.slice(1)}`;
  return token;
}

function extractChordsFromText(text, softMode) {
  const result = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('[')) continue;

    const matches = [];
    let match;
    const re = new RegExp(CHORD_REGEX.source, 'g');
    while ((match = re.exec(line)) !== null) {
      const chord = match[0];
      const start = match.index;
      const end = start + chord.length;
      const before = line[start - 1];
      const after = line[end];
      if (before && /[A-Za-z]/.test(before)) continue;
      if (after && /[A-Za-z]/.test(after)) continue;
      matches.push({ chord, start, end });
    }

    const hasUpperAG = /[A-G]/.test(line);
    const hasTabChars = /[|\-]/.test(line) || /\b[xo]\b/.test(line);
    if (hasTabChars && matches.length === 0 && !hasUpperAG) continue;
    if (matches.length === 0) continue;

    const words = line.match(/[A-Za-zА-Яа-я]+/g) || [];
    const chordDensity = matches.length / Math.max(1, words.length);
    const hasBracketed = /\[[^\]]+\]/.test(line);
    const isChordLine = matches.length >= 2 || chordDensity >= 0.6 || (softMode && matches.length >= 1) || hasBracketed;
    if (!isChordLine) continue;

    for (const { chord } of matches) {
      const normalized = normalizeChordToken(chord);
      if (STOP_WORDS.has(normalized)) continue;
      if (ROMAN_NUMERAL_RE.test(normalized)) continue;
      const base = normalized.split('/')[0];
      if (!CHORDS_SET.has(base)) continue;
      result.push(normalized);
    }
  }
  return result;
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractChordOccurrences(text, softMode) {
  const result = [];
  const lines = text.split(/\r?\n/);
  let offset = 0;
  for (const lineRaw of lines) {
    const lineTrim = lineRaw.trim();
    const lineStart = offset;
    const lineEnd = offset + lineRaw.length;
    if (!lineTrim || lineTrim.startsWith('[')) {
      offset += lineRaw.length + 1;
      continue;
    }
    const matches = [];
    let match;
    const re = new RegExp(CHORD_REGEX.source, 'g');
    while ((match = re.exec(lineRaw)) !== null) {
      const chord = match[0];
      const start = match.index;
      const end = start + chord.length;
      const before = lineRaw[start - 1];
      const after = lineRaw[end];
      if (before && /[A-Za-z]/.test(before)) continue;
      if (after && /[A-Za-z]/.test(after)) continue;
      matches.push({ chord, start, end });
    }
    const hasUpperAG = /[A-G]/.test(lineRaw) || /H/.test(lineRaw);
    const hasTabChars = /[|\-]/.test(lineRaw) || /\b[xo]\b/i.test(lineRaw);
    if (hasTabChars && matches.length === 0 && !hasUpperAG) {
      offset += lineRaw.length + 1;
      continue;
    }
    if (matches.length === 0) {
      offset += lineRaw.length + 1;
      continue;
    }
    const words = lineRaw.match(/[A-Za-zА-Яа-я]+/g) || [];
    const chordDensity = matches.length / Math.max(1, words.length);
    const hasBracketed = /\[[^\]]+\]/.test(lineRaw);
    const isChordLine = matches.length >= 2 || chordDensity >= 0.6 || (softMode && matches.length >= 1) || hasBracketed;
    if (!isChordLine) {
      offset += lineRaw.length + 1;
      continue;
    }
    for (const { chord, start, end } of matches) {
      const normalized = normalizeChordToken(chord);
      if (STOP_WORDS.has(normalized)) continue;
      if (ROMAN_NUMERAL_RE.test(normalized)) continue;
      const base = normalized.split('/')[0];
      if (!CHORDS_SET.has(base)) continue;
      const item = buildChord(base, 0, 0);
      if (!item) continue;
      const absStart = lineStart + start;
      const absEnd = lineStart + end;
      if (absStart >= lineStart && absEnd <= lineEnd) {
        result.push({ start: absStart, end: absEnd, raw: chord, base, item });
      }
    }
    offset += lineRaw.length + 1;
  }
  return result;
}

function formatChordForText(occ) {
  const token = normalizeChordToken(occ.raw);
  const parts = token.split('/');
  const rootPart = parts[0];
  const bassOrig = parts.length > 1 ? parts[1] : null;

  const transposedRoot = occ.item.transposeOffset
    ? transposeName(rootPart, occ.item.transposeOffset)
    : rootPart;
  let label = transposedRoot;
  if (occ.item.mode === 1) label += state.language === 'en' ? ' 1st inv' : ' 1 обр';
  if (occ.item.mode === 2) label += state.language === 'en' ? ' 2nd inv' : ' 2 обр';
  if (occ.item.mode === 0 && bassOrig) {
    const bass = occ.item.transposeOffset ? transposeNote(bassOrig, occ.item.transposeOffset) : bassOrig;
    label = `${label}/${bass}`;
  }
  return label;
}

function buildSongTextHtml(rawText, occurrences) {
  if (!rawText) return '';
  const sorted = occurrences.slice().sort((a, b) => a.start - b.start);
  const parts = [];
  let last = 0;
  sorted.forEach((occ, index) => {
    if (occ.start < last || occ.end > rawText.length) return;
    parts.push(escapeHtml(rawText.slice(last, occ.start)));
    const display = formatChordForText(occ);
    parts.push(`<span class="song-chord" data-idx="${index}">${escapeHtml(display)}</span>`);
    last = occ.end;
  });
  parts.push(escapeHtml(rawText.slice(last)));
  return parts.join('');
}

export {
  CHORDS_SET,
  CHORD_REGEX,
  normalizeChordToken,
  extractChordsFromText,
  escapeHtml,
  extractChordOccurrences,
  formatChordForText,
  buildSongTextHtml
};
