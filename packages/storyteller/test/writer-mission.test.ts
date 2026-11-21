import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  validateWriterMissionTaskResources,
  writerMissionTaskResourcesSchema,
  writerMissionCaptureSchema,
  writerRoundDecisionSchema,
  writerRoundTaskSchema,
  validateWriterRoundDecisionForCapture,
} from '../src/tasks';

const ROOT_HASH = 'a'.repeat(64);
const PROFILE_HASH = 'b'.repeat(64);
const SKILL_HASH = 'c'.repeat(64);
const REQUEST_HASH = 'd'.repeat(64);

function finiteWriterMissionCapture() {
  return {
    version: 'writer-mission.v1' as const,
    generationId: randomUUID(),
    operationId: randomUUID(),
    ownerId: randomUUID(),
    storyId: randomUUID(),
    sceneFrontier: {
      passageId: randomUUID(),
      narrativeRevision: 2,
      sequence: 14,
    },
    libraryRootHash: ROOT_HASH,
    libraryRootRevision: 3,
    profileObjectHash: PROFILE_HASH,
    skillObjectHashes: [SKILL_HASH],
    toolsAllowlist: ['library.read', 'workdesk.stage', 'submit_scene'] as const,
    modelSelection: {
      provider: 'openrouter' as const,
      model: 'test/writer-model',
    },
    budgets: {
      maxModelRounds: 6,
      maxInputTokens: 12_288,
      maxGeneratedTokens: 4_096,
      maxMicrousd: '250000',
      deadlineMs: 120_000,
    },
    capturedRequestHash: REQUEST_HASH,
  };
}

test('writer-mission.v1 capture and round decisions accept finite bounded grants', () => {
  const capture = writerMissionCaptureSchema.parse(finiteWriterMissionCapture());
  assert.equal(capture.version, 'writer-mission.v1');
  assert.deepEqual(capture.toolsAllowlist, [
    'library.read',
    'workdesk.stage',
    'submit_scene',
  ]);

  const toolRound = writerRoundDecisionSchema.parse({
    kind: 'tool-calls',
    calls: [
      {
        id: 't1',
        name: 'library.read',
        args: { handle: 's12' },
      },
    ],
  });
  validateWriterRoundDecisionForCapture(capture, toolRound);

  const finalRound = writerRoundDecisionSchema.parse({
    kind: 'final',
    proposal: {
      version: 1,
      summary: 'The scene closes with the promised cargo delivered.',
      stagedObjectHashes: [ROOT_HASH],
      sourceEvidence: [
        {
          rootHash: ROOT_HASH,
          objectHash: PROFILE_HASH,
          section: 's1',
          assertedAsFact: false,
        },
      ],
    },
  });
  assert.equal(finalRound.kind, 'final');

  const roundTask = writerRoundTaskSchema.parse({
    version: 'writer-round.v1',
    mission: capture,
  });
  assert.equal(roundTask.version, 'writer-round.v1');

  const resources = writerMissionTaskResourcesSchema.parse({
    version: 'storyteller-resources.v2',
    recipe: {
      version: 'writer-mission.v1',
      maxModelRounds: 6,
      maxToolCallsPerRound: 4,
      tools: ['library.read', 'workdesk.stage', 'submit_scene'],
      automaticEscalation: false,
      finalProposalReserveRounds: 1,
      maxRepairRounds: 0,
    },
    envelope: {
      maxSerializedRequestBytes: 48 * 1024,
      maxInputTokens: 12_288,
      maxGeneratedTokens: 4_096,
      maxReasoningTokens: 0,
      maxMicrousd: '250000',
      deadlineMs: 120_000,
    },
    authority: { kind: 'offline', version: 'offline-rehearsal.v1' },
  });
  assert.equal(resources.recipe.version, 'writer-mission.v1');
  validateWriterMissionTaskResources(resources);
});

test('writer-mission.v1 rejects missing root, grants, unlimited budgets, and ungranted tools', () => {
  const base = finiteWriterMissionCapture();

  assert.throws(
    () =>
      writerMissionCaptureSchema.parse({
        ...base,
        libraryRootHash: 'not-a-root',
      }),
    /Invalid string/,
  );

  assert.throws(
    () =>
      writerMissionCaptureSchema.parse({
        ...base,
        toolsAllowlist: [],
      }),
    /Too small: expected array to have >=1 items/,
  );

  assert.throws(
    () =>
      writerMissionCaptureSchema.parse({
        ...base,
        budgets: {
          ...base.budgets,
          maxModelRounds: Number.MAX_SAFE_INTEGER,
        },
      }),
    /Too big: expected number to be <=32/,
  );

  assert.throws(
    () =>
      writerMissionCaptureSchema.parse({
        ...base,
        budgets: {
          ...base.budgets,
          maxMicrousd: '0',
        },
      }),
    /finite and positive/,
  );

  const capture = writerMissionCaptureSchema.parse(base);
  assert.throws(
    () =>
      validateWriterRoundDecisionForCapture(
        capture,
        writerRoundDecisionSchema.parse({
          kind: 'tool-calls',
          calls: [
            {
              id: 't1',
              name: 'library.diff',
              args: { handle: 's12' },
            },
          ],
        }),
      ),
    /ungranted_writer_tool/,
  );

  assert.throws(
    () =>
      writerRoundDecisionSchema.parse({
        kind: 'tool-calls',
        calls: [
          {
            id: 't1',
            name: 'shell.exec',
            args: {},
          },
        ],
      }),
    /Invalid option/,
  );
});