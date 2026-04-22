import { FLAT_MAP } from '../state/constants.js';
import { normalizeToSharp, parseNoteToSemitone, keyboardStartNatural, buildAscendingNotePositions, getVisualOctaves } from '../core/chords.js';

function noteColor(note) {
  const base = note[0];
  return {
    C: '#ff1744', D: '#ff9100', E: '#ffea00', F: '#00e676', G: '#00e5ff', A: '#2979ff', B: '#d500f9'
  }[base] || '#fff';
}

function renderKeyboard(container, notes) {
  const bass = notes[0] ? normalizeToSharp(notes[0]) : 'C';
  const startNatural = keyboardStartNatural(bass);
  const whiteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const startIndex = Math.max(0, whiteOrder.indexOf(startNatural));
  const octaves = getVisualOctaves(notes);
  const totalWhiteKeys = 7 * octaves;
  const ordered = Array.from({ length: totalWhiteKeys }, (_, i) => whiteOrder[(startIndex + i) % 7]);
  const activePositions = new Set();
  const ascendingPositions = buildAscendingNotePositions(notes);
  const startSemitone = parseNoteToSemitone(startNatural) ?? 0;
  const bassSemitone = parseNoteToSemitone(bass) ?? startSemitone;
  const offsetFromStart = bassSemitone - startSemitone;
  ascendingPositions.forEach((pos) => activePositions.add(pos + offsetFromStart));
  const bassPosition = offsetFromStart;
  const whiteStepMap = { C: 2, D: 2, E: 1, F: 2, G: 2, A: 2, B: 1 };
  const whiteRelative = [];
  let rel = 0;
  for (let i = 0; i < totalWhiteKeys; i += 1) {
    const note = ordered[i];
    whiteRelative.push(rel);
    rel += whiteStepMap[note];
  }
  const whitePct = 100 / totalWhiteKeys;
  const blackPct = whitePct / 1.5;

  const keyboard = document.createElement('div');
  keyboard.className = 'keyboard';
  if (octaves > 1) keyboard.classList.add('keyboard--wide');

  ordered.forEach((note, i) => {
    const key = document.createElement('div');
    key.className = 'key white';
    const relSemitone = whiteRelative[i];
    if (activePositions.has(relSemitone)) key.classList.add('active');
    if (bassPosition === relSemitone && activePositions.has(relSemitone)) key.classList.add('bass');
    key.style.left = `${i * whitePct}%`;
    key.style.width = `${whitePct}%`;
    key.textContent = note;
    keyboard.appendChild(key);
  });

  const blackForWhite = new Set(['C', 'D', 'F', 'G', 'A']);
  ordered.forEach((lower, i) => {
    if (!blackForWhite.has(lower)) return;
    const sharp = `${lower}#`;
    const flat = FLAT_MAP[sharp] || sharp;
    const key = document.createElement('div');
    key.className = 'key black';
    const relSemitone = whiteRelative[i] + 1;
    if (activePositions.has(relSemitone)) key.classList.add('active');
    if (bassPosition === relSemitone && activePositions.has(relSemitone)) key.classList.add('bass');
    key.style.left = `${((i + 1) * whitePct) - (blackPct / 2)}%`;
    key.style.width = `${blackPct}%`;
    key.innerHTML = `<div>${flat}</div><div>${sharp}</div>`;
    keyboard.appendChild(key);
  });

  container.appendChild(keyboard);
}

export { noteColor, renderKeyboard };
