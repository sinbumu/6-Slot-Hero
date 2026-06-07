import { getSaveData } from '../storage';

type SoundCue = 'hit' | 'chest' | 'equip' | 'boss' | 'clear' | 'fail';

const SOUND_CUES: Record<SoundCue, { frequency: number; durationMs: number; type: OscillatorType }> = {
  hit: { frequency: 180, durationMs: 55, type: 'square' },
  chest: { frequency: 620, durationMs: 120, type: 'triangle' },
  equip: { frequency: 840, durationMs: 90, type: 'sine' },
  boss: { frequency: 96, durationMs: 320, type: 'sawtooth' },
  clear: { frequency: 720, durationMs: 240, type: 'triangle' },
  fail: { frequency: 120, durationMs: 260, type: 'sawtooth' },
};

let audioContext: AudioContext | undefined;

export function playSound(cue: SoundCue): void {
  const volume = getSaveData().settings.volume;
  if (volume <= 0) {
    return;
  }

  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  audioContext ??= new AudioContextCtor();
  const context = audioContext;
  const config = SOUND_CUES[cue];
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const duration = config.durationMs / 1000;

  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(config.frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.08), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}
