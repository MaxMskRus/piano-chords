import { CHORDS_DATA } from '../data/chords-data.js';
import { state } from '../state/stores.js';
import { parseNotes, parseNoteToSemitone, resetChord, updateChord, getRootBassNote } from '../core/chords.js';
import { syncUiState } from '../core/midi.js';
import { renderAll } from '../commands.js';

// ─── Smart inversion ─────────────────────────────────────────────────────────

function nearestPitch(pc, ref) {
  let p = pc;
  const base = ref - (ref % 12);
  p += base;
  while (p - ref > 6) p -= 12;
  while (ref - p > 6) p += 12;
  return p;
}

function buildVoicingForMode(chord, mode, prevVoicing, preferBassRef) {
  const base = CHORDS_DATA.find(x => x[0] === chord.originalName);
  if (!base) return null;
  const notes = parseNotes(base[1], mode, chord.transposeOffset);
  if (!notes || notes.length < 3) return null;
  const pcs = notes.slice(0,3).map(n => {
    const v = parseNoteToSemitone(n);
    return v === null ? 0 : ((v % 12) + 12) % 12;
  });

  const refBass = prevVoicing ? prevVoicing[0] : (preferBassRef ?? 48);
  const bass = nearestPitch(pcs[0], refBass);

  const v1 = (() => {
    let p = pcs[1];
    let out = bass;
    while (p + 12 <= out) p += 12;
    while (p <= out) p += 12;
    return p;
  })();

  const v2 = (() => {
    let p = pcs[2];
    let out = v1;
    while (p + 12 <= out) p += 12;
    while (p <= out) p += 12;
    return p;
  })();

  return [bass, v1, v2];
}

function voicingCost(prev, curr) {
  if (!curr) return Infinity;
  if (!prev) return 0;
  let cost = 0;
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(curr[i] - prev[i]);
    cost += d;
    if (d > 7) cost += (d - 7) * 1.5;
  }
  const bassMove = Math.abs(curr[0] - prev[0]);
  cost += bassMove * 0.5;
  const spread = curr[2] - curr[0];
  if (spread > 12) cost += (spread - 12) * 2;
  return cost;
}

function smartInversionAll() {
  if (state.selected.length === 0) return;
  state.lastGlobalAction = 'smartInv';
  let prevVoicing = null;
  state.selected.forEach((chord) => {
    const candidates = [0,1,2].map(mode => {
      const v = buildVoicingForMode(chord, mode, prevVoicing, 48);
      return { mode, v, cost: voicingCost(prevVoicing, v) };
    }).filter(x => x.v);
    if (candidates.length === 0) return;
    candidates.sort((a,b) => a.cost - b.cost);
    const best = candidates[0];
    chord.mode = best.mode;
    updateChord(chord);
    prevVoicing = best.v;
  });
  syncUiState();
  renderAll();
}

export { getRootBassNote, nearestPitch, buildVoicingForMode, voicingCost, smartInversionAll };
