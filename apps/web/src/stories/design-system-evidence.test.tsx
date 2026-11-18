import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { StoryFrame } from '@/src/features/play/ui/story-frame';
import {
  abstractPresentation,
  cavePresentation,
  caveScope,
  harborPresentation,
  harborScope,
  malformedPresentation,
  quietRoomPresentation,
  resolveFixture,
  unknownVersionPresentation,
} from '@/src/features/play/presentation/fixtures';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';
import { matrixOptions, matrixProse } from './design-system-matrix-fixtures';

const optionScope = {
  ...harborScope,
  paragraphCount: matrixProse.length,
  validLegacyOptionIds: matrixOptions.map((option) => option.id),
};

const directions = [
  ['harbor', harborPresentation, optionScope],
  ['cave', cavePresentation, caveScope],
  ['abstract', abstractPresentation, optionScope],
  ['quiet', quietRoomPresentation, optionScope],
  ['malformed', malformedPresentation, optionScope],
  ['unknown', unknownVersionPresentation, optionScope],
] as const;

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('design-system evidence (UI07)', () => {
  it('keeps passage text and enabled option ids under every fixture direction', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 }),
    );
    for (const [name, fixture, scope] of directions) {
      const presentation = resolveFixture(fixture, scope);
      render(
        <StoryFrame
          storiesHref="/stories"
          storyLabel="Greywake"
          passageTitle="Someone at the door"
          paragraphs={[...matrixProse]}
          intentions={[...matrixOptions]}
          presentation={presentation}
        />,
      );
      expect(screen.getByText(matrixProse[0] ?? ''), name).toBeInTheDocument();
      expect(screen.getByText(matrixProse[1] ?? ''), name).toBeInTheDocument();
      for (const option of matrixOptions) {
        const button = screen.getByRole('button', {
          name: new RegExp(option.label),
        });
        expect(button, name).toBeEnabled();
        expect(button.getAttribute('style') ?? '', name).not.toMatch(/url\(/);
      }
      expect(document.body.innerHTML, name).not.toContain('evil.example');
      const viewport = document.querySelector('.story-viewport');
      expect(viewport?.getAttribute('style') ?? '', name).not.toMatch(
        /--ui-danger|--ui-focus|--reader-ink|--sf-ink/,
      );
      cleanup();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('has no axe violations, and a closed Contents menu hides Journal', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        paragraphs={[...matrixProse]}
        intentions={[...matrixOptions]}
        journalHref="#story-journal"
        journal={<p>Saved passage fixture.</p>}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Journal' })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Contents' }));
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute(
      'href',
      '#story-journal',
    );
  });

  it('keeps a pending action disabled and an error notice live', async () => {
    const { container } = render(
      <section aria-label="Create">
        <label htmlFor="matrix-title">Story title</label>
        <input id="matrix-title" />
        <Action kind="button" pending>
          Saving…
        </Action>
        <SystemNotice tone="error">
          Setup could not be confirmed. Your edits are still here.
        </SystemNotice>
      </section>,
    );
    expect(screen.getByLabelText('Story title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /could not be confirmed/i,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps reduced motion and forced colors from hiding a choice', () => {
    const css = readFileSync(
      path.join(__dirname, '../features/play/ui/story-frame.css'),
      'utf8',
    );
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media \(forced-colors: active\)/);
    expect(css).not.toMatch(
      /\.story-frame__intention[^{]*\{[^}]*display:\s*none/,
    );
    const passage = css.match(/\.story-frame__passage p\s*\{[^}]*\}/s)?.[0] ?? '';
    expect(passage).toMatch(/overflow-wrap:\s*(?:anywhere|break-word)/);
    expect(passage).not.toMatch(/max-height/);
  });

  it('records the human gaps instead of calling visual taste done', () => {
    const inventory = readFileSync(
      path.join(__dirname, 'design-system-inventory.md'),
      'utf8',
    );
    expect(inventory).toMatch(/not a final art approval/);
    expect(inventory).toMatch(/no screenshot corpus/);
    expect(inventory).toMatch(/Action/);
    expect(inventory).toMatch(/SystemNotice/);
    expect(inventory).toMatch(/BookContents/);
    expect(inventory).toMatch(/LiveStoryList/);
    expect(inventory).toMatch(/DraftEditor/);
    expect(inventory).not.toMatch(/visual taste passed|all viewports green/);
  });
});
