'use client';
import { useRef, useState } from 'react';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { readSnapshotFromResponse, readStorySnapshot, submitStoryJson } from './story-transport';

export function useCampaignCommand(storyId: string, onSnapshot: (story: StorySnapshot) => void) {
  const saved = useRef<{ url: string; body: unknown } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function send(route?: string, body?: unknown) {
    if (busy || (route && saved.current)) return;
    if (route) saved.current = { url: `/api/stories/${storyId}/${route}/${crypto.randomUUID()}`, body };
    if (!saved.current) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await submitStoryJson(saved.current);
      if (response.status === 409) {
        saved.current = null;
        onSnapshot(await readStorySnapshot(storyId));
        setMessage('The saved state changed or these settings are locked. Review the latest state.');
      } else if (response.status === 400) {
        saved.current = null;
        setMessage('These values are not supported. Review the settings and try again.');
      } else if (!response.ok) {
        throw new Error('Unavailable');
      } else {
        onSnapshot(await readSnapshotFromResponse(response));
        saved.current = null;
        setMessage('Saved.');
      }
    } catch {
      setMessage('Could not confirm the result. Retry the same request or reload to recover saved state.');
    } finally { setBusy(false); }
  }
  return { send, busy, message, retry: saved.current !== null };
}
