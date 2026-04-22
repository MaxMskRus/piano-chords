import { songTextState } from '../state/stores.js';
import { el } from '../dom.js';
import { updateBodyModalOpen } from '../core/ui-state.js';
import { setActiveButtons, formatChordTitleHtml } from '../core.js';
import { renderKeyboard, noteColor } from '../ui.js';
import { isWideChord, updateChord } from '../core/chords.js';
import { attachChordPreviewSurface } from '../core/preview.js';

const clickHandlers = new Map();

function bindExclusiveClick(id, handler) {
  const node = el(id);
  const prev = clickHandlers.get(id);
  if (prev) node.removeEventListener('click', prev);
  node.addEventListener('click', handler);
  clickHandlers.set(id, handler);
  return node;
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
    if (isWideChord(chord.notes)) card.classList.add('card--wide');
    const content = document.createElement('div');
    content.className = 'card-content';
    const header = document.createElement('div');
    header.className = 'card-header';
    const title = document.createElement('div');
    title.className = 'title';
    title.innerHTML = formatChordTitleHtml(chord.name);
    header.appendChild(title);
    content.appendChild(header);

    if (viewState.piano) {
      renderKeyboard(content, chord.notes);
      attachChordPreviewSurface(content.lastElementChild, chord);
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
      attachChordPreviewSurface(notes, chord);
    }
    card.appendChild(content);
    grid.appendChild(card);
    setActiveButtons(
      ['chordViewPiano', 'chordViewColor', 'chordViewNormal'],
      viewState.piano ? 'chordViewPiano' : (viewState.color ? 'chordViewColor' : 'chordViewNormal')
    );
  }

  bindExclusiveClick('chordViewColor', () => {
    viewState.piano = false;
    viewState.color = true;
    renderChord();
  });
  bindExclusiveClick('chordViewNormal', () => {
    viewState.piano = false;
    viewState.color = false;
    renderChord();
  });
  bindExclusiveClick('chordViewPiano', () => {
    viewState.piano = true;
    renderChord();
  });
  bindExclusiveClick('chordActMode0', () => { chord.mode = 0; updateChord(chord); renderChord(); if (onChange) onChange(); });
  bindExclusiveClick('chordActMode1', () => { chord.mode = 1; updateChord(chord); renderChord(); if (onChange) onChange(); });
  bindExclusiveClick('chordActMode2', () => { chord.mode = 2; updateChord(chord); renderChord(); if (onChange) onChange(); });
  bindExclusiveClick('chordActDown', () => { chord.transposeOffset -= 1; updateChord(chord); renderChord(); if (onChange) onChange(); });
  bindExclusiveClick('chordActUp', () => { chord.transposeOffset += 1; updateChord(chord); renderChord(); if (onChange) onChange(); });

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

export { openChordViewModal, closeChordViewModal };
