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
import {
  writerMissionCaptureV1Schema,
  writerMissionCaptureV2OpeningSchema,
  writerMissionCaptureV3ContinuationSchema,
  writerOpeningSceneProposalV2Schema,
  writerSceneProposalSchema,
  writerSceneProposalV1Schema,
  writerSceneProposalV3Schema,
} from '../src/tasks/writer-mission.js';
import {
  compileWriterRoundCapturedRequest,
  hashWriterRoundCapturedRequest,
} from '../src/tasks/writer-round-request.js';

const ROOT_HASH = 'a'.repeat(64);
const PROFILE_HASH = 'b'.repeat(64);
const SKILL_HASH = 'c'.repeat(64);
const REQUEST_HASH = 'd'.repeat(64);

const FROZEN_V1_PASSAGE_ID = '55555555-5555-4555-8555-555555555555';
const FROZEN_STORY_ID = '44444444-4444-4444-8444-444444444444';
const FROZEN_V2_FIRST_PASSAGE_ID = '66666666-6666-4666-8666-666666666666';

/** WR04: wire schema adds research.delegate; mission capture bytes unchanged. */
const V1_WRITER_ROUND_CAPTURED_REQUEST_JSON =
  '{"messages":[{"role":"system","content":"You are a writer agent on a bounded mission. Reply with exactly one JSON object: either tool-calls with typed tool requests, or a final scene proposal."},{"role":"user","content":"{\\"version\\":\\"writer-round.v1\\",\\"pins\\":{\\"libraryRootHash\\":\\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\",\\"libraryRootRevision\\":3,\\"profileObjectHash\\":\\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\\",\\"skillObjectHashes\\":[\\"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\\"],\\"toolsAllowlist\\":[\\"library.read\\",\\"workdesk.stage\\",\\"submit_scene\\"],\\"sceneFrontier\\":{\\"passageId\\":\\"55555555-5555-4555-8555-555555555555\\",\\"narrativeRevision\\":2,\\"sequence\\":14}},\\"priorToolResults\\":[]}"}],"outputSchema":{"$schema":"https://json-schema.org/draft/2020-12/schema","oneOf":[{"type":"object","properties":{"kind":{"type":"string","const":"tool-calls"},"calls":{"minItems":1,"maxItems":8,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","pattern":"^t[1-9][0-9]*$"},"name":{"type":"string","enum":["library.browse","library.find","library.read","library.diff","skills.open","workdesk.stage","workdesk.read","workdesk.diff","workdesk.discard","submit_scene","research.delegate"]},"args":{"type":"object","propertyNames":{"type":"string"},"additionalProperties":{}}},"required":["id","name","args"],"additionalProperties":false}}},"required":["kind","calls"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"final"},"proposal":{"type":"object","properties":{"version":{"type":"number","const":1},"summary":{"type":"string","minLength":1,"maxLength":2000},"stagedObjectHashes":{"maxItems":16,"type":"array","items":{"type":"string","pattern":"^[a-f0-9]{64}$"}},"sourceEvidence":{"maxItems":32,"type":"array","items":{"type":"object","properties":{"rootHash":{"type":"string","pattern":"^[a-f0-9]{64}$"},"objectHash":{"type":"string","pattern":"^[a-f0-9]{64}$"},"section":{"type":"string","minLength":1,"maxLength":240},"assertedAsFact":{"type":"boolean"}},"required":["rootHash","objectHash","section","assertedAsFact"],"additionalProperties":false}}},"required":["version","summary","stagedObjectHashes","sourceEvidence"],"additionalProperties":false}},"required":["kind","proposal"],"additionalProperties":false}]}}';
const V1_WRITER_ROUND_CAPTURED_REQUEST_SHA256 =
  '90bfd3716676af33561bc9bf169b963d587351408b317a3a7b7db543fd905d02';

