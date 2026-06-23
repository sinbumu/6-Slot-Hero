import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SLOT_ICONS, SLOT_LABELS, s, sf } from '../constants';
import { getSaveData } from '../storage';
import { KeyboardMenuNavigator, type KeyboardMenuItem } from '../systems/KeyboardMenuNavigator';
import { playBgm, playSound } from '../systems/SoundSystem';
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

  private readonly keyboardMenu = new KeyboardMenuNavigator(this);

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
    playBgm(this, 'stage_select');
    playSound(this.result.cleared ? 'clear' : 'fail', this);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f0d15).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, s(82), this.result.cleared ? 'Stage Clear' : 'Run Failed', {
      fontSize: sf(32),
      color: this.result.cleared ? '#f8ddb0' : '#ff9d9d',
    }).setOrigin(0.5);

    const summary = [
      `Stage: ${this.result.stageId}`,
      `Survived: ${Math.round(this.result.survivedMs / 1000)}s`,
      `Kills: ${this.result.kills}`,
      `Equipped Count: ${this.result.equippedCount}`,
    ];

    this.add.text(s(54), s(146), summary.join('\n'), {
      fontSize: sf(17),
      color: '#ffffff',
      lineSpacing: s(12),
    });

    const equipmentSummary = EQUIPMENT_SLOTS.map((slot) => `${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}: ${save.equipped[slot]?.nameKo ?? 'Empty'}`);
    this.add.text(s(54), s(278), ['Current Equipment', ...equipmentSummary].join('\n'), {
      fontSize: sf(13),
      color: '#cfc4b2',
      lineSpacing: s(7),
    });

    const menuItems: KeyboardMenuItem[] = [];
    menuItems.push(this.createButton(GAME_WIDTH / 2, s(526), 'Retry Stage', () => {
      playSound('ui_select', this);
      this.scene.start('GameScene', { stageId: this.result.stageId });
    }));
    menuItems.push(this.createButton(GAME_WIDTH / 2, s(574), 'Stage Select', () => {
      playSound('ui_click', this);
      this.scene.start('StageSelectScene');
    }));
    this.keyboardMenu.bind(menuItems, 1);

    this.add.text(GAME_WIDTH / 2, s(618), 'W/S · Enter · Click', {
      fontSize: sf(11),
      color: '#7a7468',
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): KeyboardMenuItem {
    const button = this.add.rectangle(x, y, s(176), s(34), 0x26314a)
      .setStrokeStyle(s(2), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: sf(15),
      color: '#ffffff',
    }).setOrigin(0.5);
    button.on('pointerdown', onClick);
    return {
      target: button,
      normalStrokeWidth: s(2),
      normalStrokeColor: 0xf0c85a,
      onSelect: onClick,
    };
  }
}
