import { state, drag } from '../state/stores.js';
import { el } from '../dom.js';
import { UI_TIMINGS } from '../../config/ui.js';
import { formatChordTitleHtml } from '../core/ui-state.js';
import { isWideChord, buildChord } from '../core/chords.js';
import { attachChordPreviewSurface } from '../core/preview.js';
import { renderKeyboard, noteColor } from './keyboard.js';
import { showChordMenu, attachDragListeners } from './interactions.js';
import { renderAll } from '../commands.js';

function buildRenderedChordCard(chord, options = {}) {
  const { index = 0, previewOnly = false, previewWidth = null, previewHeight = null } = options;
  const card = document.createElement('div');
  card.className = 'card';
  if (isWideChord(chord.notes)) card.classList.add('card--wide');
  if (!previewOnly && state.midiMatchedIndices.has(index)) card.classList.add('midi-match');
  if (previewOnly) card.classList.add('midi-preview-card');
  card.setAttribute('data-idx', index);
  if (previewWidth) {
    card.style.width = `${Math.ceil(previewWidth)}px`;
    card.style.maxWidth = '100%';
  }
  if (previewHeight) {
    card.style.minHeight = `${Math.ceil(previewHeight)}px`;
  }

  const content = document.createElement('div');
  content.className = 'card-content';
  const header = document.createElement('div');
  header.className = 'card-header';
  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.innerHTML = `<svg class="drag-handle-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l2.8 2.8-1.4 1.4L13 5.8V9h-2V5.8l-.4.4-1.4-1.4L12 2Z"/>
    <path d="M12 22l-2.8-2.8 1.4-1.4.4.4V15h2v3.2l.4-.4 1.4 1.4L12 22Z"/>
    <path d="M2 12l2.8-2.8 1.4 1.4-.4.4H9v2H5.8l.4.4-1.4 1.4L2 12Z"/>
    <path d="M22 12l-2.8 2.8-1.4-1.4.4-.4H15v-2h3.2l-.4-.4 1.4-1.4L22 12Z"/>
    <circle cx="12" cy="12" r="2.2"/>
  </svg>`;
  const title = document.createElement('div');
  title.className = 'title';
  title.innerHTML = formatChordTitleHtml(chord.name);

  if (!previewOnly) header.appendChild(handle);
  header.appendChild(title);
  content.appendChild(header);

  if (state.isPianoMode) {
    renderKeyboard(content, chord.notes);
    attachChordPreviewSurface(content.lastElementChild, chord);
  } else {
    const notes = document.createElement('div');
    notes.className = 'notes';
    chord.notes.forEach((note) => {
      const key = document.createElement('div');
      key.className = 'note';
      key.textContent = note;
      key.style.background = state.isColorMode
        ? noteColor(note)
        : ((note.includes('#') || note.includes('b')) ? '#ddd' : '#fff');
      notes.appendChild(key);
    });
    content.appendChild(notes);
    attachChordPreviewSurface(notes, chord);
  }

  card.appendChild(content);

  if (!previewOnly) {
    title.addEventListener('click', (event) => {
      event.stopPropagation();
      if (drag.isDragging) return;
      state.selected = state.selected.filter((item) => item !== chord);
      renderAll();
    });

    let pressTimer;
    title.addEventListener('touchstart', (event) => {
      event.stopPropagation();
      pressTimer = setTimeout(() => showChordMenu(chord), UI_TIMINGS.longPressMs);
    });
    title.addEventListener('touchend', () => clearTimeout(pressTimer));
    title.addEventListener('touchmove', () => clearTimeout(pressTimer));
    title.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (drag.isDragging) return;
      showChordMenu(chord);
    });

    attachDragListeners(card, index, options.targetId);
  }

  return card;
}

function measureMidiPreviewMetrics(targetId) {
  const existing = state.midiPreviewMetrics[targetId];
  const grid = el(targetId);
  if (!grid) return existing || null;
  const probeWidth = grid.clientWidth || grid.getBoundingClientRect().width;
  if (!probeWidth) return existing || null;

  const cacheKey = [
    Math.round(probeWidth),
    state.isPianoMode ? 'piano' : 'notes',
    state.isColorMode ? 'color' : 'plain'
  ].join(':');
  if (existing && existing.cacheKey === cacheKey) return existing;

  const probe = document.createElement('div');
  probe.className = targetId === 'fullGrid' ? 'grid full midi-preview-probe' : 'grid midi-preview-probe';
  probe.style.width = `${Math.ceil(probeWidth)}px`;

  const normalChord = buildChord('C', 0, 0);
  const wideChord = buildChord('C11', 0, 0) || buildChord('Cmaj9', 0, 0) || normalChord;
  if (!normalChord || !wideChord) return existing || null;

  const normalCard = buildRenderedChordCard(normalChord, { previewOnly: true });
  const wideCard = buildRenderedChordCard(wideChord, { previewOnly: true });
  probe.appendChild(normalCard);
  probe.appendChild(wideCard);
  document.body.appendChild(probe);

  const metrics = {
    cacheKey,
    width: normalCard.getBoundingClientRect().width,
    wideWidth: wideCard.getBoundingClientRect().width,
    height: Math.max(normalCard.getBoundingClientRect().height, wideCard.getBoundingClientRect().height)
  };

  probe.remove();
  state.midiPreviewMetrics[targetId] = metrics;
  return metrics;
}

export { buildRenderedChordCard, measureMidiPreviewMetrics };
