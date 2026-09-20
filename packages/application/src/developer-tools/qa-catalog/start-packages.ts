import type { QaJourneyCase } from '@offscreen/contracts/qa';
import { defineCase, stage, stateEvidence } from './support';

export const startPackageCases: readonly QaJourneyCase[] = [
  defineCase({
    id: 'reusable-start-package',
    version: 4,
    name: 'Reusable canonical start package',
    purpose:
      'Prove that one generic import and campaign-start path supports both a richly authored conventional setting and a sparse abstract life without inventing missing concepts.',
    risk: 'A template can masquerade possibilities as facts, duplicate shared lore, schedule obligations twice, or bake fantasy assumptions into generic campaign creation.',
    costClass: 'offline',
    availability: { state: 'available' },
    prerequisites: [
      'Seed exact local world and rule package roots.',
      'Import the selected start directory without provider access.',
      'Use a fresh disposable campaign database.',
    ],
    initialScenario: null,
    drivers: ['api-script'],
    variants: [
      {
        id: 'conventional',
        name: 'Conventional authored world',
        description:
          'Includes characters, locations, a visible thread, a private possible arc and one typed obligation.',
        availability: {
          state: 'available',
        },
        prerequisites: ['Import the conventional start fixture.'],
      },
      {
        id: 'abstract',
        name: 'Abstract or microbe life',
        description:
          'Omits humanoids, maps, inventory, economy, calendar-specific lore and quests.',
        availability: {
          state: 'available',
        },
        prerequisites: ['Import the abstract start fixture.'],
      },
    ],
    stages: [
      stage({
        id: 'import',
        name: 'Import without activating play',
        importance: 'poc-blocker',
        preconditions: ['The source descriptor and every declared file exist.'],
        action: 'Import the package and inspect its immutable manifest.',
        observableExpectation:
          'The package is inspectable as authored content and has not started a story.',
        authoritativeExpectation:
          'Initial canon, private possibilities and executable obligations retain distinct validated authority, visibility and activation classes.',
      }),
      stage({
        id: 'instantiate',
        name: 'Start through the ordinary campaign transaction',
        importance: 'poc-blocker',
        preconditions: [
          'A reviewed opening and exact package reference exist.',
        ],
        action: 'Start a campaign with the selected imported package.',
        observableExpectation:
          'The generated opening is current while the authored start material is available to the campaign.',
        authoritativeExpectation:
          'One selected manifest contains the opening source, deterministic campaign-owned clones, exact start/world/rule references and package provenance.',
      }),
      stage({
        id: 'rule-evidence',
        name: 'Capture task-specific canonical rules',
        importance: 'major',
        preconditions: [
          'The campaign is pinned to an immutable tagged rule package.',
          'A contribution or rolled action has produced a mechanical narration task.',
        ],
        action:
          'Inspect the saved Storyteller task and its canonical library selection in Chamber.',
        observableExpectation:
          'The trace names the requested mechanic topics, resolved section handles, loaded bytes and any unmatched or omitted evidence.',
        authoritativeExpectation:
          'Only application-known mechanic tags selected complete sections from the exact pinned rule catalogue; narrative prose did not guess relevance and no extra model call selected context.',
      }),
      stage({
        id: 'choice-lore-handoff',
        name: 'Carry exact lore and memory into the selected branch',
        importance: 'major',
        preconditions: [
          'A narrative task exposes a pinned world-section catalogue.',
          'One private choice names an exact world-section handle and an unloaded campaign-document handle from its captured catalogues.',
        ],
        action:
          'Select that choice, then inspect the newly admitted Storyteller task and the player-facing offer.',
        observableExpectation:
          'The player sees only the choice label; the next task trace shows the requested world handle, stable campaign document identity and complete loaded bodies.',
        authoritativeExpectation:
          'Publication rejects invented, duplicate or wrong-catalogue handles; admission resolves task-local campaign aliases to stable story-scoped identities, and only the selected option triggers bounded loading with no retrieval call or player-prose matching.',
      }),
      stage({
        id: 'retry',
        name: 'Repeat the identical Start request',
        importance: 'poc-blocker',
        preconditions: ['The first Start transaction committed.'],
        action: 'Deliver the same story and package identities again.',
        observableExpectation: 'The same campaign remains current.',
        authoritativeExpectation:
          'Root identity, cloned document identities and obligation rows are unchanged; no obligation is inserted twice.',
      }),
      stage({
        id: 'pinning',
        name: 'Publish a later reusable revision',
        importance: 'major',
        preconditions: ['A campaign is pinned to start revision one.'],
        action:
          'Publish start revision two and reread the existing campaign without an explicit repin operation.',
        observableExpectation: 'The running story does not silently change.',
        authoritativeExpectation:
          'The campaign reference and every cloned source provenance remain pinned to revision one.',
      }),
      stage({
        id: 'absence',
        name: 'Inspect absent concepts',
        importance: 'poc-blocker',
        preconditions: ['The abstract variant is selected.'],
        action: 'Inspect the final root and campaign state.',
        observableExpectation:
          'The abstract life is not described through invented humanoid or fantasy defaults.',
        authoritativeExpectation:
          'The actual abstract protagonist may have an explicit character identity, but no humanoid anatomy, additional people, map, inventory, economy, calendar-specific lore or quest exists unless the fixture supplied it.',
      }),
    ],
    evidenceRequirements: [stateEvidence],
    resetPolicy:
      'Use fresh campaign IDs for variants; retain imported package roots to test reuse and pinning.',
    nonAssertions: [
      'This case does not establish generated prose quality.',
      'A stored obligation is not evidence that every possible schedule or consequence is supported.',
      'The conventional fixture does not make its content roles mandatory for other starts.',
    ],
  }),
];
