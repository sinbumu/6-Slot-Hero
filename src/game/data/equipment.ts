import Phaser from 'phaser';
import type { EquipmentDef, EquipmentSlot, OptionKey, Rarity, RolledEquipment, SkillKind, Tag } from '../types';

type DefParams = Omit<EquipmentDef, 'developerNote' | 'fixedOptionCount'> & {
  developerNote?: string;
};

const option = (key: OptionKey, min: number, max: number) => ({ key, min, max });

function def(params: DefParams): EquipmentDef {
  return {
    ...params,
    developerNote: params.developerNote ?? params.playerDescription,
    fixedOptionCount: params.optionRolls.length,
  };
}

export const WEAPON_DEFS: EquipmentDef[] = [
  def({
    id: 'weapon_rusted_blade',
    nameKo: '녹슨 도살검',
    nameEn: 'Rusted Blade',
    slot: 'weapon',
    tags: ['mainAttack', 'melee', 'physical'],
    skillKind: 'slashCone',
    playerDescription: '짧은 주기로 가까운 적을 부채꼴로 베어냅니다.',
    basePower: 10,
    optionRolls: [option('baseDamageMin', 6, 10), option('baseDamageMax', 12, 18), option('cooldownMs', 500, 700), option('meleeRangeMultiplier', 1, 1.25)],
  }),
  def({
    id: 'weapon_storm_dagger',
    nameKo: '폭풍침 단검',
    nameEn: 'Storm Dagger',
    slot: 'weapon',
    tags: ['mainAttack', 'melee', 'lightning'],
    skillKind: 'lightningStrike',
    playerDescription: '가까운 적에게 빠른 번개 참격을 날리고 주변 적에게 연쇄됩니다.',
    basePower: 12,
    optionRolls: [option('baseDamageMin', 5, 8), option('baseDamageMax', 11, 16), option('cooldownMs', 420, 620), option('chainCount', 1, 2)],
  }),
  def({
    id: 'weapon_ember_wand',
    nameKo: '잿불 지팡이',
    nameEn: 'Ember Wand',
    slot: 'weapon',
    tags: ['mainAttack', 'projectile', 'fire', 'area'],
    skillKind: 'fireProjectileExplosion',
    playerDescription: '화염탄을 발사해 명중 지점에 작은 폭발을 일으킵니다.',
    basePower: 13,
    optionRolls: [option('baseDamageMin', 8, 13), option('baseDamageMax', 18, 26), option('cooldownMs', 780, 1050), option('radiusPx', 34, 48), option('projectileSpeed', 210, 270)],
  }),
  def({
    id: 'weapon_venom_chakram',
    nameKo: '맹독 차크람',
    nameEn: 'Venom Chakram',
    slot: 'weapon',
    tags: ['mainAttack', 'projectile', 'poison'],
    skillKind: 'returningPoisonProjectile',
    playerDescription: '적을 관통하고 되돌아오는 독성 원반을 던집니다.',
    basePower: 12,
    optionRolls: [option('baseDamageMin', 4, 7), option('baseDamageMax', 10, 15), option('cooldownMs', 650, 880), option('pierceCount', 2, 4), option('dotDamagePerSec', 3, 7)],
  }),
];

export const NECKLACE_DEFS: EquipmentDef[] = [
  def({
    id: 'necklace_thunder_mark',
    nameKo: '천둥의 징표',
    nameEn: 'Thunder Mark',
    slot: 'necklace',
    tags: ['supportSkill', 'lightning', 'area'],
    skillKind: 'thunderAoe',
    playerDescription: '일정 주기마다 적이 몰린 곳에 번개를 떨어뜨립니다.',
    basePower: 16,
    optionRolls: [option('baseDamageMin', 18, 26), option('baseDamageMax', 34, 48), option('cooldownMs', 4300, 5600), option('radiusPx', 42, 58), option('chainCount', 0, 1)],
  }),
  def({
    id: 'necklace_blood_guardian',
    nameKo: '피의 수호부',
    nameEn: 'Blood Guardian',
    slot: 'necklace',
    tags: ['supportSkill', 'shield', 'defense'],
    skillKind: 'shieldPulse',
    playerDescription: '일정 주기마다 보호막을 얻습니다. 시전 시 약한 충격파, 보호막이 깨질 때 강한 충격파.',
    basePower: 14,
    optionRolls: [option('shieldAmount', 18, 34), option('shieldDurationMs', 2200, 3600), option('cooldownMs', 4600, 6200), option('baseDamageMin', 6, 12), option('baseDamageMax', 14, 24)],
  }),
  def({
    id: 'necklace_frost_loop',
    nameKo: '서리 고리 부적',
    nameEn: 'Frost Loop',
    slot: 'necklace',
    tags: ['supportSkill', 'ice', 'area'],
    skillKind: 'frostPulse',
    playerDescription: '일정 주기마다 주변 적에게 냉기 파동을 일으켜 느리게 만듭니다.',
    basePower: 13,
    optionRolls: [option('baseDamageMin', 10, 17), option('baseDamageMax', 22, 32), option('cooldownMs', 4300, 5900), option('radiusPx', 58, 78), option('slowPercent', 0.25, 0.45)],
  }),
  def({
    id: 'necklace_plague_heart',
    nameKo: '역병 심장 목걸이',
    nameEn: 'Plague Heart',
    slot: 'necklace',
    tags: ['supportSkill', 'poison', 'area'],
    skillKind: 'poisonPool',
    playerDescription: '일정 주기마다 독 장판을 생성해 안의 적에게 지속 피해를 줍니다.',
    basePower: 15,
    optionRolls: [option('dotDamagePerSec', 6, 11), option('dotDurationMs', 2800, 4200), option('cooldownMs', 4700, 6500), option('radiusPx', 44, 64), option('slowPercent', 0.05, 0.16)],
  }),
];

