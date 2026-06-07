import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SLOT_ICONS, SLOT_LABELS, STAGE_COUNT } from '../constants';
import { getSaveData, resetSaveData, updateSaveData } from '../storage';
import { applySceneVolume, playBgm, playSound } from '../systems/SoundSystem';
import type { EquipmentSlot } from '../types';

const EQUIPMENT_SLOTS = Object.keys(SLOT_LABELS) as EquipmentSlot[];

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelectScene');
  }

  create(): void {
    playBgm(this, 'stage_select');
    this.render();
  }

  private render(): void {
    this.children.removeAll();

    const save = getSaveData();
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111018).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 42, 'Select Stage', {
      fontSize: '28px',
      color: '#f8ddb0',
    }).setOrigin(0.5);

    for (let stageId = 1; stageId <= STAGE_COUNT; stageId += 1) {
      const isOpen = stageId <= save.unlockedStage;
      const isCleared = save.clearedStages.includes(stageId);
      const y = 94 + (stageId - 1) * 54;
      const button = this.add.rectangle(GAME_WIDTH / 2, y, 272, 38, isOpen ? 0x26314a : 0x25212c)
        .setStrokeStyle(2, isOpen ? 0xf0c85a : 0x5b5568)
        .setInteractive({ useHandCursor: isOpen });

      const stateLabel = isCleared ? 'Cleared' : isOpen ? 'Open' : 'Locked';
      this.add.text(GAME_WIDTH / 2, y, `Stage ${stageId}: ${stateLabel}`, {
        fontSize: '18px',
        color: isCleared ? '#d8f4df' : isOpen ? '#ffffff' : '#8c8796',
      }).setOrigin(0.5);

      if (isOpen) {
        button.on('pointerdown', () => {
          playSound('ui_select', this);
          this.scene.start('GameScene', { stageId });
        });
      }
    }

    this.add.text(44, 382, 'Character Status', {
      fontSize: '18px',
      color: '#f8ddb0',
    });

    this.add.text(44, 354, `Unlocked Stage: ${save.unlockedStage} / ${STAGE_COUNT}`, {
      fontSize: '13px',
      color: '#cfc4b2',
    });

    const equippedLines = EQUIPMENT_SLOTS.map((slot) => {
      const item = save.equipped[slot];
      return `${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}: ${item?.nameKo ?? 'Empty'}`;
    });

    this.add.text(44, 418, equippedLines.join('\n'), {
      fontSize: '13px',
      color: '#cfc4b2',
      lineSpacing: 7,
    });

    this.add.text(44, 556, `Volume: ${Math.round(save.settings.volume * 100)}%`, {
      fontSize: '15px',
      color: '#cfc4b2',
    });

    const volumeButton = this.add.rectangle(258, 564, 116, 30, 0x26314a)
      .setStrokeStyle(1, 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    this.add.text(258, 564, save.settings.volume > 0 ? 'Sound On' : 'Muted', {
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5);

    volumeButton.on('pointerdown', () => {
      updateSaveData((current) => ({
        ...current,
        settings: {
          ...current.settings,
          volume: current.settings.volume > 0 ? 0 : 0.7,
        },
      }));
      applySceneVolume(this);
      this.render();
    });

    const resetButton = this.add.rectangle(GAME_WIDTH / 2, 604, 144, 30, 0x43222a)
      .setStrokeStyle(1, 0xff8585)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, 604, 'Reset Data', {
      fontSize: '14px',
      color: '#ffd6d6',
    }).setOrigin(0.5);

    resetButton.on('pointerdown', () => {
      playSound('ui_click', this);
      if (window.confirm('Reset all save data?')) {
        resetSaveData();
        applySceneVolume(this);
        this.render();
      }
    });
  }
}
