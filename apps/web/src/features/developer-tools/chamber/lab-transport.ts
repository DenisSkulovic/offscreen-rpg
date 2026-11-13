import { z } from 'zod';

const requestTimeoutMs = 10000;

const scenarioSchema = z.object({
  id: z.string(),
  version: z.number(),
  name: z.string(),
  family: z.string(),
  costClass: z.string(),
  availabilityPerLane: z.record(z.string(), z.unknown()),
  searchTags: z.array(z.string()),
});

const openResultSchema = z.object({
  runId: z.string().uuid(),
  snapshot: z.object({
    runId: z.string().uuid(),
    lane: z.string(),
    lifecycle: z.string(),
    revision: z.number(),
    seed: z.number(),
    fixtureHash: z.string().nullable(),
    nextOrdinal: z.number(),
    breakpoint: z.string().nullable(),
    evidenceTier: z.string(),
  }),
  scenarioId: z.string(),
  scenarioVersion: z.number(),
  lane: z.string(),
  unavailableReason: z.string().nullable(),
});

async function labRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    ...(init?.body
      ? { headers: { 'content-type': 'application/json', ...init.headers } }
      : {}),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new Error(payload?.message ?? payload?.code ?? 'lab_unavailable');
  }
  return response;
}

export async function readLabScenarios(q?: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const response = await labRequest(`/api/chamber-tools/lab/scenarios${query}`);
  return z.array(scenarioSchema).parse(await response.json());
}

export async function readLabCommands() {
  const response = await labRequest('/api/chamber-tools/lab/commands');
  return z
    .array(
      z.object({
        name: z.string(),
        params: z.string(),
        description: z.string(),
      }),
    )
    .parse(await response.json());
}

export async function openLabRun(body: {
  scenarioId: string;
  scenarioVersion: number;
  lane: string;
  seed?: number;
}) {
  const response = await labRequest('/api/chamber-tools/lab/runs', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return openResultSchema.parse(await response.json());
}

export async function readLabRun(runId: string) {
  const response = await labRequest(`/api/chamber-tools/lab/runs/${runId}`);
  return z
    .object({
      runId: z.string().uuid(),
      snapshot: openResultSchema.shape.snapshot,
      scenarioId: z.string(),
      scenarioVersion: z.number(),
      lastObservation: z.unknown(),
      lastDelta: z.unknown(),
      evidence: z.unknown().nullable(),
    })
    .parse(await response.json());
}

export async function submitLabCommand(
  runId: string,
  commandId: string,
  body: unknown,
) {
  const response = await labRequest(
    `/api/chamber-tools/lab/runs/${runId}/commands/${commandId}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
  return response.json();
}

export async function replayLabRun(runId: string, operationId: string) {
  const response = await labRequest(
    `/api/chamber-tools/lab/runs/${runId}/replay/${operationId}`,
    { method: 'PUT' },
  );
  return openResultSchema.parse(await response.json());
}

export type LabScenario = z.infer<typeof scenarioSchema>;
export type LabOpenResult = z.infer<typeof openResultSchema>;