export const HELMET_DEFS: EquipmentDef[] = [
  makePassive('helmet_ember_crown', '잿불투구', 'Ember Crown', 'helmet', ['fire', 'area'], '화염 스킬의 피해와 폭발 범위가 증가합니다.', 11, [
    option('fireDamageMultiplier', 1.12, 1.35),
    option('areaRadiusMultiplier', 1.08, 1.28),
  ]),
  makePassive('helmet_storm_crown', '폭풍관', 'Storm Crown', 'helmet', ['lightning'], '번개 스킬의 피해와 연쇄 성능이 증가합니다.', 11, [
    option('lightningDamageMultiplier', 1.1, 1.32),
    option('chainCount', 0, 1),
    option('critChance', 0.03, 0.08),
  ]),
  makePassive('helmet_plague_mask', '역병 가면', 'Plague Mask', 'helmet', ['poison'], '독 피해와 독 지속 시간이 증가합니다.', 11, [
    option('poisonDamageMultiplier', 1.12, 1.34),
    option('dotDurationMs', 300, 900),
    option('areaRadiusMultiplier', 1, 1.18),
  ]),
  makePassive('helmet_reach_visor', '도살자의 시야', 'Butcher Visor', 'helmet', ['melee', 'physical'], '근접/물리 공격의 범위와 피해가 증가합니다.', 10, [
    option('physicalDamageMultiplier', 1.1, 1.28),
    option('meleeRangeMultiplier', 1.08, 1.3),
    option('critDamageMultiplier', 1.05, 1.2),
  ]),
];

export const GLOVES_DEFS: EquipmentDef[] = [
  makePassive('gloves_swift', '신속의 장갑', 'Swift Gloves', 'gloves', ['mainAttack'], '주 공격이 더 자주 발동합니다.', 10, [
    option('mainCooldownMultiplier', 0.72, 0.9),
    option('mainDamageMultiplier', 0.92, 1.05),
    option('critChance', 0.02, 0.06),
  ]),
  makePassive('gloves_overcharge', '과충전 건틀릿', 'Overcharge Gauntlets', 'gloves', ['mainAttack'], '주 공격이 느려지지만 훨씬 강해집니다.', 12, [
    option('mainCooldownMultiplier', 1.18, 1.45),
    option('mainDamageMultiplier', 1.45, 2.05),
    option('areaRadiusMultiplier', 1, 1.18),
  ]),
  makePassive('gloves_echo', '반향 장갑', 'Echo Gloves', 'gloves', ['mainAttack'], '일정 확률로 주 공격이 한 번 더 발동합니다.', 12, [
    option('echoChance', 0.12, 0.28),
    option('echoDamageMultiplier', 0.45, 0.75),
    option('mainCooldownMultiplier', 0.95, 1.08),
  ]),
  makePassive('gloves_ritual', '의식 장갑', 'Ritual Gloves', 'gloves', ['supportSkill'], '목걸이 보조 스킬이 더 자주 발동합니다.', 10, [
    option('supportCooldownMultiplier', 0.7, 0.88),
    option('supportDamageMultiplier', 0.95, 1.15),
    option('shieldAmount', 0, 8),
  ]),
];

