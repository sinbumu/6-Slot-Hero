import Phaser from 'phaser';
import { s, sf } from './constants';

export const UI_FONT_FAMILY = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
export const UI_FONT_FAMILY_SERIF = 'Georgia, "Noto Serif KR", serif';

function textPadX(): number {
  return s(4);
}

function textPadY(): number {
  return s(6);
}

function parseFontSizePx(fontSize: string | number | undefined): number {
  if (typeof fontSize === 'number') {
    return fontSize;
  }
  if (!fontSize) {
    return s(13);
  }
  const match = fontSize.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : s(13);
}

export function buildUiTextStyle(
  text: string,
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.Types.GameObjects.Text.TextStyle {
  const merged: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: UI_FONT_FAMILY,
    padding: { x: textPadX(), y: textPadY() },
    ...style,
  };

  const fontSizePx = parseFontSizePx(merged.fontSize);
  const minLineSpacing = Math.round(fontSizePx * 0.34);

  if (text.includes('\n')) {
    merged.lineSpacing = Math.max(merged.lineSpacing ?? 0, minLineSpacing);
  }

  const strokePad = typeof merged.strokeThickness === 'number' ? merged.strokeThickness : 0;
  const stylePadding = typeof merged.padding === 'object' ? merged.padding : {};
  merged.padding = {
    x: Math.max(textPadX(), stylePadding.x ?? 0) + Math.round(strokePad * 0.5),
    y: Math.max(textPadY(), stylePadding.y ?? 0) + strokePad,
  };

  return merged;
}

export function applyUiTextFactoryPatch(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const originalText = factory.text.bind(factory);

  factory.text = function patchedText(
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    content: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    const textContent = Array.isArray(content) ? content.join('\n') : content;
    return originalText(x, y, content, buildUiTextStyle(textContent, style));
  };
}

export function uiTextStyle(
  baseSizePx: number,
  extra?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.Types.GameObjects.Text.TextStyle {
  return buildUiTextStyle('', {
    fontSize: sf(baseSizePx),
    ...extra,
  });
}
