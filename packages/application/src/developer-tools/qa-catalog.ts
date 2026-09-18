import {
  qaJourneyCaseSchema,
  type QaJourneyCase,
} from '@offscreen/contracts/qa';
import { mechanicalContentCatalogue } from '../campaign/fixtures/mechanical-content';

type StageInput = Omit<
  QaJourneyCase['stages'][number],
  'evidence' | 'assessment' | 'rubricDimensions'
> & {
  evidence?: QaJourneyCase['stages'][number]['evidence'];
  assessment?: QaJourneyCase['stages'][number]['assessment'];
  rubricDimensions?: QaJourneyCase['stages'][number]['rubricDimensions'];
};

const stateEvidence = {
  kind: 'state-snapshot',
  description: 'Authoritative saved state or stable artifact identity.',
  required: true,
} as const;

function stage(input: StageInput): QaJourneyCase['stages'][number] {
  return {
    ...input,
    assessment: input.assessment ?? 'structural',
    rubricDimensions: input.rubricDimensions ?? [],
    evidence: input.evidence ?? [stateEvidence],
  };
}

function defineCase(input: QaJourneyCase): QaJourneyCase {
  return qaJourneyCaseSchema.parse(input);
}

export const qaJourneyCatalog: readonly QaJourneyCase[] = [
  defineCase({
    id: 'offline-player-entry',
    version: 1,
    name: 'Offline player-entry smoke',
    purpose:
      'Confirm that a developer can enter the product, create a reviewed offline story, and return to it.',
    risk: 'A mechanically capable backend is not a playable POC if the entry and return path is unclear or loses identity.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'The local Chamber launcher is running with its isolated database.',
      'The scripted opening generator is selected; no provider credential is loaded.',
    ],
    initialScenario: 'chamber.v1',
    drivers: ['manual-chamber', 'browser-automation'],
    variants: [
      {
        id: 'local-developer-session',
        name: 'Local developer session',
        description:
          'Uses the identity provisioned by the Chamber launcher and does not claim account-creation coverage.',
        availability: { state: 'available' },
        prerequisites: ['Launch through the local Chamber.'],
      },
      {
        id: 'oauth-account-lifecycle',
        name: 'OAuth account lifecycle',
        description:
          'Starts signed out and requires real OAuth credentials in a suitable manual environment.',
        availability: {
          state: 'planned',
          reason:
            'The isolated Chamber does not load real OAuth credentials or exercise hosted callbacks.',
        },
        prerequisites: [
          'Real OAuth credentials and a callback-capable environment are available.',
        ],
      },
    ],
    stages: [
      stage({
        id: 'launch',
        name: 'Launch the local environment',
        importance: 'poc-blocker',
        preconditions: ['The Chamber database is available.'],
        action: 'Launch the Chamber and open its player-facing page.',
        observableExpectation:
          'The application opens without a provider request.',
        authoritativeExpectation:
          'The session is isolated to the Chamber database and provider call count remains zero.',
      }),
      stage({
        id: 'enter',
        name: 'Enter through the declared identity variant',
        importance: 'poc-blocker',
        preconditions: ['The run names one identity variant.'],
        action: 'Complete the entry path for the selected variant.',
        observableExpectation:
          'The authenticated story workspace becomes available.',
        authoritativeExpectation:
          'The resulting session owns subsequent drafts and stories; only the OAuth variant may claim account creation.',
      }),
      stage({
        id: 'new-story',
        name: 'Reach story creation',
        importance: 'major',
        preconditions: ['The player session is active.'],
        action: 'View saved stories and choose New Story.',
        observableExpectation:
          'The creation workspace is understandable and usable.',
        authoritativeExpectation:
          'No story or draft is created by navigation alone.',
      }),
      stage({
        id: 'choose-storyteller',
        name: 'Inspect storyteller profiles',
        importance: 'major',
        preconditions: ['The creation workspace is open.'],
        action: 'Inspect the storyteller catalogue and select a profile.',
        observableExpectation:
          'The two profiles communicate meaningfully different direction.',
        authoritativeExpectation:
          'The selected stable profile identity and revision can be recovered from saved state.',
        assessment: 'human-judgment',
        rubricDimensions: ['profile-expression', 'readability'],
      }),
      stage({
        id: 'save-premise',
        name: 'Save premise and storyteller',
        importance: 'poc-blocker',
        preconditions: ['A profile and premise have been chosen.'],
        action: 'Save the story premise and profile selection.',
        observableExpectation:
          'The saved values remain visible after navigation.',
        authoritativeExpectation:
          'A versioned owned draft records both values.',
      }),
      stage({
        id: 'generate-opening',
        name: 'Generate an offline opening',
        importance: 'poc-blocker',
        preconditions: ['A current draft revision exists.'],
        action: 'Request an opening candidate through the offline generator.',
        observableExpectation:
          'A reviewable candidate appears without paid inference.',
        authoritativeExpectation:
          'The candidate records its source draft/profile/configuration and provider calls remain zero.',
      }),
      stage({
        id: 'start',
        name: 'Review and start',
        importance: 'poc-blocker',
        preconditions: ['A current opening candidate exists.'],
        action: 'Review the candidate and start the story.',
        observableExpectation:
          'The playable story opens at the reviewed passage.',
        authoritativeExpectation:
          'Exactly one owned story is created from the selected immutable candidate.',
      }),
      stage({
        id: 'reopen',
        name: 'Return to the saved story',
        importance: 'poc-blocker',
        preconditions: ['The story has started.'],
        action: 'Leave the story, find it in the list, and reopen it.',
        observableExpectation:
          'The same current passage and available interaction return.',
        authoritativeExpectation:
          'The reopened snapshot has the same story identity and committed revision.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'identity-variant',
        description:
          'The exact local-session or OAuth variant used by the run.',
        required: true,
      },
      {
        kind: 'artifact-identities',
        description: 'Draft, candidate, story and current-passage identities.',
        required: true,
      },
    ],
    resetPolicy:
      'Create a fresh run and fresh draft/story identities. Never rewrite a finalized run.',
    nonAssertions: [
      'This case does not assess live prose quality.',
      'The local developer-session variant does not cover account creation or OAuth revocation.',
    ],
  }),
  defineCase({
    id: 'immediate-mechanical-dm-loop',
    version: 1,
    name: 'Immediate mechanical DM loop',
    purpose:
      'Exercise generated options, admitted private plans, visible d20 consequences, and three committed rounds.',
    risk: 'The POC may narrate choices without mechanics governing outcomes or without durable player agency.',
    costClass: 'offline',
    availability: {
      state: 'planned',
      reason: 'The playable DM adjudication loop has not been implemented yet.',
    },
    prerequisites: [
      'The playable DM adjudication loop is implemented.',
      'A deterministic offline planning executor is available.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber', 'browser-automation'],
    variants: mechanicalContentCatalogue().map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      availability: { state: 'available' as const },
      prerequisites: [],
    })),
    stages: [
      stage({
        id: 'start',
        name: 'Start the mechanical scenario',
        importance: 'poc-blocker',
        preconditions: ['A reviewed mechanical opening exists.'],
        action: 'Start the selected scenario variant.',
        observableExpectation:
          'The opening presents feasible, distinct choices.',
        authoritativeExpectation:
          'A committed passage owns the current offer and private admitted plans.',
      }),
      stage({
        id: 'inspect-offer',
        name: 'Inspect offer plans',
        importance: 'major',
        preconditions: ['A current offer exists.'],
        action:
          'Compare public choices with private admitted plans in the Chamber.',
        observableExpectation:
          'Choices express materially different feasible intentions.',
        authoritativeExpectation:
          'Every public option maps to one validated offer-local plan.',
        assessment: 'human-judgment',
        rubricDimensions: ['situation-fidelity', 'option-agency'],
      }),
      stage({
        id: 'resolve-round-one',
        name: 'Resolve first choice',
        importance: 'poc-blocker',
        preconditions: ['An offer-local plan is available.'],
        action: 'Select one option and wait for its consequence.',
        observableExpectation:
          'The player sees the check, consequence, and a fresh choice.',
        authoritativeExpectation:
          'One resolution receipt and its effects commit exactly once.',
      }),
      stage({
        id: 'resolve-round-two',
        name: 'Resolve second choice after reload',
        importance: 'poc-blocker',
        preconditions: ['Round one is committed.'],
        action: 'Reload, choose again, and retry the same command once.',
        observableExpectation:
          'Progress survives reload and the duplicate has no extra effect.',
        authoritativeExpectation:
          'The command identity resolves to one saved receipt and one publication.',
      }),
      stage({
        id: 'resolve-round-three',
        name: 'Complete three committed rounds',
        importance: 'poc-blocker',
        preconditions: ['Two rounds are committed.'],
        action: 'Select and resolve a third option.',
        observableExpectation:
          'The third consequence respects prior facts and presents the next situation.',
        authoritativeExpectation:
          'Three chronological resolution receipts are linked to three committed consequences.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'resolution-receipts',
        description:
          'Selected intentions, d20 checks, effects, and idempotent command identities.',
        required: true,
      },
      {
        kind: 'planning-trace',
        description:
          'Captured planning inputs, tool evidence, admitted plans, and offer identities.',
        required: true,
      },
    ],
    resetPolicy:
      'Start a new story and QA run from the same captured fixture seed.',
    nonAssertions: [
      'This case does not require long-running activities, a general combat engine, or live inference.',
    ],
  }),
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
    version: 1,
    name: 'Failure and recovery',
    purpose:
      'Make uncertain execution, stale publication, and retry behavior inspectable.',
    risk: 'Recovery may repeat committed mechanics or resume from the wrong durable boundary.',
    costClass: 'offline',
    availability: {
      state: 'planned',
      reason: 'Controlled Chamber fault injection has not been implemented.',
    },
    prerequisites: [
      'Chamber-only deterministic fault controls are implemented.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber', 'browser-automation'],
    variants: [],
    stages: [
      stage({
        id: 'invalid-output',
        name: 'Reject invalid output',
        importance: 'major',
        preconditions: ['An invalid-output fault can be armed.'],
        action: 'Run one generation with a controlled invalid result.',
        observableExpectation:
          'The failure is explicit and retryable from a known boundary.',
        authoritativeExpectation:
          'No invalid proposal or effects are published.',
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
    id: 'conservative-live-quality-probe',
    version: 1,
    name: 'Conservative live quality probe',
    purpose:
      'Collect the first bounded paid evidence after a deliberate authorization.',
    risk: 'Unbounded or poorly observed experimentation can spend money without useful evidence.',
    costClass: 'live-billable',
    availability: {
      state: 'planned',
      reason:
        'Live execution remains disabled until trace, accounting, pricing, allowance, and authorization preflights pass.',
    },
    prerequisites: [
      'The separate conservative live-evaluation feature is implemented.',
      'Current route pricing and remaining allowance have been verified.',
      'The owner has explicitly authorized the concrete paid probe.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber'],
    variants: [],
    stages: [
      stage({
        id: 'preflight',
        name: 'Pass live preflight',
        importance: 'poc-blocker',
        preconditions: [
          'A concrete model, route, cap, and stop policy are proposed.',
        ],
        action:
          'Verify trace completeness, accounting, route pricing, allowance, and authorization.',
        observableExpectation:
          'The operator can see the exact maximum exposure before dispatch.',
        authoritativeExpectation:
          'A durable run allowance and model-policy identity authorize only this probe.',
      }),
      stage({
        id: 'dispatch',
        name: 'Dispatch one bounded probe',
        importance: 'poc-blocker',
        preconditions: ['All preflight gates passed.'],
        action: 'Dispatch the authorized generation once.',
        observableExpectation:
          'The result or explicit failure becomes inspectable without automatic fallback.',
        authoritativeExpectation:
          'At most the authorized call count and reservation are consumed.',
      }),
      stage({
        id: 'reconcile',
        name: 'Reconcile cost and evidence',
        importance: 'poc-blocker',
        preconditions: ['The probe reached a terminal or uncertain state.'],
        action:
          'Capture output quality observations and reconcile provider accounting.',
        observableExpectation:
          'The run states what was learned and whether another call is justified.',
        authoritativeExpectation:
          'Call count, tokens, charge, reservations, and certainty are retained.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'authorization',
        description:
          'The concrete user authorization for this model, cap, and probe.',
        required: true,
      },
      {
        kind: 'provider-accounting',
        description:
          'Call count, tokens, charge, reservation, and accounting certainty.',
        required: true,
      },
    ],
    resetPolicy: 'Every authorized paid probe receives a new immutable QA run.',
    nonAssertions: [
      'One probe cannot establish broad model quality.',
      'No fallback, automatic repair, or model judge is authorized by this case.',
    ],
  }),
];

export function listQaJourneyCases(): readonly QaJourneyCase[] {
  return qaJourneyCatalog;
}

export function findQaJourneyCase(
  id: string,
  version: number,
): QaJourneyCase | undefined {
  return qaJourneyCatalog.find(
    (candidate) => candidate.id === id && candidate.version === version,
  );
}
