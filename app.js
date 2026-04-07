const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_MAP = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};

const state = {
  selected: [],
  isColorMode: true,
  isPianoMode: true,
  globalMode: 0,
  openGroups: new Set(),
  lastSearchLen: 0,
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
  songs[name] = { data, fav: songs[name]?.fav || false };
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
  const data = songs[name]?.data || '';
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
  document.body.classList.remove('modal-open');
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
}

init();
