import type Phaser from 'phaser';
import { getSaveData } from '../storage';

export type SoundCue =
  | 'hit'
  | 'chest'
  | 'equip'
  | 'boss'
  | 'clear'
  | 'fail'
  | 'ui_click'
  | 'ui_select'
  | 'weapon_melee'
  | 'weapon_fire'
  | 'weapon_lightning'
  | 'weapon_orbit'
  | 'necklace_thunder'
  | 'necklace_shield'
  | 'necklace_poison'
  | 'necklace_meteor';

export type BgmCue = 'main_title' | 'stage_select' | `stage_${1 | 2 | 3 | 4 | 5}`;

const SOUND_CUES: Record<SoundCue, { frequency: number; durationMs: number; type: OscillatorType }> = {
  hit: { frequency: 180, durationMs: 55, type: 'square' },
  chest: { frequency: 620, durationMs: 120, type: 'triangle' },
  equip: { frequency: 840, durationMs: 90, type: 'sine' },
  boss: { frequency: 96, durationMs: 320, type: 'sawtooth' },
  clear: { frequency: 720, durationMs: 240, type: 'triangle' },
  fail: { frequency: 120, durationMs: 260, type: 'sawtooth' },
  ui_click: { frequency: 520, durationMs: 45, type: 'square' },
  ui_select: { frequency: 740, durationMs: 70, type: 'triangle' },
  weapon_melee: { frequency: 360, durationMs: 60, type: 'sawtooth' },
  weapon_fire: { frequency: 220, durationMs: 140, type: 'sawtooth' },
  weapon_lightning: { frequency: 960, durationMs: 110, type: 'square' },
  weapon_orbit: { frequency: 460, durationMs: 80, type: 'triangle' },
  necklace_thunder: { frequency: 820, durationMs: 180, type: 'square' },
  necklace_shield: { frequency: 680, durationMs: 200, type: 'sine' },
  necklace_poison: { frequency: 250, durationMs: 130, type: 'triangle' },
  necklace_meteor: { frequency: 120, durationMs: 220, type: 'sawtooth' },
};

const AUDIO_BASE_PATH = '/assets/audio';

const BGM_FILES: Record<BgmCue, string> = {
  main_title: 'ebunny-mystical-fantasy-loop-366827.mp3',
  stage_select: 'TownTheme.mp3',
  stage_1: 'battleThemeA.mp3',
  stage_2: 'battleThemeA.mp3',
  stage_3: 'Battle.mp3',
  stage_4: 'Battle.mp3',
  stage_5: 'bosstheme_WO_low.mp3',
};

const SFX_FILES: Partial<Record<SoundCue, string>> = {
  ui_click: 'click1.ogg',
  ui_select: 'metalClick.ogg',
  chest: 'dropLeather.ogg',
  equip: 'metalClick.ogg',
  weapon_melee: 'knifeSlice.ogg',
  weapon_fire: 'yodguard-fire-magic-3-378640.mp3',
  weapon_lightning: 'yodguard-lightning-magic-1-378645.mp3',
  weapon_orbit: 'metalPot1.ogg',
  necklace_thunder: 'dragon-studio-lightning-spell-386163.mp3',
  necklace_shield: 'coghezzi-holy-healing-spell-533279.mp3',
  necklace_poison: 'yodguard-potion-drink-3-540167.mp3',
  necklace_meteor: 'freesound_community-supernatural-explosion-104295.mp3',
  boss: 'freesound_community-supernatural-explosion-104295.mp3',
  clear: 'coghezzi-holy-healing-spell-533279.mp3',
};

const bgmKey = (cue: BgmCue) => `bgm_${cue}`;
const sfxKey = (cue: SoundCue) => `sfx_${cue}`;

let audioContext: AudioContext | undefined;
let currentBgmKey: string | undefined;
let currentBgm: Phaser.Sound.BaseSound | undefined;

export function loadAudioAssets(scene: Phaser.Scene): void {
  for (const [cue, file] of Object.entries(BGM_FILES) as Array<[BgmCue, string]>) {
    scene.load.audio(bgmKey(cue), `${AUDIO_BASE_PATH}/${file}`);
  }
  for (const [cue, file] of Object.entries(SFX_FILES) as Array<[SoundCue, string]>) {
    scene.load.audio(sfxKey(cue), `${AUDIO_BASE_PATH}/${file}`);
  }
}

export function playBgm(scene: Phaser.Scene, cue: BgmCue): void {
  const key = bgmKey(cue);
  applySceneVolume(scene);
  if (currentBgmKey === key && currentBgm?.isPlaying) {
    return;
  }
  stopBgm();
  if (!scene.cache.audio.exists(key) || getSaveData().settings.volume <= 0) {
    currentBgmKey = key;
    return;
  }
  currentBgmKey = key;
  currentBgm = scene.sound.add(key, {
    loop: true,
    volume: getBgmVolume(),
  });
  currentBgm.play();
}

export function stopBgm(): void {
  currentBgm?.stop();
  currentBgm?.destroy();
  currentBgm = undefined;
}

export function applySceneVolume(scene: Phaser.Scene): void {
  const volume = getSaveData().settings.volume;
  scene.sound.setVolume(volume);
  if (volume <= 0) {
    stopBgm();
    return;
  }
}

export function playSound(cue: SoundCue, scene?: Phaser.Scene): void {
  const volume = getSaveData().settings.volume;
  if (volume <= 0) {
    return;
  }
  if (scene && playLoadedSound(scene, cue)) {
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

function playLoadedSound(scene: Phaser.Scene, cue: SoundCue): boolean {
  const key = sfxKey(cue);
  if (!scene.cache.audio.exists(key)) {
    return false;
  }
  scene.sound.play(key, {
    volume: getSfxVolume(cue),
  });
  return true;
}

function getBgmVolume(): number {
  return getSaveData().settings.volume * 0.42;
}

function getSfxVolume(cue: SoundCue): number {
  const baseVolume = getSaveData().settings.volume;
  if (cue === 'boss' || cue === 'necklace_meteor') {
    return baseVolume * 0.34;
  }
  if (cue === 'weapon_fire' || cue === 'weapon_lightning' || cue === 'necklace_thunder') {
    return baseVolume * 0.46;
  }
  return baseVolume * 0.58;
}
