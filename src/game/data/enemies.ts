export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  moveSpeed: number;
  contactDamage: number;
  textureKey: string;
  rangedDamage?: number;
  rangedCooldownMs?: number;
  rangedMinDistance?: number;
  rangedMaxDistance?: number;
  projectileSpeed?: number;
}

export interface StageSpawnWeights {
  crawler: number;
  runner: number;
  brute: number;
  skirmisher: number;
}

export const ENEMY_DEFS: EnemyDef[] = [
  { id: 'crawler', name: 'Crawler', hp: 12, moveSpeed: 46, contactDamage: 4, textureKey: 'crawler_enemy' },
  { id: 'runner', name: 'Runner', hp: 10, moveSpeed: 114, contactDamage: 3, textureKey: 'runner_enemy' },
  { id: 'brute', name: 'Brute', hp: 56, moveSpeed: 34, contactDamage: 14, textureKey: 'brute_enemy' },
  {
    id: 'skirmisher',
    name: 'Skirmisher',
    hp: 8,
    moveSpeed: 44,
    contactDamage: 2,
    textureKey: 'skirmisher_enemy',
    rangedDamage: 3,
    rangedCooldownMs: 1467,
    rangedMinDistance: 104,
    rangedMaxDistance: 380,
    projectileSpeed: 118,
  },
];

const DEFAULT_SPAWN_WEIGHTS: StageSpawnWeights = {
  crawler: 15,
  runner: 30,
  brute: 35,
  skirmisher: 20,
};

export const STAGE_SPAWN_WEIGHTS: Record<number, StageSpawnWeights> = {
  1: { crawler: 70, runner: 25, brute: 5, skirmisher: 0 },
  2: { crawler: 50, runner: 35, brute: 15, skirmisher: 0 },
  3: { crawler: 30, runner: 40, brute: 20, skirmisher: 10 },
  4: { crawler: 20, runner: 35, brute: 30, skirmisher: 15 },
  5: { crawler: 15, runner: 30, brute: 35, skirmisher: 20 },
};

export const PRE_BOSS_SPAWN_WEIGHTS: StageSpawnWeights = {
  crawler: 5,
  runner: 45,
  brute: 45,
  skirmisher: 5,
};

export const ELITE_SPAWN_MIN_STAGE = 4;
export const ELITE_SPAWN_CHANCE_BY_STAGE: Record<number, number> = {
  4: 0.08,
  5: 0.12,
};
export const ELITE_HP_MULTIPLIER = 1.3;
export const ELITE_CONTACT_DAMAGE_BONUS = 1;
export const ELITE_SCALE = 1.14;

export function getStageSpawnWeights(stageId: number, preBossPressure: boolean): StageSpawnWeights {
  if (preBossPressure) {
    return PRE_BOSS_SPAWN_WEIGHTS;
  }
  return STAGE_SPAWN_WEIGHTS[stageId] ?? DEFAULT_SPAWN_WEIGHTS;
}

export function pickEnemyDefForStage(stageId: number, preBossPressure: boolean): EnemyDef {
  const weights = getStageSpawnWeights(stageId, preBossPressure);
  const entries = ENEMY_DEFS.flatMap((def) => {
    const weight = weights[def.id as keyof StageSpawnWeights] ?? 0;
    return weight > 0 ? [{ def, weight }] : [];
  });

  if (entries.length === 0) {
    return ENEMY_DEFS[0];
  }

  let roll = Math.random() * entries.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.def;
    }
  }

  return entries[entries.length - 1].def;
}

export function getEliteSpawnChance(stageId: number): number {
  return ELITE_SPAWN_CHANCE_BY_STAGE[stageId] ?? 0;
}

/** Stages 1–2 unchanged (×1). Stage 3+ mob damage multiplier on top of base formula. */
export function getStageMobDamageMultiplier(stageId: number): number {
  if (stageId <= 2) {
    return 1;
  }
  if (stageId === 3) {
    return 1.5;
  }
  if (stageId === 4) {
    return 2;
  }
  if (stageId === 5) {
    return 2.5;
  }
  return 1;
}
