const state = {
  selected: [],
  language: 'ru',
  isColorMode: true,
  isPianoMode: true,
  isMidiFreePlay: true,
  globalMode: 0,
  lastGlobalAction: 'mode0',
  openGroups: new Set(),
  lastSearchLen: 0,
  midiMatchedIndices: new Set(),
  midiPreviewChords: [],
  midiPreviewMetrics: {},
  chordFilter: 'all',
};

const songTextState = {
  title: '',
  rawText: '',
  occurrences: [],
  softMode: false,
  viewMode: 'piano',
  lastAddedSignature: null,
};

const midiState = {
  access: null,
  initialized: false,
  supported: typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function',
  connecting: false,
  permissionDenied: false,
  lastError: '',
  heldNotes: new Set(),
  velocities: new Map(),
  evaluationTimer: null,
  audioEngine: null,
  audioUnlocked: false,
};

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

export { state, songTextState, midiState, drag };
