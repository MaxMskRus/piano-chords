const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_MAP = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};

const state = {
  selected: [],
  isColorMode: true,
  isPianoMode: true,
  globalMode: 0,
  openGroups: new Set(),
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

const el = (id) => document.getElementById(id);

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
    if (query && !name.toLowerCase().includes(query.toLowerCase())) continue;
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

function renderChordsList() {
  const container = el('chordsList');
  const prevOpen = new Set(state.openGroups);
  document.querySelectorAll('.group').forEach(d => {
    if (d.open && d.dataset.root) prevOpen.add(d.dataset.root);
  });
  container.innerHTML = '';
  const groups = groupChords(el('search').value || '');
  const orderedRoots = GROUP_ORDER.filter(r => groups.has(r));
  for (const root of orderedRoots) {
    const items = groups.get(root) || [];
    const details = document.createElement('details');
    details.className = 'group';
    details.dataset.root = root;
    if (prevOpen.has(root)) details.open = true;
    const summary = document.createElement('summary');
    const label = RUS_NAMES[root] ? ` (${RUS_NAMES[root]})` : '';
    summary.innerHTML = `<span class=\"dot\" style=\"background:${noteColor(root)}\"></span> ${root}${label}`;
    details.appendChild(summary);
    const wrap = document.createElement('div');
    wrap.className = 'group-items';
    items.forEach(name => {
      const row = document.createElement('div');
      row.className = 'item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.selected.some(c => c.originalName === name);
      cb.addEventListener('change', () => toggleChord(name));
      const label = document.createElement('div');
      label.textContent = name;
      row.appendChild(cb);
      row.appendChild(label);
      wrap.appendChild(row);
    });
    details.appendChild(wrap);
    container.appendChild(details);
    details.addEventListener('toggle', () => {
      if (details.open) state.openGroups.add(root);
      else state.openGroups.delete(root);
    });
  }
  state.openGroups = prevOpen;
}

function toggleChord(name) {
  const idx = state.selected.findIndex(c => c.originalName === name);
  if (idx >= 0) state.selected.splice(idx, 1);
  else {
    const item = buildChord(name, state.globalMode, 0);
    if (item) state.selected.push(item);
  }
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

function renderSelected(targetId) {
  const grid = el(targetId);
  grid.innerHTML = '';
  state.selected.forEach(chord => {
    const card = document.createElement('div');
    card.className = 'card';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = chord.name;
    card.appendChild(title);

    if (state.isPianoMode) {
      renderKeyboard(card, chord.notes);
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
      card.appendChild(notes);
    }

    card.addEventListener('click', () => {
      state.selected = state.selected.filter(c => c !== chord);
      renderAll();
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showChordMenu(chord);
    });

    grid.appendChild(card);
  });
}

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

  el('search').addEventListener('input', renderChordsList);
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
  el('transDown').addEventListener('click', () => transposeAll(-1));
  el('transUp').addEventListener('click', () => transposeAll(1));

  el('fullMode0').addEventListener('click', () => setGlobalMode(0));
  el('fullMode1').addEventListener('click', () => setGlobalMode(1));
  el('fullMode2').addEventListener('click', () => setGlobalMode(2));
  el('fullTransDown').addEventListener('click', () => transposeAll(-1));
  el('fullTransUp').addEventListener('click', () => transposeAll(1));

  el('saveSong').addEventListener('click', () => {
    const name = el('songName').value.trim();
    if (!name) { alert('Введите название песни'); return; }
    saveSong(name);
  });
  el('openSongs').addEventListener('click', openSongsModal);
  el('songsClose').addEventListener('click', closeSongsModal);
}

init();
