import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  WRITER_RESEARCH_READ_ONLY_TOOL_NAMES,
  assertDistinctWriterResearchChildRequests,
  assertWriterResearchCaptureRoot,
  assertWriterResearchChildToolsGranted,
  assertWriterResearchFundingWithinCap,
  computeWriterResearchChildId,
  hashWriterResearchChildRequest,
  writerResearchCaptureV1Schema,
  writerResearchDelegateArgsSchema,
  writerResearchResultV1Schema,
} from '../src/tasks/writer-research.js';

const ROOT_HASH = 'a'.repeat(64);
const SKILL_HASH = 'c'.repeat(64);

function childCapture(input: {
  missionId: string;
  parentToolCallId: string;
  childOrdinal: 1 | 2;
  question: string;
  required?: boolean;
}) {
  return writerResearchCaptureV1Schema.parse({
    version: 'writer-research.v1',
    missionId: input.missionId,
    parentToolCallId: input.parentToolCallId,
    childOrdinal: input.childOrdinal,
    question: input.question,
    rootHash: ROOT_HASH,
    rootRevision: 3,
    skillObjectHashes: [SKILL_HASH],
    toolAllowlist: [...WRITER_RESEARCH_READ_ONLY_TOOL_NAMES],
    modelSelection: { provider: 'openrouter', model: 'test/research' },
    funding: {
      maxModelRounds: 2,
      maxInputTokens: 4000,
      maxGeneratedTokens: 800,
      maxMicrousd: 50_000,
    },
    required: input.required ?? true,
  });
}

test('writer research builds two distinct child contracts with stable ids', () => {
  const missionId = randomUUID();
  const first = childCapture({
    missionId,
    parentToolCallId: 't1',
    childOrdinal: 1,
    question: 'Who governs Seyda Neen?',
  });
  const second = childCapture({
    missionId,
    parentToolCallId: 't1',
    childOrdinal: 2,
    question: 'What do the locals trade?',
  });
  const firstId = computeWriterResearchChildId({
    missionId,
    parentToolCallId: 't1',
    childOrdinal: 1,
  });
  const secondId = computeWriterResearchChildId({
    missionId,
    parentToolCallId: 't1',
    childOrdinal: 2,
  });
  assert.notEqual(firstId, secondId);
  assert.equal(
    firstId,
    computeWriterResearchChildId({
      missionId,
      parentToolCallId: 't1',
      childOrdinal: 1,
    }),
  );
  const firstHash = hashWriterResearchChildRequest(first);
  const secondHash = hashWriterResearchChildRequest(second);
  assert.notEqual(firstHash, secondHash);
  assert.match(firstHash, /^[a-f0-9]{64}$/);
});

test('writer research rejects recursive delegation in child allowlist', () => {
  assert.throws(
    () =>
      assertWriterResearchChildToolsGranted(
        'research.delegate',
        WRITER_RESEARCH_READ_ONLY_TOOL_NAMES,
      ),
    /writer_research_recursive_delegate/,
  );
  assert.throws(
    () =>
      assertWriterResearchChildToolsGranted('workdesk.stage', [
        'library.read',
        'skills.open',
      ]),
    /ungranted_writer_research_tool/,
  );
});

test('writer research rejects over-cap child and mission budgets', () => {
  assert.throws(
    () =>
      assertWriterResearchFundingWithinCap({
        childFunding: {
          maxModelRounds: 1,
          maxInputTokens: 1000,
          maxGeneratedTokens: 200,
          maxMicrousd: 80_000,
        },
        perChildCapMicrousd: 50_000,
        missionMaxMicrousd: 250_000,
        outstandingChildMicrousd: 0,
      }),
    /writer_research_child_over_cap/,
  );
  assert.throws(
    () =>
      assertWriterResearchFundingWithinCap({
        childFunding: {
          maxModelRounds: 1,
          maxInputTokens: 1000,
          maxGeneratedTokens: 200,
          maxMicrousd: 40_000,
        },
        perChildCapMicrousd: 50_000,
        missionMaxMicrousd: 250_000,
        outstandingChildMicrousd: 220_000,
      }),
    /writer_research_mission_over_cap/,
  );
});

test('writer research rejects mismatched pinned root', () => {
  const capture = childCapture({
    missionId: randomUUID(),
    parentToolCallId: 't2',
    childOrdinal: 1,
    question: 'Where is the silt strider?',
  });
  assert.throws(
    () => assertWriterResearchCaptureRoot(capture, 'b'.repeat(64), 3),
    /writer_research_root_mismatch/,
  );
  assert.throws(
    () => assertWriterResearchCaptureRoot(capture, ROOT_HASH, 9),
    /writer_research_root_mismatch/,
  );
});

test('writer research duplicate ordinal with different questions does not widen silently', () => {
  const missionId = randomUUID();
  const left = childCapture({
    missionId,
    parentToolCallId: 't3',
    childOrdinal: 1,
    question: 'First framing question',
  });
  const right = childCapture({
    missionId,
    parentToolCallId: 't3',
    childOrdinal: 1,
    question: 'A different question at the same ordinal',
  });
  assert.equal(
    computeWriterResearchChildId({
      missionId,
      parentToolCallId: 't3',
      childOrdinal: 1,
    }),
    computeWriterResearchChildId({
      missionId,
      parentToolCallId: 't3',
      childOrdinal: 1,
    }),
  );
  assert.notEqual(
    hashWriterResearchChildRequest(left),
    hashWriterResearchChildRequest(right),
  );
  assert.doesNotThrow(() =>
    assertDistinctWriterResearchChildRequests(left, right),
  );
});

test('writer research delegate args reject authority smuggling keys', () => {
  assert.throws(() =>
    writerResearchDelegateArgsSchema.parse({
      parentToolCallId: 't1',
      questions: [
        {
          question: 'Who leads House Hlaalu?',
          required: true,
          rootHash: ROOT_HASH,
        },
      ],
    }),
  );
  const parsed = writerResearchDelegateArgsSchema.parse({
    parentToolCallId: 't1',
    questions: [{ question: 'What happened at the lighthouse?', required: false }],
  });
  assert.equal(parsed.questions.length, 1);
});

test('writer research result schema enforces evidence bounds', () => {
  const valid = writerResearchResultV1Schema.parse({
    version: 'writer-research-result.v1',
    claims: [
      {
        text: 'The lighthouse was recently repaired.',
        evidence: [
          {
            rootHash: ROOT_HASH,
            documentId: randomUUID(),
            objectHash: 'd'.repeat(64),
            section: 'repairs',
          },
        ],
      },
    ],
    gaps: ['No witness named the carpenter.'],
    contradictions: [],
  });
  assert.equal(valid.claims.length, 1);
});