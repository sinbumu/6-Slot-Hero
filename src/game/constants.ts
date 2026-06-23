import type { OptionKey } from './types';

export const RENDER_SCALE = 3;
export const BASE_WIDTH = 360;
export const BASE_HEIGHT = 640;
export const GAME_WIDTH = BASE_WIDTH * RENDER_SCALE;
export const GAME_HEIGHT = BASE_HEIGHT * RENDER_SCALE;

/** Scale spatial values (coordinates, sizes, radii, px/s). */
export const s = (value: number): number => value * RENDER_SCALE;

/** Phaser text fontSize helper. */
export const sf = (px: number): string => `${s(px)}px`;

const SPATIAL_OPTION_KEYS = new Set<OptionKey>(['rangePx', 'radiusPx', 'projectileSpeed']);

export function scaleOptionValue(key: OptionKey, value: number): number {
  return SPATIAL_OPTION_KEYS.has(key) ? s(value) : value;
}

export const STAGE_COUNT = 5;

export const SLOT_LABELS = {
  weapon: 'Weapon',
  necklace: 'Necklace',
  helmet: 'Helmet',
  gloves: 'Gloves',
  armor: 'Armor',
  belt: 'Belt',
} as const;

export const SLOT_ICONS = {
  weapon: '⚔',
  necklace: '📿',
  helmet: '⛑',
  gloves: '🧤',
  armor: '🛡',
  belt: '🧷',
} as const;
