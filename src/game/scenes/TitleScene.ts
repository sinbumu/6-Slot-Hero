import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x09080d).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 164, '6-Slot Hero', {
      fontFamily: 'Georgia, serif',
      fontSize: '38px',
      color: '#f8ddb0',
      stroke: '#3a1d12',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 224, 'Farm gear. Fill six slots. Kill the boss.', {
      fontSize: '13px',
      color: '#b8a994',
    }).setOrigin(0.5);

    const prompt = this.add.text(GAME_WIDTH / 2, 420, 'Click / Touch to Start', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.35,
      duration: 750,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      this.scene.start('StageSelectScene');
    });
  }
}
