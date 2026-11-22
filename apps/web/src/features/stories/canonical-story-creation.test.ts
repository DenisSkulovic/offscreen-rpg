import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

function readAppSource(relative: string): string {
  return readFileSync(path.join(webRoot, relative), 'utf8');
}

describe('canonical story creation routes', () => {
  it('routes new creation through StoryLaunchForm only', () => {
    const source = readAppSource('app/(authenticated)/stories/new/page.tsx');
    expect(source).toContain('StoryLaunchForm');
    expect(source).toContain('requireViewer');
    expect(source).not.toContain('DraftEditor');
    expect(source).not.toContain('randomUUID');
    expect(source).not.toContain('story-launch-capability');
  });

  it('keeps launch as a compatibility redirect to new', () => {
    const source = readAppSource('app/(authenticated)/stories/launch/page.tsx');
    expect(source).toContain("redirect('/stories/new')");
    expect(source).not.toContain('StoryLaunchForm');
    expect(source).not.toContain('isStoryLaunchEnabled');
  });

  it('stories home has no launch feature gate', () => {
    const home = readAppSource('app/(authenticated)/stories/page.tsx');
    expect(home).toContain('href="/stories/new"');
    expect(home).not.toContain('/stories/launch');
    expect(home).not.toContain('isStoryLaunchEnabled');
    expect(home).not.toContain('STORY_LAUNCH_ENABLED');
  });

  it('saved drafts still use DraftEditor on /stories/[id]', () => {
    const source = readAppSource('app/(authenticated)/stories/[id]/page.tsx');
    expect(source).toContain('DraftEditor');
  });
});
