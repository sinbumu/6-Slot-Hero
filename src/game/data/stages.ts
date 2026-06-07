export interface StageDef {
  id: number;
  name: string;
  colorHex: number;
}

export const STAGE_DEFS: StageDef[] = [
  { id: 1, name: 'Ashen Outskirts', colorHex: 0x8f7a5a },
  { id: 2, name: 'Ember Den', colorHex: 0xc45b32 },
  { id: 3, name: 'Storm Ruins', colorHex: 0x4e83d8 },
  { id: 4, name: 'Plague Pit', colorHex: 0x4f9d55 },
  { id: 5, name: 'Six-Slot Rift', colorHex: 0xaa55ff },
];
