import type { QaJourneyCase } from '@offscreen/contracts/qa';
import { mechanicalContentCatalogue } from '../../campaign/fixtures/mechanical-content';
import { defineCase, stage, stateEvidence } from './support';

export const playerEntryCases: readonly QaJourneyCase[] = [
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
    version: 7,
    name: 'Timed mechanical DM loop',
    purpose:
      'Exercise generated options, admitted private plans, visible d20 consequences, and three committed rounds.',
    risk: 'The POC may narrate choices without mechanics governing outcomes or without durable player agency.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Launch the local Chamber with PostgreSQL and Temporal available.',
      'Use a listed mechanical scenario and the deterministic offline planning executor.',
      'Do not load or enable a provider route.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber', 'browser-automation'],
    variants: mechanicalContentCatalogue()
      .filter((entry) =>
        ['pineapple-mechanics.v4', 'microbe.v3'].includes(entry.id),
      )
      .map((entry) => ({
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
          'The opening presents feasible, distinct choices and labels each with a finite gameSecond duration or as extended work.',
        authoritativeExpectation:
          'A committed passage owns the current offer and private admitted plans; public timing is derived from those plans rather than omitted or inferred from prose.',
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
          'The accepted execution remains visible until its target gameSecond; only then does the committed outcome appear while narration preparation is pending, followed by a fresh choice.',
        authoritativeExpectation:
          'The admitted execution owns the campaign clock, then one resolution receipt and its effects commit exactly once at its target gameSecond. Narration latency adds no gameSeconds; preparation retry cannot repeat mechanics.',
      }),
      stage({
        id: 'control-finite-action',
        name: 'Pause and retime a finite action',
        importance: 'major',
        preconditions: ['A finite action execution is running.'],
        action:
          'Pause it before its target, leave it paused, change its remaining-time speed, then resume it.',
        observableExpectation:
          'Paused time earns nothing; the displayed target is unchanged, the due estimate follows the selected speed, and the action later settles normally.',
        authoritativeExpectation:
          'Start, pause, pace change, resume and settlement are distinct durable revisions. A stale worker wake cannot settle the paused execution, and no control duplicates its eventual roll or effects.',
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
];
