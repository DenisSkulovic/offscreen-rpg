import type { QaJourneyCase } from '@offscreen/contracts/qa';
import { defineCase, stage, stateEvidence } from './support';

export const storytellerOperationCases: readonly QaJourneyCase[] = [
  defineCase({
    id: 'storyteller-contrast',
    version: 1,
    name: 'Storyteller contrast',
    purpose:
      'Determine whether profiles change decisions and story direction rather than only wording.',
    risk: 'Profiles may be cosmetic labels over effectively identical behavior.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Capture one premise and deterministic offline seed.',
      'Use the same configuration except for the storyteller profile.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber'],
    variants: [],
    stages: [
      stage({
        id: 'capture-baseline',
        name: 'Capture the shared baseline',
        importance: 'major',
        preconditions: ['Two profiles are available.'],
        action:
          'Record the premise, seed, configuration, and profile revisions.',
        observableExpectation:
          'The comparison inputs are understandable and differ only by profile.',
        authoritativeExpectation:
          'Both planned runs reference the same captured baseline.',
      }),
      stage({
        id: 'run-profile-one',
        name: 'Run the first profile',
        importance: 'major',
        preconditions: ['The shared baseline is captured.'],
        action: 'Create and inspect the offline result for the first profile.',
        observableExpectation:
          'Framing, opportunities, and option direction are coherent with the profile.',
        authoritativeExpectation:
          'Artifacts capture the first profile identity and revision.',
        assessment: 'human-judgment',
        rubricDimensions: ['profile-expression', 'readability'],
      }),
      stage({
        id: 'run-profile-two',
        name: 'Run the second profile',
        importance: 'major',
        preconditions: ['The first result and shared baseline are retained.'],
        action: 'Create and inspect the offline result for the second profile.',
        observableExpectation:
          'Framing, opportunities, and option direction are coherent with the profile.',
        authoritativeExpectation:
          'Artifacts capture the second profile identity and revision.',
        assessment: 'human-judgment',
        rubricDimensions: ['profile-expression', 'readability'],
      }),
      stage({
        id: 'compare',
        name: 'Record anchored comparison',
        importance: 'major',
        preconditions: ['Both profile results exist.'],
        action:
          'Compare decisions, opportunity selection, consequence framing, and later direction.',
        observableExpectation:
          'The observation names meaningful similarities and differences with evidence.',
        authoritativeExpectation:
          'Both compared artifact sets remain linked to the run.',
        assessment: 'human-judgment',
        rubricDimensions: ['profile-expression', 'option-agency', 'continuity'],
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'comparison-baseline',
        description:
          'Shared premise, deterministic seed, and configuration identities.',
        required: true,
      },
      {
        kind: 'profile-artifacts',
        description: 'Profile identities and linked results for both sides.',
        required: true,
      },
    ],
    resetPolicy:
      'Repeat both profile runs under a new QA run; retain the prior comparison.',
    nonAssertions: [
      'Exact prose equality is not expected.',
      'Offline authored content cannot establish general live-model profile quality.',
    ],
  }),
  defineCase({
    id: 'failure-and-recovery',
    version: 2,
    name: 'Failure and recovery',
    purpose:
      'Make uncertain execution, stale publication, and retry behavior inspectable.',
    risk: 'Recovery may repeat committed mechanics or resume from the wrong durable boundary.',
    costClass: 'offline',
    availability: {
      state: 'planned',
      reason:
        'Pending-consequence hold/failure controls and API-level provider recovery evidence exist, but stale-publication and saved-result interruption are not yet composed into one operator-friendly run.',
    },
    prerequisites: [
      'Use Chamber controls for pending consequences and the fake-provider API harness for dispatch/accounting outcomes.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber', 'api-script'],
    variants: [],
    stages: [
      stage({
        id: 'invalid-output',
        name: 'Reject invalid output',
        importance: 'major',
        preconditions: ['An invalid-output fault can be armed.'],
        action: 'Run one generation with a controlled invalid result.',
        observableExpectation:
          'The failure is explicit. Scripted work may retry from a known boundary; a settled provider attempt is terminal for that operation.',
        authoritativeExpectation:
          'No invalid proposal or effects are published, and settled provider work cannot buy another attempt through retry.',
      }),
      stage({
        id: 'delayed-result',
        name: 'Observe delayed execution',
        importance: 'major',
        preconditions: ['A delayed-result fault can be armed.'],
        action: 'Delay one result, reload, and inspect status before release.',
        observableExpectation:
          'The UI reports pending work without inventing completion.',
        authoritativeExpectation:
          'One operation identity remains pending until its saved result arrives.',
      }),
      stage({
        id: 'stale-publication',
        name: 'Fence stale publication',
        importance: 'poc-blocker',
        preconditions: ['A stale-publication boundary can be produced.'],
        action: 'Attempt to publish a result against a superseded revision.',
        observableExpectation:
          'The stale result does not replace the current story.',
        authoritativeExpectation:
          'Revision fencing preserves the newer committed state.',
      }),
      stage({
        id: 'publication-interruption',
        name: 'Resume saved-result publication',
        importance: 'poc-blocker',
        preconditions: [
          'A saved-result publication interruption can be armed.',
        ],
        action: 'Interrupt after saving a result, then recover it.',
        observableExpectation:
          'Recovery publishes the original consequence once.',
        authoritativeExpectation:
          'Dice and effects are not rerun during publication recovery.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'operation-trace',
        description:
          'Operation, attempt, result, publication, and recovery identities.',
        required: true,
      },
    ],
    resetPolicy: 'Use a fresh run and fixture story for every fault sequence.',
    nonAssertions: ['This case does not exercise real provider outages.'],
  }),
  defineCase({
    id: 'story-snapshot-cache-fallback',
    version: 1,
    name: 'Story snapshot cache consistency',
    purpose:
      'Confirm that optional Redis acceleration never becomes story authority or exposes a stale current projection.',
    risk: 'A cache hit could otherwise hide committed gameplay, cross ownership boundaries, or make Redis availability a gameplay dependency.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'The local PostgreSQL and Redis services are running.',
      'The API is configured with the loopback REDIS_URL.',
      'An owned playable story exists.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber'],
    variants: [],
    stages: [
      stage({
        id: 'populate',
        name: 'Populate an unchanged snapshot',
        importance: 'major',
        preconditions: ['The story is readable and Redis is healthy.'],
        action: 'Open and reload the same unchanged story twice.',
        observableExpectation: 'Both reads show the same current state.',
        authoritativeExpectation:
          'Ownership is checked in PostgreSQL before the version-addressed cached projection is eligible.',
      }),
      stage({
        id: 'change',
        name: 'Commit through the cached view',
        importance: 'poc-blocker',
        preconditions: ['The unchanged snapshot was read repeatedly.'],
        action: 'Commit one available action and reload the story.',
        observableExpectation:
          'The committed passage, offer, activity, or receipt appears immediately.',
        authoritativeExpectation:
          'The changed projection identity cannot address the previous cached value; no delete message is required for correctness.',
      }),
      stage({
        id: 'outage',
        name: 'Lose optional Redis',
        importance: 'major',
        preconditions: ['The changed snapshot is visible.'],
        action: 'Stop Redis and reload the story again.',
        observableExpectation:
          'The same current story remains readable, with at most a normal database-read delay.',
        authoritativeExpectation:
          'The API falls back to PostgreSQL and emits a safe cache warning without logging cached content.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'runtime-log',
        description:
          'A bounded cache-fallback event containing operation/projection/error kind and no player content.',
        required: true,
      },
    ],
    resetPolicy:
      'Restart Redis and use a fresh story or key prefix before repeating the case.',
    nonAssertions: [
      'This case does not establish a production cache hit rate or latency benefit.',
      'It does not authorize caching commands, sessions, private plans, timers, or accounting admission.',
    ],
  }),
  defineCase({
    id: 'storyteller-request-purpose-audit',
    version: 1,
    name: 'Storyteller request-purpose packet audit',
    purpose:
      'Compare every implemented Storyteller request shape before spending provider credit.',
    risk: 'A generic or noisy prompt can waste context, blur task authority, and hide long-scene continuity loss.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Use authored audit fixtures; no application story or provider credential is required.',
    ],
    initialScenario: null,
    drivers: ['api-script'],
    variants: [],
    stages: [
      stage({
        id: 'capture-purposes',
        name: 'Capture all request purposes',
        importance: 'poc-blocker',
        preconditions: ['The Storyteller package can build locally.'],
        action:
          'Run pnpm storyteller:packet-audit and retain the reported manifest and readable comparison paths.',
        observableExpectation:
          'Five purpose cases plus human and nonhuman fifteen-turn continuity cases identify exact structural sizes, hashes and evidence coverage.',
        authoritativeExpectation:
          'The manifest states that transport was not performed, charge is zero, and token/cache fields remain unknown.',
      }),
      stage({
        id: 'compare-evidence',
        name: 'Inspect evidence and overlap',
        importance: 'major',
        preconditions: ['The audit manifest exists.'],
        action:
          'Compare loaded/omitted evidence, user sections, output schemas and adjacent message-prefix bytes.',
        observableExpectation:
          'Purpose-specific differences and the missing early clue/holder-change continuity are understandable without reading raw provider code.',
        authoritativeExpectation:
          'The report derives from the machine-readable manifest and makes no token, billing or cache-hit claim from byte counts.',
      }),
    ],
    evidenceRequirements: [
      {
        kind: 'request-artifact',
        description:
          'The generation/run-scoped JSON manifest and derived readable comparison.',
        required: true,
      },
    ],
    resetPolicy:
      'Run the command again; every audit writes a new directory and preserves earlier evidence.',
    nonAssertions: [
      'Authored task captures do not prove an HTTP/worker gameplay journey.',
      'Bytes do not establish tokens, provider cache reuse, cost, or narrative quality.',
    ],
  }),
  defineCase({
    id: 'provider-dispatch-review',
    version: 1,
    name: 'Provider dispatch review gate',
    purpose:
      'Inspect and explicitly reject a complete provider packet without spending model credit.',
    risk: 'A review surface is unsafe if inspection can dispatch implicitly, stale decisions apply, or rejection is mistaken for a provider failure.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Run the developer-only Chamber with the mandatory unpriced hold route.',
      'Do not configure or authorize a commercial provider route for this case.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber'],
    variants: [],
    stages: [
      stage({
        id: 'capture',
        name: 'Capture the exact held packet',
        importance: 'poc-blocker',
        preconditions: ['No provider attempt exists for the generation.'],
        action:
          'Run pnpm chamber:packet and inspect the generation-scoped artifact.',
        observableExpectation:
          'The artifact identifies its request purpose, packet hash, messages, schema and structural sizes.',
        authoritativeExpectation:
          'One awaiting-review record exists and provider attempts, reservations and charges remain zero.',
      }),
      stage({
        id: 'reject',
        name: 'Reject by exact revision and packet hash',
        importance: 'major',
        preconditions: ['The held revision and packet hash are known.'],
        action:
          'Submit a developer-only reject decision with a fresh decision ID.',
        observableExpectation:
          'The review becomes rejected and the generation exposes an intentional dispatch-rejected failure.',
        authoritativeExpectation:
          'No provider attempt is created; stale revision/hash decisions conflict without changing state.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'operation-trace',
        description:
          'Generation, review revision, packet hash, decision identity and zero-attempt accounting.',
        required: true,
      },
    ],
    resetPolicy:
      'Use a fresh generation for every packet or decision rehearsal.',
    nonAssertions: [
      'Byte counts do not establish tokenizer output or provider cache hits.',
      'This offline rejection case does not authorize release to a live provider.',
    ],
  }),
];
