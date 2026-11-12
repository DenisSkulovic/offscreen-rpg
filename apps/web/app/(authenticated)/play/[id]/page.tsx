import { notFound } from 'next/navigation';
import { z } from 'zod';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { requireViewer } from '@/src/server/viewer';
import { readNestJson } from '@/src/server/nest-reader';
import { seedAuthorizedQuery } from '@/src/server/seed-authorized-query';
import { createServerQueryClient } from '@/src/shared/api/query-client';
import { storySnapshotQueryOptions } from '@/src/shared/api/story-snapshot-query';
import { PlayQueryBoundary } from '@/src/features/play/play-query-boundary';
import { PlayScene } from '@/src/features/play/view';

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) {
    notFound();
  }
  const storyId = parsed.data;
  // Read through Nest route policy first so 401/404/503 propagate to Next.
  // prefetchQuery alone would swallow queryFn failures into the Query cache.
  const snapshot = await readNestJson(
    viewer,
    `/api/stories/${storyId}`,
    storySnapshotSchema,
  );
  const queryClient = createServerQueryClient();
  await seedAuthorizedQuery(
    queryClient,
    { queryKey: storySnapshotQueryOptions(viewer.user.id, storyId).queryKey },
    snapshot,
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlayQueryBoundary>
        <PlayScene viewerId={viewer.user.id} storyId={storyId} />
      </PlayQueryBoundary>
    </HydrationBoundary>
  );
}
