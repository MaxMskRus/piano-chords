const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_MAP = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};
const ROMAN_NUMERAL_RE = /^(I|II|III|IV|V|VI|VII)$/;
const STOP_WORDS = new Set([
  "THE","AND","IT","IS","NOT","ARE","YOU","ME","WE","HE","SHE","THEY",
  "MY","YOUR","OUR","HIS","HER","THEIR","THIS","THAT","THESE","THOSE",
  "OF","TO","IN","ON","FOR","WITH","FROM","AS","AT","BE","WAS","WERE",
  "BUT","OR","IF","THEN","SO","NO","YES"
]);
const CHORD_SUFFIXES = [
  "mMaj7","maj7","maj9","maj","m7b5","dim7","dim","aug","sus2","sus4","sus",
  "add13","add11","add9","m11","m9","m7","m6","m",
  "7b5","7#5","7b9","7#9","6/9","13","11","9","7","6","5"
];

const state = {
  selected: [],
  isColorMode: true,
  isPianoMode: true,
  globalMode: 0,
  openGroups: new Set(),
  lastSearchLen: 0,
};

const songTextState = {
  title: '',
  rawText: '',
  occurrences: [],
  softMode: false,
  viewMode: 'piano',
};

const GROUP_ORDER = [
  "C","C#","D","D#","Db","E","Eb","F","F#","G","G#","Gb","A","A#","Ab","B","Bb"
];
const RUS_NAMES = {
  "C":"До","C#":"До Диез","D":"Ре","D#":"Ре Диез","Db":"Ре Бемоль",
  "E":"Ми","Eb":"Ми Бемоль","F":"Фа","F#":"Фа Диез",
  "G":"Соль","G#":"Соль Диез","Gb":"Соль Бемоль",
  "A":"Ля","A#":"Ля Диез","Ab":"Ля Бемоль",
  "B":"Си","Bb":"Си Бемоль"
};
const CHORD_TYPE_NAMES = {
  "": "мажор",
  "m": "минор",
  "dim": "уменьшённый",
  "aug": "увеличенный",
  "sus2": "sus2",
  "sus4": "sus4",
  "5": "квинтаккорд",
  "6": "секстаккорд",
  "m6": "минорный секстаккорд",
  "6/9": "секстаккорд с ноной",
  "7": "доминантсептаккорд",
  "m7": "минорный септаккорд",
  "maj7": "мажорный септаккорд",
  "mMaj7": "минорный мажорный септаккорд",
  "dim7": "уменьшённый септаккорд",
  "m7b5": "полууменьшённый септаккорд",
  "7b5": "доминантсептаккорд с пониженной квинтой",
  "7#5": "доминантсептаккорд с повышенной квинтой",
  "7b9": "доминантсептаккорд с пониженной ноной",
  "7#9": "доминантсептаккорд с повышенной ноной",
  "9": "нонаккорд",
  "m9": "минорный нонаккорд",
  "maj9": "мажорный нонаккорд",
  "11": "ундецимаккорд",
  "m11": "минорный ундецимаккорд",
  "13": "терцдецимаккорд"
};

const el = (id) => document.getElementById(id);

function updateBodyModalOpen() {
  if (document.querySelector('.modal:not(.hidden)')) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
}

const CHORDS_SET = new Set(CHORDS_DATA.map(x => x[0]));
const CHORD_REGEX = new RegExp(
  `[A-GH](?:#|b)?(?:${CHORD_SUFFIXES.join('|')})?(?:\\/[A-GH](?:#|b)?)?`,
  'g'
);

// ─── drag state ───────────────────────────────────────────────────────────────
const drag = {
  active: false,
  sourceIndex: null,
  ghost: null,
  targetId: null,
  startX: 0,
  startY: 0,
  isDragging: false,
  dragThreshold: 8,
  targetIndex: null,
};

function parseNoteToSemitone(note) {
  if (!note) return null;
  const letter = note[0].toUpperCase();
  const base = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter];
  if (base === undefined) return null;
  let acc = 0;
  for (let i = 1; i < note.length; i++) {
    const ch = note[i];
    if (ch === '#') acc += 1;
    else if (ch === 'b') acc -= 1;
    else break;
  }
  return base + acc;
}

function normalizeToSharp(note) {
  const v = parseNoteToSemitone(note);
  if (v === null) return note;
  const idx = ((v % 12) + 12) % 12;
  return NOTE_ORDER[idx];
}

function transposeNote(note, semitones, preferFlats = null) {
  const v = parseNoteToSemitone(note);
  if (v === null) return note;
  const idx = ((v + semitones) % 12 + 12) % 12;
  const sharp = NOTE_ORDER[idx];
  const useFlats = preferFlats !== null ? preferFlats : (note.includes('b') && semitones <= 0);
  return useFlats && FLAT_MAP[sharp] ? FLAT_MAP[sharp] : sharp;
}

function transposeName(name, semitones) {
  if (!name) return name;
  const root = (name.length > 1 && (name[1] === '#' || name[1] === 'b')) ? name.slice(0,2) : name.slice(0,1);
  const suffix = name.slice(root.length);
  return transposeNote(root, semitones) + suffix;
}

