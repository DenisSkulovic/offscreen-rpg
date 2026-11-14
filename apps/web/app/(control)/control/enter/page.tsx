import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { EnterAdminSessionButton } from '@/src/features/admin/enter-admin-session';
import {
  resolveSafeControlDestination,
  signInHrefForControl,
} from '@/src/features/admin/safe-control-destination';
import { nestFetch } from '@/src/server/nest-reader';
import { adminSelfV1Schema } from '@offscreen/contracts/admin';

/**
 * Deliberate Admin enter surface. Requires a player session; never grants
 * staff from layout alone. Actual privileged cookie is minted by Nest POST.
 */
export default async function ControlEnterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const returnTo = resolveSafeControlDestination(nextRaw ?? '/control');
  const cookie = (await headers()).get('cookie') ?? '';

  const me = await nestFetch({ cookie }, '/api/me');
  if (me.status === 401) {
    redirect(signInHrefForControl('/control/enter'));
  }
  if (!me.ok) {
    return (
      <main>
        <h1>Offscreen Control</h1>
        <p role="alert">Account service unavailable. Try again shortly.</p>
        <p>
          <Link href="/">Home</Link>
        </p>
      </main>
    );
  }

  const adminMe = await nestFetch({ cookie }, '/api/admin/me');
  if (adminMe.ok) {
    const self = adminSelfV1Schema.safeParse(await adminMe.json());
    if (self.success) {
      redirect(returnTo === '/control/enter' ? '/control' : returnTo);
    }
  }

  return (
    <main>
      <p className="eyebrow">Offscreen Control</p>
      <h1>Enter staff mode</h1>
      <p>
        You are signed in as a player identity. Starting Admin requires an
        enrolled staff principal and a recent sign-in.
      </p>
      <EnterAdminSessionButton returnTo={returnTo} />
      <p>
        <Link href="/stories">Back to stories</Link>
        {' · '}
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