function frozenWriterMissionV1Capture() {
  return {
    version: 'writer-mission.v1' as const,
    generationId: '11111111-1111-4111-8111-111111111111',
    operationId: '22222222-2222-4222-8222-222222222222',
    ownerId: '33333333-3333-4333-8333-333333333333',
    storyId: FROZEN_STORY_ID,
    sceneFrontier: {
      passageId: FROZEN_V1_PASSAGE_ID,
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

function frozenWriterMissionV2OpeningCapture() {
  return {
    version: 'writer-mission.v2' as const,
    generationId: '11111111-1111-4111-8111-111111111111',
    operationId: '22222222-2222-4222-8222-222222222222',
    ownerId: '33333333-3333-4333-8333-333333333333',
    storyId: FROZEN_STORY_ID,
    sceneScope: {
      kind: 'opening' as const,
      reservedStoryId: FROZEN_STORY_ID,
      reservedFirstPassageId: FROZEN_V2_FIRST_PASSAGE_ID,
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

function finiteWriterMissionV2OpeningCapture() {
  const storyId = randomUUID();
  const reservedFirstPassageId = randomUUID();
  return {
    version: 'writer-mission.v2' as const,
    generationId: randomUUID(),
    operationId: randomUUID(),
    ownerId: randomUUID(),
    storyId,
    sceneScope: {
      kind: 'opening' as const,
      reservedStoryId: storyId,
      reservedFirstPassageId,
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

test('writer-round captured request pins v1 oracle hash and v2 opening sceneScope', () => {
  const v1Capture = writerMissionCaptureV1Schema.parse(
    frozenWriterMissionV1Capture(),
  );
  const v1Request = compileWriterRoundCapturedRequest(v1Capture, []);
  assert.equal(
    JSON.stringify(v1Request),
    V1_WRITER_ROUND_CAPTURED_REQUEST_JSON,
  );
  assert.equal(
    hashWriterRoundCapturedRequest(v1Request),
    V1_WRITER_ROUND_CAPTURED_REQUEST_SHA256,
  );
  const v1ReplayHash = hashWriterRoundCapturedRequest(
    compileWriterRoundCapturedRequest(v1Capture, []),
  );
  assert.equal(v1ReplayHash, V1_WRITER_ROUND_CAPTURED_REQUEST_SHA256);

  const v2Capture = writerMissionCaptureV2OpeningSchema.parse(
    frozenWriterMissionV2OpeningCapture(),
  );
  const v2Request = compileWriterRoundCapturedRequest(v2Capture, []);
  const userPayload = JSON.parse(
    (v2Request.messages[1] as { content: string }).content,
  ) as {
    version: string;
    pins: Record<string, unknown>;
    priorToolResults: unknown[];
  };
  assert.equal(userPayload.version, 'writer-round.v1');
  assert.ok('sceneScope' in userPayload.pins);
  assert.equal('sceneFrontier' in userPayload.pins, false);
  assert.deepEqual(userPayload.pins.sceneScope, {
    kind: 'opening',
    reservedStoryId: FROZEN_STORY_ID,
    reservedFirstPassageId: FROZEN_V2_FIRST_PASSAGE_ID,
  });
  assert.deepEqual(userPayload.pins.libraryRootHash, ROOT_HASH);
  assert.deepEqual(userPayload.pins.toolsAllowlist, [
    'library.read',
    'workdesk.stage',
    'submit_scene',
  ]);
  assert.deepEqual(userPayload.priorToolResults, []);
  assert.equal('passageHistory' in userPayload, false);
  assert.equal('priorPassages' in userPayload, false);

  const v2OutputSchemaJson = JSON.stringify(v2Request.outputSchema);
  assert.match(v2OutputSchemaJson, /"paragraphs"/);
  assert.match(v2OutputSchemaJson, /"title"/);
  assert.match(v2OutputSchemaJson, /"const":2/);

  const v2Hash = hashWriterRoundCapturedRequest(v2Request);
  const v2ReplayHash = hashWriterRoundCapturedRequest(
    compileWriterRoundCapturedRequest(v2Capture, []),
  );
  assert.equal(v2ReplayHash, v2Hash);
});

test('writer-round capture validation pins final proposal version to mission capture', () => {
  const v1Capture = writerMissionCaptureV1Schema.parse(
    finiteWriterMissionCapture(),
  );
  const v1Final = writerRoundDecisionSchema.parse({
    kind: 'final',
    proposal: finiteV1SceneProposal(),
  });
  validateWriterRoundDecisionForCapture(v1Capture, v1Final);

  const v2Capture = writerMissionCaptureV2OpeningSchema.parse(
    finiteWriterMissionV2OpeningCapture(),
  );
  const v2Final = writerRoundDecisionSchema.parse({
    kind: 'final',
    proposal: finiteV2OpeningSceneProposal(),
  });
  validateWriterRoundDecisionForCapture(v2Capture, v2Final);

  assert.throws(
    () =>
      validateWriterRoundDecisionForCapture(
        v1Capture,
        writerRoundDecisionSchema.parse({
          kind: 'final',
          proposal: finiteV2OpeningSceneProposal(),
        }),
      ),
    /writer_proposal_version_mismatch/,
  );

  assert.throws(
    () =>
      validateWriterRoundDecisionForCapture(
        v2Capture,
        writerRoundDecisionSchema.parse({
          kind: 'final',
          proposal: finiteV1SceneProposal(),
        }),
      ),
    /writer_proposal_version_mismatch/,
  );

  const ungranted = writerRoundDecisionSchema.parse({
    kind: 'tool-calls',
    calls: [
      {
        id: 't1',
        name: 'library.diff',
        args: { handle: 's12' },
      },
    ],
  });
  assert.throws(
    () => validateWriterRoundDecisionForCapture(v1Capture, ungranted),
    /ungranted_writer_tool/,
  );
});

test('writer-mission.v1 capture and round decisions accept finite bounded grants', () => {
  const capture = writerMissionCaptureSchema.parse(
    finiteWriterMissionCapture(),
  );
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
  validateWriterRoundDecisionForCapture(capture, finalRound);

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

test('writer-mission.v2 opening capture accepts reserved scope without sceneFrontier', () => {
  const capture = writerMissionCaptureV2OpeningSchema.parse(
    finiteWriterMissionV2OpeningCapture(),
  );
  assert.equal(capture.version, 'writer-mission.v2');
  assert.equal(capture.sceneScope.kind, 'opening');
  assert.equal(capture.sceneScope.reservedStoryId, capture.storyId);
  assert.ok(!('sceneFrontier' in capture));

  const unionCapture = writerMissionCaptureSchema.parse(capture);
  assert.equal(unionCapture.version, 'writer-mission.v2');

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

  const roundTask = writerRoundTaskSchema.parse({
    version: 'writer-round.v1',
    mission: capture,
  });
  assert.equal(roundTask.mission.version, 'writer-mission.v2');
});

function finiteV1SceneProposal() {
  return {
    version: 1 as const,
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
  };
}

function validOpeningPassageContent() {
  return {
    version: 1 as const,
    title: 'Seyda Neen',
    paragraphs: [
      'Rain beads on the hull as the skiff nudges the Imperial dock.',
      'Along the jetty, crates marked for Census Office wait under a sputtering lantern.',
    ],
  };
}

function validOpeningChoiceInteraction() {
  return {
    kind: 'choice.v1' as const,
    prompt: 'Where will you go first in Seyda Neen?',
    options: [
      { id: 'visit_officer', label: 'Seek the Census and Excise Office' },
      { id: 'wander_dock', label: 'Walk the dockside and listen' },
    ],
  };
}

function finiteV2OpeningSceneProposal() {
  return {
    version: 2 as const,
    summary: 'Opening at Seyda Neen with a grounded dock choice.',
    stagedObjectHashes: [ROOT_HASH],
    sourceEvidence: [
      {
        rootHash: ROOT_HASH,
        objectHash: PROFILE_HASH,
        section: 'seyda-neen.docks',
        assertedAsFact: true,
      },
    ],
    scene: {
      content: validOpeningPassageContent(),
      interaction: validOpeningChoiceInteraction(),
    },
  };
}

test('writer scene proposals keep v1 replay and accept v2 opening scene bodies', () => {
  const v1 = writerSceneProposalV1Schema.parse(finiteV1SceneProposal());
  assert.equal(v1.version, 1);
  assert.equal(writerSceneProposalSchema.parse(v1).version, 1);

  const v1Final = writerRoundDecisionSchema.parse({
    kind: 'final',
    proposal: finiteV1SceneProposal(),
  });
  assert.equal(v1Final.kind, 'final');
  assert.equal(v1Final.proposal.version, 1);

  const v2 = writerOpeningSceneProposalV2Schema.parse(
    finiteV2OpeningSceneProposal(),
  );
  assert.equal(v2.version, 2);
  assert.equal(v2.scene.content.title, 'Seyda Neen');
  assert.equal(v2.scene.interaction?.kind, 'choice.v1');

  const v2Final = writerRoundDecisionSchema.parse({
    kind: 'final',
    proposal: finiteV2OpeningSceneProposal(),
  });
  assert.equal(v2Final.kind, 'final');
  assert.equal(v2Final.proposal.version, 2);

  const v2NullInteraction = writerOpeningSceneProposalV2Schema.parse({
    ...finiteV2OpeningSceneProposal(),
    scene: {
      content: validOpeningPassageContent(),
      interaction: null,
    },
  });
  assert.equal(v2NullInteraction.scene.interaction, null);
});

test('writer v2 opening scene proposals reject invalid scene bodies and unknown keys', () => {
  const base = finiteV2OpeningSceneProposal();

  assert.throws(
    () =>
      writerOpeningSceneProposalV2Schema.parse({
        ...base,
        scene: undefined,
      }),
    /Invalid input: expected object, received undefined/,
  );

  assert.throws(
    () =>
      writerOpeningSceneProposalV2Schema.parse({
        ...base,
        scene: {
          ...base.scene,
          content: {
            ...validOpeningPassageContent(),
            title: '',
          },
        },
      }),
    /Too small: expected string to have >=1 characters/,
  );

  assert.throws(
    () =>
      writerOpeningSceneProposalV2Schema.parse({
        ...base,
        scene: {
          ...base.scene,
          interaction: {
            ...validOpeningChoiceInteraction(),
            options: [
              { id: 'dup', label: 'First path' },
              { id: 'dup', label: 'Second path' },
            ],
          },
        },
      }),
    /Option identities must be unique/,
  );

  assert.throws(() =>
    writerOpeningSceneProposalV2Schema.parse({
      ...base,
      extraField: 'forged',
    }),
  );
});

test('writer-mission ownerId: v1 keeps uuid, v2 accepts Better Auth text ids', () => {
  const v1Base = frozenWriterMissionV1Capture();
  writerMissionCaptureV1Schema.parse(v1Base);

  assert.throws(
    () =>
      writerMissionCaptureV1Schema.parse({
        ...v1Base,
        ownerId: 'user_bah_launch',
      }),
    /Invalid UUID/,
  );

  const v2Base = {
    ...finiteWriterMissionV2OpeningCapture(),
    ownerId: 'user_bah_launch',
  };
  const v2 = writerMissionCaptureV2OpeningSchema.parse(v2Base);
  assert.equal(v2.ownerId, 'user_bah_launch');

  assert.throws(
    () =>
      writerMissionCaptureV2OpeningSchema.parse({
        ...v2Base,
        ownerId: '',
      }),
    /Too small: expected string to have >=1 characters/,
  );

  assert.throws(
    () =>
      writerMissionCaptureV2OpeningSchema.parse({
        ...v2Base,
        ownerId: '   ',
      }),
    /must not be empty or whitespace-only/,
  );
});

test('writer-mission.v2 opening rejects malformed scope, drifted story, sceneFrontier injection, and grant violations', () => {
  const base = finiteWriterMissionV2OpeningCapture();

  assert.throws(
    () =>
      writerMissionCaptureV2OpeningSchema.parse({
        ...base,
        storyId: 'not-a-uuid',
      }),
    /Invalid UUID/,
  );

  assert.throws(
    () =>
      writerMissionCaptureV2OpeningSchema.parse({
        ...base,
        sceneScope: {
          ...base.sceneScope,
          reservedFirstPassageId: 'bad-passage-id',
        },
      }),
    /Invalid UUID/,
  );

  assert.throws(() =>
    writerMissionCaptureV2OpeningSchema.parse({
      ...base,
      sceneScope: {
        kind: 'opening',
        reservedStoryId: randomUUID(),
      },
    }),
  );

  assert.throws(
    () =>
      writerMissionCaptureV2OpeningSchema.parse({
        ...base,
        sceneScope: {
          ...base.sceneScope,
          reservedStoryId: randomUUID(),
        },
      }),
    /must match the mission storyId/,
  );

  assert.throws(() =>
    writerMissionCaptureV2OpeningSchema.parse({
      ...base,
      sceneFrontier: {
        passageId: randomUUID(),
        narrativeRevision: 1,
        sequence: 0,
      },
    }),
  );

  assert.throws(
    () =>
      writerMissionCaptureV2OpeningSchema.parse({
        ...base,
        toolsAllowlist: ['library.read', 'library.read'],
      }),
    /duplicate tool names/,
  );

  assert.throws(
    () =>
      writerMissionCaptureV2OpeningSchema.parse({
        ...base,
        budgets: {
          ...base.budgets,
          maxModelRounds: Number.MAX_SAFE_INTEGER,
        },
      }),
    /Too big: expected number to be <=32/,
  );

  const capture = writerMissionCaptureV2OpeningSchema.parse(base);
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
});

const CHECKPOINT_HASH = 'e'.repeat(64);
const BASE_OBJECT_HASH = 'f'.repeat(64);

function finiteWriterMissionV3ContinuationCapture() {
  const storyId = randomUUID();
  const basePassageId = randomUUID();
  return {
    version: 'writer-mission.v3' as const,
    generationId: randomUUID(),
    operationId: randomUUID(),
    ownerId: randomUUID(),
    storyId,
    sceneScope: {
      kind: 'continuation' as const,
      baseSceneSequence: 4,
      basePassageId,
      baseCheckpointHash: CHECKPOINT_HASH,
      baseRootHash: ROOT_HASH,
      baseRootRevision: 3,
      baseNarrativeRevision: 2,
      baseCampaignStateRevision: 1,
      controllingIntentOrReceiptId: randomUUID(),
      scenarioKind: 'narrative-only' as const,
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

function narrativeIntentForOption(optionId: string, label: string) {
  return {
    kind: 'narrative-intent.v1' as const,
    key: optionId,
    label,
    intention: `The player means to ${label.toLowerCase()}.`,
    risk: 'The path may draw unwanted attention.',
    fictionalDurationSeconds: 600,
    effects: [] as [],
  };
}

function finiteV3ContinuationSceneProposal() {
  const interaction = validOpeningChoiceInteraction();
  return {
    version: 3 as const,
    summary: 'Continuation at the docks with bound narrative intents.',
    stagedObjectHashes: [ROOT_HASH],
    sourceEvidence: [
      {
        rootHash: ROOT_HASH,
        objectHash: PROFILE_HASH,
        section: 'seyda-neen.continuation',
        assertedAsFact: true,
      },
    ],
    scene: {
      content: validOpeningPassageContent(),
      interaction,
      authoredIntents: interaction.options.map((option) =>
        narrativeIntentForOption(option.id, option.label),
      ),
    },
    documentChanges: [] as [],
  };
}

test('writer-mission.v3 continuation capture and v3 scene proposals bind narrative intents to choices', () => {
  writerMissionCaptureV1Schema.parse(frozenWriterMissionV1Capture());
  writerMissionCaptureV2OpeningSchema.parse(finiteWriterMissionV2OpeningCapture());

  const v3Capture = writerMissionCaptureV3ContinuationSchema.parse(
    finiteWriterMissionV3ContinuationCapture(),
  );
  writerMissionCaptureV3ContinuationSchema.parse({
    ...finiteWriterMissionV3ContinuationCapture(),
    providerPolicy: {
      version: 'writer-round-lab.v2',
      model: 'test/wr11-model',
    },
  });
  assert.equal(v3Capture.version, 'writer-mission.v3');
  assert.equal(v3Capture.sceneScope.kind, 'continuation');
  assert.equal(v3Capture.sceneScope.baseRootHash, v3Capture.libraryRootHash);
  assert.equal(writerMissionCaptureSchema.parse(v3Capture).version, 'writer-mission.v3');
  assert.throws(
    () =>
      writerMissionCaptureV3ContinuationSchema.parse({
        ...finiteWriterMissionV3ContinuationCapture(),
        sceneScope: {
          ...finiteWriterMissionV3ContinuationCapture().sceneScope,
          baseRootHash: PROFILE_HASH,
        },
      }),
    /Continuation baseRootHash must match libraryRootHash/,
  );

  const v3Proposal = writerSceneProposalV3Schema.parse(
    finiteV3ContinuationSceneProposal(),
  );
  assert.equal(v3Proposal.version, 3);
  assert.equal(v3Proposal.scene.authoredIntents.length, 2);
  assert.equal(writerSceneProposalSchema.parse(v3Proposal).version, 3);

  const v3CaptureParsed = writerMissionCaptureV3ContinuationSchema.parse(
    finiteWriterMissionV3ContinuationCapture(),
  );
  const v3Final = writerRoundDecisionSchema.parse({
    kind: 'final',
    proposal: finiteV3ContinuationSceneProposal(),
  });
  validateWriterRoundDecisionForCapture(v3CaptureParsed, v3Final);

  const base = finiteV3ContinuationSceneProposal();

  assert.throws(
    () =>
      writerSceneProposalV3Schema.parse({
        ...base,
        scene: {
          ...base.scene,
          authoredIntents: [base.scene.authoredIntents[0]],
        },
      }),
    /exactly one authored intent/,
  );

  assert.throws(
    () =>
      writerSceneProposalV3Schema.parse({
        ...base,
        scene: {
          ...base.scene,
          authoredIntents: [
            ...base.scene.authoredIntents,
            narrativeIntentForOption('visit_officer', 'Duplicate path'),
          ],
        },
      }),
    /unique|exactly one authored intent/,
  );

  assert.throws(
    () =>
      writerSceneProposalV3Schema.parse({
        ...base,
        scene: {
          ...base.scene,
          authoredIntents: [
            narrativeIntentForOption('visit_officer', 'Office'),
            narrativeIntentForOption('unknown_path', 'Forged path'),
          ],
        },
      }),
    /not an offered choice option/,
  );

  assert.throws(
    () =>
      writerSceneProposalV3Schema.parse({
        ...base,
        scene: {
          content: base.scene.content,
          interaction: null,
          authoredIntents: [narrativeIntentForOption('visit_officer', 'Office')],
        },
      }),
    /require a choice interaction/,
  );
});
