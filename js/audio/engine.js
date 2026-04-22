import { PIANO_SAMPLE_ROOTS, pianoSampleNameForMidi } from './sample-map.js';
import { AUDIO_ENGINE_DEFAULTS, PREVIEW_AUDIO_CONFIG } from '../config/audio.js';
import { t } from '../modules/i18n.js';
class WebPianoEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.buffers = new Map();
    this.samplePromises = new Map();
    this.loadingPromise = null;
    this.activeHeld = new Map();
    this.activePreview = new Map();
    this.attackTime = AUDIO_ENGINE_DEFAULTS.attackTime;
    this.releaseTime = AUDIO_ENGINE_DEFAULTS.releaseTime;
    this.noteGain = AUDIO_ENGINE_DEFAULTS.noteGain;
    this.masterLevel = AUDIO_ENGINE_DEFAULTS.masterLevel;
    this.startOffset = AUDIO_ENGINE_DEFAULTS.startOffset;
    this.previewStartOffset = AUDIO_ENGINE_DEFAULTS.previewStartOffset;
    this.onStatus = null;
  }

  setStatusCallback(callback) {
    this.onStatus = typeof callback === 'function' ? callback : null;
  }

  emitStatus(message) {
    if (this.onStatus) {
      this.onStatus(message);
    }
  }

  async ensureContextReady() {
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
    return this;
  }

  async ensureReady() {
    await this.ensureContextReady();
    if (!this.loadingPromise) {
      this.loadingPromise = this.loadSamples();
    }
    await this.loadingPromise;
    return this;
  }

  async ensurePreviewReady(midiNotes = []) {
    await this.ensureContextReady();
    await this.ensureSamplesForNotes(midiNotes);
    return this;
  }

  async loadSample(root) {
    if (this.buffers.has(root)) return this.buffers.get(root);
    if (this.samplePromises.has(root)) return this.samplePromises.get(root);

    const promise = (async () => {
      const url = pianoSampleNameForMidi(root);
      if (!url) return null;
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      this.buffers.set(root, audioBuffer);
      return audioBuffer;
    })();

    this.samplePromises.set(root, promise);
    try {
      return await promise;
    } finally {
      this.samplePromises.delete(root);
    }
  }

  async loadSamples() {
    const total = PIANO_SAMPLE_ROOTS.length;
    const concurrency = 6;
    let completed = this.buffers.size;
    const queue = PIANO_SAMPLE_ROOTS.filter((root) => !this.buffers.has(root));
    if (completed > 0) {
      this.emitStatus(t('loadingSounds', { completed, total }));
    }
    const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
      while (queue.length > 0) {
        const root = queue.shift();
        if (root === undefined) return;
        await this.loadSample(root);
        completed += 1;
        this.emitStatus(t('loadingSounds', { completed, total }));
      }
    });
    await Promise.all(workers);
  }

  rootsForMidiNotes(midiNotes) {
    return Array.from(new Set(
      (Array.isArray(midiNotes) ? midiNotes : [])
        .filter((midiNote) => Number.isFinite(midiNote))
        .map((midiNote) => this.nearestRoot(midiNote))
    ));
  }

  async ensureSamplesForNotes(midiNotes) {
    const roots = this.rootsForMidiNotes(midiNotes);
    if (!roots.length) return;
    await Promise.all(roots.map((root) => this.loadSample(root)));
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
    return this.createVoiceWithOptions(midiNote, velocity, {});
  }

  createVoiceWithOptions(midiNote, velocity = 100, options = {}) {
    const root = this.nearestRoot(midiNote);
    const buffer = this.buffers.get(root);
    if (!buffer || !this.audioContext || !this.masterGain) return null;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.pow(2, (midiNote - root) / 12);

    const gainNode = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    const velocityGain = Math.max(0.18, Math.min(1, velocity / 127));
    const attackTime = typeof options.attackTime === 'number' ? options.attackTime : this.attackTime;
    const startOffset = Math.max(0, typeof options.startOffset === 'number' ? options.startOffset : this.startOffset);
    const targetGain = (typeof options.noteGain === 'number' ? options.noteGain : this.noteGain) * velocityGain;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(targetGain, now + attackTime);

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    const maxOffset = Math.max(0, buffer.duration - 0.02);
    source.start(now, Math.min(startOffset, maxOffset));

    const voice = { source, gainNode, midiNote, released: false };
    source.onended = () => {
      try { source.disconnect(); } catch (_) {}
      try { gainNode.disconnect(); } catch (_) {}
    };
    return voice;
  }

  noteOn(midiNote, velocity = 100) {
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

  releasePreviewVoice(voice, fadeTime = 0.04) {
    if (!voice || voice.released || !this.audioContext) return;
    voice.released = true;
    const now = this.audioContext.currentTime;
    const current = Math.max(0.0001, voice.gainNode.gain.value);
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(current, now);
    voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
    try {
      voice.source.stop(now + fadeTime + 0.02);
    } catch (_) {}
  }

  releaseAllPreviewVoices(fadeTime = 0.04) {
    this.activePreview.forEach((voices) => {
      voices.forEach((voice) => this.releasePreviewVoice(voice, fadeTime));
    });
    this.activePreview.clear();
  }

  noteOff(midiNote) {
    const held = this.activeHeld.get(midiNote);
    if (!held) return;
    held.forEach((voice) => this.releaseVoice(voice));
    this.activeHeld.delete(midiNote);
  }

  syncHeldNotes(desiredNotes, velocityMap = null) {
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

  previewChord(midiNotes, velocity = 92, options = {}) {
    if (!this.audioContext || !this.masterGain || !Array.isArray(midiNotes) || !midiNotes.length) return [];
    const holdTime = typeof options.holdTime === 'number' ? options.holdTime : PREVIEW_AUDIO_CONFIG.holdTime;
    const releaseTime = typeof options.releaseTime === 'number' ? options.releaseTime : PREVIEW_AUDIO_CONFIG.releaseTime;
    const attackTime = typeof options.attackTime === 'number' ? options.attackTime : PREVIEW_AUDIO_CONFIG.attackTime;
    const noteGain = typeof options.noteGain === 'number' ? options.noteGain : PREVIEW_AUDIO_CONFIG.noteGain;
    const retriggerFade = typeof options.retriggerFade === 'number' ? options.retriggerFade : PREVIEW_AUDIO_CONFIG.retriggerFade;
    const startOffset = typeof options.startOffset === 'number' ? options.startOffset : this.previewStartOffset;
    const previewKey = Array.from(midiNotes).join(',');
    this.releaseAllPreviewVoices(retriggerFade);
    const voices = [];
    midiNotes.forEach((midiNote) => {
      const voice = this.createVoiceWithOptions(midiNote, velocity, { attackTime, noteGain, startOffset });
      if (!voice || !this.audioContext) return;
      voices.push(voice);
    });
    this.activePreview.set(previewKey, voices);
    window.setTimeout(() => {
      const current = this.activePreview.get(previewKey);
      if (current !== voices) return;
      current.forEach((voice) => this.releasePreviewVoice(voice, releaseTime));
      window.setTimeout(() => {
        if (this.activePreview.get(previewKey) === current) {
          this.activePreview.delete(previewKey);
        }
      }, Math.ceil((releaseTime + 0.08) * 1000));
    }, Math.ceil((attackTime + holdTime) * 1000));
    return voices;
  }
}

export { WebPianoEngine };