export const ARMOR_DEFS: EquipmentDef[] = [
  makePassive('armor_iron_shell', '무쇠 껍질 갑옷', 'Iron Shell', 'armor', ['defense'], '최대 체력과 피해 감소가 증가합니다.', 12, [
    option('maxHpBonus', 20, 45),
    option('damageReductionPercent', 0.04, 0.12),
    option('armorAmplifyMultiplier', 1, 1.12),
    option('bossDamageMultiplier', 1, 1.08),
  ]),
  makePassive('armor_regen_hide', '재생 가죽 갑옷', 'Regen Hide', 'armor', ['defense'], '초당 체력을 회복하고 최대 체력이 증가합니다.', 11, [
    option('maxHpBonus', 12, 30),
    option('hpRegenPerSec', 0.8, 2.2),
    option('damageReductionPercent', 0, 0.06),
    option('armorAmplifyMultiplier', 1, 1.1),
  ]),
  makePassive('armor_blood_plate', '혈철 갑옷', 'Blood Plate', 'armor', ['defense', 'lifesteal'], '피해를 줄 때 체력을 조금 회복합니다.', 12, [
    option('maxHpBonus', 10, 26),
    option('lifestealPercent', 0.015, 0.045),
    option('damageReductionPercent', 0.02, 0.08),
    option('armorAmplifyMultiplier', 1.02, 1.16),
  ]),
  makePassive('armor_amplifier_mail', '증폭 사슬갑옷', 'Amplifier Mail', 'armor', ['defense'], '생존력을 얻고 다른 장비 패시브 배율을 전체적으로 증폭합니다.', 13, [
    option('maxHpBonus', 8, 24),
    option('damageReductionPercent', 0.02, 0.08),
    option('armorAmplifyMultiplier', 1.15, 1.35),
    option('supportDamageMultiplier', 1, 1.14),
  ]),
];

export const BELT_DEFS: EquipmentDef[] = [
  makePassive('belt_fire_fuse', '잿불 도화선', 'Fire Fuse', 'belt', ['fire', 'area'], '화염 스킬의 폭발과 피해가 강화됩니다.', 14, [
    option('fireDamageMultiplier', 1.18, 1.45),
    option('areaRadiusMultiplier', 1.1, 1.32),
    option('baseDamageMin', 1, 4),
    option('baseDamageMax', 4, 9),
  ]),
  makePassive('belt_storm_chain', '번개 사슬 허리띠', 'Storm Chain', 'belt', ['lightning'], '번개 스킬의 연쇄와 피해가 강화됩니다.', 14, [
    option('lightningDamageMultiplier', 1.18, 1.42),
    option('chainCount', 1, 2),
    option('critChance', 0.04, 0.1),
    option('baseDamageMax', 2, 8),
  ]),
  makePassive('belt_venom_loop', '맹독 순환끈', 'Venom Loop', 'belt', ['poison'], '독 피해와 독 지속 시간이 강화됩니다.', 14, [
    option('poisonDamageMultiplier', 1.2, 1.5),
    option('dotDurationMs', 500, 1500),
    option('dotDamagePerSec', 1, 4),
    option('areaRadiusMultiplier', 1, 1.18),
  ]),
  makePassive('belt_frost_clamp', '서리 고정대', 'Frost Clamp', 'belt', ['ice'], '냉기 스킬의 감속과 피해가 강화됩니다.', 13, [
    option('iceDamageMultiplier', 1.15, 1.38),
    option('slowPercent', 0.08, 0.2),
    option('slowDurationMs', 500, 1200),
    option('areaRadiusMultiplier', 1.05, 1.22),
  ]),
  makePassive('belt_blade_circuit', '칼날 순환띠', 'Blade Circuit', 'belt', ['melee', 'physical', 'orbit'], '근접/물리 공격의 범위와 타격 리듬이 강화됩니다.', 13, [
    option('physicalDamageMultiplier', 1.15, 1.38),
    option('meleeRangeMultiplier', 1.1, 1.3),
    option('orbitTickRateMultiplier', 0.82, 1),
    option('critDamageMultiplier', 1.05, 1.25),
  ]),
  makePassive('belt_guardian_knot', '수호자 매듭', 'Guardian Knot', 'belt', ['defense', 'shield', 'lifesteal'], '보호막, 피해 감소, 흡혈 계열 생존 효과가 강화됩니다.', 13, [
    option('shieldAmount', 8, 22),
    option('damageReductionPercent', 0.02, 0.08),
    option('lifestealPercent', 0.005, 0.02),
    option('maxHpBonus', 8, 24),
  ]),
];

export const EQUIPMENT_DEFS: EquipmentDef[] = [
  ...WEAPON_DEFS,
  ...NECKLACE_DEFS,
  ...HELMET_DEFS,
  ...GLOVES_DEFS,
  ...ARMOR_DEFS,
  ...BELT_DEFS,
];

