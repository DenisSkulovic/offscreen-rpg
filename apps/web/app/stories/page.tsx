import { storyListSchema } from '@offscreen/contracts/stories';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import Link from 'next/link';
import { draftListSchema } from '@offscreen/contracts/drafts';
import { apiOrigin, requireViewer } from '@/src/lib/viewer';
import { SignOutButton } from '@/src/features/session/sign-out-button';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { DraftList } from '@/src/features/stories/draft-list';

export default async function Stories() {
  const { user, cookie } = await requireViewer();
  const response = await fetch(`${apiOrigin()}/api/drafts`, {
    headers: { cookie },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error('Drafts could not be loaded');
  }
  const liveResponse = await fetch(`${apiOrigin()}/api/stories`, {
    headers: { cookie },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!liveResponse.ok) {
    throw new Error('Stories could not be loaded');
  }
  const liveStories = storyListSchema.parse(await liveResponse.json());
  return (
    <main>
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG</p>
      <h1>Welcome, {user.name}.</h1>
      <Link className="button" href="/stories/new">
        New story
      </Link>
      <LiveStoryList initial={liveStories} />
      <DraftList initial={draftListSchema.parse(await response.json())} />
      <SignOutButton />
    </main>
  );
}