function getFullRussianName(chordName) {
  if (!chordName) return '';
  const root = chordName.startsWith('C#') ? 'C#' : chordName.startsWith('Db') ? 'Db' :
    chordName.startsWith('D#') ? 'D#' : chordName.startsWith('Eb') ? 'Eb' :
    chordName.startsWith('F#') ? 'F#' : chordName.startsWith('Gb') ? 'Gb' :
    chordName.startsWith('G#') ? 'G#' : chordName.startsWith('Ab') ? 'Ab' :
    chordName.startsWith('A#') ? 'A#' : chordName.startsWith('Bb') ? 'Bb' :
    chordName[0];
  const suffix = chordName.slice(root.length);
  const rootRussian = RUS_NAMES[root] || root;
  const typeRussian = Object.prototype.hasOwnProperty.call(CHORD_TYPE_NAMES, suffix)
    ? CHORD_TYPE_NAMES[suffix]
    : suffix;
  return `${rootRussian} ${typeRussian}`.trim();
}

function normalizeChordToken(token) {
  if (!token) return token;
  // Немецкая нотация: H = B
  if (token[0] === 'H') return 'B' + token.slice(1);
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
    let m;
    const re = new RegExp(CHORD_REGEX.source, 'g');
    while ((m = re.exec(line)) !== null) {
      const chord = m[0];
      const start = m.index;
      const end = start + chord.length;
      const before = line[start - 1];
      const after = line[end];
      if (before && /[A-Za-z]/.test(before)) continue;
      if (after && /[A-Za-z]/.test(after)) continue;
      matches.push({ chord, start, end });
    }

    const hasUpperAG = /[A-G]/.test(line);
    const hasTabChars = /[|\-]/.test(line) || /\b[xo]\b/.test(line);
    if (hasTabChars && matches.length === 0 && !hasUpperAG) {
      continue;
    }
    if (matches.length === 0) continue;

    const words = line.match(/[A-Za-zА-Яа-я]+/g) || [];
    const wordCount = words.length;
    const chordCount = matches.length;
    const chordDensity = chordCount / Math.max(1, wordCount);
    const hasBracketed = /\[[^\]]+\]/.test(line);
    const isChordLine = chordCount >= 2 || chordDensity >= 0.6 || (softMode && chordCount >= 1) || hasBracketed;

    if (!isChordLine) continue;

    for (const { chord } of matches) {
      const norm = normalizeChordToken(chord);
      if (STOP_WORDS.has(norm)) continue;
      if (ROMAN_NUMERAL_RE.test(norm)) continue;
      const base = norm.split('/')[0];
      if (!CHORDS_SET.has(base)) continue;
      result.push(norm);
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
  for (let li = 0; li < lines.length; li++) {
    const lineRaw = lines[li];
    const lineTrim = lineRaw.trim();
    const lineStart = offset;
    const lineEnd = offset + lineRaw.length;
    if (!lineTrim || lineTrim.startsWith('[')) {
      offset += lineRaw.length + 1;
      continue;
    }
    const matches = [];
    let m;
    const re = new RegExp(CHORD_REGEX.source, 'g');
    while ((m = re.exec(lineRaw)) !== null) {
      const chord = m[0];
      const start = m.index;
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
    const wordCount = words.length;
    const chordCount = matches.length;
    const chordDensity = chordCount / Math.max(1, wordCount);
    const hasBracketed = /\[[^\]]+\]/.test(lineRaw);
    const isChordLine = chordCount >= 2 || chordDensity >= 0.6 || (softMode && chordCount >= 1) || hasBracketed;
    if (!isChordLine) {
      offset += lineRaw.length + 1;
      continue;
    }
    for (const { chord, start, end } of matches) {
      const norm = normalizeChordToken(chord);
      if (STOP_WORDS.has(norm)) continue;
      if (ROMAN_NUMERAL_RE.test(norm)) continue;
      const base = norm.split('/')[0];
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
  if (occ.item.mode === 1) label += ' 1 обр';
  if (occ.item.mode === 2) label += ' 2 обр';
  if (occ.item.mode === 0 && bassOrig) {
    const bass = occ.item.transposeOffset ? transposeNote(bassOrig, occ.item.transposeOffset) : bassOrig;
    label = `${label}/${bass}`;
  }
  return label;
}

function buildSongTextHtml(rawText, occurrences) {
  if (!rawText) return '';
  const spans = [];
  let last = 0;
  const parts = [];
  occurrences.sort((a,b)=>a.start-b.start);
  const preserve = (s) =>
    escapeHtml(s)
      .replace(/\r/g, '')
      .replace(/ /g, '&nbsp;')
      .replace(/\n/g, '<br>');
  occurrences.forEach((occ, idx) => {
    if (occ.start < last || occ.end > rawText.length) return;
    parts.push(preserve(rawText.slice(last, occ.start)));
    const display = formatChordForText(occ);
    parts.push(`<span class="song-chord" data-idx="${idx}">${escapeHtml(display)}</span>`);
    spans.push(occ);
    last = occ.end;
  });
  parts.push(preserve(rawText.slice(last)));
  return parts.join('');
}

function parseNotes(notesStr, mode, offset) {
  let res = notesStr.split(', ').slice();
  if (res.length >= 3) {
    if (mode === 1) {
      const f = res.shift();
      res.push(f);
    } else if (mode === 2) {
      const f = res.shift();
      const s = res.shift();
      res.push(f); res.push(s);
    }
  }
  return res.map(n => transposeNote(n, offset));
}

function buildChord(name, mode, offset) {
  const base = CHORDS_DATA.find(x => x[0] === name);
  if (!base) return null;
  const originalName = name;
  const notesStr = base[1];
  const notes = parseNotes(notesStr, mode, offset);
  let displayName = name;
  if (offset !== 0) displayName = transposeName(name, offset);
  if (mode === 1) displayName += ' 1 обр.';
  if (mode === 2) displayName += ' 2 обр.';
  if (mode !== 0) {
    const bass = getRootBassNote(originalName, offset);
    if (bass) displayName += ` (Бас ${bass})`;
  }
  return { originalName, name: displayName, mode, transposeOffset: offset, notes };
}

function resetChord(chord) {
  chord.mode = 0;
  chord.transposeOffset = 0;
  const base = CHORDS_DATA.find(x => x[0] === chord.originalName);
  if (base) {
    chord.notes = parseNotes(base[1], chord.mode, chord.transposeOffset);
  }
  chord.name = chord.originalName;
}

function updateChord(chord) {
  const base = CHORDS_DATA.find(x => x[0] === chord.originalName);
  if (!base) return;
  chord.notes = parseNotes(base[1], chord.mode, chord.transposeOffset);
  let displayName = chord.originalName;
  if (chord.transposeOffset !== 0) displayName = transposeName(displayName, chord.transposeOffset);
  if (chord.mode === 1) displayName += ' 1 обр.';
  if (chord.mode === 2) displayName += ' 2 обр.';
  if (chord.mode !== 0) {
    const bass = getRootBassNote(chord.originalName, chord.transposeOffset);
    if (bass) displayName += ` (Бас ${bass})`;
  }
  chord.name = displayName;
}

function saveLastState() {
  const data = state.selected.map(c => `${c.originalName}:${c.mode}:${c.transposeOffset}`).join(',');
  localStorage.setItem('lastChords', data);
  localStorage.setItem('lastGlobalMode', String(state.globalMode));
}

function loadLastState() {
  const raw = localStorage.getItem('lastChords') || '';
  const gm = parseInt(localStorage.getItem('lastGlobalMode') || '0', 10) || 0;
  if (raw) {
    raw.split(',').forEach(p => {
      const d = p.split(':');
      if (d.length >= 2) {
        const offset = d[2] ? parseInt(d[2],10) || 0 : 0;
        const mode = parseInt(d[1],10) || 0;
        const item = buildChord(d[0], mode, offset);
        if (item) state.selected.push(item);
      }
    });
  }
  state.globalMode = gm;
}

function saveSong(name) {
  const songs = JSON.parse(localStorage.getItem('songs') || '{}');
  const data = state.selected.map(c => `${c.originalName}:${c.mode}:${c.transposeOffset}`).join(',');
  songs[name] = { type: 'chords', data, fav: songs[name]?.fav || false };
  localStorage.setItem('songs', JSON.stringify(songs));
}

function saveSongText(name, text) {
  const songs = JSON.parse(localStorage.getItem('songs') || '{}');
  songs[name] = { type: 'text', text, fav: songs[name]?.fav || false };
  localStorage.setItem('songs', JSON.stringify(songs));
}

function deleteSong(name) {
  const songs = JSON.parse(localStorage.getItem('songs') || '{}');
  delete songs[name];
  localStorage.setItem('songs', JSON.stringify(songs));
}

function toggleFav(name) {
  const songs = JSON.parse(localStorage.getItem('songs') || '{}');
  if (songs[name]) songs[name].fav = !songs[name].fav;
  localStorage.setItem('songs', JSON.stringify(songs));
}

function loadSong(name) {
  const songs = JSON.parse(localStorage.getItem('songs') || '{}');
  const entry = songs[name] || {};
  if (entry.type === 'text' || entry.text) {
    openSongTextModal(name, entry.text || '', true);
    return;
  }
  const data = entry.data || '';
  state.selected = [];
  if (data) {
    data.split(',').forEach(p => {
      const d = p.split(':');
      if (d.length >= 2) {
        const offset = d[2] ? parseInt(d[2],10) || 0 : 0;
        const mode = parseInt(d[1],10) || 0;
        const item = buildChord(d[0], mode, offset);
        if (item) state.selected.push(item);
      }
    });
  }
  renderAll();
}

function groupChords(query='') {
  const all = CHORDS_DATA.map(x => x[0]);
  const groups = new Map();
  for (const name of all) {
    if (query && !name.toLowerCase().startsWith(query.toLowerCase())) continue;
    const root = name.startsWith('C#') ? 'C#' : name.startsWith('Db') ? 'Db' :
      name.startsWith('D#') ? 'D#' : name.startsWith('Eb') ? 'Eb' :
      name.startsWith('F#') ? 'F#' : name.startsWith('Gb') ? 'Gb' :
      name.startsWith('G#') ? 'G#' : name.startsWith('Ab') ? 'Ab' :
      name.startsWith('A#') ? 'A#' : name.startsWith('Bb') ? 'Bb' :
      name.startsWith('C') ? 'C' : name.startsWith('D') ? 'D' : name.startsWith('E') ? 'E' :
      name.startsWith('F') ? 'F' : name.startsWith('G') ? 'G' : name.startsWith('A') ? 'A' :
      name.startsWith('B') ? 'B' : name[0];
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(name);
  }
  return groups;
}

function renderChordsList(prevSearchLen = state.lastSearchLen) {
  const container = el('chordsList');
  const query = (el('search').value || '').trim();
  const queryLen = query.length;
  const prevOpen = new Set(state.openGroups);
  document.querySelectorAll('.group').forEach(d => {
    if (d.open && d.dataset.root) prevOpen.add(d.dataset.root);
  });
  container.innerHTML = '';
  const groups = groupChords(query);
  const orderedRoots = GROUP_ORDER.filter(r => groups.has(r));
  for (const root of orderedRoots) {
    const items = groups.get(root) || [];
    const details = document.createElement('details');
    details.className = 'group';
    details.dataset.root = root;
    if (queryLen > 0) {
      details.open = true;
    } else if (prevSearchLen > 0) {
      details.open = false;
    } else if (prevOpen.has(root)) {
      details.open = true;
    }
    const summary = document.createElement('summary');
    const label = RUS_NAMES[root] ? ` (${RUS_NAMES[root]})` : '';
    summary.innerHTML = `<span class="dot" style="background:${noteColor(root)}"></span> ${root}${label}`;
    details.appendChild(summary);
    const wrap = document.createElement('div');
    wrap.className = 'group-items';
    items.forEach(name => {
      const row = document.createElement('div');
      row.className = 'item';
      const count = state.selected.filter(c => c.originalName === name).length;
      const badge = document.createElement('div');
      badge.className = 'count' + (count === 0 ? ' empty' : '');
      badge.textContent = count === 0 ? '0' : String(count);
      const label = document.createElement('div');
      label.className = 'label';
      const title = document.createElement('div');
      title.className = 'name';
      title.textContent = name;
      const ru = document.createElement('div');
      ru.className = 'ru';
      ru.textContent = getFullRussianName(name);
      label.appendChild(title);
      label.appendChild(ru);
      row.appendChild(badge);
      row.appendChild(label);
      row.addEventListener('click', () => addChord(name));
      wrap.appendChild(row);
    });
    details.appendChild(wrap);
    container.appendChild(details);
    details.addEventListener('toggle', () => {
      if (details.open) state.openGroups.add(root);
      else state.openGroups.delete(root);
    });
  }
  if (queryLen > 0) {
    state.openGroups = orderedRoots.length === 1 ? new Set(orderedRoots) : new Set();
  } else if (prevSearchLen > 0) {
    state.openGroups = new Set();
  } else {
    state.openGroups = prevOpen;
  }
}

function addChord(name) {
  const item = buildChord(name, state.globalMode, 0);
  if (item) state.selected.push(item);
  renderAll();
}

function renderKeyboard(container, notes) {
  const norm = new Set(notes.map(normalizeToSharp));
  const bass = notes[0] ? normalizeToSharp(notes[0]) : null;
  const rootWhite = bass ? bass[0] : 'C';
  const whiteOrder = ["C","D","E","F","G","A","B"];
  const startIndex = Math.max(0, whiteOrder.indexOf(rootWhite));
  const ordered = Array.from({length:7}, (_,i)=> whiteOrder[(startIndex+i)%7]);

  const keyboard = document.createElement('div');
  keyboard.className = 'keyboard';

  ordered.forEach((note, i) => {
    const key = document.createElement('div');
    key.className = 'key white';
    if (norm.has(note)) key.classList.add('active');
    if (bass === note) key.classList.add('bass');
    key.style.left = `calc(${i} * 100% / 7)`;
    key.textContent = note;
    keyboard.appendChild(key);
  });

  const blackForWhite = new Set(["C","D","F","G","A"]);
  ordered.forEach((lower, i) => {
    if (!blackForWhite.has(lower)) return;
    const sharp = lower + '#';
    const flat = FLAT_MAP[sharp] || sharp;
    const key = document.createElement('div');
    key.className = 'key black';
    if (norm.has(sharp)) key.classList.add('active');
    if (bass === sharp) key.classList.add('bass');
    key.style.left = `calc(${i+1} * 100% / 7 - 100% / 15)`;
    key.innerHTML = `<div>${flat}</div><div>${sharp}</div>`;
    keyboard.appendChild(key);
  });

  container.appendChild(keyboard);
}

function noteColor(note) {
  const base = note[0];
  return {
    C:'#ff1744', D:'#ff9100', E:'#ffea00', F:'#00e676', G:'#00e5ff', A:'#2979ff', B:'#d500f9'
  }[base] || '#fff';
}

// ─── Drag & Drop helpers - универсальная логика для обоих режимов ────────────

function createGhost(card) {
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.id = 'drag-ghost';
  ghost.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    opacity: 0.85;
    transform: scale(1.02);
    transition: none;
    pointer-events: none;
    z-index: 9999;
  `;
  document.body.appendChild(ghost);
  return ghost;
}

function moveGhost(x, y) {
  if (!drag.ghost) return;
  const rect = drag.ghost.getBoundingClientRect();
  drag.ghost.style.left = (x - rect.width / 2) + 'px';
  drag.ghost.style.top = (y - rect.height / 2) + 'px';
}

function removeGhost() {
  if (drag.ghost) { drag.ghost.remove(); drag.ghost = null; }
}

function getTargetIndex(gridEl, x, y) {
  if (!gridEl) return -1;
  const elAt = document.elementFromPoint(x, y);
  const card = elAt ? elAt.closest('.card') : null;
  if (card && gridEl.contains(card) && !card.classList.contains('dragging')) {
    const idx = parseInt(card.dataset.idx, 10);
    return Number.isFinite(idx) ? idx : -1;
  }
  const cards = Array.from(gridEl.querySelectorAll('.card:not(.dragging)'));
  let bestIdx = -1;
  let bestDist = Infinity;
  for (const c of cards) {
    const rect = c.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(x - cx, y - cy);
    const maxRadius = Math.max(rect.width, rect.height) * 0.75;
    if (dist <= maxRadius && dist < bestDist) {
      const idx = parseInt(c.dataset.idx, 10);
      if (Number.isFinite(idx)) {
        bestIdx = idx;
        bestDist = dist;
      }
    }
  }
  return bestIdx;
}

function applyDragHighlight(gridEl, targetIndex) {
  const cards = Array.from(gridEl.querySelectorAll('.card'));
  cards.forEach((c, i) => {
    c.classList.remove('drag-over');
    const idx = parseInt(c.dataset.idx, 10);
    if (idx === targetIndex) {
      c.classList.add('drag-over');
    }
  });
}

function clearDragHighlight(gridEl) {
  if (!gridEl) return;
  gridEl.querySelectorAll('.card').forEach(c =>
    c.classList.remove('drag-over')
  );
}

function cleanupDrag() {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
  clearDragHighlight(el(drag.targetId));
  removeGhost();
  if (drag.sourceIndex !== null) {
    const sourceCard = document.querySelector(`.card[data-idx="${drag.sourceIndex}"]`);
    if (sourceCard) sourceCard.classList.remove('dragging');
  }
  drag.active = false;
  drag.isDragging = false;
  drag.sourceIndex = null;
  drag.targetIndex = null;
}

// ─── Mouse drag ───────────────────────────────────────────────────────────────

function onMouseMove(e) {
  if (!drag.active) return;
  
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  const distance = Math.hypot(dx, dy);
  
  if (!drag.isDragging && distance > drag.dragThreshold) {
    drag.isDragging = true;
    const sourceCard = document.querySelector(`.card[data-idx="${drag.sourceIndex}"]`);
    if (sourceCard) {
      sourceCard.classList.add('dragging');
      drag.ghost = createGhost(sourceCard);
      if (drag.ghost) moveGhost(e.clientX, e.clientY);
    }
  }
  
  if (!drag.isDragging) return;
  
  moveGhost(e.clientX, e.clientY);
  const gridEl = el(drag.targetId);
  const targetIndex = getTargetIndex(gridEl, e.clientX, e.clientY);
  
  if (targetIndex >= 0 && targetIndex !== drag.sourceIndex) {
    applyDragHighlight(gridEl, targetIndex);
    drag.targetIndex = targetIndex;
  } else {
    clearDragHighlight(gridEl);
    drag.targetIndex = null;
  }
}

function onMouseUp(e) {
  if (!drag.active) return;
  
  if (drag.isDragging && drag.targetIndex !== null && drag.targetIndex !== drag.sourceIndex) {
    // Меняем местами аккорды
    const temp = state.selected[drag.sourceIndex];
    state.selected[drag.sourceIndex] = state.selected[drag.targetIndex];
    state.selected[drag.targetIndex] = temp;
    renderAll();
  }
  
  cleanupDrag();
}

// ─── Touch drag ───────────────────────────────────────────────────────────────

function onTouchMove(e) {
  if (!drag.active) return;
  
  const t = e.touches[0];
  const dx = t.clientX - drag.startX;
  const dy = t.clientY - drag.startY;
  const distance = Math.hypot(dx, dy);
  
  if (!drag.isDragging && distance > drag.dragThreshold) {
    drag.isDragging = true;
    const sourceCard = document.querySelector(`.card[data-idx="${drag.sourceIndex}"]`);
    if (sourceCard) {
      sourceCard.classList.add('dragging');
      drag.ghost = createGhost(sourceCard);
      if (drag.ghost) moveGhost(t.clientX, t.clientY);
    }
  }
  
  if (!drag.isDragging) return;
  
  e.preventDefault();
  moveGhost(t.clientX, t.clientY);
  const gridEl = el(drag.targetId);
  const targetIndex = getTargetIndex(gridEl, t.clientX, t.clientY);
  
  if (targetIndex >= 0 && targetIndex !== drag.sourceIndex) {
    applyDragHighlight(gridEl, targetIndex);
    drag.targetIndex = targetIndex;
  } else {
    clearDragHighlight(gridEl);
    drag.targetIndex = null;
  }
}

function onTouchEnd(e) {
  if (!drag.active) return;
  
  if (drag.isDragging && drag.targetIndex !== null && drag.targetIndex !== drag.sourceIndex) {
    // Меняем местами аккорды
    const temp = state.selected[drag.sourceIndex];
    state.selected[drag.sourceIndex] = state.selected[drag.targetIndex];
    state.selected[drag.targetIndex] = temp;
    renderAll();
  }
  
  cleanupDrag();
}

// ─── Attach drag listeners ────────────────────────────────────────────────────

function attachDragListeners(card, index, gridId) {
  card.setAttribute('data-idx', index);
  const handle = card.querySelector('.drag-handle');
  if (!handle) return;
  
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    drag.active = true;
    drag.sourceIndex = index;
    drag.targetId = gridId;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.isDragging = false;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  handle.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    const t = e.touches[0];
    drag.active = true;
    drag.sourceIndex = index;
    drag.targetId = gridId;
    drag.startX = t.clientX;
    drag.startY = t.clientY;
    drag.isDragging = false;
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, { passive: false });
}

// ─── Render selected chords ───────────────────────────────────────────────────

function renderSelected(targetId) {
  const grid = el(targetId);
  grid.innerHTML = '';
  state.selected.forEach((chord, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-idx', index);
    
    const content = document.createElement('div');
    content.className = 'card-content';
    
    const header = document.createElement('div');
    header.className = 'card-header';
    
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 3h2v2H9zM9 7h2v2H9zM9 11h2v2H9zM13 3h2v2h-2zM13 7h2v2h-2zM13 11h2v2h-2z"/></svg>`;
    
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = chord.name;
    
    header.appendChild(handle);
    header.appendChild(title);
    content.appendChild(header);

    if (state.isPianoMode) {
      renderKeyboard(content, chord.notes);
    } else {
      const notes = document.createElement('div');
      notes.className = 'notes';
      chord.notes.forEach(n => {
        const key = document.createElement('div');
        key.className = 'note';
        key.textContent = n;
        if (state.isColorMode) {
          key.style.background = noteColor(n);
        } else {
          key.style.background = (n.includes('#') || n.includes('b')) ? '#ddd' : '#fff';
        }
        notes.appendChild(key);
      });
      content.appendChild(notes);
    }
    
    card.appendChild(content);

    // Клик на название для удаления
    title.addEventListener('click', (e) => {
      e.stopPropagation();
      if (drag.isDragging) return;
      state.selected = state.selected.filter(c => c !== chord);
      renderAll();
    });

    // Долгое нажатие для меню
    let pressTimer;
    title.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      pressTimer = setTimeout(() => {
        showChordMenu(chord);
      }, 500);
    });
    title.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });
    title.addEventListener('touchmove', () => {
      clearTimeout(pressTimer);
    });
    
    title.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (drag.isDragging) return;
      showChordMenu(chord);
    });

    attachDragListeners(card, index, targetId);
    grid.appendChild(card);
  });
}

