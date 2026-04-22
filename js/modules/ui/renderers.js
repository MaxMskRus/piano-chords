import { CHORDS_DATA } from '../data/chords-data.js';
import { GROUP_ORDER, FLAT_MAP } from '../state/constants.js';
import { state } from '../state/stores.js';
import { el } from '../dom.js';
import { passesChordFilter } from '../core/filter-state.js';
import { getFullChordName, keyboardStartNatural, buildAscendingNotePositions, isWideChord, buildChord, normalizeToSharp, parseNoteToSemitone, getVisualOctaves } from '../core/chords.js';
import { previewGroupChord } from '../core/preview.js';
import { noteColor, renderKeyboard } from './keyboard.js';
import { buildRenderedChordCard, measureMidiPreviewMetrics } from './card-factory.js';
import { syncSelectedMidiPreviewLayout, shouldShowMidiPreview } from './preview-layout.js';
import { getLocalizedNoteName, t } from '../i18n.js';

function hasAnyExpandedGroups() {
  return Array.from(document.querySelectorAll('#chordsList .group')).some((details) => details.open);
}

function updateGroupsToggleButtonState() {
  const button = el('toggleAllGroups');
  if (!button) return;
  button.textContent = hasAnyExpandedGroups() ? t('collapseAll') : t('expandAll');
}

function setAllGroupsExpanded(expanded) {
  document.querySelectorAll('#chordsList .group').forEach((details) => {
    details.open = expanded;
    const root = details.dataset.root;
    if (!root) return;
    if (expanded) state.openGroups.add(root);
    else state.openGroups.delete(root);
  });
  if (!expanded) state.openGroups = new Set();
  updateGroupsToggleButtonState();
}

function groupChords(query = '') {
  const all = CHORDS_DATA.map((entry) => entry[0]);
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

function renderChordsList(addChord, prevSearchLen = state.lastSearchLen) {
  const container = el('chordsList');
  const query = (el('search').value || '').trim();
  const queryLen = query.length;
  const prevOpen = new Set(state.openGroups);
  document.querySelectorAll('.group').forEach((details) => {
    if (details.open && details.dataset.root) prevOpen.add(details.dataset.root);
  });
  container.innerHTML = '';
  const groups = groupChords(query);
  const orderedRoots = GROUP_ORDER.filter((root) => groups.has(root));
  for (const root of orderedRoots) {
    const items = (groups.get(root) || []).filter((name) => passesChordFilter(name));
    if (!items.length) continue;
    const details = document.createElement('details');
    details.className = 'group';
    details.dataset.root = root;
    if (queryLen > 0) details.open = true;
    else if (prevSearchLen > 0) details.open = false;
    else if (prevOpen.has(root)) details.open = true;

    const summary = document.createElement('summary');
    const localizedRoot = getLocalizedNoteName(root);
    const label = localizedRoot && localizedRoot !== root ? ` (${localizedRoot})` : '';
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = noteColor(root);
    summary.appendChild(dot);
    summary.appendChild(document.createTextNode(` ${root}${label}`));
    details.appendChild(summary);

    const wrap = document.createElement('div');
    wrap.className = 'group-items';
    items.forEach((name) => {
      const row = document.createElement('div');
      row.className = 'item';
      const count = state.selected.filter((chord) => chord.originalName === name).length;
      const badge = document.createElement('div');
      badge.className = `count${count === 0 ? ' empty' : ''}`;
      badge.textContent = count === 0 ? '0' : String(count);

      const labelNode = document.createElement('div');
      labelNode.className = 'label';
      const title = document.createElement('div');
      title.className = 'name';
      title.textContent = name;
      const ru = document.createElement('div');
      ru.className = 'ru';
      ru.textContent = getFullChordName(name);
      labelNode.appendChild(title);
      labelNode.appendChild(ru);

      const playButton = document.createElement('button');
      playButton.type = 'button';
      playButton.className = 'item-play';
      playButton.setAttribute('aria-label', `${t('previewVerb')} ${name}`);
      playButton.title = `${t('previewVerb')} ${name}`;
      playButton.innerHTML = '<span aria-hidden="true">▶</span>';
      playButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await previewGroupChord(name, playButton);
      });

      row.appendChild(badge);
      row.appendChild(labelNode);
      row.appendChild(playButton);
      row.addEventListener('click', () => addChord(name));
      wrap.appendChild(row);
    });
    details.appendChild(wrap);
    container.appendChild(details);
    details.addEventListener('toggle', () => {
      if (details.open) state.openGroups.add(root);
      else state.openGroups.delete(root);
      updateGroupsToggleButtonState();
    });
  }

  if (queryLen > 0) {
    state.openGroups = orderedRoots.length === 1 ? new Set(orderedRoots) : new Set();
  } else if (prevSearchLen > 0) {
    state.openGroups = new Set();
  } else {
    state.openGroups = prevOpen;
  }
  updateGroupsToggleButtonState();
}

function renderSelected(targetId, attachDragListeners) {
  const grid = el(targetId);
  grid.innerHTML = '';
  const previewChords = (targetId === 'selectedGrid' || targetId === 'fullGrid') ? state.midiPreviewChords : [];
  const chordsToRender = state.selected.length > 0 ? state.selected : previewChords.length > 0 ? previewChords : [];
  const isPreviewOnly = state.selected.length === 0 && previewChords.length > 0;
  const previewMetrics = isPreviewOnly ? measureMidiPreviewMetrics(targetId) : null;

  chordsToRender.forEach((chord, index) => {
    if (!isPreviewOnly) {
      const card = buildRenderedChordCard(chord, { index, targetId });
      attachDragListeners(card, index, targetId);
      grid.appendChild(card);
      return;
    }

    let slot = grid.querySelector('.midi-preview-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'midi-preview-slot';
      if (previewMetrics) slot.style.minHeight = `${Math.ceil(previewMetrics.height)}px`;
      grid.appendChild(slot);
    }
    const card = buildRenderedChordCard(chord, {
      index,
      previewOnly: true,
      previewWidth: previewMetrics ? (isWideChord(chord.notes) ? previewMetrics.wideWidth : previewMetrics.width) : null,
      previewHeight: previewMetrics ? previewMetrics.height : null
    });
    slot.appendChild(card);
  });
}

function addChord(name) {
  const item = buildChord(name, state.globalMode, 0);
  if (item) state.selected.push(item);
}

function printPdf() {
  const songName = (el('songName').value || '').trim();
  const titleEl = el('printTitle');
  titleEl.textContent = songName || t('chordsFallbackTitle');
  titleEl.style.fontSize = songName.length > 52 ? '16pt' : songName.length > 34 ? '19pt' : '22pt';
  setTimeout(() => window.print(), 100);
}

export {
  noteColor,
  hasAnyExpandedGroups,
  updateGroupsToggleButtonState,
  setAllGroupsExpanded,
  groupChords,
  renderChordsList,
  renderKeyboard,
  renderSelected,
  addChord,
  printPdf
};
