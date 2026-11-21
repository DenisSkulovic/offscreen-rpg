import { describe, expect, it } from 'vitest';
import { isStoryLaunchEnabled } from './story-launch-capability';

describe('isStoryLaunchEnabled', () => {
  it('only the exact true flag enables launch', () => {
    expect(isStoryLaunchEnabled({})).toBe(false);
    expect(isStoryLaunchEnabled({ STORY_LAUNCH_ENABLED: undefined })).toBe(
      false,
    );
    expect(isStoryLaunchEnabled({ STORY_LAUNCH_ENABLED: '1' })).toBe(false);
    expect(isStoryLaunchEnabled({ STORY_LAUNCH_ENABLED: 'false' })).toBe(false);
    expect(isStoryLaunchEnabled({ STORY_LAUNCH_ENABLED: 'TRUE' })).toBe(false);
    expect(isStoryLaunchEnabled({ STORY_LAUNCH_ENABLED: 'true' })).toBe(true);
  });
});
