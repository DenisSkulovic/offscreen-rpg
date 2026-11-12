import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { draftIdSchema } from '@offscreen/contracts/drafts';
import { requireViewer } from '@/src/server/viewer';
import {
  applyNestRoutePolicy,
  nestFetch,
  readNestJson,
} from '@/src/server/nest-reader';
import { DraftEditor } from '@/src/features/stories/draft-editor';
import { mechanicalContentCatalogueSchema } from '@offscreen/contracts/openings';
import { classifyNestStatus } from '@/src/shared/api/classify-nest-status';

export default async function NewDraft({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const viewer = await requireViewer();
  const parsed = draftIdSchema.safeParse((await searchParams).id);
  if (!parsed.success) redirect(`/stories/new?id=${randomUUID()}`);
  const existing = await nestFetch(viewer, `/api/drafts/${parsed.data}`);
  const existingStatus = classifyNestStatus(existing.status);
  if (existingStatus.kind === 'success') redirect(`/stories/${parsed.data}`);
  if (existingStatus.kind === 'unauthorized') redirect('/sign-in');
  if (existingStatus.kind !== 'not_found')
    applyNestRoutePolicy(existing.status);
  const catalogue = await readNestJson(
    viewer,
    `/api/drafts/${parsed.data}/openings/catalogue`,
    mechanicalContentCatalogueSchema,
  );
  return (
    <DraftEditor
      viewerId={viewer.user.id}
      id={parsed.data}
      initial={null}
      preparedStarts={catalogue.entries}
    />
  );
}
