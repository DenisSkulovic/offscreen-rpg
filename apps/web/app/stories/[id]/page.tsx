import { notFound, redirect } from 'next/navigation';
import { draftIdSchema, draftSchema } from '@offscreen/contracts/drafts';
import { apiOrigin, requireViewer } from '@/src/lib/viewer';
import { DraftEditor } from '@/src/features/stories/draft-editor';

export default async function SavedDraft({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { cookie } = await requireViewer();
  const parsed = draftIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const response = await fetch(`${apiOrigin()}/api/drafts/${parsed.data}`, {
    headers: { cookie },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) notFound();
  if (response.status === 401) redirect('/sign-in');
  if (!response.ok) throw new Error('Draft could not be loaded');
  return (
    <DraftEditor
      id={parsed.data}
      initial={draftSchema.parse(await response.json())}
    />
  );
}
