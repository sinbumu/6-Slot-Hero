import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, s, sf } from '../constants';
import { playBgm, playSound } from '../systems/SoundSystem';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    playBgm(this, 'main_title');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x09080d).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, s(164), '6-Slot Hero', {
      fontFamily: 'Georgia, serif',
      fontSize: sf(38),
      color: '#f8ddb0',
      stroke: '#3a1d12',
      strokeThickness: s(4),
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, s(224), 'Farm gear. Fill six slots. Kill the boss.', {
      fontSize: sf(13),
      color: '#b8a994',
    }).setOrigin(0.5);

    const prompt = this.add.text(GAME_WIDTH / 2, s(420), 'Click / Touch to Start', {
      fontSize: sf(18),
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
      playSound('ui_click', this);
      this.scene.start('StageSelectScene');
    });
  }
}
