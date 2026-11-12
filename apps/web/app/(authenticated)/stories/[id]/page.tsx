import { notFound } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { draftIdSchema, draftSchema } from '@offscreen/contracts/drafts';
import { requireViewer } from '@/src/server/viewer';
import { readNestJson } from '@/src/server/nest-reader';
import { DraftEditor } from '@/src/features/stories/draft-editor';
import { mechanicalContentCatalogueSchema } from '@offscreen/contracts/openings';
import { createServerQueryClient } from '@/src/shared/api/query-client';
import { draftQueryOptions } from '@/src/shared/api/draft-query';

export default async function SavedDraft({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const parsed = draftIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  // Draft ownership/404 before catalogue so a missing draft cannot surface as 5xx.
  const draft = await readNestJson(
    viewer,
    `/api/drafts/${parsed.data}`,
    draftSchema,
  );
  const catalogue = await readNestJson(
    viewer,
    `/api/drafts/${parsed.data}/openings/catalogue`,
    mechanicalContentCatalogueSchema,
  );
  const queryClient = createServerQueryClient();
  await queryClient.prefetchQuery({
    ...draftQueryOptions(viewer.user.id, parsed.data),
    queryFn: async () => draft,
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DraftEditor
        viewerId={viewer.user.id}
        id={parsed.data}
        initial={draft}
        preparedStarts={catalogue.entries}
      />
    </HydrationBoundary>
  );
}
