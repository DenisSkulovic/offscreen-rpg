import { notFound } from 'next/navigation';
import { z } from 'zod';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { requireViewer } from '@/src/server/viewer';
import { readNestJson } from '@/src/server/nest-reader';
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
  const story = await readNestJson(
    viewer,
    `/api/stories/${parsed.data}`,
    storySnapshotSchema,
  );
  return <PlayScene story={story} />;
}
