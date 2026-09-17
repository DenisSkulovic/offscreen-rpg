import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { SignOutButton } from './sign-out-button';
import { SessionRefresh } from './session-refresh';

const viewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export default async function Stories() {
  const requestHeaders = await headers();
  const response = await fetch(
    `${process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001'}/api/me`,
    {
      headers: { cookie: requestHeaders.get('cookie') ?? '' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 401) redirect('/sign-in');
  if (!response.ok) throw new Error('Account could not be loaded');
  const user = viewerSchema.parse(await response.json());
  return (
    <main>
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG</p>
      <h1>Welcome, {user.name}.</h1>
      <p>Your account is ready. Story creation is coming next.</p>
      <SignOutButton />
    </main>
  );
}
