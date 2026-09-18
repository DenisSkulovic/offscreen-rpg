import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export const apiOrigin = () =>
  process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001';
export async function requireViewer() {
  const cookie = (await headers()).get('cookie') ?? '';
  const response = await fetch(`${apiOrigin()}/api/me`, {
    headers: { cookie },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 401) redirect('/sign-in');
  if (!response.ok) throw new Error('Account could not be loaded');
  const user = z
    .object({ id: z.string(), name: z.string(), email: z.string() })
    .parse(await response.json());
  return { user, cookie };
}
