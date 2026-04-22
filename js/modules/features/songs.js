import { el } from '../dom.js';
import { getSongsStore, toggleFav, loadSong, deleteSong } from '../storage.js';
import { updateBodyModalOpen } from '../core/ui-state.js';
import { scheduleMidiEvaluation } from '../core/midi.js';
import { t } from '../i18n.js';
function openSongsModal() {
  const list = el('songsList');
  list.innerHTML = '';
  const songs = getSongsStore();
  const entries = Object.entries(songs);
  const favs = entries
    .filter(([, v]) => v.fav)
    .sort((a, b) => (b[1].favOrder || 0) - (a[1].favOrder || 0));
  const others = entries
    .filter(([, v]) => !v.fav)
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  [...favs, ...others].forEach(([name, data]) => {
    const row = document.createElement('div');
    row.className = 'song-row';
    const star = document.createElement('button');
    star.className = 'star-btn';
    star.type = 'button';
    star.textContent = data.fav ? '★' : '☆';
    star.setAttribute('aria-pressed', data.fav ? 'true' : 'false');
    if (data.fav) star.classList.add('is-fav');
    star.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(name); openSongsModal(); });
    const title = document.createElement('div');
    title.className = 'song-name';
    title.textContent = name;
    title.title = name;
    const actions = document.createElement('div');
    actions.className = 'song-actions';
    const open = document.createElement('button');
    open.className = 'btn';
    open.type = 'button';
    open.textContent = t('songsOpen');
    open.addEventListener('click', () => { el('songName').value = name; loadSong(name); closeSongsModal(); });
    const del = document.createElement('button');
    del.className = 'btn btn-danger';
    del.type = 'button';
    del.textContent = t('songsDelete');
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteSong(name); openSongsModal(); });
    row.appendChild(star);
    row.appendChild(title);
    actions.appendChild(open);
    actions.appendChild(del);
    row.appendChild(actions);
    row.addEventListener('click', () => { el('songName').value = name; loadSong(name); closeSongsModal(); });
    list.appendChild(row);
  });
  el('songsModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeSongsModal() {
  el('songsModal').classList.add('hidden');
  updateBodyModalOpen();
  scheduleMidiEvaluation();
}

function openFaqModal() {
  el('faqModal').classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeFaqModal() {
  el('faqModal').classList.add('hidden');
  updateBodyModalOpen();
}

export { openSongsModal, closeSongsModal, openFaqModal, closeFaqModal };
