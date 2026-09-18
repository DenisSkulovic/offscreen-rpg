import { chamberInspectorSchema } from '@offscreen/contracts/chamber';
import {
  qaEvidenceBundleSchema,
  qaJourneyCaseSchema,
  qaRunSchema,
  qaRunSummarySchema,
  type FinalizeQaRun,
  type OpenQaRun,
  type RecordQaStage,
} from '@offscreen/contracts/qa';
import { z } from 'zod';
import {
  preferNewerSnapshot,
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
} from '@/src/lib/story-transport';

const requestTimeoutMs = 10000;

export {
  preferNewerSnapshot,
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
};

export async function readChamberInspector(
  storyId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/chamber-tools/stories/${storyId}`, {
    cache: 'no-store',
    signal:
      signal === undefined
        ? AbortSignal.timeout(requestTimeoutMs)
        : AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Unavailable');
  }
  return chamberInspectorSchema.parse(await response.json());
}

async function qaRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    ...(init?.body ? { headers: { 'content-type': 'application/json' } } : {}),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (!response.ok) {
    const code = (await response.json().catch(() => null)) as {
      code?: string;
    } | null;
    throw new Error(code?.code ?? 'qa_unavailable');
  }
  return response;
}

export async function readQaCases() {
  const response = await qaRequest('/api/chamber-tools/qa/cases');
  return z.array(qaJourneyCaseSchema).parse(await response.json());
}

export async function readQaRun(runId: string) {
  const response = await qaRequest(`/api/chamber-tools/qa/runs/${runId}`);
  return qaRunSchema.parse(await response.json());
}

export async function readQaRuns() {
  const response = await qaRequest('/api/chamber-tools/qa/runs');
  return z.array(qaRunSummarySchema).parse(await response.json());
}

export async function openQaRun(runId: string, body: OpenQaRun) {
  const response = await qaRequest(`/api/chamber-tools/qa/runs/${runId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return qaRunSchema.parse(await response.json());
}

export async function recordQaStage(
  runId: string,
  stageId: string,
  body: RecordQaStage,
) {
  const response = await qaRequest(
    `/api/chamber-tools/qa/runs/${runId}/stages/${stageId}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  return qaRunSchema.parse(await response.json());
}

export async function finalizeQaRun(runId: string, body: FinalizeQaRun) {
  const response = await qaRequest(
    `/api/chamber-tools/qa/runs/${runId}/finalization`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  return qaRunSchema.parse(await response.json());
}

export async function readQaEvidence(runId: string) {
  const response = await qaRequest(
    `/api/chamber-tools/qa/runs/${runId}/evidence`,
  );
  return qaEvidenceBundleSchema.parse(await response.json());
}
