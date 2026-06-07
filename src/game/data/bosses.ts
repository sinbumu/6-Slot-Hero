export type BossPatternType = 'charge' | 'aoePulse' | 'radialShot' | 'lineWave' | 'hazardZone';

export interface BossPatternDef {
  type: BossPatternType;
  cooldownMs: number;
  damage: number;
  telegraphMs: number;
  durationMs?: number;
  radiusPx?: number;
  projectileCount?: number;
  projectileSpeed?: number;
}

export interface BossDef {
  id: string;
  nameKo: string;
  stageId: number;
  hp: number;
  moveSpeed: number;
  contactDamage: number;
  colorHex: number;
  rewardTableId: string;
  patterns: BossPatternDef[];
}

export const BOSS_DEFS: BossDef[] = [
  {
    id: 'boss_1_bone_butcher',
    nameKo: '뼈 도살자',
    stageId: 1,
    hp: 250,
    moveSpeed: 48,
    contactDamage: 8,
    colorHex: 0x8f7a5a,
    rewardTableId: 'boss_reward_stage_1',
    patterns: [{ type: 'charge', cooldownMs: 4200, damage: 12, telegraphMs: 650 }],
  },
  {
    id: 'boss_2_ember_ogre',
    nameKo: '잿불 오우거',
    stageId: 2,
    hp: 500,
    moveSpeed: 52,
    contactDamage: 10,
    colorHex: 0xc45b32,
    rewardTableId: 'boss_reward_stage_2',
    patterns: [
      { type: 'charge', cooldownMs: 4500, damage: 14, telegraphMs: 650 },
      { type: 'aoePulse', cooldownMs: 5200, damage: 16, telegraphMs: 800, radiusPx: 58 },
    ],
  },
  {
    id: 'boss_3_storm_horror',
    nameKo: '폭풍 괴수',
    stageId: 3,
    hp: 900,
    moveSpeed: 56,
    contactDamage: 12,
    colorHex: 0x4e83d8,
    rewardTableId: 'boss_reward_stage_3',
    patterns: [
      { type: 'charge', cooldownMs: 4300, damage: 16, telegraphMs: 600 },
      { type: 'radialShot', cooldownMs: 4800, damage: 10, telegraphMs: 500, projectileCount: 8, projectileSpeed: 145 },
    ],
  },
  {
    id: 'boss_4_plague_colossus',
    nameKo: '역병 거상',
    stageId: 4,
    hp: 1400,
    moveSpeed: 50,
    contactDamage: 15,
    colorHex: 0x4f9d55,
    rewardTableId: 'boss_reward_stage_4',
    patterns: [
      { type: 'aoePulse', cooldownMs: 4300, damage: 20, telegraphMs: 750, radiusPx: 72 },
      { type: 'hazardZone', cooldownMs: 5200, damage: 7, telegraphMs: 650, durationMs: 2600, radiusPx: 52 },
      { type: 'lineWave', cooldownMs: 6100, damage: 18, telegraphMs: 700 },
    ],
  },
  {
    id: 'boss_5_six_slot_wraith',
    nameKo: '육슬롯 망령',
    stageId: 5,
    hp: 2200,
    moveSpeed: 60,
    contactDamage: 18,
    colorHex: 0xaa55ff,
    rewardTableId: 'boss_reward_stage_5',
    patterns: [
      { type: 'charge', cooldownMs: 3900, damage: 22, telegraphMs: 550 },
      { type: 'radialShot', cooldownMs: 4500, damage: 14, telegraphMs: 450, projectileCount: 12, projectileSpeed: 165 },
      { type: 'lineWave', cooldownMs: 5200, damage: 24, telegraphMs: 650 },
      { type: 'hazardZone', cooldownMs: 6200, damage: 8, telegraphMs: 550, durationMs: 3200, radiusPx: 58 },
    ],
  },
];
