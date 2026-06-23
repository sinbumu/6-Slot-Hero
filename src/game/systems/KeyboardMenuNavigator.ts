import Phaser from 'phaser';
import { s } from '../constants';

export interface KeyboardMenuItem {
  target: Phaser.GameObjects.Rectangle;
  normalStrokeWidth: number;
  normalStrokeColor: number;
  onSelect: () => void;
}

const FOCUS_STROKE_COLOR = 0xffffff;

export class KeyboardMenuNavigator {
  private items: KeyboardMenuItem[] = [];
  private focusIndex = 0;
  private columns = 1;
  private keydownHandler?: (event: KeyboardEvent) => void;

  constructor(private readonly scene: Phaser.Scene) {}

  bind(items: KeyboardMenuItem[], columns = 1): void {
    this.unbind();
    this.items = items;
    this.columns = Math.max(1, columns);
    this.focusIndex = 0;
    this.applyFocus();

    if (this.items.length === 0) {
      return;
    }

    this.keydownHandler = (event: KeyboardEvent) => this.handleKey(event);
    this.scene.input.keyboard?.on('keydown', this.keydownHandler);
  }

  bindSingle(item: KeyboardMenuItem): void {
    this.bind([item], 1);
  }

  unbind(): void {
    if (this.keydownHandler) {
      this.scene.input.keyboard?.off('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }
    this.items = [];
    this.focusIndex = 0;
    this.columns = 1;
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.items.length === 0) {
      return;
    }

    const key = event.key;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      event.preventDefault();
      this.moveFocus(0, -1);
      return;
    }
    if (key === 'ArrowDown' || key === 's' || key === 'S') {
      event.preventDefault();
      this.moveFocus(0, 1);
      return;
    }
    if (this.columns > 1 && (key === 'ArrowLeft' || key === 'a' || key === 'A')) {
      event.preventDefault();
      this.moveFocus(-1, 0);
      return;
    }
    if (this.columns > 1 && (key === 'ArrowRight' || key === 'd' || key === 'D')) {
      event.preventDefault();
      this.moveFocus(1, 0);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.items[this.focusIndex]?.onSelect();
    }
  }

  private moveFocus(deltaCol: number, deltaRow: number): void {
    if (this.columns <= 1) {
      const next = Phaser.Math.Wrap(this.focusIndex + deltaRow, 0, this.items.length);
      this.focusIndex = next;
      this.applyFocus();
      return;
    }

    const row = Math.floor(this.focusIndex / this.columns);
    const col = this.focusIndex % this.columns;
    const rowCount = Math.ceil(this.items.length / this.columns);
    let nextRow = row + deltaRow;
    let nextCol = col + deltaCol;

    if (nextRow < 0) {
      nextRow = rowCount - 1;
    } else if (nextRow >= rowCount) {
      nextRow = 0;
    }

    if (nextCol < 0) {
      nextCol = this.columns - 1;
    } else if (nextCol >= this.columns) {
      nextCol = 0;
    }

    let nextIndex = nextRow * this.columns + nextCol;
    if (nextIndex >= this.items.length) {
      nextIndex = this.items.length - 1;
    }
    this.focusIndex = nextIndex;
    this.applyFocus();
  }

  private applyFocus(): void {
    this.items.forEach((item, index) => {
      if (index === this.focusIndex) {
        item.target.setStrokeStyle(s(3), FOCUS_STROKE_COLOR, 1);
      } else {
        item.target.setStrokeStyle(item.normalStrokeWidth, item.normalStrokeColor);
      }
    });
  }
}
