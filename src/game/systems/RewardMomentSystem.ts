import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

export const REWARD_OUTRO_GRACE_MS = 200;
export const REWARD_OUTRO_EASE_MS = 250;

const OUTRO_EASE_START_SCALE = 0.18;

type RewardMomentState = 'idle' | 'outroGrace' | 'outroEase';

export class RewardMomentSystem {
  private state: RewardMomentState = 'idle';
  private timeScale = 1;
  private invulnerable = false;
  private movementBlocked = false;
  private overlay?: Phaser.GameObjects.Rectangle;
  private pendingTimers: Phaser.Time.TimerEvent[] = [];
  private pendingTweens: Phaser.Tweens.Tween[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  destroy(): void {
    this.cancelPending();
    if (this.overlay?.active) {
      this.overlay.destroy();
    }
    this.overlay = undefined;
    this.state = 'idle';
    this.timeScale = 1;
    this.invulnerable = false;
    this.movementBlocked = false;
  }

  cancel(): void {
    this.cancelPending();
    if (!this.isSceneLive()) {
      this.state = 'idle';
      this.timeScale = 1;
      this.invulnerable = false;
      this.movementBlocked = false;
      return;
    }
    this.resetState();
  }

  isOutroActive(): boolean {
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

  /** Runs only after a reward modal closes (pick or skip). */
  beginOutro(onComplete: () => void): void {
    if (!this.isSceneLive()) {
      onComplete();
      return;
    }

    this.cancelPending();
    this.state = 'outroGrace';
    this.timeScale = 0;
    this.invulnerable = true;
    this.movementBlocked = true;
    this.scene.cameras.main?.setZoom(1);
    this.ensureOverlay().setAlpha(0.38).setVisible(true);

    this.pendingTimers.push(this.scene.time.delayedCall(REWARD_OUTRO_GRACE_MS, () => {
      if (this.state !== 'outroGrace' || !this.isSceneLive()) {
        return;
      }
      this.state = 'outroEase';
      this.movementBlocked = false;
      this.timeScale = OUTRO_EASE_START_SCALE;
      this.startOutroEase(onComplete);
    }));
  }

  private startOutroEase(onComplete: () => void): void {
    if (!this.isSceneLive()) {
      onComplete();
      return;
    }

    const easeState = { scale: OUTRO_EASE_START_SCALE, alpha: 0.38 };
    this.pendingTweens.push(this.scene.tweens.add({
      targets: easeState,
      scale: 1,
      alpha: 0,
      duration: REWARD_OUTRO_EASE_MS,
      ease: 'Sine.Out',
      onUpdate: () => {
        if (!this.isSceneLive()) {
          return;
        }
        this.timeScale = easeState.scale;
        this.overlay?.setAlpha(easeState.alpha);
      },
      onComplete: () => {
        if (this.state !== 'outroEase') {
          return;
        }
        this.resetState();
        onComplete();
      },
    }));
  }

  private resetState(): void {
    this.state = 'idle';
    this.timeScale = 1;
    this.invulnerable = false;
    this.movementBlocked = false;
    this.overlay?.setAlpha(0).setVisible(false);
    this.scene.cameras.main?.setZoom(1);
  }

  private isSceneLive(): boolean {
    return Boolean(this.scene?.sys?.isActive());
  }

  private cancelPending(): void {
    for (const timer of this.pendingTimers) {
      timer.remove(false);
    }
    this.pendingTimers = [];
    for (const tween of this.pendingTweens) {
      tween.stop();
    }
    this.pendingTweens = [];
    if (this.overlay && this.isSceneLive()) {
      this.scene.tweens.killTweensOf(this.overlay);
    }
  }

  private ensureOverlay(): Phaser.GameObjects.Rectangle {
    if (!this.overlay || !this.overlay.scene) {
      this.overlay = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x140a24, 0)
        .setOrigin(0)
        .setDepth(90)
        .setScrollFactor(0)
        .setVisible(false);
    }
    return this.overlay;
  }
}
