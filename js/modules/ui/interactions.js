import { state, drag, songTextState } from '../state/stores.js';
import { el } from '../dom.js';
import { updateBodyModalOpen } from '../core.js';
import { renderAll } from '../commands.js';
import { updateChord } from '../core/chords.js';
import { renderSongTextView, updateSongTextPreview } from '../features/song-text.js';

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
  drag.ghost.style.left = `${x - rect.width / 2}px`;
  drag.ghost.style.top = `${y - rect.height / 2}px`;
}

function removeGhost() {
  if (drag.ghost) {
    drag.ghost.remove();
    drag.ghost = null;
  }
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
  for (const item of cards) {
    const rect = item.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(x - cx, y - cy);
    const maxRadius = Math.max(rect.width, rect.height) * 0.75;
    if (dist <= maxRadius && dist < bestDist) {
      const idx = parseInt(item.dataset.idx, 10);
      if (Number.isFinite(idx)) {
        bestIdx = idx;
        bestDist = dist;
      }
    }
  }
  return bestIdx;
}

function applyDragHighlight(gridEl, targetIndex) {
  Array.from(gridEl.querySelectorAll('.card')).forEach((card) => {
    card.classList.remove('drag-over');
    const idx = parseInt(card.dataset.idx, 10);
    if (idx === targetIndex) card.classList.add('drag-over');
  });
}

