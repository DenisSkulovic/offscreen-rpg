import Link from 'next/link';
import { draftListSchema } from '@offscreen/contracts/drafts';
import { apiOrigin, requireViewer } from './viewer';
import { SignOutButton } from './sign-out-button';
import { SessionRefresh } from './session-refresh';
import { DraftList } from './draft-list';

export default async function Stories() {
  const { user, cookie } = await requireViewer();
  const response = await fetch(`${apiOrigin()}/api/drafts`, {
    headers: { cookie },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Drafts could not be loaded');
  return (
    <main>
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG</p>
      <h1>Welcome, {user.name}.</h1>
      <Link className="button" href="/stories/new">
        New story
      </Link>
      <DraftList initial={draftListSchema.parse(await response.json())} />
      <p>
        <Link href="/chamber">Open the scripted testing chamber</Link>
      </p>
      <SignOutButton />
    </main>
  );
}
