import { STAGE_COUNT } from './constants';
import type { SaveData } from './types';

export const SAVE_KEY = 'six_slot_hero_save_v1';

let cachedSaveData: SaveData = getDefaultSaveData();

export function getDefaultSaveData(): SaveData {
  return {
    version: 1,
    unlockedStage: 1,
    clearedStages: [],
    equipped: {},
    settings: { volume: 0.7 },
    tutorial: { stage1Seen: false },
    stats: { totalRuns: 0, totalKills: 0, bestStage: 1 },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      cachedSaveData = getDefaultSaveData();
      return cachedSaveData;
    }

    const parsed = JSON.parse(raw) as Partial<SaveData>;
    cachedSaveData = normalizeSaveData(parsed);
    return cachedSaveData;
  } catch (error) {
    console.warn('Failed to load save data. Falling back to defaults.', error);
    cachedSaveData = getDefaultSaveData();
    return cachedSaveData;
  }
}

export function getSaveData(): SaveData {
  return cachedSaveData;
}

export function setSaveData(next: SaveData): void {
  cachedSaveData = normalizeSaveData(next);
  persistSaveData(cachedSaveData);
}

export function updateSaveData(updater: (current: SaveData) => SaveData): SaveData {
  const next = normalizeSaveData(updater(cachedSaveData));
  cachedSaveData = next;
  persistSaveData(next);
  return next;
}

export function persistSaveData(data: SaveData = cachedSaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist save data.', error);
  }
}

export function resetSaveData(): SaveData {
  cachedSaveData = getDefaultSaveData();
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn('Failed to clear save data.', error);
  }
  return cachedSaveData;
}

function normalizeSaveData(input: Partial<SaveData>): SaveData {
  const defaults = getDefaultSaveData();
  return {
    version: typeof input.version === 'number' ? input.version : defaults.version,
    unlockedStage: clampStage(input.unlockedStage ?? defaults.unlockedStage),
    clearedStages: Array.isArray(input.clearedStages) ? input.clearedStages.filter(isStageNumber) : [],
    equipped: input.equipped ?? {},
    settings: {
      volume: clamp01(input.settings?.volume ?? defaults.settings.volume),
    },
    tutorial: {
      stage1Seen: typeof input.tutorial?.stage1Seen === 'boolean' ? input.tutorial.stage1Seen : false,
    },
    stats: {
      totalRuns: clampNonNegativeInteger(input.stats?.totalRuns ?? 0),
      totalKills: clampNonNegativeInteger(input.stats?.totalKills ?? 0),
      bestStage: clampStage(input.stats?.bestStage ?? 1),
    },
  };
}

function clampStage(value: number): number {
  return Math.max(1, Math.min(STAGE_COUNT, Math.floor(value)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampNonNegativeInteger(value: number): number {
  return Math.max(0, Math.floor(value));
}

function isStageNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 1 && value <= STAGE_COUNT;
}
