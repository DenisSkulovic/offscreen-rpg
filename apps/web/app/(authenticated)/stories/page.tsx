import { storyListSchema } from '@offscreen/contracts/stories';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import Link from 'next/link';
import { draftListSchema } from '@offscreen/contracts/drafts';
import { requireViewer } from '@/src/server/viewer';
import { readNestJson } from '@/src/server/nest-reader';
import { SignOutButton } from '@/src/features/session/sign-out-button';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { DraftList } from '@/src/features/stories/draft-list';

export default async function Stories() {
  const viewer = await requireViewer();
  const [drafts, liveStories] = await Promise.all([
    readNestJson(viewer, '/api/drafts', draftListSchema),
    readNestJson(viewer, '/api/stories', storyListSchema),
  ]);
  return (
    <main>
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG</p>
      <h1>Welcome, {viewer.user.name}.</h1>
      <Link className="button" href="/stories/new">
        New story
      </Link>
      <LiveStoryList initial={liveStories} />
      <DraftList initial={drafts} />
      <SignOutButton />
    </main>
  );
}
