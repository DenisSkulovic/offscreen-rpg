'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  storyLaunchRequestSchema,
  storyLaunchStatusSchema,
  type StoryLaunchRequest,
  type StoryLaunchStatus,
} from '@offscreen/contracts/story-launch';
import {
  clearLaunchPointer,
  hashStoryLaunchRequest,
  loadLaunchPointer,
  saveLaunchPointer,
} from '@/src/shared/api/story-launch-intent-store';

const POLL_MS = 2000;
const NEEDS_INPUT_404 =
  'This launch was not submitted. Enter the prompt again. Nothing was started.';

export type StoryLaunchPhase =
  | { kind: 'idle' }
  | { kind: 'needs-input'; message: string }
  | { kind: 'submitting'; operationId: string }
  | { kind: 'polling'; status: StoryLaunchStatus }
  | { kind: 'attention'; status: StoryLaunchStatus }
  | { kind: 'ready'; status: StoryLaunchStatus; href: string }
  | { kind: 'rejected'; message: string };

function freezeLaunchRequest(request: StoryLaunchRequest): string {
  return JSON.stringify(request);
}

function isPollingState(state: StoryLaunchStatus['state']): boolean {
  return state === 'pending' || state === 'preparing' || state === 'composing';
}

async function putLaunch(
  operationId: string,
  frozenBody: string,
): Promise<
  | { outcome: 'status'; status: StoryLaunchStatus }
  | { outcome: 'unauthorized' }
  | { outcome: 'recover' }
