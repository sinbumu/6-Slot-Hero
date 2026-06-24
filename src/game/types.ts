export type EquipmentSlot = 'weapon' | 'necklace' | 'helmet' | 'gloves' | 'armor' | 'belt';

export type Rarity = 'common' | 'rare' | 'epic' | 'relic' | 'bossUnique';

export type Tag =
  | 'mainAttack'
  | 'supportSkill'
  | 'melee'
  | 'projectile'
  | 'orbit'
  | 'area'
  | 'physical'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'poison'
  | 'defense'
  | 'shield'
  | 'lifesteal';

export type OptionKey =
  | 'baseDamageMin'
  | 'baseDamageMax'
  | 'cooldownMs'
  | 'rangePx'
  | 'radiusPx'
  | 'projectileSpeed'
  | 'pierceCount'
  | 'chainCount'
  | 'dotDamagePerSec'
  | 'dotDurationMs'
  | 'slowPercent'
  | 'slowDurationMs'
  | 'shieldAmount'
  | 'shieldDurationMs'
  | 'maxHpBonus'
  | 'hpRegenPerSec'
  | 'damageReductionPercent'
  | 'lifestealPercent'
  | 'mainDamageMultiplier'
  | 'supportDamageMultiplier'
  | 'fireDamageMultiplier'
  | 'iceDamageMultiplier'
  | 'lightningDamageMultiplier'
  | 'poisonDamageMultiplier'
  | 'physicalDamageMultiplier'
  | 'mainCooldownMultiplier'
  | 'supportCooldownMultiplier'
  | 'areaRadiusMultiplier'
  | 'projectileSpeedMultiplier'
  | 'meleeRangeMultiplier'
  | 'orbitTickRateMultiplier'
  | 'echoChance'
  | 'echoDamageMultiplier'
  | 'critChance'
  | 'critDamageMultiplier'
  | 'armorAmplifyMultiplier'
  | 'bossDamageMultiplier';

export interface EquipmentOptionRoll {
  key: OptionKey;
  min: number;
  max: number;
}

export type SkillKind =
  | 'bareFist'
  | 'slashCone'
  | 'lightningStrike'
  | 'fireProjectileExplosion'
  | 'returningPoisonProjectile'
  | 'thunderAoe'
  | 'shieldPulse'
  | 'frostPulse'
  | 'poisonPool'
  | 'passiveModifier';

export interface EquipmentDef {
  id: string;
  nameKo: string;
  nameEn: string;
  slot: EquipmentSlot;
  tags: Tag[];
  skillKind: SkillKind;
  playerDescription: string;
  developerNote: string;
  basePower: number;
  fixedOptionCount: number;
  optionRolls: EquipmentOptionRoll[];
}

export interface RolledEquipment extends EquipmentDef {
  instanceId: string;
  stageFound: number;
  rarity: Rarity;
  upgradeLevel?: number;
  rolledOptions: Partial<Record<OptionKey, number>>;
}

export interface RandomUpgradeReward {
  kind: 'randomUpgrade';
  slot: EquipmentSlot;
  currentItem: RolledEquipment;
  upgradedItem: RolledEquipment;
}

export type RewardOption =
  | { kind: 'equipment'; item: RolledEquipment }
  | RandomUpgradeReward;

export interface SaveData {
  version: number;
  unlockedStage: number;
  clearedStages: number[];
  equipped: Partial<Record<EquipmentSlot, RolledEquipment>>;
  settings: {
    volume: number;
  };
  tutorial: {
    introSeen: boolean;
    stage1Seen: boolean;
    firstRewardSeen: boolean;
    firstEquipSeen: boolean;
    seenStageIntros: number[];
    endingSeen: boolean;
  };
  stats: {
    totalRuns: number;
    totalKills: number;
    bestStage: number;
  };
}

export interface RunResult {
  stageId: number;
  cleared: boolean;
  survivedMs: number;
  kills: number;
  equippedCount: number;
}
