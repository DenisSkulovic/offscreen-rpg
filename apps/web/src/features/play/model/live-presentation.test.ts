import { describe, expect, it } from 'vitest';
import { harborPresentation } from '../presentation/fixtures';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import { resolveLivePresentation } from './live-presentation';

describe('resolveLivePresentation', () => {
  it('returns null when appearance is absent', () => {
    expect(resolveLivePresentation(makeStorySnapshot())).toBeNull();
  });

  it('applies a published V1 directive bound to the current passage', () => {
    const story = makeStorySnapshot();
    const withAppearance = {
      ...story,
      current: {
        ...story.current,
        appearance: {
          source: {
            storyId: story.id,
            passageId: story.current.id,
            interactionId: story.current.interaction?.id,
          },
          directive: harborPresentation,
        },
      },
    };
    const resolved = resolveLivePresentation(withAppearance);
    expect(resolved?.applied).toBe(true);
    expect(resolved?.storyId).toBe(story.id);
    expect(resolved?.passageId).toBe(story.current.id);
  });

  it('ignores appearance aimed at another passage', () => {
    const story = makeStorySnapshot();
    const withAppearance = {
      ...story,
      current: {
        ...story.current,
        appearance: {
          source: {
            storyId: story.id,
            passageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          },
          directive: harborPresentation,
        },
      },
    };
    expect(resolveLivePresentation(withAppearance)).toBeNull();
  });
});
