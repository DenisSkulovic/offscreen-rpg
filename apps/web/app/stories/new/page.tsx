import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { draftIdSchema } from '@offscreen/contracts/drafts';
import { apiOrigin, requireViewer } from '../viewer';
import { DraftEditor } from '../draft-editor';

export default async function NewDraft({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { cookie } = await requireViewer();
  const parsed = draftIdSchema.safeParse((await searchParams).id);
  if (!parsed.success) redirect(`/stories/new?id=${randomUUID()}`);
  const response = await fetch(`${apiOrigin()}/api/drafts/${parsed.data}`, {
    headers: { cookie },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (response.ok) redirect(`/stories/${parsed.data}`);
  if (response.status === 401) redirect('/sign-in');
  if (response.status !== 404) throw new Error('Draft could not be loaded');
  return <DraftEditor id={parsed.data} initial={null} />;
}
