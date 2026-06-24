import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

export const REWARD_OUTRO_GRACE_MS = 200;
export const REWARD_OUTRO_EASE_MS = 250;
const PICKUP_FX_MS = 120;

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
  private baseZoom = 1;

  constructor(private readonly scene: Phaser.Scene) {}

  destroy(): void {
    this.cancelPending();
    this.overlay?.destroy();
    this.overlay = undefined;
    this.resetState();
  }

  cancel(): void {
    this.cancelPending();
    this.resetState();
  }

  clearVisuals(): void {
    this.cancelPending();
    this.overlay?.setAlpha(0);
    if (this.state === 'idle' && this.scene.cameras?.main) {
      this.scene.cameras.main.setZoom(this.baseZoom || 1);
    }
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

  /** Visual-only pickup beat. Does not delay or gate the reward modal. */
  playPickupFx(): void {
    this.clearVisuals();
    this.invulnerable = true;
    this.baseZoom = this.scene.cameras.main.zoom;

    const overlay = this.ensureOverlay();
    overlay.setAlpha(0);
    this.pendingTweens.push(this.scene.tweens.add({
      targets: overlay,
      alpha: 0.3,
      duration: 80,
      ease: 'Sine.Out',
      yoyo: true,
      hold: 20,
    }));
    this.scene.cameras.main.zoomTo(this.baseZoom * 1.03, PICKUP_FX_MS, 'Sine.Out');
    this.scene.cameras.main.shake(PICKUP_FX_MS, 0.0015);

    this.pendingTimers.push(this.scene.time.delayedCall(PICKUP_FX_MS, () => {
      this.invulnerable = false;
      this.clearVisuals();
    }));
  }

  beginOutro(onComplete: () => void): void {
    this.cancelPending();
    this.state = 'outroGrace';
    this.timeScale = 0;
    this.invulnerable = true;
    this.movementBlocked = true;
    this.baseZoom = this.scene.cameras.main.zoom;
    this.ensureOverlay().setAlpha(0.42);
    this.scene.cameras.main.setZoom(this.baseZoom * 1.02);

    this.pendingTimers.push(this.scene.time.delayedCall(REWARD_OUTRO_GRACE_MS, () => {
      if (this.state !== 'outroGrace') {
        return;
      }
      this.state = 'outroEase';
      this.movementBlocked = false;
      this.timeScale = OUTRO_EASE_START_SCALE;
      this.startOutroEase(onComplete);
    }));
  }

  private startOutroEase(onComplete: () => void): void {
    const easeState = { scale: OUTRO_EASE_START_SCALE, alpha: 0.42 };
    this.pendingTweens.push(this.scene.tweens.add({
      targets: easeState,
      scale: 1,
      alpha: 0,
      duration: REWARD_OUTRO_EASE_MS,
      ease: 'Sine.Out',
      onUpdate: () => {
        this.timeScale = easeState.scale;
        this.overlay?.setAlpha(easeState.alpha);
        this.scene.cameras.main.setZoom(Phaser.Math.Linear(this.baseZoom * 1.02, this.baseZoom, easeState.scale));
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
    this.overlay?.setAlpha(0);
    if (this.scene.cameras?.main) {
      this.scene.cameras.main.setZoom(this.baseZoom || 1);
    }
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
    this.killOverlayTweens();
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

  private killOverlayTweens(): void {
    if (this.overlay) {
      this.scene.tweens.killTweensOf(this.overlay);
    }
  }
}
