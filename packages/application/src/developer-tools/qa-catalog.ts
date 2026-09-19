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
    version: 6,
    name: 'Timed mechanical DM loop',
    purpose:
      'Exercise generated options, admitted private plans, visible d20 consequences, and three committed rounds.',
    risk: 'The POC may narrate choices without mechanics governing outcomes or without durable player agency.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Launch the local Chamber with PostgreSQL and Temporal available.',
      'Use the pineapple-mechanics.v4 scenario and deterministic offline planning executor.',
      'Do not load or enable a provider route.',
    ],
    initialScenario: null,
    drivers: ['manual-chamber', 'browser-automation'],
    variants: mechanicalContentCatalogue()
      .filter((entry) => entry.id === 'pineapple-mechanics.v4')
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
          'The opening presents feasible, distinct choices and labels each with a finite tick duration or as extended work.',
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
          'The accepted execution remains visible until its target tick; only then does the committed outcome appear while narration preparation is pending, followed by a fresh choice.',
        authoritativeExpectation:
          'The admitted execution owns the campaign clock, then one resolution receipt and its effects commit exactly once at its target tick. Narration latency adds no ticks; preparation retry cannot repeat mechanics.',
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
  defineCase({
    id: 'quiet-activity-lifecycle',
    version: 1,
    name: 'Quiet activity lifecycle',
    purpose:
      'Manually verify genuine clock waiting, finite accepted continuation, horizon/cancellation/blocking stops, explicit scene re-entry, finite repeatable work, and reload-safe activity identity.',
    risk: 'Routine play may secretly roll, generate narration, duplicate instances, replay a finite opportunity, or lose authority after reload.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Launch the local Chamber with PostgreSQL and Temporal available.',
      'Use the microbe.v3 mechanical scenario and an offline scripted Storyteller.',
      'Do not load or enable a provider route.',
    ],
    initialScenario: 'microbe.v3',
    drivers: ['manual-chamber', 'browser-automation'],
    variants: [],
    stages: [
      stage({
        id: 'start-microbe',
        name: 'Start the nonhuman mechanical story',
        importance: 'poc-blocker',
        preconditions: ['A reviewed microbe.v3 opening exists.'],
        action: 'Start the story and inspect its current activity choices.',
        observableExpectation:
          'The organism receives only the activities explicitly authorized for this situation.',
        authoritativeExpectation:
          'The current offer and private situation authorization name the same process keys; no human, job, currency, or anatomy requirement is introduced.',
      }),
      stage({
        id: 'complete-chain',
        name: 'Complete an accepted finite plan',
        importance: 'poc-blocker',
        preconditions: [
          'Sample the gradient briefly plus the temperature and pressure cycles are currently authorized.',
        ],
        action:
          'Stage both environmental cycles in order, set a horizon beyond six ticks, start Sample the gradient briefly, and let all entries settle.',
        observableExpectation:
          'The plan shows three distinct entries starting and finishing in the accepted order before its displayed horizon.',
        authoritativeExpectation:
          'The accepted plan owns exactly one successor; current authorization and prerequisites are rechecked at the boundary, activity identities remain distinct, and no generation task chooses the successor.',
      }),
      stage({
        id: 'stop-at-plan-horizon',
        name: 'Stop successor admission at the plan horizon',
        importance: 'poc-blocker',
        preconditions: [
          'Start a fresh microbe.v3 story and stage a successor with a one-tick horizon.',
        ],
        action:
          'Start the two-tick sampling activity and inspect the plan after it completes.',
        observableExpectation:
          'The first entry completes, the plan says horizon reached, and its pending successor is cancelled without starting.',
        authoritativeExpectation:
          'The absolute horizon is captured at acceptance; completion may cross it, but no successor activity row, wake, roll, or reward is created at or beyond it.',
      }),
      stage({
        id: 'repeat-limit',
        name: 'Reach the finite occurrence limit',
        importance: 'poc-blocker',
        preconditions: [
          'The accepted plan completed its first sampling cycle and the choice remains authorized once more.',
        ],
        action:
          'Complete a second sampling cycle, reload the story, and inspect the resulting offer and commitments.',
        observableExpectation:
          'The second instance remains visible in history, but a third sampling choice is absent after reload.',
        authoritativeExpectation:
          'Two distinct activity identities exist, the occurrence count is exactly two, campaign time is monotonic, and fresh offer projection cannot reset the limit.',
      }),
      stage({
        id: 'inspect-zero-call',
        name: 'Confirm quiet execution admitted no model work',
        importance: 'poc-blocker',
        preconditions: [
          'The accepted finite plan and the second sampling cycle completed.',
        ],
        action:
          'Inspect the Chamber task, consequence, roll, and provider-accounting records for this story.',
        observableExpectation:
          'The chronology contains factual activity outcomes without generated literary interludes.',
        authoritativeExpectation:
          'There are zero activity rolls, zero consequence intents for the quiet completions, zero provider calls, and zero charge.',
      }),
      stage({
        id: 'cancel-pending-chain',
        name: 'Cancel only pending continuation',
        importance: 'major',
        preconditions: [
          'Start a fresh microbe.v3 story and accept the same two-entry plan.',
        ],
        action:
          'While the first entry is running, choose Cancel pending activities, then let the current entry finish.',
        observableExpectation:
          'The current activity continues and completes; the pending successor is marked cancelled and never starts.',
        authoritativeExpectation:
          'The plan-control command is replay-safe, changes only future entries, and does not pause, abandon, reroll, or replace the current activity.',
      }),
      stage({
        id: 'block-invalid-successor',
        name: 'Block a successor whose prerequisite changed',
        importance: 'poc-blocker',
        preconditions: [
          'Start a fresh microbe.v3 story; stage Hold through a temperature cycle after Remain contracted.',
        ],
        action: 'Let Remain contracted finish and inspect the accepted plan.',
        observableExpectation:
          'The completed wait remains in history and the temperature-cycle entry is visibly blocked instead of starting.',
        authoritativeExpectation:
          'The wait clears exposed before successor admission; revalidation creates no second activity or wake and records a durable blocked reason.',
      }),
      stage({
        id: 'reenter-after-scene',
        name: 'Require an explicit handoff after a scene',
        importance: 'poc-blocker',
        preconditions: [
          'Start a fresh beacon-watch.v1 story and stage Keep the harbor watch after Observe the harbor shift.',
        ],
        action:
          'Let the observation reach its scene, inspect the stopped plan, publish the scripted scene, then explicitly select Keep the harbor watch.',
        observableExpectation:
          'The queued watch stays blocked while the scene is pending and after its offer appears; only selecting that offered watch starts it.',
        authoritativeExpectation:
          'The Storyteller receives only the exact pending private entry, publication grants fresh situation authority without creating an activity, and the player command rebinds the same plan entry before it completes quietly.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'activity-identities',
        description:
          'Accepted-plan activity IDs plus the second sampling and beacon handoff IDs, revisions, progress, ticks, and terminal states.',
        required: true,
      },
      {
        kind: 'occurrence-history',
        description:
          'The persisted finite scope/count plus the final offer showing no third sampling action.',
        required: true,
      },
      {
        kind: 'zero-call-evidence',
        description:
          'Roll, consequence, generation, provider-call, and charge counts for the quiet sequence.',
        required: true,
      },
    ],
    resetPolicy:
      'Start a fresh microbe.v3 story and QA run. Do not edit or reuse occurrence history from an earlier run.',
    nonAssertions: [
      'This fixture proves generic contracts with authored content, not biological realism or arbitrary-world Storyteller intelligence.',
      'It does not prove arbitrary-length itineraries, arbitrary chain editing, interruption recovery, or generated report quality.',
    ],
  }),
  defineCase({
    id: 'activity-interruption-and-blocking',
    version: 1,
    name: 'Activity interruption, blocking, and exact resumption',
    purpose:
      'Verify that changed requirements stop work without erasing progress and that A-to-B-to-A returns to the exact retained instance.',
    risk: 'A changed world may keep rewarding invalid work, silently restart it, rewind time, or disguise a blocker as voluntary suspension.',
    costClass: 'offline',
    availability: {
      state: 'planned',
      reason:
        'The mechanics exist, but Chamber lacks deterministic controls for the stranger interruption and repair-tool loss needed for confident manual reproduction.',
    },
    prerequisites: [
      'Add developer-only deterministic controls for the beacon interruption and required-tool loss.',
      'Expose activity identities, revisions, blockers, rolls, rewards, and current authorization in Chamber inspection.',
    ],
    initialScenario: 'beacon-watch.v1',
    drivers: ['manual-chamber', 'browser-automation'],
    variants: [],
    stages: [
      stage({
        id: 'earn-progress',
        name: 'Earn partial beacon progress',
        importance: 'poc-blocker',
        preconditions: ['The beacon repair is explicitly authorized.'],
        action:
          'Start the repair and settle one controlled successful attempt.',
        observableExpectation:
          'Partial repair progress is visible and no completion reward is paid.',
        authoritativeExpectation:
          'One retained activity identity owns the contribution receipt and progress; harbor credit remains zero.',
      }),
      stage({
        id: 'block-before-boundary',
        name: 'Remove a boundary prerequisite',
        importance: 'poc-blocker',
        preconditions: ['Repair is running with incomplete progress.'],
        action:
          'Use the deterministic control to remove required repair-tool access, then settle the next wake.',
        observableExpectation:
          'The same activity becomes blocked and explains that work cannot continue.',
        authoritativeExpectation:
          'No additional roll, contribution, reward, or occurrence completion is recorded; duplicate wake-up is harmless.',
      }),
      stage({
        id: 'authorize-resume',
        name: 'Restore conditions without silently restarting',
        importance: 'poc-blocker',
        preconditions: ['The exact repair is blocked.'],
        action:
          'Restore the required condition, confirm work stays dormant, then publish and select an exact resume intention.',
        observableExpectation:
          'Restoring tools alone does not restart work; the current scene must explicitly offer resumption.',
        authoritativeExpectation:
          'Resume matches the same activity ID and revision, rechecks prerequisites, and preserves prior progress.',
      }),
      stage({
        id: 'switch-and-return',
        name: 'Complete B and return to A',
        importance: 'poc-blocker',
        preconditions: ['The controlled stranger interruption is available.'],
        action:
          'Interrupt repair A, select and complete tool-securing B, then select the freshly projected A resume.',
        observableExpectation:
          'B completes quietly and A returns with its earlier progress rather than restarting.',
        authoritativeExpectation:
          'A and B have distinct identities, world ticks remain monotonic, B creates no narration intent, and only A resumes.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'activity-lifecycle',
        description:
          'A/B identities, revisions, states, progress, blocker, ticks, rolls, and terminal effects.',
        required: true,
      },
      {
        kind: 'authorization-history',
        description:
          'Offer and exact-resume identities before interruption, after blocking, and after B completion.',
        required: true,
      },
    ],
    resetPolicy:
      'Use a fresh beacon-watch.v1 story for each run; deterministic controls must be recorded as QA evidence.',
    nonAssertions: [
      'Direct database edits are not acceptable evidence for this manual case.',
      'This does not claim multiplayer capacity allocation or irreversible target invalidation.',
    ],
  }),
  defineCase({
    id: 'activity-history-and-diagnostics',
    version: 1,
    name: 'Activity history and diagnostics',
    purpose:
      'Prove that committed activity lifecycles remain understandable after reload and runtime failures carry actionable correlation without becoming gameplay authority.',
    risk: 'Completed work may disappear, retries may duplicate history, hidden mechanics may leak, or generic errors may make failed background work impossible to diagnose.',
    costClass: 'offline',
    availability: {
      state: 'planned',
      reason:
        'The durable history presentation and structured runtime logger exist, but deterministic failure controls required for repeatable manual evidence are not implemented yet.',
    },
    prerequisites: [
      'Add deterministic duplicate-delivery and retryable-worker-failure controls with captured structured diagnostics.',
    ],
    initialScenario: 'beacon-watch.v1',
    drivers: ['manual-chamber', 'browser-automation'],
    variants: [],
    stages: [
      stage({
        id: 'record-lifecycle',
        name: 'Record one exact lifecycle',
        importance: 'poc-blocker',
        preconditions: ['Beacon repair is explicitly authorized.'],
        action:
          'Start repair, pause and resume it, trigger the controlled interruption, switch to B, and return to A.',
        observableExpectation:
          'Activity history explains the ordered transitions using recognizable labels and reasons.',
        authoritativeExpectation:
          'Events retain exact activity IDs, revisions, world ticks and stable causes under the same commits as their state changes.',
      }),
      stage({
        id: 'retain-terminal-history',
        name: 'Retain terminal work after reload',
        importance: 'poc-blocker',
        preconditions: ['At least one activity has completed.'],
        action:
          'Reload after completion and inspect activity history separately from current commitments.',
        observableExpectation:
          'Completed work remains readable even though it is no longer an active commitment.',
        authoritativeExpectation:
          'The terminal event links permitted roll/effect evidence without exposing private plans, secret DCs, or undiscovered facts.',
      }),
      stage({
        id: 'replay-without-duplicates',
        name: 'Replay delivery without duplicate events',
        importance: 'poc-blocker',
        preconditions: ['A recorded boundary or control command exists.'],
        action:
          'Redeliver the same command and worker notice, then reload history.',
        observableExpectation:
          'No lifecycle entry or mechanical outcome appears twice.',
        authoritativeExpectation:
          'Stable cause identities fence duplicate events, rolls, effects, and terminal outcomes.',
      }),
      stage({
        id: 'inspect-runtime-failure',
        name: 'Inspect a correlated runtime failure',
        importance: 'major',
        preconditions: ['A deterministic retryable worker failure is enabled.'],
        action:
          'Trigger one failed delivery and inspect the captured diagnostic before retrying successfully.',
        observableExpectation:
          'Gameplay history does not claim a fictional failure; retry later continues from committed state.',
        authoritativeExpectation:
          'One structured error names the stable event and safe story/activity/operation/notice identities without secrets or arbitrary payloads.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'activity-event-ledger',
        description:
          'Ordered public-safe lifecycle events with exact instance, revision, tick, cause, and permitted evidence links.',
        required: true,
      },
      {
        kind: 'structured-runtime-diagnostics',
        description:
          'Stable event name, severity, timestamp and safe correlation identities for the injected retryable failure and recovery.',
        required: true,
      },
    ],
    resetPolicy:
      'Use a fresh beacon-watch.v1 story; retain the injected failure identity and do not use direct database edits as lifecycle evidence.',
    nonAssertions: [
      'This does not establish production telemetry, analytics, distributed tracing, or hosted log retention.',
      'Runtime logs are diagnostic evidence, not authority for activity state or rewards.',
    ],
  }),
  defineCase({
    id: 'historical-report-vs-scene',
    version: 2,
    name: 'Historical report versus controlling scene',
    purpose:
      'Prove that delayed report-only narration cannot replace current gameplay while a required scene can deliberately hold it.',
    risk: 'Late prose may overwrite the current offer, duplicate rewards, or let routine work advance through an unresolved controlling event.',
    costClass: 'offline',
    availability: {
      state: 'planned',
      reason:
        'Report dispatch and source-bound publication exist, but the Chamber cannot yet deterministically delay/release report delivery or compare it with a controlling scene.',
    },
    prerequisites: [
      'The Chamber can delay, fail, retry, and inspect report and controlling-scene hooks independently.',
    ],
    initialScenario: 'beacon-watch.v1',
    drivers: ['manual-chamber', 'browser-automation'],
    variants: [],
    stages: [
      stage({
        id: 'commit-report-source',
        name: 'Commit a reportable activity boundary',
        importance: 'poc-blocker',
        preconditions: [
          'Beacon completion is configured with an optional historical report.',
        ],
        action:
          'Complete the beacon repair and capture its boundary receipt and report hook.',
        observableExpectation:
          'The factual completion and reward are visible immediately; literary reporting may still be pending.',
        authoritativeExpectation:
          'Mechanics, report intent, and stable hook identity commit once without making the report current authority.',
      }),
      stage({
        id: 'advance-past-report',
        name: 'Advance gameplay while reporting is pending',
        importance: 'poc-blocker',
        preconditions: ['The optional report has not published.'],
        action:
          'Select and finish the authorized wait before releasing the report.',
        observableExpectation:
          'Current play proceeds independently of the optional report.',
        authoritativeExpectation:
          'The wait owns the later ticks/current state; the report retains the earlier completion tick and receipt.',
      }),
      stage({
        id: 'publish-late-report',
        name: 'Publish the delayed historical report',
        importance: 'poc-blocker',
        preconditions: ['Gameplay has advanced beyond the report source.'],
        action: 'Release and publish the saved report result, then reload.',
        observableExpectation:
          'The report reads as earlier history and does not replace the current scene or choices.',
        authoritativeExpectation:
          'Current revision, offer, facts, rewards, and tick remain unchanged; duplicate publication creates no second report.',
      }),
      stage({
        id: 'contrast-required-scene',
        name: 'Contrast a required controlling scene',
        importance: 'poc-blocker',
        preconditions: [
          'A fresh story can trigger the supported stranger hazard.',
        ],
        action:
          'Trigger the controlling scene, fail its offline generation, leave it blocked across an artificial time jump, then explicitly retry the same generation.',
        observableExpectation:
          'The story visibly holds with a retryable blocker, then publishes the recovered scene without repeating the committed action.',
        authoritativeExpectation:
          'One independently owned Storyteller hold survives failure; retry retains its generation identity, valid publication transfers ownership to the exact offered decision, selection clears that hold, and no successor, held-time catch-up, duplicate receipt, extra reward, or response deadline appears.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'follow-up-hooks',
        description:
          'Source receipts, hook identities, task/publication states, source ticks, and controlling classification.',
        required: true,
      },
      {
        kind: 'before-after-current-state',
        description:
          'Current story revision, offer, tick, facts, rewards, and passage identity before and after late report publication.',
        required: true,
      },
    ],
    resetPolicy:
      'Use separate fresh stories for the optional-report and required-scene variants; never reuse hook identities.',
    nonAssertions: [
      'A scripted report proves authority and delivery semantics, not live prose quality.',
      'This case does not authorize provider calls, automatic fallback choices, or notification delivery.',
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
          'Five cases identify narrative/mechanical opening, continuation, consequence and report contracts with exact structural sizes and hashes.',
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
          'Purpose-specific differences and current context loss are understandable without reading raw provider code.',
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
          'A durable run allowance, effective account/story policy snapshot, matching route identity, and one immutable operation envelope authorize only this probe.',
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
          'At most the authorized call count and operation-wide token/cost reservation are consumed; a new attempt ID cannot replenish them.',
      }),
      stage({
        id: 'reconcile',
        name: 'Reconcile cost and evidence',
        importance: 'poc-blocker',
        preconditions: ['The probe reached a terminal or uncertain state.'],
        action:
          'Capture output quality observations and reconcile provider accounting.',
        observableExpectation:
          'The run states what was learned, the safe limiting reason when blocked, and whether retry can help.',
        authoritativeExpectation:
          'Attempt detail and aggregate operation rounds, tokens, charge, reservations, and certainty are retained without double-counting; retry is offered only for unsent/recoverable work or saved publication.',
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
