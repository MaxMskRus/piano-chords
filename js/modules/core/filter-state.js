import { FILTER_SUFFIXES } from '../../config/filters.js';
import { state } from '../state/stores.js';

function defaultGetChordSuffix(name) {
  if (!name) return '';
  const root = (name.length > 1 && (name[1] === '#' || name[1] === 'b')) ? name.slice(0, 2) : name.slice(0, 1);
  return name.slice(root.length);
}

function classifyChordFilter(name, getChordSuffix = defaultGetChordSuffix) {
  const suffix = getChordSuffix(name);
  if (FILTER_SUFFIXES.major.has(suffix)) return 'major';
  if (FILTER_SUFFIXES.minor.has(suffix)) return 'minor';
  if (FILTER_SUFFIXES.dominant.has(suffix)) return 'dominant';
  if (FILTER_SUFFIXES.maj7.has(suffix)) return 'maj7';
  if (FILTER_SUFFIXES.m7.has(suffix)) return 'm7';
  if (FILTER_SUFFIXES.sus.has(suffix)) return 'sus';
  if (FILTER_SUFFIXES.dim.has(suffix)) return 'dim';
  return 'other';
}

function passesChordFilter(name, getChordSuffix = defaultGetChordSuffix) {
  return state.chordFilter === 'all' || classifyChordFilter(name, getChordSuffix) === state.chordFilter;
}

function renderChordFilterState() {
  document.querySelectorAll('.chord-filter-btn').forEach((button) => {
    const active = button.dataset.filter === state.chordFilter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

export { classifyChordFilter, passesChordFilter, renderChordFilterState };
