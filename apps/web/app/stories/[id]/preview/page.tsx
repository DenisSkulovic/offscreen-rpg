import { notFound, redirect } from 'next/navigation';
import { draftIdSchema, draftSchema } from '@offscreen/contracts/drafts';
import { latestOpeningSchema } from '@offscreen/contracts/openings';
import { apiOrigin, requireViewer } from '@/src/lib/viewer';
import { OpeningPreviewPanel } from '@/src/features/stories/opening-preview';

export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { cookie } = await requireViewer();
  const parsed = draftIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const options = {
    headers: { cookie },
    cache: 'no-store' as const,
    signal: AbortSignal.timeout(5000),
  };
  const [draftResponse, previewResponse] = await Promise.all([
    fetch(`${apiOrigin()}/api/drafts/${parsed.data}`, options),
    fetch(`${apiOrigin()}/api/drafts/${parsed.data}/openings/latest`, options),
  ]);
  if (draftResponse.status === 401 || previewResponse.status === 401)
    redirect('/sign-in');
  if (draftResponse.status === 404) notFound();
  if (!draftResponse.ok || !previewResponse.ok)
    throw new Error('Preview could not be loaded');
  return (
    <OpeningPreviewPanel
      draft={draftSchema.parse(await draftResponse.json())}
      initial={latestOpeningSchema.parse(await previewResponse.json()).preview}
    />
  );
}
