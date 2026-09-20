import type { QaJourneyCase } from '@offscreen/contracts/qa';
import { defineCase, stage, stateEvidence } from './support';

export const calendarAndLiveEvaluationCases: readonly QaJourneyCase[] = [
  defineCase({
    id: 'calendar-projection',
    version: 1,
    name: 'Captured calendar projection',
    purpose:
      'Confirm that one admitted elapsed, ordinal, or unequal-month calendar names the shared campaign clock without changing its authority.',
    risk: 'A display calendar can silently reinterpret time, depend on Earth dates, or ask the Storyteller to perform arithmetic.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Use an offline mechanical campaign start with an explicit time definition.',
      'Do not configure a provider route.',
    ],
    initialScenario: null,
    drivers: ['api-script'],
    variants: [
      {
        id: 'elapsed-cycle',
        name: 'Elapsed cycles',
        description: 'Projects a nonhuman cycle unit without inventing days.',
        availability: { state: 'available' },
        prerequisites: ['Admit an elapsed-unit definition.'],
      },
      {
        id: 'ordinal-day',
        name: 'Ordinal days',
        description: 'Projects a positive day count from a nonzero epoch.',
        availability: { state: 'available' },
        prerequisites: ['Admit an ordinal-day definition.'],
      },
      {
        id: 'unequal-months',
        name: 'Unequal named months',
        description: 'Projects a repeating year whose month lengths differ.',
        availability: { state: 'available' },
        prerequisites: ['Admit a named-year definition.'],
      },
      {
        id: 'world-deadline',
        name: 'Consequential deadline',
        description:
          'Interrupts accepted work at an exact world obligation and publishes its controlling replacement scene.',
        availability: { state: 'available' },
        prerequisites: [
          'Start frost-road.v1 with the Ember/Rain/Frost definition and winter obligation.',
        ],
      },
      {
        id: 'schedule-revision',
        name: 'Schedule revision and stale wake',
        description:
          'Postpones or cancels a pending obligation while accepted work is sleeping, then proves every wake re-reads authority.',
        availability: { state: 'available' },
        prerequisites: [
          'Start frost-road.v1 at a non-instant pace with pending obligations.',
        ],
      },
      {
        id: 'recurring-opportunity-window',
        name: 'Recurring opportunity window',
        description:
          'Uses a Storyteller-proposed warehouse shift to distinguish a recurring availability phase from a deadline or universal daylight rule.',
        availability: {
          state: 'planned',
          reason:
            'Typed recurring availability and close-behavior rules are not implemented yet.',
        },
        prerequisites: [
          'Admit a campaign chronology with a named cycle or calendar phase.',
          'Prepare the same generic activity with start-only and continuously-required variants.',
        ],
      },
    ],
    stages: [
      stage({
        id: 'admit',
        name: 'Admit one immutable time definition',
        importance: 'major',
        preconditions: ['The selected variant definition is valid.'],
        action:
          'Start the campaign with the selected definition and reload it.',
        observableExpectation:
          'The snapshot shows the selected mode and a truthful current label.',
        authoritativeExpectation:
          'Versioned campaign settings retain the exact definition and epoch.',
      }),
      stage({
        id: 'advance',
        name: 'Project the settled campaign tick',
        importance: 'major',
        preconditions: ['A finite accepted action can advance campaign time.'],
        action: 'Settle the action and read the campaign again.',
        observableExpectation:
          'The date and duration labels advance by the admitted definition.',
        authoritativeExpectation:
          'The monotonic tick remains authoritative and the compact Storyteller context contains the server-projected date.',
      }),
      stage({
        id: 'deadline',
        name: 'Stop accepted work at the controlling boundary',
        importance: 'poc-blocker',
        preconditions: [
          'The world-deadline variant has an accepted journey crossing the exact due tick.',
        ],
        action:
          'Advance the journey through the due boundary, redeliver it once, prepare the saved consequence and publish the scripted scene.',
        observableExpectation:
          'The journey retains its earned progress, the condition becomes current once, and the replacement decision reflects the changed route.',
        authoritativeExpectation:
          'The obligation, event, coalesced hold and consequence receipt commit once before the productive crossing boundary.',
      }),
      stage({
        id: 'revise',
        name: 'Revise a sleeping schedule',
        importance: 'poc-blocker',
        preconditions: [
          'The schedule-revision variant has running accepted work that has not earned the old boundary.',
        ],
        action:
          'Postpone one obligation, reject its stale revision, cancel another and deliver the old activity wake.',
        observableExpectation:
          'Described knowledge still hides the exact tick; history shows postpone, cancellation and the eventual firing once.',
        authoritativeExpectation:
          'The old wake uses the revised due tick, cancelled work cannot fire, and revision-kind receipts remain replay-safe.',
      }),
      stage({
        id: 'pace',
        name: 'Change pace without changing chronology',
        importance: 'major',
        preconditions: ['Campaign speed is editable.'],
        action: 'Change pace and read the same settled tick.',
        observableExpectation: 'The world date at that tick is unchanged.',
        authoritativeExpectation:
          'The new settings revision preserves the captured definition and epoch exactly.',
      }),
    ],
    evidenceRequirements: [stateEvidence],
    resetPolicy: 'Use a fresh campaign for each calendar variant.',
    nonAssertions: [
      'Calendar labels do not schedule deadlines or seasonal effects.',
      'This case does not cover leap years, reforms, or simultaneous calendars.',
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
