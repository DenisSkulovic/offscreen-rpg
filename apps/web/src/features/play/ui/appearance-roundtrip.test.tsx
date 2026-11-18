import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { projectStoredSceneAppearance } from '@offscreen/contracts/stories';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { resolveLivePresentation } from '../model/live-presentation';
import { fixtureIds, makeStorySnapshot } from '@/src/test/story-fixtures';
import { StoryFrame } from './story-frame';

const prose = 'The road narrows toward the silt gate.';
const otherPassageId = '33333333-3333-4333-8333-333333333333';
const staleOfferId = '44444444-4444-4444-8444-444444444444';

const directive = {
  schemaVersion: 1,
  scene: {
    palette: {
      backdrop: '#1a3040',
      accent: '#d7a15a',
      surfaceTint: '#1c2830',
    },
    atmosphere: { lighting: 'dim', vignette: 0.2 },
  },
  choices: [
    {
      target: {
        kind: 'legacy',
        interactionId: fixtureIds.interactionId,
        optionId: 'walk',
      },
      surface: 'filled',
      accent: '#d7a15a',
    },
  ],
};

function projectSnapshot(stored: unknown) {
  const base = makeStorySnapshot();
  const appearance = projectStoredSceneAppearance(stored, {
    storyId: base.id,
    passageId: base.current.id,
  });
  return storySnapshotSchema.parse({
    ...base,
    current: {
      ...base.current,
      ...(appearance ? { appearance } : {}),
    },
  });
}

function renderBook(stored: unknown) {
  const story = projectSnapshot(stored);
  const onIntentionSelect = vi.fn();
  render(
    <StoryFrame
      storiesHref="/stories"
      storyLabel="Ashfall Approach"
      passageTitle={story.current.content.title}
      passageId={story.current.id}
      interactionId={story.current.interaction?.id}
      paragraphs={story.current.content.paragraphs}
      presentation={resolveLivePresentation(story)}
      intentions={
        story.current.interaction?.specification.options.map((option) => ({
          id: option.id,
          label: option.label,
        })) ?? []
      }
      onIntentionSelect={onIntentionSelect}
    />,
  );
  return { story, onIntentionSelect };
}

describe('saved appearance read into the book (DIR01)', () => {
  it('changes the backdrop for a matching passage and keeps the choice ids', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { story, onIntentionSelect } = renderBook({
      source: {
        storyId: fixtureIds.storyId,
        passageId: fixtureIds.passageId,
        interactionId: fixtureIds.interactionId,
      },
      directive,
    });
    expect(story.current.content.paragraphs).toEqual([prose]);
    expect(story.current.interaction?.specification.options.map((option) => option.id)).toEqual([
      'walk',
      'wait',
    ]);
    expect(screen.getByText(prose)).toBeVisible();
    expect(document.querySelector('[data-lighting]')).toHaveAttribute('data-lighting', 'dim');
    expect(document.querySelector('.story-viewport__plane')?.getAttribute('style')).toContain(
      '#1a3040',
    );
    const walk = screen.getByRole('button', { name: /Walk the gate road/i });
    expect(walk).toBeEnabled();
    expect(walk).toHaveAttribute('data-surface', 'filled');
    expect(screen.getByRole('button', { name: /Wait and watch/i })).toBeEnabled();
    await user.click(walk);
    expect(onIntentionSelect).toHaveBeenCalledWith('walk');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('leaves the book unstyled when the saved appearance does not belong here', async () => {
    const user = userEvent.setup();
    const cases = [
      null,
      {
        source: { storyId: fixtureIds.storyId, passageId: otherPassageId },
        directive,
      },
      {
        source: {
          storyId: fixtureIds.storyId,
          passageId: fixtureIds.passageId,
        },
        directive: {
          schemaVersion: 1,
          scene: { palette: { backdrop: 'linear-gradient(red, blue)' } },
          choices: [
            {
              target: {
                kind: 'legacy',
                interactionId: fixtureIds.interactionId,
                optionId: 'walk',
              },
              css: 'background:url(https://evil.example)',
            },
          ],
        },
      },
      {
        source: {
          storyId: fixtureIds.storyId,
          passageId: fixtureIds.passageId,
        },
        directive,
        assets: {
          plate: {
            src: 'javascript:alert(1)',
            width: 32,
            height: 32,
            description: null,
          },
        },
      },
    ];
    for (const stored of cases) {
      const { unmount } = render(
        <StoryFrame
          storiesHref="/stories"
          storyLabel="Ashfall Approach"
          paragraphs={[prose]}
          intentions={[
            { id: 'walk', label: 'Walk the gate road' },
            { id: 'wait', label: 'Wait and watch' },
          ]}
          presentation={resolveLivePresentation(projectSnapshot(stored))}
          onIntentionSelect={() => undefined}
        />,
      );
      expect(screen.getByText(prose)).toBeVisible();
      expect(screen.getByRole('button', { name: /Walk the gate road/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Wait and watch/i })).toBeEnabled();
      expect(document.body.innerHTML).not.toContain('evil.example');
      expect(document.body.innerHTML).not.toContain('#1a3040');
      await user.click(screen.getByRole('button', { name: /Walk the gate road/i }));
      unmount();
    }
  });

  it('keeps the current options when the offer id is stale', () => {
    renderBook({
      source: {
        storyId: fixtureIds.storyId,
        passageId: fixtureIds.passageId,
        campaignOfferId: staleOfferId,
      },
      directive: {
        ...directive,
        choices: [
          {
            target: { kind: 'campaign', offerId: staleOfferId, path: ['look'] },
            surface: 'filled',
          },
        ],
      },
    });
    expect(document.querySelector('[data-lighting]')).toHaveAttribute('data-lighting', 'dim');
    expect(screen.getByRole('button', { name: /Walk the gate road/i })).not.toHaveAttribute(
      'data-surface',
      'filled',
    );
    expect(screen.getAllByRole('button', { name: /Walk the gate road|Wait and watch/ })).toHaveLength(
      2,
    );
  });
});
