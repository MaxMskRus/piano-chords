export const PIANO_SAMPLE_ROOTS = [
  21, 24, 27, 30, 33, 36, 39, 42, 45, 48,
  51, 54, 57, 60, 63, 66, 69, 72, 75, 78,
  81, 84, 87, 90, 93, 96, 99, 102, 105, 108
];

export function pianoSampleNameForMidi(midiNote) {
  const octave = Math.floor(midiNote / 12) - 1;
  const note = ((midiNote % 12) + 12) % 12;
  const names = {
    0: 'c',
    3: 'd_sharp',
    6: 'f_sharp',
    9: 'a'
  };
  const name = names[note];
  if (!name) return null;
  return `audio/piano_${name}${octave}.wav`;
}
