import { redirect } from 'next/navigation';

/** Compatibility entry: canonical creation lives at `/stories/new`. */
export default function StoryLaunchRedirect() {
  redirect('/stories/new');
}
