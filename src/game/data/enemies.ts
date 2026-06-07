export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  moveSpeed: number;
  contactDamage: number;
  textureKey: string;
}

export const ENEMY_DEFS: EnemyDef[] = [
  { id: 'crawler', name: 'Crawler', hp: 12, moveSpeed: 46, contactDamage: 4, textureKey: 'crawler_enemy' },
  { id: 'runner', name: 'Runner', hp: 10, moveSpeed: 76, contactDamage: 3, textureKey: 'runner_enemy' },
  { id: 'brute', name: 'Brute', hp: 28, moveSpeed: 34, contactDamage: 7, textureKey: 'brute_enemy' },
];
