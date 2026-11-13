import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignInButton } from '@/src/features/session/sign-in-button';
import {
  DEFAULT_SAFE_ENTRY,
  resolveSafeEntryDestination,
} from '@/src/features/session/safe-entry-destination';
import { nestFetch } from '@/src/server/nest-reader';

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: nextRaw } = await searchParams;
  const next = resolveSafeEntryDestination(nextRaw);
  const cookie = (await headers()).get('cookie') ?? '';
  try {
    const session = await nestFetch({ cookie }, '/api/me');
    if (session.ok) redirect(next);
  } catch {
    // Nest down: still offer sign-in; Better Auth may be reachable separately.
  }

  return (
    <main>
      <p className="eyebrow">Offscreen RPG</p>
      <h1>
        A life beyond
        <br />
        the screen.
      </h1>
      <p>
        Sign in to continue
        {next === DEFAULT_SAFE_ENTRY
          ? ' to your stories.'
          : ' where you left off.'}
      </p>
      {error ? (
        <p role="alert">Sign-in was not completed. You can try again.</p>
      ) : null}
      <SignInButton next={next} />
      <p>
        <Link href="/demo">Back to the public preview</Link>
        {' · '}
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
