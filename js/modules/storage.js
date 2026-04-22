import { state } from './state/stores.js';
import { STORAGE_KEYS } from './state/constants.js';
import { buildChord } from './core/chords.js';
import { openSongTextModal } from './features/song-text.js';
import { renderAll } from './commands.js';
import { getJson, getString, setJson, setString } from './utils/storage.js';

function saveLastState() {
  const data = state.selected.map(c => `${c.originalName}:${c.mode}:${c.transposeOffset}`).join(',');
  setString(STORAGE_KEYS.LAST_CHORDS, data);
  setString(STORAGE_KEYS.LAST_GLOBAL_MODE, state.globalMode);
}

function loadLastState() {
  const raw = getString(STORAGE_KEYS.LAST_CHORDS);
  const gm = parseInt(getString(STORAGE_KEYS.LAST_GLOBAL_MODE, '0'), 10) || 0;
  state.isMidiFreePlay = getString(STORAGE_KEYS.MIDI_FREE_PLAY, '1') !== '0';
  state.language = getString(STORAGE_KEYS.LANGUAGE, 'ru') === 'en' ? 'en' : 'ru';
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
  state.lastGlobalAction = `mode${gm}`;
}

function getSongsStore() {
  const raw = getJson(STORAGE_KEYS.SONGS, {});
  let changed = false;
  let maxOrder = 0;
  let maxFavOrder = 0;

  Object.values(raw).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    if (Number.isFinite(entry.order)) maxOrder = Math.max(maxOrder, entry.order);
    if (Number.isFinite(entry.favOrder)) maxFavOrder = Math.max(maxFavOrder, entry.favOrder);
  });

  Object.entries(raw).forEach(([name, entry]) => {
    if (!entry || typeof entry !== 'object') {
      raw[name] = { type: 'chords', data: '', fav: false, order: ++maxOrder, favOrder: 0 };
      changed = true;
      return;
    }
    if (!Number.isFinite(entry.order)) {
      entry.order = ++maxOrder;
      changed = true;
    }
    if (!Number.isFinite(entry.favOrder)) {
      entry.favOrder = entry.fav ? ++maxFavOrder : 0;
      changed = true;
    }
    if (typeof entry.fav !== 'boolean') {
      entry.fav = !!entry.fav;
      changed = true;
    }
  });

  if (changed) setJson(STORAGE_KEYS.SONGS, raw);
  return raw;
}

function saveSongsStore(songs) {
  setJson(STORAGE_KEYS.SONGS, songs);
}

function getNextSongOrder(songs) {
  return Object.values(songs).reduce((max, entry) => Math.max(max, entry?.order || 0), 0) + 1;
}

function getNextFavOrder(songs) {
  return Object.values(songs).reduce((max, entry) => Math.max(max, entry?.favOrder || 0), 0) + 1;
}

function saveSong(name) {
  const songs = getSongsStore();
  const data = state.selected.map(c => `${c.originalName}:${c.mode}:${c.transposeOffset}`).join(',');
  const prev = songs[name];
  songs[name] = {
    type: 'chords',
    data,
    fav: prev?.fav || false,
    order: prev?.order || getNextSongOrder(songs),
    favOrder: prev?.favOrder || 0
  };
  saveSongsStore(songs);
}

function saveSongText(name, text) {
  const songs = getSongsStore();
  const prev = songs[name];
  songs[name] = {
    type: 'text',
    text,
    fav: prev?.fav || false,
    order: prev?.order || getNextSongOrder(songs),
    favOrder: prev?.favOrder || 0
  };
  saveSongsStore(songs);
}

function deleteSong(name) {
  const songs = getSongsStore();
  delete songs[name];
  saveSongsStore(songs);
}

function toggleFav(name) {
  const songs = getSongsStore();
  if (songs[name]) {
    songs[name].fav = !songs[name].fav;
    songs[name].favOrder = songs[name].fav ? getNextFavOrder(songs) : 0;
  }
  saveSongsStore(songs);
}

function loadSong(name) {
  const songs = getSongsStore();
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

export {
  saveLastState,
  loadLastState,
  getSongsStore,
  saveSongsStore,
  getNextSongOrder,
  getNextFavOrder,
  saveSong,
  saveSongText,
  deleteSong,
  toggleFav,
  loadSong
};
