export const FILTER_SUFFIXES = {
  major: new Set(['', 'maj', '5', '6', '6/9', 'add9', 'add11', 'add13', 'aug']),
  minor: new Set(['m', 'm6', 'mMaj7']),
  dominant: new Set(['7', '9', '11', '13', '7b5', '7#5', '7b9', '7#9']),
  maj7: new Set(['maj7', 'maj9']),
  m7: new Set(['m7', 'm9', 'm11']),
  sus: new Set(['sus2', 'sus4', 'sus']),
  dim: new Set(['dim', 'dim7', 'm7b5'])
};
