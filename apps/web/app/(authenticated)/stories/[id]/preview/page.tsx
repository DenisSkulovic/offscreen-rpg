import { notFound, redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { draftIdSchema, draftSchema } from '@offscreen/contracts/drafts';
import {
  latestOpeningSchema,
  mechanicalContentCatalogueSchema,
} from '@offscreen/contracts/openings';
import { requireViewer } from '@/src/server/viewer';
import { nestFetch, parseNestJson } from '@/src/server/nest-reader';
import { NestTransientError } from '@/src/server/nest-errors';
import { OpeningPreviewPanel } from '@/src/features/stories/opening-preview';
import { classifyNestStatus } from '@/src/shared/api/classify-nest-status';
import { createServerQueryClient } from '@/src/shared/api/query-client';
import { openingQueryOptions } from '@/src/shared/api/opening-query';

export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const parsed = draftIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const [draftResponse, previewResponse, catalogueResponse] = await Promise.all(
    [
      nestFetch(viewer, `/api/drafts/${parsed.data}`),
      nestFetch(viewer, `/api/drafts/${parsed.data}/openings/latest`),
      nestFetch(viewer, `/api/drafts/${parsed.data}/openings/catalogue`),
    ],
  );
  const statuses = [
    draftResponse.status,
    previewResponse.status,
    catalogueResponse.status,
  ].map(classifyNestStatus);
  if (statuses.some((status) => status.kind === 'unauthorized')) {
    redirect('/sign-in');
  }
  if (classifyNestStatus(draftResponse.status).kind === 'not_found') {
    notFound();
  }
  if (statuses.some((status) => status.kind !== 'success')) {
    throw new NestTransientError(
      [draftResponse, previewResponse, catalogueResponse].find(
        (response) => classifyNestStatus(response.status).kind !== 'success',
      )?.status ?? 503,
      'Preview could not be loaded',
    );
  }
  const draft = await parseNestJson(draftResponse, draftSchema);
  const preview = (await parseNestJson(previewResponse, latestOpeningSchema))
    .preview;
  const mechanicalContent = (
    await parseNestJson(catalogueResponse, mechanicalContentCatalogueSchema)
  ).entries;
  const queryClient = createServerQueryClient();
  await queryClient.prefetchQuery({
    ...openingQueryOptions(viewer.user.id, parsed.data),
    queryFn: async () => preview,
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OpeningPreviewPanel
        viewerId={viewer.user.id}
        draft={draft}
        initial={preview}
        mechanicalContent={mechanicalContent}
      />
    </HydrationBoundary>
  );
}