export function rollEquipment(definition: EquipmentDef, params: { stageId: number; rarity: Rarity }): RolledEquipment {
  const stageMultiplier = getStageStatMultiplier(params.stageId);
  const rarityMultiplier = getRarityStatMultiplier(params.rarity);
  const rolledOptions: RolledEquipment['rolledOptions'] = {};

  for (const roll of definition.optionRolls) {
    const raw = Phaser.Math.FloatBetween(roll.min, roll.max);
    rolledOptions[roll.key] = normalizeRolledOption(roll.key, raw, stageMultiplier, rarityMultiplier);
  }

  if (
    typeof rolledOptions.baseDamageMin === 'number' &&
    typeof rolledOptions.baseDamageMax === 'number' &&
    rolledOptions.baseDamageMin > rolledOptions.baseDamageMax
  ) {
    rolledOptions.baseDamageMax = rolledOptions.baseDamageMin;
  }

  return {
    ...definition,
    instanceId: createInstanceId(definition.id),
    stageFound: params.stageId,
    rarity: params.rarity,
    upgradeLevel: 0,
    rolledOptions,
  };
}

export function generateRewardOptions(params: {
  stageId: number;
  context: 'normalChest' | 'focusedChest' | 'bossReward';
  focusSlot?: EquipmentSlot;
}): RolledEquipment[] {
  const options: RolledEquipment[] = [];
  const requiredRarity = params.context === 'normalChest' ? undefined : getBestRarityForStage(params.stageId);

  for (let index = 0; index < 3; index += 1) {
    const candidates = params.focusSlot ? EQUIPMENT_DEFS.filter((item) => item.slot === params.focusSlot) : EQUIPMENT_DEFS;
    const definition = Phaser.Utils.Array.GetRandom(candidates);
    const rarity = index === 0 && requiredRarity ? requiredRarity : rollRarityForStage(params.stageId, params.context);
    options.push(rollEquipment(definition, { stageId: params.stageId, rarity }));
  }

  return Phaser.Utils.Array.Shuffle(options);
}

export function getRarityLabel(rarity: Rarity): string {
  const labels: Record<Rarity, string> = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    relic: 'Relic',
    bossUnique: 'Boss Unique',
  };
  return labels[rarity];
}

function makePassive(
  id: string,
  nameKo: string,
  nameEn: string,
  slot: EquipmentSlot,
  tags: Tag[],
  playerDescription: string,
  basePower: number,
  optionRolls: EquipmentDef['optionRolls'],
): EquipmentDef {
  return def({
    id,
    nameKo,
    nameEn,
    slot,
    tags,
    skillKind: 'passiveModifier' satisfies SkillKind,
    playerDescription,
    basePower,
    optionRolls,
  });
}

function rollRarityForStage(stageId: number, context: 'normalChest' | 'focusedChest' | 'bossReward'): Rarity {
  if (context === 'focusedChest' || context === 'bossReward') {
    return Math.random() < 0.4 ? getBestRarityForStage(stageId) : rollRarityForStage(stageId, 'normalChest');
  }

  const roll = Math.random();
  if (stageId === 1) {
    return roll < 0.75 ? 'common' : 'rare';
  }
  if (stageId === 2) {
    return roll < 0.55 ? 'common' : roll < 0.9 ? 'rare' : 'epic';
  }
  if (stageId === 3) {
    return roll < 0.62 ? 'rare' : 'epic';
  }
  if (stageId === 4) {
    return roll < 0.48 ? 'rare' : roll < 0.9 ? 'epic' : 'relic';
  }
  return roll < 0.65 ? 'epic' : 'relic';
}

function getBestRarityForStage(stageId: number): Rarity {
  if (stageId <= 1) {
    return 'rare';
  }
  if (stageId <= 3) {
    return 'epic';
  }
  return 'relic';
}

function getStageStatMultiplier(stageId: number): number {
  return 1 + (stageId - 1) * 0.12;
}

function getRarityStatMultiplier(rarity: Rarity): number {
  const multipliers: Record<Rarity, number> = {
    common: 1,
    rare: 1.18,
    epic: 1.42,
    relic: 1.72,
    bossUnique: 1.95,
  };
  return multipliers[rarity];
}

function normalizeRolledOption(key: OptionKey, raw: number, stageMultiplier: number, rarityMultiplier: number): number {
  if (isMultiplierOption(key) || key === 'cooldownMs') {
    return roundOption(raw);
  }
  if (key === 'critChance' || key === 'echoChance' || key === 'slowPercent' || key === 'damageReductionPercent' || key === 'lifestealPercent') {
    return roundOption(raw);
  }
  return roundOption(raw * stageMultiplier * rarityMultiplier);
}

function isMultiplierOption(key: OptionKey): boolean {
  return key.endsWith('Multiplier');
}

function roundOption(value: number): number {
  return Math.round(value * 100) / 100;
}

function createInstanceId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
