import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireViewer } from '@/src/server/viewer';
import { isStoryLaunchEnabled } from '@/src/server/story-launch-capability';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { StoryLaunchForm } from '@/src/features/stories/story-launch-form';
import '@/src/features/stories/story-launch.css';

export default async function StoryLaunchPage() {
  const viewer = await requireViewer();
  if (!isStoryLaunchEnabled()) {
    redirect('/stories/new');
  }
  const viewerId = viewer.user.id;
  return (
    <main className="story-launch">
      <SessionRefresh />
      <h1 className="story-launch__title">Play from a prompt</h1>
      <p className="story-launch__lede">
        Describe where the story should begin. A title and a character are not
        required. Play starts only after the server reports a ready story.
      </p>
      <p>
        <Link href="/stories">Back to your stories</Link>
      </p>
      <StoryLaunchForm viewerId={viewerId} presets={[]} />
    </main>
  );
}
