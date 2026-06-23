import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

export const REWARD_INTRO_MS = 120;
export const REWARD_OUTRO_GRACE_MS = 200;
export const REWARD_OUTRO_EASE_MS = 250;

const INTRO_TIME_SCALE = 0.22;
const OUTRO_EASE_START_SCALE = 0.18;

type RewardMomentState = 'idle' | 'intro' | 'outroGrace' | 'outroEase';

export class RewardMomentSystem {
  private state: RewardMomentState = 'idle';
  private stateElapsedMs = 0;
  private timeScale = 1;
  private invulnerable = false;
  private movementBlocked = false;
  private overlay?: Phaser.GameObjects.Rectangle;
  private introCallback?: () => void;
  private outroCallback?: () => void;
  private baseZoom = 1;

  constructor(private readonly scene: Phaser.Scene) {}

  destroy(): void {
    this.overlay?.destroy();
    this.overlay = undefined;
    this.introCallback = undefined;
    this.outroCallback = undefined;
    this.resetState();
  }

  isActive(): boolean {
    return this.state !== 'idle';
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  isInvulnerable(): boolean {
    return this.invulnerable;
  }

  isMovementBlocked(): boolean {
    return this.movementBlocked;
  }

  beginIntro(onComplete: () => void): void {
    this.killOverlayTweens();
    this.state = 'intro';
    this.stateElapsedMs = 0;
    this.timeScale = INTRO_TIME_SCALE;
    this.invulnerable = true;
    this.movementBlocked = false;
    this.introCallback = onComplete;
    this.baseZoom = this.scene.cameras.main.zoom;

    const overlay = this.ensureOverlay();
    overlay.setAlpha(0);
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.34,
      duration: 90,
      ease: 'Sine.Out',
    });
    this.scene.cameras.main.zoomTo(this.baseZoom * 1.04, REWARD_INTRO_MS, 'Sine.Out');
    this.scene.cameras.main.shake(REWARD_INTRO_MS, 0.0018);
  }

  beginOutro(onComplete: () => void): void {
    this.killOverlayTweens();
    this.state = 'outroGrace';
    this.stateElapsedMs = 0;
    this.timeScale = 0;
    this.invulnerable = true;
    this.movementBlocked = true;
    this.outroCallback = onComplete;
    this.baseZoom = this.scene.cameras.main.zoom;
    this.ensureOverlay().setAlpha(0.42);
    this.scene.cameras.main.setZoom(this.baseZoom * 1.02);
  }

  update(delta: number): void {
    if (this.state === 'idle') {
      return;
    }

    this.stateElapsedMs += delta;

    if (this.state === 'intro' && this.stateElapsedMs >= REWARD_INTRO_MS) {
      this.finishIntro();
      return;
    }

    if (this.state === 'outroGrace' && this.stateElapsedMs >= REWARD_OUTRO_GRACE_MS) {
      this.state = 'outroEase';
      this.stateElapsedMs = 0;
      this.movementBlocked = false;
      this.timeScale = OUTRO_EASE_START_SCALE;
      return;
    }

    if (this.state === 'outroEase') {
      const progress = Phaser.Math.Clamp(this.stateElapsedMs / REWARD_OUTRO_EASE_MS, 0, 1);
      this.timeScale = Phaser.Math.Linear(OUTRO_EASE_START_SCALE, 1, progress);
      this.overlay?.setAlpha(Phaser.Math.Linear(0.42, 0, progress));
      this.scene.cameras.main.setZoom(Phaser.Math.Linear(this.baseZoom * 1.02, this.baseZoom, progress));

      if (this.stateElapsedMs >= REWARD_OUTRO_EASE_MS) {
        this.finishOutro();
      }
    }
  }

  private finishIntro(): void {
    this.state = 'idle';
    this.timeScale = 1;
    this.invulnerable = false;
    this.fadeOutOverlay(80);
    this.scene.cameras.main.zoomTo(this.baseZoom, 80, 'Sine.Out');
    const callback = this.introCallback;
    this.introCallback = undefined;
    callback?.();
  }

  private finishOutro(): void {
    this.resetState();
    const callback = this.outroCallback;
    this.outroCallback = undefined;
    callback?.();
  }

  private resetState(): void {
    this.state = 'idle';
    this.stateElapsedMs = 0;
    this.timeScale = 1;
    this.invulnerable = false;
    this.movementBlocked = false;
    this.overlay?.setAlpha(0);
    if (this.scene.cameras?.main) {
      this.scene.cameras.main.setZoom(this.baseZoom);
    }
  }

  private ensureOverlay(): Phaser.GameObjects.Rectangle {
    if (!this.overlay || !this.overlay.scene) {
      this.overlay = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x140a24, 0)
        .setOrigin(0)
        .setDepth(95)
        .setScrollFactor(0);
    }
    return this.overlay;
  }

  private fadeOutOverlay(duration: number): void {
    if (!this.overlay) {
      return;
    }
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0,
      duration,
      ease: 'Sine.Out',
    });
  }

  private killOverlayTweens(): void {
    if (this.overlay) {
      this.scene.tweens.killTweensOf(this.overlay);
    }
  }
}