function clearDragHighlight(gridEl) {
  if (!gridEl) return;
  gridEl.querySelectorAll('.card').forEach((card) => card.classList.remove('drag-over'));
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

function onMouseMove(event) {
  if (!drag.active) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  const distance = Math.hypot(dx, dy);
  if (!drag.isDragging && distance > drag.dragThreshold) {
    drag.isDragging = true;
    const sourceCard = document.querySelector(`.card[data-idx="${drag.sourceIndex}"]`);
    if (sourceCard) {
      sourceCard.classList.add('dragging');
      drag.ghost = createGhost(sourceCard);
      if (drag.ghost) moveGhost(event.clientX, event.clientY);
    }
  }
  if (!drag.isDragging) return;
  moveGhost(event.clientX, event.clientY);
  const gridEl = el(drag.targetId);
  const targetIndex = getTargetIndex(gridEl, event.clientX, event.clientY);
  if (targetIndex >= 0 && targetIndex !== drag.sourceIndex) {
    applyDragHighlight(gridEl, targetIndex);
    drag.targetIndex = targetIndex;
  } else {
    clearDragHighlight(gridEl);
    drag.targetIndex = null;
  }
}

function onMouseUp() {
  if (!drag.active) return;
  if (drag.isDragging && drag.targetIndex !== null && drag.targetIndex !== drag.sourceIndex) {
    const temp = state.selected[drag.sourceIndex];
    state.selected[drag.sourceIndex] = state.selected[drag.targetIndex];
    state.selected[drag.targetIndex] = temp;
    renderAll();
  }
  cleanupDrag();
}

function onTouchMove(event) {
  if (!drag.active) return;
  const touch = event.touches[0];
  const dx = touch.clientX - drag.startX;
  const dy = touch.clientY - drag.startY;
  const distance = Math.hypot(dx, dy);
  if (!drag.isDragging && distance > drag.dragThreshold) {
    drag.isDragging = true;
    const sourceCard = document.querySelector(`.card[data-idx="${drag.sourceIndex}"]`);
    if (sourceCard) {
      sourceCard.classList.add('dragging');
      drag.ghost = createGhost(sourceCard);
      if (drag.ghost) moveGhost(touch.clientX, touch.clientY);
    }
  }
  if (!drag.isDragging) return;
  event.preventDefault();
  moveGhost(touch.clientX, touch.clientY);
  const gridEl = el(drag.targetId);
  const targetIndex = getTargetIndex(gridEl, touch.clientX, touch.clientY);
  if (targetIndex >= 0 && targetIndex !== drag.sourceIndex) {
    applyDragHighlight(gridEl, targetIndex);
    drag.targetIndex = targetIndex;
  } else {
    clearDragHighlight(gridEl);
    drag.targetIndex = null;
  }
}

function onTouchEnd() {
  if (!drag.active) return;
  if (drag.isDragging && drag.targetIndex !== null && drag.targetIndex !== drag.sourceIndex) {
    const temp = state.selected[drag.sourceIndex];
    state.selected[drag.sourceIndex] = state.selected[drag.targetIndex];
    state.selected[drag.targetIndex] = temp;
    renderAll();
  }
  cleanupDrag();
}

function attachDragListeners(card, index, gridId) {
  card.setAttribute('data-idx', index);
  const handle = card.querySelector('.drag-handle');
  if (!handle) return;
  handle.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    drag.active = true;
    drag.sourceIndex = index;
    drag.targetId = gridId;
    drag.startX = event.clientX;
    drag.startY = event.clientY;
    drag.isDragging = false;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  handle.addEventListener('touchstart', (event) => {
    event.stopPropagation();
    const touch = event.touches[0];
    drag.active = true;
    drag.sourceIndex = index;
    drag.targetId = gridId;
    drag.startX = touch.clientX;
    drag.startY = touch.clientY;
    drag.isDragging = false;
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, { passive: false });
}

function showChordMenu(chord) {
  const modal = el('chordModal');
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  const close = () => {
    modal.classList.add('hidden');
    updateBodyModalOpen();
  };
  const bindExclusiveClick = (id, handler) => {
    const node = el(id);
    if (!showChordMenu.handlers) showChordMenu.handlers = new Map();
    const prev = showChordMenu.handlers.get(id);
    if (prev) node.removeEventListener('click', prev);
    node.addEventListener('click', handler);
    showChordMenu.handlers.set(id, handler);
    return node;
  };
  bindExclusiveClick('actMode0', () => { chord.mode = 0; updateChord(chord); renderAll(); close(); });
  bindExclusiveClick('actMode1', () => { chord.mode = 1; updateChord(chord); renderAll(); close(); });
  bindExclusiveClick('actMode2', () => { chord.mode = 2; updateChord(chord); renderAll(); close(); });
  bindExclusiveClick('actUp', () => { chord.transposeOffset += 1; updateChord(chord); renderAll(); close(); });
  bindExclusiveClick('actDown', () => { chord.transposeOffset -= 1; updateChord(chord); renderAll(); close(); });
  bindExclusiveClick('actClose', close);
}

function showChordMenuForText(chord) {
  const modal = el('chordModal');
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  const close = () => {
    modal.classList.add('hidden');
    updateBodyModalOpen();
  };
  const applyAndRender = () => {
    updateChord(chord);
    renderSongTextView();
    updateSongTextPreview();
    close();
  };
  const bindExclusiveClick = (id, handler) => {
    const node = el(id);
    if (!showChordMenuForText.handlers) showChordMenuForText.handlers = new Map();
    const prev = showChordMenuForText.handlers.get(id);
    if (prev) node.removeEventListener('click', prev);
    node.addEventListener('click', handler);
    showChordMenuForText.handlers.set(id, handler);
    return node;
  };
  bindExclusiveClick('actMode0', () => { chord.mode = 0; applyAndRender(); });
  bindExclusiveClick('actMode1', () => { chord.mode = 1; applyAndRender(); });
  bindExclusiveClick('actMode2', () => { chord.mode = 2; applyAndRender(); });
  bindExclusiveClick('actUp', () => { chord.transposeOffset += 1; applyAndRender(); });
  bindExclusiveClick('actDown', () => { chord.transposeOffset -= 1; applyAndRender(); });
  bindExclusiveClick('actClose', close);
}

export {
  createGhost,
  moveGhost,
  removeGhost,
  getTargetIndex,
  applyDragHighlight,
  clearDragHighlight,
  cleanupDrag,
  onMouseMove,
  onMouseUp,
  onTouchMove,
  onTouchEnd,
  attachDragListeners,
  showChordMenu,
  showChordMenuForText
};