> {
  try {
    const response = await fetch(`/api/stories/launch/${operationId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: frozenBody,
    });
    if (response.status === 401) {
      return { outcome: 'unauthorized' };
    }
    if (response.status === 202) {
      return { outcome: 'recover' };
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { outcome: 'recover' };
    }
    const parsed = storyLaunchStatusSchema.safeParse(json);
    if (response.ok && parsed.success) {
      return { outcome: 'status', status: parsed.data };
    }
    if (parsed.success) {
      return { outcome: 'status', status: parsed.data };
    }
    return { outcome: 'recover' };
  } catch {
    return { outcome: 'recover' };
  }
}

async function getLaunchStatus(
  operationId: string,
): Promise<
  | { outcome: 'status'; status: StoryLaunchStatus }
  | { outcome: 'not_found' }
  | { outcome: 'malformed' }
  | { outcome: 'unauthorized' }
> {
  try {
    const response = await fetch(`/api/stories/launch/${operationId}`, {
      cache: 'no-store',
    });
    if (response.status === 401) {
      return { outcome: 'unauthorized' };
    }
    if (response.status === 404) {
      return { outcome: 'not_found' };
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { outcome: 'malformed' };
    }
    const parsed = storyLaunchStatusSchema.safeParse(json);
    if (!parsed.success) {
      return { outcome: 'malformed' };
    }
    return { outcome: 'status', status: parsed.data };
  } catch {
    return { outcome: 'malformed' };
  }
}

export function useStoryLaunch(viewerId: string) {
  const [phase, setPhase] = useState<StoryLaunchPhase>({ kind: 'idle' });
  const phaseRef = useRef<StoryLaunchPhase>(phase);
  phaseRef.current = phase;
  const requestRef = useRef<StoryLaunchRequest | null>(null);
  const mountRecoveryStarted = useRef(false);

  const applyStatus = useCallback((status: StoryLaunchStatus) => {
    const state = status.state;
    if (isPollingState(state)) {
      setPhase({ kind: 'polling', status });
      return;
    }
    if (state === 'held' || state === 'failed' || state === 'uncertain') {
      setPhase({ kind: 'attention', status });
      return;
    }
    if (state === 'ready') {
      const href = `/play/${status.storyId}`;
      setPhase({ kind: 'ready', status, href });
      window.location.assign(href);
    }
  }, []);

  const handleGetResult = useCallback(
    (result: Awaited<ReturnType<typeof getLaunchStatus>>) => {
      if (result.outcome === 'status') {
        applyStatus(result.status);
        return;
      }
      if (result.outcome === 'not_found') {
        requestRef.current = null;
        clearLaunchPointer(viewerId);
        setPhase({ kind: 'needs-input', message: NEEDS_INPUT_404 });
        return;
      }
      if (result.outcome === 'unauthorized') {
        setPhase({
          kind: 'rejected',
          message: 'Sign in again, then retry.',
        });
        return;
      }
      setPhase({
        kind: 'rejected',
        message: 'The server status could not be read.',
      });
    },
    [applyStatus, viewerId],
  );

  const refreshStatus = useCallback(async () => {
    const pointer = loadLaunchPointer(viewerId);
    if (!pointer) {
      setPhase({
        kind: 'needs-input',
        message: 'No launch in progress. Enter a prompt to begin.',
      });
      return;
    }
    const result = await getLaunchStatus(pointer.operationId);
    handleGetResult(result);
  }, [handleGetResult, viewerId]);

  const beginLaunch = useCallback(
    async (input: {
      prompt: string;
      preset?: { presetId: string; presetRootHash: string };
      hints?: {
        storytellerProfile?: string;
        worldInvention?: 'original' | 'source-bound';
      };
    }) => {
      const currentPhase = phaseRef.current;
      if (
        currentPhase.kind === 'submitting' ||
        currentPhase.kind === 'polling'
      ) {
        return;
      }

      const operationId = crypto.randomUUID();
      const trimmed = input.prompt.trim();

      let source: StoryLaunchRequest['source'];
      if (input.preset) {
        const base = {
          kind: 'preset' as const,
          presetId: input.preset.presetId,
          presetRootHash: input.preset.presetRootHash,
        };
        source =
          trimmed.length > 0 ? { ...base, customPrompt: input.prompt } : base;
      } else {
        source = { kind: 'prompt', prompt: input.prompt };
      }

      const parsed = storyLaunchRequestSchema.safeParse({
        operationId,
        source,
        hints: input.hints,
      });
      if (!parsed.success) {
        const issues = parsed.error.issues;
        const message =
          issues.some((i) => i.code === 'too_big') ||
          input.prompt.length > 24000
            ? 'The prompt is too long.'
            : 'Enter a prompt before launching.';
        setPhase({ kind: 'rejected', message });
        return;
      }

      const frozenBody = freezeLaunchRequest(parsed.data);
      requestRef.current = parsed.data;
      const requestHash = await hashStoryLaunchRequest(parsed.data);
      saveLaunchPointer({
        version: 1,
        viewerId,
        operationId,
        requestHash,
        createdAt: Date.now(),
      });

      setPhase({ kind: 'submitting', operationId });

      const putResult = await putLaunch(operationId, frozenBody);
      if (putResult.outcome === 'unauthorized') {
        setPhase({
          kind: 'rejected',
          message: 'Sign in again, then retry.',
        });
        return;
      }
      if (putResult.outcome === 'status') {
        applyStatus(putResult.status);
        return;
      }

      // Lost or ambiguous PUT: one GET, never a second PUT.
      const getResult = await getLaunchStatus(operationId);
      handleGetResult(getResult);
    },
    [applyStatus, handleGetResult, viewerId],
  );

  useEffect(() => {
    if (mountRecoveryStarted.current) {
      return;
    }
    mountRecoveryStarted.current = true;
    const pointer = loadLaunchPointer(viewerId);
    if (!pointer) {
      return;
    }
    void getLaunchStatus(pointer.operationId).then(handleGetResult);
  }, [handleGetResult, viewerId]);

  useEffect(() => {
    if (phase.kind !== 'polling') {
      return;
    }
    let cancelled = false;

    function tick() {
      if (cancelled || document.visibilityState === 'hidden') {
        return;
      }
      void refreshStatus();
    }

    const intervalId = window.setInterval(tick, POLL_MS);

    function onVisibility() {
      if (document.visibilityState === 'visible' && !cancelled) {
        void refreshStatus();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase.kind, refreshStatus]);

  return {
    phase,
    beginLaunch,
    refreshStatus,
  };
}
