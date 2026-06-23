import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SLOT_ICONS, SLOT_LABELS, STAGE_COUNT, s, sf } from '../constants';
import { getSaveData, resetSaveData, updateSaveData } from '../storage';
import { KeyboardMenuNavigator, type KeyboardMenuItem } from '../systems/KeyboardMenuNavigator';
import { applySceneVolume, playBgm, playSound } from '../systems/SoundSystem';
import type { EquipmentSlot } from '../types';

const EQUIPMENT_SLOTS = Object.keys(SLOT_LABELS) as EquipmentSlot[];

export class StageSelectScene extends Phaser.Scene {
  private readonly keyboardMenu = new KeyboardMenuNavigator(this);

  constructor() {
    super('StageSelectScene');
  }

  create(): void {
    playBgm(this, 'stage_select');
    this.render();
  }

  private render(): void {
    this.keyboardMenu.unbind();
    this.children.removeAll();

    const save = getSaveData();
    const menuItems: KeyboardMenuItem[] = [];
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111018).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, s(42), 'Select Stage', {
      fontSize: sf(28),
      color: '#f8ddb0',
    }).setOrigin(0.5);

    for (let stageId = 1; stageId <= STAGE_COUNT; stageId += 1) {
      const isOpen = stageId <= save.unlockedStage;
      const isCleared = save.clearedStages.includes(stageId);
      const y = s(94) + (stageId - 1) * s(54);
      const button = this.add.rectangle(GAME_WIDTH / 2, y, s(272), s(38), isOpen ? 0x26314a : 0x25212c)
        .setStrokeStyle(s(2), isOpen ? 0xf0c85a : 0x5b5568)
        .setInteractive({ useHandCursor: isOpen });

      const stateLabel = isCleared ? 'Cleared' : isOpen ? 'Open' : 'Locked';
      this.add.text(GAME_WIDTH / 2, y, `Stage ${stageId}: ${stateLabel}`, {
        fontSize: sf(18),
        color: isCleared ? '#d8f4df' : isOpen ? '#ffffff' : '#8c8796',
      }).setOrigin(0.5);

      if (isOpen) {
        const startStage = (): void => {
          playSound('ui_select', this);
          this.scene.start('GameScene', { stageId });
        };
        button.on('pointerdown', startStage);
        menuItems.push({
          target: button,
          normalStrokeWidth: s(2),
          normalStrokeColor: 0xf0c85a,
          onSelect: startStage,
        });
      }
    }

    this.add.text(s(44), s(382), 'Character Status', {
      fontSize: sf(18),
      color: '#f8ddb0',
    });

    this.add.text(s(44), s(354), `Unlocked Stage: ${save.unlockedStage} / ${STAGE_COUNT}`, {
      fontSize: sf(13),
      color: '#cfc4b2',
    });

    const equippedLines = EQUIPMENT_SLOTS.map((slot) => {
      const item = save.equipped[slot];
      return `${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}: ${item?.nameKo ?? 'Empty'}`;
    });

    this.add.text(s(44), s(418), equippedLines.join('\n'), {
      fontSize: sf(13),
      color: '#cfc4b2',
      lineSpacing: s(7),
    });

    const volumeButton = this.add.rectangle(GAME_WIDTH / 2, s(564), s(132), s(30), 0x26314a)
      .setStrokeStyle(s(1), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, s(564), save.settings.volume > 0 ? 'Sound On' : 'Sound Off', {
      fontSize: sf(13),
      color: '#ffffff',
    }).setOrigin(0.5);

    const resetButton = this.add.rectangle(GAME_WIDTH / 2, s(604), s(144), s(30), 0x43222a)
      .setStrokeStyle(s(1), 0xff8585)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, s(604), 'Reset Data', {
      fontSize: sf(14),
      color: '#ffd6d6',
    }).setOrigin(0.5);

    const toggleVolume = (): void => {
      updateSaveData((current) => ({
        ...current,
        settings: {
          ...current.settings,
          volume: current.settings.volume > 0 ? 0 : 0.7,
        },
      }));
      applySceneVolume(this);
      if (getSaveData().settings.volume > 0) {
        playBgm(this, 'stage_select');
      }
      this.render();
    };
    const resetData = (): void => {
      playSound('ui_click', this);
      if (window.confirm('Reset all save data?')) {
        resetSaveData();
        applySceneVolume(this);
        this.render();
      }
    };

    volumeButton.on('pointerdown', toggleVolume);
    resetButton.on('pointerdown', resetData);
    menuItems.push(
      {
        target: volumeButton,
        normalStrokeWidth: s(1),
        normalStrokeColor: 0xf0c85a,
        onSelect: toggleVolume,
      },
      {
        target: resetButton,
        normalStrokeWidth: s(1),
        normalStrokeColor: 0xff8585,
        onSelect: resetData,
      },
    );
    this.keyboardMenu.bind(menuItems, 1);

    this.add.text(GAME_WIDTH / 2, s(638), 'W/S · Enter · Click', {
      fontSize: sf(11),
      color: '#7a7468',
    }).setOrigin(0.5);
  }
}
