import Phaser from 'phaser';
import { s } from '../constants';
import { loadSaveData } from '../storage';
import { loadAudioAssets } from '../systems/SoundSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    loadAudioAssets(this);
  }

  create(): void {
    this.createGeneratedTextures();
    loadSaveData();
    this.scene.start('TitleScene');
  }

  private createGeneratedTextures(): void {
    this.createCircleTexture('player_circle', s(20), 0x4fd4ff);
    this.createCircleTexture('player_hit', s(22), 0xff6565);
    this.createCircleTexture('crawler_enemy', s(18), 0x9ad85c);
    this.createCircleTexture('runner_enemy', s(14), 0xf0c85a);
    this.createCircleTexture('brute_enemy', s(26), 0xb2604f);
    this.createCircleTexture('skirmisher_enemy', s(12), 0x9b7cff);
    this.createCircleTexture('boss_large', s(56), 0xaa55ff);
    this.createCircleTexture('projectile_orb', s(8), 0xfff1a8);
    this.createCircleTexture('aoe_circle', s(48), 0xff7a3d, 0.35);
    this.createRectTexture('chest_box', s(22), s(18), 0xc99336, 0x5b3318);
    this.createRectTexture('slash_arc', s(34), s(10), 0xdfe8ff);
    this.createRectTexture('warning_marker', s(70), s(6), 0xff3d3d);
    this.createRectTexture('item_card_bg', s(94), s(124), 0x241b2d, 0xe0b15a);
  }

  private createCircleTexture(key: string, size: number, color: number, alpha = 1): void {
    if (this.textures.exists(key)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(color, alpha);
    graphics.fillCircle(size / 2, size / 2, size / 2);
    graphics.lineStyle(s(2), 0xffffff, 0.3);
    graphics.strokeCircle(size / 2, size / 2, size / 2 - 1);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private createRectTexture(key: string, width: number, height: number, color: number, border = 0xffffff): void {
    if (this.textures.exists(key)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, height, s(3));
    graphics.lineStyle(s(2), border, 0.75);
    graphics.strokeRoundedRect(s(1), s(1), width - s(2), height - s(2), s(3));
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
}
