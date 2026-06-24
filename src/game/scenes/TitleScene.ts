import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, s, sf } from '../constants';
import { KeyboardMenuNavigator } from '../systems/KeyboardMenuNavigator';
import { playBgm, playSound } from '../systems/SoundSystem';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    playBgm(this, 'main_title');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x09080d).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, s(164), '6-Slot Hero', {
      fontFamily: 'Georgia, "Noto Serif KR", serif',
      fontSize: sf(38),
      color: '#f8ddb0',
      stroke: '#3a1d12',
      strokeThickness: s(4),
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, s(224), 'Farm gear. Fill six slots. Kill the boss.', {
      fontSize: sf(13),
      color: '#b8a994',
    }).setOrigin(0.5);

    const buttonY = s(418);
    const startButton = this.add.rectangle(GAME_WIDTH / 2, buttonY, s(196), s(48), 0x26314a, 0.55)
      .setStrokeStyle(s(2), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    const startLabel = this.add.text(GAME_WIDTH / 2, buttonY, 'Start', {
      fontSize: sf(20),
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, buttonY + s(38), 'Click · Enter · Space', {
      fontSize: sf(11),
      color: '#9a9080',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [startButton, startLabel],
      alpha: 0.72,
      duration: 750,
      yoyo: true,
      repeat: -1,
    });

    const keyboardMenu = new KeyboardMenuNavigator(this);
    const startGame = (): void => {
      playSound('ui_click', this);
      keyboardMenu.unbind();
      this.scene.start('StageSelectScene');
    };
    keyboardMenu.bindSingle({
      target: startButton,
      normalStrokeWidth: s(2),
      normalStrokeColor: 0xf0c85a,
      onSelect: startGame,
    });
    startButton.on('pointerdown', startGame);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboardMenu.unbind());
  }
}