// ─── PDF / Print ──────────────────────────────────────────────────────────────

function printPdf() {
  const songName = (el('songName').value || '').trim();
  const titleEl = el('printTitle');
  titleEl.textContent = songName || 'Аккорды';
  
  // Небольшая задержка для обновления DOM
  setTimeout(() => {
    window.print();
  }, 100);
}

// ─────────────────────────────────────────────────────────────────────────────

function showChordMenu(chord) {
  const modal = el('chordModal');
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const close = () => {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  el('actMode0').onclick = () => { chord.mode = 0; updateChord(chord); renderAll(); close(); };
  el('actMode1').onclick = () => { chord.mode = 1; updateChord(chord); renderAll(); close(); };
  el('actMode2').onclick = () => { chord.mode = 2; updateChord(chord); renderAll(); close(); };
  el('actUp').onclick = () => { chord.transposeOffset += 1; updateChord(chord); renderAll(); close(); };
  el('actDown').onclick = () => { chord.transposeOffset -= 1; updateChord(chord); renderAll(); close(); };
  el('actClose').onclick = close;
}

function showChordMenuForText(chord) {
  const modal = el('chordModal');
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const close = () => {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  const applyAndRender = () => {
    updateChord(chord);
    renderSongTextView();
    updateSongTextPreview();
    close();
  };

  el('actMode0').onclick = () => { chord.mode = 0; applyAndRender(); };
  el('actMode1').onclick = () => { chord.mode = 1; applyAndRender(); };
  el('actMode2').onclick = () => { chord.mode = 2; applyAndRender(); };
  el('actUp').onclick = () => { chord.transposeOffset += 1; applyAndRender(); };
  el('actDown').onclick = () => { chord.transposeOffset -= 1; applyAndRender(); };
  el('actClose').onclick = close;
}

function renderAll() {
  renderSelected('selectedGrid');
  renderSelected('fullGrid');
  renderChordsList();
  saveLastState();
}

function setGlobalMode(mode) {
  state.globalMode = mode;
  state.selected.forEach(c => { resetChord(c); c.mode = mode; updateChord(c); });
  renderAll();
}

function transposeAll(semi) {
  state.selected.forEach(c => { c.transposeOffset += semi; updateChord(c); });
  renderAll();
}

function getRootBassNote(originalName, offset) {
  const base = CHORDS_DATA.find(x => x[0] === originalName);
  if (!base) return '';
  const notes = parseNotes(base[1], 0, offset);
  return notes && notes.length > 0 ? notes[0] : '';
}

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
  renderAll();
}

function openSongsModal() {
  const list = el('songsList');
  list.innerHTML = '';
  const songs = JSON.parse(localStorage.getItem('songs') || '{}');
  const entries = Object.entries(songs);
  const favs = entries.filter(([,v])=>v.fav).sort((a,b)=>a[0].localeCompare(b[0]));
  const others = entries.filter(([,v])=>!v.fav).sort((a,b)=>a[0].localeCompare(b[0]));
  [...favs, ...others].forEach(([name, data]) => {
    const row = document.createElement('div');
    row.className = 'song-row';
    const star = document.createElement('div');
    star.className = 'star';
    star.textContent = data.fav ? '★' : '☆';
    star.addEventListener('click', () => { toggleFav(name); openSongsModal(); });
    const title = document.createElement('div');
    title.className = 'name';
    title.textContent = name;
    const open = document.createElement('button');
    open.className = 'btn';
    open.textContent = 'Открыть';
    open.addEventListener('click', () => { el('songName').value = name; loadSong(name); closeSongsModal(); });
    const del = document.createElement('button');
    del.className = 'btn btn-danger';
    del.textContent = 'Удалить';
    del.addEventListener('click', () => { deleteSong(name); openSongsModal(); });
    row.appendChild(star);
    row.appendChild(title);
    row.appendChild(open);
    row.appendChild(del);
    list.appendChild(row);
  });
  el('songsModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeSongsModal() {
  el('songsModal').classList.add('hidden');
  updateBodyModalOpen();
}

function openFaqModal() {
  el('faqModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeFaqModal() {
  el('faqModal').classList.add('hidden');
  updateBodyModalOpen();
}

function renderSongTextView(targetId = 'songTextView') {
  const view = el(targetId);
  if (!songTextState.rawText) {
    if (view) view.innerHTML = '';
    return;
  }
  if (!songTextState.occurrences.length) {
    if (view) view.textContent = songTextState.rawText;
    return;
  }
  if (view) view.innerHTML = buildSongTextHtml(songTextState.rawText, songTextState.occurrences);
}

function updateSongTextPreview() {
  const preview = document.querySelector('.song-text-preview');
  if (!preview) return;
  preview.innerHTML = '';
  if (!songTextState.occurrences.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Аккорды не найдены.';
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
    ru.textContent = getFullRussianName(base);
    chip.appendChild(ru);
    preview.appendChild(chip);
  });
}

function openSongTextModal(title = '', text = '', viewOnly = false) {
  songTextState.title = title || '';
  songTextState.rawText = text || '';
  songTextState.occurrences = [];
  songTextState.softMode = false;
  songTextState.viewMode = 'piano';

  el('songTextTitle').value = songTextState.title;
  el('songTextInput').value = songTextState.rawText;
  el('songTextSoftMode').checked = false;

  const modal = el('songTextModal');
  modal.classList.toggle('view-only', !!viewOnly);
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
}

function closeSongTextModal() {
  el('songTextModal').classList.add('hidden');
  updateBodyModalOpen();
}

function openSongTextFullModal() {
  el('songTextFullModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  renderSongTextView('songTextFullView');
}

function closeSongTextFullModal() {
  el('songTextFullModal').classList.add('hidden');
  updateBodyModalOpen();
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

function openChordViewModal(chord, opts = {}) {
  const showActions = !!opts.showActions;
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
  const grid = el('chordViewGrid');
  grid.innerHTML = '';
  const viewState = { color: true, piano: true };
  if (songTextState.viewMode === 'piano') {
    viewState.piano = true;
  } else if (songTextState.viewMode === 'color') {
    viewState.piano = false;
    viewState.color = true;
  } else if (songTextState.viewMode === 'normal') {
    viewState.piano = false;
    viewState.color = false;
  }

  function renderChord() {
    grid.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card';
    const content = document.createElement('div');
    content.className = 'card-content';
    const header = document.createElement('div');
    header.className = 'card-header';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = chord.name;
    header.appendChild(title);
    content.appendChild(header);

    if (viewState.piano) {
      renderKeyboard(content, chord.notes);
    } else {
      const notes = document.createElement('div');
      notes.className = 'notes';
      chord.notes.forEach(n => {
        const key = document.createElement('div');
        key.className = 'note';
        key.textContent = n;
        if (viewState.color) {
          key.style.background = noteColor(n);
        } else {
          key.style.background = (n.includes('#') || n.includes('b')) ? '#ddd' : '#fff';
        }
        notes.appendChild(key);
      });
      content.appendChild(notes);
    }
    card.appendChild(content);
    grid.appendChild(card);
  }

  el('chordViewColor').onclick = () => {
    viewState.piano = false;
    viewState.color = true;
    renderChord();
  };
  el('chordViewNormal').onclick = () => {
    viewState.piano = false;
    viewState.color = false;
    renderChord();
  };
  el('chordViewPiano').onclick = () => {
    viewState.piano = true;
    renderChord();
  };
  el('chordActMode0').onclick = () => { chord.mode = 0; updateChord(chord); renderChord(); if (onChange) onChange(); };
  el('chordActMode1').onclick = () => { chord.mode = 1; updateChord(chord); renderChord(); if (onChange) onChange(); };
  el('chordActMode2').onclick = () => { chord.mode = 2; updateChord(chord); renderChord(); if (onChange) onChange(); };
  el('chordActDown').onclick = () => { chord.transposeOffset -= 1; updateChord(chord); renderChord(); if (onChange) onChange(); };
  el('chordActUp').onclick = () => { chord.transposeOffset += 1; updateChord(chord); renderChord(); if (onChange) onChange(); };

  renderChord();
  const modal = el('chordViewModal');
  modal.classList.toggle('show-actions', showActions);
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  // Закрытие по клику вне карточки
  const onBackdrop = (e) => {
    if (e.target === modal) {
      closeChordViewModal();
      modal.removeEventListener('click', onBackdrop);
    }
  };
  modal.addEventListener('click', onBackdrop);
}

function closeChordViewModal() {
  el('chordViewModal').classList.add('hidden');
  updateBodyModalOpen();
}

let importFound = [];

function openImportModal() {
  el('importModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  el('importText').focus();
}

function closeImportModal() {
  el('importModal').classList.add('hidden');
  updateBodyModalOpen();
}

function renderImportPreview() {
  const preview = el('importPreview');
  preview.innerHTML = '';
  if (importFound.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Аккорды не найдены.';
    preview.appendChild(empty);
  } else {
    importFound.forEach(ch => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      const base = ch.split('/')[0];
      chip.textContent = ch;
      const ru = document.createElement('span');
      ru.className = 'ru';
      ru.textContent = getFullRussianName(base);
      chip.appendChild(ru);
      preview.appendChild(chip);
    });
  }
  el('importAdd').textContent = `Добавить (${importFound.length})`;
}

function init() {
  loadLastState();
  renderAll();

  el('search').addEventListener('input', (e) => {
    const q = (e.target.value || '').trim();
    const prevLen = state.lastSearchLen;
    state.lastSearchLen = q.length;
    renderChordsList(prevLen);
  });
  el('toggleColor').addEventListener('click', () => { state.isColorMode = !state.isColorMode; renderAll(); });
  el('togglePiano').addEventListener('click', () => { state.isPianoMode = !state.isPianoMode; renderAll(); });
  el('clearAll').addEventListener('click', () => { state.selected = []; renderAll(); });
  el('fullScreen').addEventListener('click', () => {
    el('fullModal').classList.remove('hidden');
    document.body.classList.add('modal-open');
  });
  el('fullClose').addEventListener('click', () => {
    el('fullModal').classList.add('hidden');
    document.body.classList.remove('modal-open');
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

  el('printPdf').addEventListener('click', printPdf);

  el('saveSong').addEventListener('click', () => {
    const name = el('songName').value.trim();
    if (!name) { alert('Введите название песни'); return; }
    saveSong(name);
  });
  el('openSongs').addEventListener('click', openSongsModal);
  el('songsClose').addEventListener('click', closeSongsModal);

  const openFaqBtn = el('openFaqTop');
  if (openFaqBtn) openFaqBtn.addEventListener('click', openFaqModal);
  const faqClose = el('faqClose');
  if (faqClose) faqClose.addEventListener('click', closeFaqModal);

  el('importClose').addEventListener('click', closeImportModal);
  el('importScan').addEventListener('click', () => {
    const text = (el('importText').value || '').trim();
    const softMode = el('importSoftMode').checked;
    importFound = text ? extractChordsFromText(text, softMode) : [];
    renderImportPreview();
  });
  el('importAdd').addEventListener('click', () => {
    const text = (el('importText').value || '').trim();
    if (!importFound.length && text) {
      const softMode = el('importSoftMode').checked;
      importFound = extractChordsFromText(text, softMode);
    }
    importFound.forEach(token => {
      const base = token.split('/')[0];
      const item = buildChord(base, state.globalMode, 0);
      if (item) state.selected.push(item);
    });
    importFound = [];
    el('importText').value = '';
    renderImportPreview();
    closeImportModal();
    renderAll();
  });

  // Новый режим текста с аккордами
  el('openImport').addEventListener('click', () => {
    const title = (el('songName').value || '').trim();
    openSongTextModal(title, '', false);
  });
  el('songTextFull').addEventListener('click', () => {
    openSongTextFullModal();
  });
  el('songTextExitFull').addEventListener('click', () => {
    closeSongTextFullModal();
  });
  el('songTextFullClose').addEventListener('click', () => {
    closeSongTextFullModal();
  });
  el('songTextClose').addEventListener('click', closeSongTextModal);
  el('songTextFind').addEventListener('click', () => {
    songTextState.rawText = el('songTextInput').value || '';
    songTextState.softMode = el('songTextSoftMode').checked;
    songTextState.occurrences = extractChordOccurrences(songTextState.rawText, songTextState.softMode);
    updateSongTextPreview();
    renderSongTextView();
  });
  el('songTextAdd').addEventListener('click', () => {
    if (!songTextState.occurrences.length) {
      songTextState.rawText = el('songTextInput').value || '';
      songTextState.softMode = el('songTextSoftMode').checked;
      songTextState.occurrences = extractChordOccurrences(songTextState.rawText, songTextState.softMode);
    }
    songTextState.occurrences.forEach(occ => {
      const item = buildChord(occ.base, occ.item.mode, occ.item.transposeOffset);
      if (item) state.selected.push(item);
    });
    renderAll();
  });
  el('songTextSave').addEventListener('click', () => {
    const title = (el('songTextTitle').value || '').trim();
    if (!title) { alert('Введите название песни'); return; }
    const text = el('songTextInput').value || '';
    saveSongText(title, text);
    alert('Песня сохранена');
  });
  el('songTextMode0').addEventListener('click', () => applyGlobalModeToSongText(0));
  el('songTextMode1').addEventListener('click', () => applyGlobalModeToSongText(1));
  el('songTextMode2').addEventListener('click', () => applyGlobalModeToSongText(2));
  el('songTextSmart').addEventListener('click', smartInversionSongText);
  el('songTextDown').addEventListener('click', () => transposeSongText(-1));
  el('songTextUp').addEventListener('click', () => transposeSongText(1));
  el('songTextViewPiano').addEventListener('click', () => { songTextState.viewMode = 'piano'; });
  el('songTextViewColor').addEventListener('click', () => { songTextState.viewMode = 'color'; });
  el('songTextViewNormal').addEventListener('click', () => { songTextState.viewMode = 'normal'; });

  const songTextView = el('songTextView');
  songTextView.addEventListener('click', (e) => {
    const target = e.target.closest('.song-chord');
    if (!target) return;
    const idx = Number(target.dataset.idx);
    const occ = songTextState.occurrences[idx];
    if (!occ) return;
    openChordViewModal(occ.item, {
      showActions: true,
      onChange: () => {
        renderSongTextView('songTextView');
        updateSongTextPreview();
        renderSongTextView('songTextFullView');
      }
    });
  });

  const songTextFullView = el('songTextFullView');
  songTextFullView.addEventListener('click', (e) => {
    const target = e.target.closest('.song-chord');
    if (!target) return;
    const idx = Number(target.dataset.idx);
    const occ = songTextState.occurrences[idx];
    if (!occ) return;
    openChordViewModal(occ.item, {
      showActions: true,
      onChange: () => {
        renderSongTextView('songTextView');
        updateSongTextPreview();
        renderSongTextView('songTextFullView');
      }
    });
  });
}

init();
