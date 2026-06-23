import Phaser from 'phaser';
import { s } from '../constants';

export interface FloatingJoystickConfig {
  zoneLeft: number;
  zoneTop: number;
  zoneWidth: number;
  zoneHeight: number;
  maxRadius: number;
  deadzone: number;
  depth: number;
}

export class FloatingJoystick {
  private readonly config: FloatingJoystickConfig;
  private base?: Phaser.GameObjects.Arc;
  private knob?: Phaser.GameObjects.Arc;
  private ghost?: Phaser.GameObjects.Arc;
  private moveVector = new Phaser.Math.Vector2(0, 0);
  private active = false;
  private pointerId = -1;
  private baseX = 0;
  private baseY = 0;

  constructor(config: FloatingJoystickConfig) {
    this.config = config;
  }

  attach(scene: Phaser.Scene): void {
    const ghostX = configCenterX(this.config);
    const ghostY = configCenterY(this.config);
    this.ghost = scene.add.circle(ghostX, ghostY, s(28), 0x4fd4ff, 0.08)
      .setStrokeStyle(s(2), 0x4fd4ff, 0.35)
      .setDepth(this.config.depth)
      .setScrollFactor(0);
    this.base = scene.add.circle(ghostX, ghostY, this.config.maxRadius, 0x1a2530, 0.45)
      .setStrokeStyle(s(2), 0x4fd4ff, 0.55)
      .setDepth(this.config.depth)
      .setScrollFactor(0)
      .setVisible(false);
    this.knob = scene.add.circle(ghostX, ghostY, s(14), 0x4fd4ff, 0.75)
      .setStrokeStyle(s(1), 0xffffff, 0.6)
      .setDepth(this.config.depth + 1)
      .setScrollFactor(0)
      .setVisible(false);
  }

  destroy(): void {
    this.base?.destroy();
    this.knob?.destroy();
    this.ghost?.destroy();
    this.base = undefined;
    this.knob = undefined;
    this.ghost = undefined;
  }

  isTouchPointer(pointer: Phaser.Input.Pointer): boolean {
    if (pointer.wasTouch) {
      return true;
    }
    const domEvent = pointer.event as PointerEvent | undefined;
    return domEvent?.pointerType === 'touch' || domEvent?.pointerType === 'pen';
  }

  isInActivationZone(x: number, y: number): boolean {
    const { zoneLeft, zoneTop, zoneWidth, zoneHeight } = this.config;
    return x >= zoneLeft && x <= zoneLeft + zoneWidth && y >= zoneTop && y <= zoneTop + zoneHeight;
  }

  tryActivate(pointer: Phaser.Input.Pointer): boolean {
    if (this.active || !this.isTouchPointer(pointer)) {
      return false;
    }
    if (!this.isInActivationZone(pointer.x, pointer.y)) {
      return false;
    }

    this.active = true;
    this.pointerId = pointer.id;
    this.baseX = clampBaseX(pointer.x, this.config);
    this.baseY = clampBaseY(pointer.y, this.config);
    this.syncVisuals(pointer.x, pointer.y);
    this.base?.setVisible(true);
    this.knob?.setVisible(true);
    this.ghost?.setVisible(false);
    return true;
  }

  update(pointer: Phaser.Input.Pointer): void {
    if (!this.active || pointer.id !== this.pointerId) {
      return;
    }
    this.syncVisuals(pointer.x, pointer.y);
  }

  release(pointerId: number): void {
    if (!this.active || pointerId !== this.pointerId) {
      return;
    }
    this.reset();
  }

  forceRelease(): void {
    if (!this.active) {
      return;
    }
    this.reset();
  }

  getMoveVector(): Phaser.Math.Vector2 {
    return this.moveVector;
  }

  isActive(): boolean {
    return this.active;
  }

  setVisible(enabled: boolean): void {
    if (this.active) {
      return;
    }
    this.ghost?.setVisible(enabled);
  }

  private reset(): void {
    this.active = false;
    this.pointerId = -1;
    this.moveVector.set(0, 0);
    this.base?.setVisible(false);
    this.knob?.setVisible(false);
    this.ghost?.setVisible(true);
  }

  private syncVisuals(pointerX: number, pointerY: number): void {
    const { maxRadius, deadzone } = this.config;
    const dx = pointerX - this.baseX;
    const dy = pointerY - this.baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDistance = Math.min(distance, maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = this.baseX + Math.cos(angle) * clampedDistance;
    const knobY = this.baseY + Math.sin(angle) * clampedDistance;

    this.base?.setPosition(this.baseX, this.baseY);
    this.knob?.setPosition(knobX, knobY);

    if (clampedDistance <= deadzone) {
      this.moveVector.set(0, 0);
      return;
    }

    const magnitude = (clampedDistance - deadzone) / (maxRadius - deadzone);
    this.moveVector.set(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }
}

function configCenterX(config: FloatingJoystickConfig): number {
  return config.zoneLeft + config.zoneWidth / 2;
}

function configCenterY(config: FloatingJoystickConfig): number {
  return config.zoneTop + config.zoneHeight / 2;
}

function clampBaseX(x: number, config: FloatingJoystickConfig): number {
  const radius = config.maxRadius;
  return Phaser.Math.Clamp(x, config.zoneLeft + radius, config.zoneLeft + config.zoneWidth - radius);
}

function clampBaseY(y: number, config: FloatingJoystickConfig): number {
  const radius = config.maxRadius;
  return Phaser.Math.Clamp(y, config.zoneTop + radius, config.zoneTop + config.zoneHeight - radius);
}
