export const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const FLAT_MAP = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};
export const ROMAN_NUMERAL_RE = /^(I|II|III|IV|V|VI|VII)$/;
export const STOP_WORDS = new Set([
  "THE","AND","IT","IS","NOT","ARE","YOU","ME","WE","HE","SHE","THEY",
  "MY","YOUR","OUR","HIS","HER","THEIR","THIS","THAT","THESE","THOSE",
  "OF","TO","IN","ON","FOR","WITH","FROM","AS","AT","BE","WAS","WERE",
  "BUT","OR","IF","THEN","SO","NO","YES"
]);
export const CHORD_SUFFIXES = [
  "mMaj7","maj7","maj9","maj","m7b5","dim7","dim","aug","sus2","sus4","sus",
  "add13","add11","add9","m11","m9","m7","m6","m",
  "7b5","7#5","7b9","7#9","6/9","13","11","9","7","6","5"
];
export const GROUP_ORDER = [
  "C","C#","D","D#","Db","E","Eb","F","F#","G","G#","Gb","A","A#","Ab","B","Bb"
];
export const NOTE_DISPLAY_NAMES = {
  ru: {
    "C":"До","C#":"До Диез","D":"Ре","D#":"Ре Диез","Db":"Ре Бемоль",
    "E":"Ми","Eb":"Ми Бемоль","F":"Фа","F#":"Фа Диез",
    "G":"Соль","G#":"Соль Диез","Gb":"Соль Бемоль",
    "A":"Ля","A#":"Ля Диез","Ab":"Ля Бемоль",
    "B":"Си","Bb":"Си Бемоль"
  },
  en: {
    "C":"Do","C#":"Do sharp","D":"Re","D#":"Re sharp","Db":"Re flat",
    "E":"Mi","Eb":"Mi flat","F":"Fa","F#":"Fa sharp",
    "G":"Sol","G#":"Sol sharp","Gb":"Sol flat",
    "A":"La","A#":"La sharp","Ab":"La flat",
    "B":"Si","Bb":"Si flat"
  }
};
export const RUS_NAMES = NOTE_DISPLAY_NAMES.ru;
export const CHORD_TYPE_DISPLAY_NAMES = {
  ru: {
    "": "мажор",
    "maj": "мажор",
    "m": "минор",
    "dim": "уменьшённый",
    "aug": "увеличенный",
    "sus": "sus",
    "sus2": "sus2",
    "sus4": "sus4",
    "add9": "с добавленной ноной",
    "add11": "с добавленной ундецимой",
    "add13": "с добавленной терцдецимой",
    "5": "квинтаккорд",
    "6": "секстаккорд",
    "m6": "минорный секстаккорд",
    "6/9": "секстаккорд с ноной",
    "7": "доминантсептаккорд",
    "m7": "минорный септаккорд",
    "maj7": "мажорный септаккорд",
    "mMaj7": "минорный мажорный септаккорд",
    "dim7": "уменьшённый септаккорд",
    "m7b5": "полууменьшённый септаккорд",
    "7b5": "доминантсептаккорд с пониженной квинтой",
    "7#5": "доминантсептаккорд с повышенной квинтой",
    "7b9": "доминантсептаккорд с пониженной ноной",
    "7#9": "доминантсептаккорд с повышенной ноной",
    "9": "нонаккорд",
    "m9": "минорный нонаккорд",
    "maj9": "мажорный нонаккорд",
    "11": "ундецимаккорд",
    "m11": "минорный ундецимаккорд",
    "13": "терцдецимаккорд"
  },
  en: {
    "": "major",
    "maj": "major",
    "m": "minor",
    "dim": "diminished",
    "aug": "augmented",
    "sus": "suspended",
    "sus2": "sus2",
    "sus4": "sus4",
    "add9": "add ninth",
    "add11": "add eleventh",
    "add13": "add thirteenth",
    "5": "power chord",
    "6": "sixth chord",
    "m6": "minor sixth chord",
    "6/9": "sixth add ninth chord",
    "7": "dominant seventh chord",
    "m7": "minor seventh chord",
    "maj7": "major seventh chord",
    "mMaj7": "minor major seventh chord",
    "dim7": "diminished seventh chord",
    "m7b5": "half-diminished seventh chord",
    "7b5": "dominant seventh flat five chord",
    "7#5": "dominant seventh sharp five chord",
    "7b9": "dominant seventh flat nine chord",
    "7#9": "dominant seventh sharp nine chord",
    "9": "ninth chord",
    "m9": "minor ninth chord",
    "maj9": "major ninth chord",
    "11": "eleventh chord",
    "m11": "minor eleventh chord",
    "13": "thirteenth chord"
  }
};
export const CHORD_TYPE_NAMES = CHORD_TYPE_DISPLAY_NAMES.ru;

export const STORAGE_KEYS = Object.freeze({
  LAST_CHORDS: 'lastChords',
  LAST_GLOBAL_MODE: 'lastGlobalMode',
  MIDI_FREE_PLAY: 'midiFreePlay',
  SONGS: 'songs',
  LANGUAGE: 'uiLanguage'
});
