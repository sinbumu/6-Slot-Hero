import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SLOT_ICONS, SLOT_LABELS } from '../constants';
import { getSaveData } from '../storage';
import { playSound } from '../systems/SoundSystem';
import type { EquipmentSlot, RunResult } from '../types';

const EQUIPMENT_SLOTS = Object.keys(SLOT_LABELS) as EquipmentSlot[];

export class ResultScene extends Phaser.Scene {
  private result: RunResult = {
    stageId: 1,
    cleared: false,
    survivedMs: 0,
    kills: 0,
    equippedCount: 0,
  };

  constructor() {
    super('ResultScene');
  }

  init(data: Partial<RunResult>): void {
    this.result = {
      stageId: data.stageId ?? 1,
      cleared: data.cleared ?? false,
      survivedMs: data.survivedMs ?? 0,
      kills: data.kills ?? 0,
      equippedCount: data.equippedCount ?? 0,
    };
  }

  create(): void {
    const save = getSaveData();
    playSound(this.result.cleared ? 'clear' : 'fail');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f0d15).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 82, this.result.cleared ? 'Stage Clear' : 'Run Failed', {
      fontSize: '32px',
      color: this.result.cleared ? '#f8ddb0' : '#ff9d9d',
    }).setOrigin(0.5);

    const summary = [
      `Stage: ${this.result.stageId}`,
      `Survived: ${Math.round(this.result.survivedMs / 1000)}s`,
      `Kills: ${this.result.kills}`,
      `Equipped Count: ${this.result.equippedCount}`,
    ];

    this.add.text(54, 146, summary.join('\n'), {
      fontSize: '17px',
      color: '#ffffff',
      lineSpacing: 12,
    });

    const equipmentSummary = EQUIPMENT_SLOTS.map((slot) => `${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}: ${save.equipped[slot]?.nameKo ?? 'Empty'}`);
    this.add.text(54, 278, ['Current Equipment', ...equipmentSummary].join('\n'), {
      fontSize: '13px',
      color: '#cfc4b2',
      lineSpacing: 7,
    });

    this.createButton(GAME_WIDTH / 2, 526, 'Retry Stage', () => {
      this.scene.start('GameScene', { stageId: this.result.stageId });
    });
    this.createButton(GAME_WIDTH / 2, 574, 'Stage Select', () => {
      this.scene.start('StageSelectScene');
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 176, 34, 0x26314a)
      .setStrokeStyle(2, 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '15px',
      color: '#ffffff',
    }).setOrigin(0.5);
    button.on('pointerdown', onClick);
  }
}
