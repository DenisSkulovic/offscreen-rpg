import Link from 'next/link';
import { requireViewer } from '@/src/server/viewer';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { StoryLaunchForm } from '@/src/features/stories/launch/story-launch-form';
import '@/src/features/stories/story-launch.css';

export default async function NewStoryPage() {
  const viewer = await requireViewer();
  const viewerId = viewer.user.id;
  return (
    <main className="story-launch">
      <SessionRefresh />
      <h1 className="story-launch__title">Create a story</h1>
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
