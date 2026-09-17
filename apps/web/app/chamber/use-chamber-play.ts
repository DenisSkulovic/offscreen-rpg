'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import {
  preferNewerSnapshot,
  readChamberInspector,
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
} from './transport';
import type { ChamberInspector } from '@offscreen/contracts/chamber';

type PendingCommand = { id: string; body: unknown };

export function useChamberPlay(args: {
  initial: StorySnapshot | null;
  initialId: string | null;
}) {
  const [story, setStory] = useState(args.initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [inspector, setInspector] = useState<ChamberInspector | null>(null);
  const [inspectorError, setInspectorError] = useState('');
  const [inspectorPending, setInspectorPending] = useState(false);
  const startOperationId = useRef(args.initialId);
  const [scenario, setScenario] = useState('chamber.v3');
  const responseOperation = useRef<PendingCommand | null>(null);
  const controlOperation = useRef<PendingCommand | null>(null);
  const hasWaiting = story?.waiting != null || story?.decision != null;
  const storyId = story?.id;
  const storyRevision = story?.revision;
  const storyViewVersion = story?.viewVersion;

  function acceptSnapshot(next: StorySnapshot) {
    setStory((prior) => preferNewerSnapshot(prior, next));
  }

  const refreshInspector = useCallback(
    async (targetStoryId: string, signal?: AbortSignal) => {
      setInspectorPending(true);
      try {
        const next = await readChamberInspector(targetStoryId, signal);
        if (signal?.aborted) {
          return;
        }
        setInspector(next);
        setInspectorError(
          next
            ? ''
            : 'Inspector is unavailable. Use the local Chamber launcher for developer tools.',
        );
      } catch {
        if (!signal?.aborted) {
          setInspectorError(
            'Inspector could not be loaded. Retry refresh or reload.',
          );
        }
      } finally {
        if (!signal?.aborted) {
          setInspectorPending(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!storyId) {
      setInspector(null);
      setInspectorError('');
      return;
    }
    const controller = new AbortController();
    void refreshInspector(storyId, controller.signal);
    return () => {
      controller.abort();
    };
  }, [refreshInspector, storyId, storyRevision, storyViewVersion]);

  useEffect(() => {
    if (!hasWaiting || !storyId) {
      return;
    }
    const pollingStoryId = storyId;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const latest = await readStorySnapshot(
          pollingStoryId,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setStory((prior) => preferNewerSnapshot(prior, latest));
        }
      } catch {
        /* Failed reads never advance the story; reopening also recovers it. */
      }
      if (!controller.signal.aborted) {
        timer = setTimeout(() => void refresh(), 2000);
      }
    }
    timer = setTimeout(() => void refresh(), 2000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [hasWaiting, storyId]);

  async function control(action?: 'pause' | 'resume') {
    if (!story || pending) {
      return;
    }
    if (!controlOperation.current) {
      if (!action || !story.waiting?.canControl) {
        return;
      }
      controlOperation.current = {
        id: crypto.randomUUID(),
        body: {
          intervalId: story.current.id,
          expectedControlRevision: story.waiting.controlRevision,
          action,
        },
      };
    } else if (action) {
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await submitStoryJson({
        url: `/api/stories/${story.id}/controls/${controlOperation.current.id}`,
        body: controlOperation.current.body,
      });
      if (response.status === 409) {
        acceptSnapshot(await readStorySnapshot(story.id));
        setError(
          'The wait changed or is already due. The current saved situation is shown.',
        );
      } else {
        if (!response.ok) {
          throw new Error('Unavailable');
        }
        acceptSnapshot(await readSnapshotFromResponse(response));
      }
      controlOperation.current = null;
    } catch {
      setError(
        'Could not confirm the control. Retry the same request or reload.',
      );
    } finally {
      setPending(false);
    }
  }

  async function respond(optionId?: string) {
    if (!story || pending || !story.canRespond || !story.current.interaction) {
      return;
    }
    if (!responseOperation.current) {
      if (!optionId) {
        return;
      }
      responseOperation.current = {
        id: crypto.randomUUID(),
        body: {
          expectedRevision: story.revision,
          submission: {
            interactionId: story.current.interaction.id,
            answer: { kind: 'choice.v1', optionId },
          },
        },
      };
    } else if (optionId) {
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await submitStoryJson({
        url: `/api/stories/${story.id}/responses/${responseOperation.current.id}`,
        body: responseOperation.current.body,
      });
      if (response.status === 409) {
        acceptSnapshot(await readStorySnapshot(story.id));
        responseOperation.current = null;
        setError('The situation changed. The latest saved scene is shown.');
      } else {
        if (!response.ok) {
          throw new Error('Unavailable');
        }
        acceptSnapshot(await readSnapshotFromResponse(response));
        responseOperation.current = null;
      }
    } catch {
      setError(
        'Could not confirm this choice. Retry the same choice or reload to check saved progress.',
      );
    } finally {
      setPending(false);
    }
  }

  async function start() {
    if (pending || story) {
      return;
    }
    startOperationId.current ??= crypto.randomUUID();
    window.history.replaceState(
      null,
      '',
      `/chamber?id=${startOperationId.current}`,
    );
    setPending(true);
    setError('');
    try {
      const response = await submitStoryJson({
        url: `/api/stories/${startOperationId.current}/chamber`,
        body: { scenario },
      });
      if (!response.ok) {
        throw new Error('Unavailable');
      }
      acceptSnapshot(await readSnapshotFromResponse(response));
    } catch {
      setError(
        'Could not confirm the saved story. Retry the same request or reload. If your session expired, sign in again.',
      );
    } finally {
      setPending(false);
    }
  }

  return {
    story,
    pending,
    error,
    inspector,
    inspectorError,
    inspectorPending,
    refreshInspector: () => {
      if (storyId) {
        void refreshInspector(storyId);
      }
    },
    scenario,
    setScenario,
    startOperationId,
    responseOperation,
    controlOperation,
    control,
    respond,
    start,
  };
}
