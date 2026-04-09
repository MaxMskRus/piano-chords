const PIANO_SAMPLE_ROOTS = [
  21, 24, 27, 30, 33, 36, 39, 42, 45, 48,
  51, 54, 57, 60, 63, 66, 69, 72, 75, 78,
  81, 84, 87, 90, 93, 96, 99, 102, 105, 108
];

function pianoSampleNameForMidi(midiNote) {
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

class WebPianoEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.buffers = new Map();
    this.loadingPromise = null;
    this.activeHeld = new Map();
    this.attackTime = 0.005;
    this.releaseTime = 0.34;
    this.noteGain = 0.34;
    this.masterLevel = 0.86;
    this.isUnlocked = false;
  }

  async ensureReady() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API not supported');
      this.audioContext = new AudioCtx({ latencyHint: 'interactive' });
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterLevel;
      this.masterGain.connect(this.audioContext.destination);
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    if (!this.loadingPromise) {
      this.loadingPromise = this.loadSamples();
    }
    await this.loadingPromise;
    this.isUnlocked = true;
    return this;
  }

  async loadSamples() {
    const tasks = PIANO_SAMPLE_ROOTS.map(async (root) => {
      const url = pianoSampleNameForMidi(root);
      if (!url) return;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to load ${url}: ${response.status}`);
          return;
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
        this.buffers.set(root, audioBuffer);
      } catch (err) {
        console.warn(`Error loading sample for root ${root}:`, err);
      }
    });
    await Promise.all(tasks);
    console.log(`Loaded ${this.buffers.size} piano samples`);
  }

  nearestRoot(midiNote) {
    let best = PIANO_SAMPLE_ROOTS[0];
    let bestDistance = Math.abs(best - midiNote);
    for (const root of PIANO_SAMPLE_ROOTS) {
      const distance = Math.abs(root - midiNote);
      if (distance < bestDistance) {
        best = root;
        bestDistance = distance;
      }
    }
    return best;
  }

  createVoice(midiNote, velocity = 100) {
    if (!this.audioContext || this.audioContext.state !== 'running') return null;
    
    const root = this.nearestRoot(midiNote);
    const buffer = this.buffers.get(root);
    if (!buffer) return null;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.pow(2, (midiNote - root) / 12);

    const gainNode = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    const velocityGain = Math.max(0.18, Math.min(1, velocity / 127));
    const targetGain = this.noteGain * velocityGain;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(targetGain, now + this.attackTime);

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(now);

    const voice = { source, gainNode, midiNote, released: false };
    source.onended = () => {
      try { source.disconnect(); } catch (_) {}
      try { gainNode.disconnect(); } catch (_) {}
    };
    return voice;
  }

  noteOn(midiNote, velocity = 100) {
    if (!this.isUnlocked || !this.audioContext || this.audioContext.state !== 'running') return;
    const voice = this.createVoice(midiNote, velocity);
    if (!voice) return;
    if (!this.activeHeld.has(midiNote)) {
      this.activeHeld.set(midiNote, new Set());
    }
    this.activeHeld.get(midiNote).add(voice);
  }

  releaseVoice(voice) {
    if (!voice || voice.released || !this.audioContext) return;
    voice.released = true;
    const now = this.audioContext.currentTime;
    const current = Math.max(0.0001, voice.gainNode.gain.value);
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(current, now);
    voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + this.releaseTime);
    try {
      voice.source.stop(now + this.releaseTime + 0.05);
    } catch (_) {}
  }

  noteOff(midiNote) {
    const held = this.activeHeld.get(midiNote);
    if (!held) return;
    held.forEach((voice) => this.releaseVoice(voice));
    this.activeHeld.delete(midiNote);
  }

  syncHeldNotes(desiredNotes, velocityMap = null) {
    if (!this.isUnlocked) return;
    const desired = new Set(desiredNotes);
    for (const midiNote of Array.from(this.activeHeld.keys())) {
      if (!desired.has(midiNote)) {
        this.noteOff(midiNote);
      }
    }
    Array.from(desired).sort((a, b) => a - b).forEach((midiNote) => {
      if (!this.activeHeld.has(midiNote)) {
        const velocity = velocityMap instanceof Map ? (velocityMap.get(midiNote) || 100) : 100;
        this.noteOn(midiNote, velocity);
      }
    });
  }

  stopAll() {
    Array.from(this.activeHeld.keys()).forEach((midiNote) => this.noteOff(midiNote));
  }
  
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.ensureReady();
  }
}

window.WebPianoEngine = WebPianoEngine;
