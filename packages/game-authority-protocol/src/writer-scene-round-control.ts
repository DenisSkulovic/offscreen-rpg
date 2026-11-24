import { z } from 'zod';
import { gameAuthorityErrorSchema } from './game-authority';

export const writerSceneRoundControlContractVersion =
  'writer-scene-round.control.v1' as const;

export const writerSceneRoundControlVersionHeader =
  'x-offscreen-writer-scene-round-control-version' as const;

export const writerSceneRoundMissionIdSchema = z.uuid();

export const writerSceneRoundExecutionPlanSchema = z.strictObject({
  missionId: writerSceneRoundMissionIdSchema,
  contextId: writerSceneRoundMissionIdSchema,
  ordinal: z.number().int().positive(),
  expectedRevision: z.number().int().positive(),
  model: z.string().min(1).max(128),
  maxModelRounds: z.number().int().positive(),
});

export const writerSceneRoundMissionStateSchema = z.strictObject({
  status: z.enum(['published', 'replayed', 'held', 'uncertain', 'pending']),
  reason: z.string().min(1).max(256).optional(),
});

const writerSceneRoundFinalizeTerminalSchema = z.strictObject({
  status: z.enum(['published', 'replayed', 'held', 'uncertain']),
  reason: z.string().min(1).max(256).optional(),
});

const writerSceneRoundFinalizeNeedsNextRoundSchema = z.strictObject({
  status: z.literal('needs-next-round'),
  nextOrdinal: z.number().int().positive(),
  nextRevision: z.number().int().positive(),
});

export const writerSceneRoundFinalizeResultSchema = z.union([
  writerSceneRoundFinalizeTerminalSchema,
  writerSceneRoundFinalizeNeedsNextRoundSchema,
]);

export const writerSceneRoundPlanResponseSchema = z.union([
  writerSceneRoundExecutionPlanSchema,
  z.strictObject({
    status: z.literal('held'),
    reason: z.string().min(1).max(256),
  }),
]);

export const writerSceneRoundHttpErrorSchema = gameAuthorityErrorSchema;

export type WriterSceneRoundExecutionPlan = z.infer<
  typeof writerSceneRoundExecutionPlanSchema
>;
export type WriterSceneRoundMissionState = z.infer<
  typeof writerSceneRoundMissionStateSchema
>;
export type WriterSceneRoundFinalizeResult = z.infer<
  typeof writerSceneRoundFinalizeResultSchema
>;

export function writerSceneRoundPlanPath(missionId: string): string {
  writerSceneRoundMissionIdSchema.parse(missionId);
  return `/internal/v1/writer-scene-rounds/${missionId}/plan`;
}

export function writerSceneRoundFinalizePath(missionId: string): string {
  writerSceneRoundMissionIdSchema.parse(missionId);
  return `/internal/v1/writer-scene-rounds/${missionId}/finalize`;
}

export function writerSceneRoundStatePath(missionId: string): string {
  writerSceneRoundMissionIdSchema.parse(missionId);
  return `/internal/v1/writer-scene-rounds/${missionId}/state`;
}

export type WriterSceneRoundControlRoute =
  | { kind: 'plan'; missionId: string }
  | { kind: 'finalize'; missionId: string }
  | { kind: 'state'; missionId: string }
  | { kind: 'invalid' }
  | { kind: 'absent' };

export function routeWriterSceneRoundControl(
  method: string,
  pathname: string,
): WriterSceneRoundControlRoute {
  const parts = pathname.split('/').filter((part) => part.length > 0);
  if (
    parts[0] !== 'internal' ||
    parts[1] !== 'v1' ||
    parts[2] !== 'writer-scene-rounds'
  ) {
    return { kind: 'absent' };
  }
  if (parts.length !== 5) {
    return { kind: 'invalid' };
  }
  const missionId = writerSceneRoundMissionIdSchema.safeParse(parts[3]);
  if (!missionId.success) {
    return { kind: 'invalid' };
  }
  if (parts[4] === 'plan' && method === 'POST') {
    return { kind: 'plan', missionId: missionId.data };
  }
  if (parts[4] === 'finalize' && method === 'POST') {
    return { kind: 'finalize', missionId: missionId.data };
  }
  if (parts[4] === 'state' && method === 'GET') {
    return { kind: 'state', missionId: missionId.data };
  }
  return { kind: 'invalid' };
}