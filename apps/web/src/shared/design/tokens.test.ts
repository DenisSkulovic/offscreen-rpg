import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(path.join(__dirname, 'tokens.css'), 'utf8');
const frameSource = readFileSync(
  path.resolve(__dirname, '../../features/play/ui/story-frame.tsx'),
  'utf8',
);
const frameCss = readFileSync(
  path.resolve(__dirname, '../../features/play/ui/story-frame.css'),
  'utf8',
);
const storiesCss = readFileSync(
  path.resolve(__dirname, '../../features/stories/stories-library.css'),
  'utf8',
);
const globalCss = readFileSync(
  path.resolve(__dirname, '../../../app/style.css'),
  'utf8',
);

const PLATFORM_ROLES = [
  '--ui-canvas',
  '--ui-ink',
  '--ui-muted',
  '--ui-focus',
  '--ui-border',
  '--ui-action',
  '--ui-action-ink',
  '--ui-danger',
  '--ui-attention',
  '--ui-success',
];

const READER_ROLES = [
  '--reader-paper',
  '--reader-ink',
  '--reader-muted',
  '--reader-edge',
  '--reader-measure',
  '--reader-line-height',
];

const SCENE_STYLE_KEYS = [
  '--sf-chrome-bg',
  '--sf-chrome-ink',
  '--sf-chrome-muted',
  '--sf-stage',
  '--sf-option-bg',
  '--sf-option-ink',
  '--sf-option-muted',
  '--sf-option-edge',
  '--sf-vignette',
  '--sf-texture',
];

const PROTECTED_STYLE_KEYS = [
  '--ui-danger',
  '--ui-focus',
  '--ui-action',
  '--ui-action-ink',
  '--ui-attention',
  '--ui-success',
  '--reader-ink',
  '--reader-muted',
  '--sf-ink',
  '--sf-ink-muted',
  '--sf-ink-quiet',
  '--sf-focus',
  '--sf-action',
  '--sf-action-ink',
  '--sf-status-attention',
];

function channel(hex: string, index: number): number {
  const value =
    Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string): number {
  const lum = (hex: string) =>
    0.2126 * channel(hex, 0) +
    0.7152 * channel(hex, 1) +
    0.0722 * channel(hex, 2);
  const lighter = Math.max(lum(foreground), lum(background));
  const darker = Math.min(lum(foreground), lum(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function declaredOnce(css: string, name: string): boolean {
  return css.split(`${name}:`).length === 2;
}

describe('semantic token registry', () => {
  it('defines each platform and reader role once, with no feature selectors', () => {
    for (const name of [...PLATFORM_ROLES, ...READER_ROLES]) {
      expect(declaredOnce(tokens, name), name).toBe(true);
    }
    expect(tokens).toMatch(/:root\s*\{/);
    expect(tokens).not.toMatch(
      /\.(story-demo|story-frame|stories-library|chamber)\b/,
    );
    expect(tokens).not.toMatch(/^(?:button|main|body|a|p)\b/m);
    expect(
      globalCss.startsWith("@import '../src/shared/design/tokens.css';"),
    ).toBe(true);
  });

  it('keeps scene decoration off reader ink, focus, action, and system status', () => {
    const assigned = [...frameSource.matchAll(/'(--[a-z0-9-]+)':/g)].map(
      (match) => match[1],
    );
    expect(assigned).toEqual(SCENE_STYLE_KEYS);
    for (const key of PROTECTED_STYLE_KEYS) {
      expect(assigned, key).not.toContain(key);
    }
    expect(frameCss).toContain('--sf-paper-ink: var(--reader-ink)');
    expect(frameCss).toContain('--sf-focus: var(--ui-focus)');
    expect(storiesCss).toContain('--sl-ink: var(--ui-ink)');
    expect(storiesCss).toContain('--sl-focus: var(--ui-focus)');
    expect(storiesCss).toContain('--sl-action: var(--ui-action)');
  });

  it('keeps the copied status and reader pairs legible', () => {
    expect(contrast('#1c1915', '#f7f1e6')).toBeGreaterThanOrEqual(7);
    expect(contrast('#e7ece8', '#12181f')).toBeGreaterThanOrEqual(7);
    expect(contrast('#f3e9d9', '#121b22')).toBeGreaterThanOrEqual(7);
    expect(contrast('#8ec8ff', '#121b22')).toBeGreaterThanOrEqual(3);
    expect(contrast('#1d4e89', '#f7f1e6')).toBeGreaterThanOrEqual(3);
    expect(contrast('#f0b4ae', '#121b22')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#8a332c', '#f7f1e6')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#b7d7c4', '#121b22')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#1d5c42', '#f7f1e6')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#6b4e16', '#f7f1e6')).toBeGreaterThanOrEqual(4.5);
  });
});
