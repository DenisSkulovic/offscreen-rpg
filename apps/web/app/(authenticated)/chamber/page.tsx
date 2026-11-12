import { z } from 'zod';
import { redirect } from 'next/navigation';
import { requireViewer } from '@/src/server/viewer';
import { readNestJson } from '@/src/server/nest-reader';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { Chamber } from '@/src/features/developer-tools/chamber/view';

export default async function ChamberPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const viewer = await requireViewer();
  const { id } = await searchParams;
  if (id && !z.uuid().safeParse(id).success) {
    redirect('/chamber');
  }
  const initial = id
    ? await readNestJson(viewer, `/api/stories/${id}`, storySnapshotSchema, {
        optional: true,
      })
    : null;
  return (
    <Chamber
      viewerId={viewer.user.id}
      initial={initial}
      initialId={id ?? null}
    />
  );
}
