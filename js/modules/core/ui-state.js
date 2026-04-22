import { el } from '../dom.js';
import { escapeHtml } from './text.js';
import { t } from '../i18n.js';

function updateBodyModalOpen() {
  if (document.querySelector('.modal:not(.hidden)')) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
}

function formatChordTitleHtml(name) {
  const safe = escapeHtml(name || '');
  return safe.replace(/(\s*\((?:Бас|Bass) [^)]+\))$/, '<span class="title-bass">$1</span>');
}

function setActiveButtons(ids, activeId) {
  ids.forEach((id) => {
    const node = el(id);
    if (!node) return;
    const isActive = id === activeId;
    node.classList.toggle('is-active', isActive);
    node.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setToggleState(id, isActive) {
  const node = el(id);
  if (!node) return;
  node.classList.toggle('is-active', !!isActive);
  node.setAttribute('aria-pressed', isActive ? 'true' : 'false');
}

function setMidiModeButtonState(id, isFreePlay) {
  const node = el(id);
  if (!node) return;
  node.textContent = isFreePlay ? t('freePlay') : t('training');
  node.classList.toggle('is-active', !!isFreePlay);
  node.setAttribute('aria-pressed', isFreePlay ? 'true' : 'false');
}

function setMidiStatus(message = '', type = '') {
  ['midiStatus', 'fullMidiStatus'].forEach((id) => {
    const node = el(id);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-ready', type === 'ready');
    node.classList.toggle('is-error', type === 'error');
  });
}

export {
  updateBodyModalOpen,
  formatChordTitleHtml,
  setActiveButtons,
  setToggleState,
  setMidiModeButtonState,
  setMidiStatus
};
