import type { QaJourneyCase } from '@offscreen/contracts/qa';
import { defineCase, stage, stateEvidence } from './support';

export const activityLifecycleCases: readonly QaJourneyCase[] = [
  defineCase({
    id: 'finite-action-overlap',
    version: 3,
    name: 'Finite action preparation overlap',
    purpose:
      'Prove that one frozen finite result may prepare privately during its wait and publishes only after exact mechanical settlement.',
    risk: 'Speculative prose may leak future state, reroll mechanics, miss an early/late wake, or bypass a due world rule.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Use the Chamber scripted-generation control for a five-second finite action and retain its exact generation identity.',
      'Expose pending execution, generation, receipt and publication identities without exposing the private outcome to the player.',
    ],
    initialScenario: 'pineapple-mechanics.v4',
    drivers: ['manual-chamber', 'api-script'],
    variants: [],
    stages: [
      stage({
        id: 'early-preparation',
        name: 'Finish preparation before mechanics',
        importance: 'poc-blocker',
        preconditions: [
          'An eligible five-second action is paused while unheld scripted preparation completes.',
        ],
        action:
          'Select and pause the action, inspect it after preparation finishes privately, then resume to its target.',
        observableExpectation:
          'No outcome, effect, fact, passage or next choice appears before the target; the settled result and prepared scene then publish promptly.',
        authoritativeExpectation:
          'One frozen draw remains private, settlement creates one matching receipt, and the exact preparation generation publishes once.',
      }),
      stage({
        id: 'late-preparation',
        name: 'Finish preparation after mechanics',
        importance: 'poc-blocker',
        preconditions: [
          'The same action uses a thirty-second scripted preparation delay.',
        ],
        action:
          'Select the action, wait through its target, inspect the held state, then release preparation.',
        observableExpectation:
          'The action completes at five seconds and remains visibly awaiting narration without gaining more fictional time; the scene publishes at release.',
        authoritativeExpectation:
          'The saved receipt owns the committed result and required-turn hold while the same generation completes; no second draw or task is created.',
      }),
      stage({
        id: 'due-boundary-fallback',
        name: 'Fall back at a due world boundary',
        importance: 'poc-blocker',
        preconditions: [
          'A world obligation is due no later than the selected action target.',
        ],
        action: 'Select the action and advance to the due boundary.',
        observableExpectation:
          'The world rule is not hidden or skipped and no future action outcome leaks.',
        authoritativeExpectation:
          'Overlap is ineligible; ordered settlement uses the sequential consequence path without a pending resolution or preparation generation.',
      }),
      stage({
        id: 'failed-preparation-recovery',
        name: 'Recover the same failed preparation',
        importance: 'poc-blocker',
        preconditions: [
          'The story-scoped Chamber control is armed to fail the next pending consequence.',
        ],
        action:
          'Select the finite action, wait for committed mechanics and the explicit narration failure, then retry through the ordinary story endpoint.',
        observableExpectation:
          'The committed outcome remains visible but blocked for narration; retry publishes one scene without adding fictional time.',
        authoritativeExpectation:
          'The retry reuses the exact generation and saved receipt; it creates no second draw, effect, receipt, operation allowance or held-time catch-up.',
      }),
    ],
    evidenceRequirements: [
      stateEvidence,
      {
        kind: 'overlap-readiness',
        description:
          'Execution, frozen-result digest, generation, receipt, hold and publication identities with their readiness order.',
        required: true,
      },
    ],
    resetPolicy:
      'Use a fresh story and QA run for each timing order and preserve every earlier run.',
    nonAssertions: [
      'This case does not claim that activities, travel, general combat or prose-authored schedules are safe to overlap.',
      'Scripted latency does not establish live provider speed or prose quality.',
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
];
