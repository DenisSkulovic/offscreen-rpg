'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  storySnapshotSchema,
  type HistoricalScene,
} from '@offscreen/contracts/stories';
import { historicalForkStoryId } from './historical-fork-story-id';

export function useForkHistoricalScene({
  sourceStoryId,
  scene,
}: {
  sourceStoryId: string;
  scene: HistoricalScene;
}) {
  const router = useRouter();
  const [forkStoryId, setForkStoryId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [forked, setForked] = useState(false);

  useEffect(() => {
    let alive = true;
    setForkStoryId(null);
    setForked(false);
    void historicalForkStoryId(sourceStoryId, scene.asOfSequence).then((id) => {
      if (alive) setForkStoryId(id);
    });
    return () => {
      alive = false;
    };
  }, [scene.asOfSequence, sourceStoryId]);

  const fork = useCallback(async () => {
    if (!forkStoryId || pending || forked) return;
    setPending(true);
    try {
      const response = await fetch(
        `/api/stories/${sourceStoryId}/forks/${forkStoryId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expectedRevision: scene.asOfSequence,
            sourcePassageId: scene.current.id,
          }),
        },
      );
      if (!response.ok) {
        setPending(false);
        return;
      }
      storySnapshotSchema.parse(await response.json());
      setForked(true);
      router.push(`/play/${forkStoryId}`);
    } finally {
      setPending(false);
    }
  }, [
    forkStoryId,
    forked,
    pending,
    router,
    scene.asOfSequence,
    scene.current.id,
    sourceStoryId,
  ]);

  return { fork, pending, forked, forkStoryId, ready: forkStoryId !== null };
}