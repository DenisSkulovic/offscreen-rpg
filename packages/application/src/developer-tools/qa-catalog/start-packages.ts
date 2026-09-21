import type { QaJourneyCase } from '@offscreen/contracts/qa';
import { defineCase, stage, stateEvidence } from './support';

export const startPackageCases: readonly QaJourneyCase[] = [
  defineCase({
    id: 'reusable-start-package',
    version: 13,
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
          'The same result creates a source-backed descriptive thread and links that change index to the choice.',
          'Intervening play creates an unrelated passage and document before a later result revises the promoted thread.',
          'The correcting result restarts the active situation, marks the revised thread as a change cue and attaches the existing quay through its captured catalogue handle.',
        ],
        action:
          'Select the linked choices through the intervening play and correction, then inspect each admitted Storyteller task and the player-facing offers.',
        observableExpectation:
          'The player sees only choice labels; traces show the exact requested identities, and the eventual return contains the corrected complete thread body without presenting its obsolete body as current.',
        authoritativeExpectation:
          'Admission resolves local aliases to stable story document IDs. The restarted scene carries the revised thread and unchanged quay as typed cues; successors load their current versions without a rewrite, retrieval call or prose matching.',
      }),
      stage({
        id: 'retrieval-oracle',
        name: 'Apply the same retrieval oracle to contrasting worlds',
        importance: 'major',
        preconditions: [
          'The conventional and abstract oracle cases declare mode, structured cues, expected, acceptable and forbidden paths, scope, abstention and fixed budgets.',
        ],
        action:
          'Resolve admitted stable identity, place and thread cues against the exact current root, then compare bounded search with the same declared evidence policy.',
        observableExpectation:
          'The conventional case finds the corrected route; the abstract case returns no invented tavern, wage or humanoid evidence and remains able to abstain.',
        authoritativeExpectation:
          'Both worlds use one generic cue and search contract. The cue trace records stable IDs and reasons; fixture nouns remain expected evidence, never retrieval-policy switches or universal game fields.',
      }),
      stage({
        id: 'lexical-discovery',
        name: 'Find an uncarried current memory',
        importance: 'major',
        preconditions: [
          'The promoted thread has crossed unrelated play and has a superseding revision.',
          'A similar noncanonical possibility and an exact developer-private decoy also exist.',
        ],
        action:
          'Search the exact current campaign root for the thread name, inspect the trace, and load the winning stable document ID through canonical context selection.',
        observableExpectation:
          'The result identifies revision two with a corrected snippet and explicit scan coverage; the exact loader returns the corrected complete body.',
        authoritativeExpectation:
          'Search excludes developer-private and superseded bodies. A candidate remains a lead until its stable ID is loaded from the same current manifest.',
      }),
      stage({
        id: 'retrieval-cost-postures',
        name: 'Compare bounded retrieval cost postures',
        importance: 'major',
        preconditions: [
          'The same exact story root and information needs are available to minimal, balanced and rich retrieval recipes.',
          'A stricter operation envelope is available for intersection.',
        ],
        action:
          'Run the maintained memory evaluator under all three postures, then resolve rich under zero read and retained-byte limits.',
        observableExpectation:
          'The report shows each posture’s recall, precision, assembly and timing separately; it does not call a larger recipe universally better.',
        authoritativeExpectation:
          'Recipe changes affect only bounded optional evidence work. The effective recipe never exceeds operation limits, and visibility, current-root, authority and branch filters remain identical.',
      }),
      stage({
        id: 'scripted-memory-exploration',
        name: 'Follow retrieved memory to its canonical source',
        importance: 'major',
        preconditions: [
          'A captured Greywake root contains the current favor record and its original source passage.',
          'A rich bounded retrieval recipe permits at least four reads.',
        ],
        action:
          'Batch memory search and registry lookup, snapshot and restore the private exploration state, then batch inspection of the returned favor handle with its source read.',
        observableExpectation:
          'The trace exposes compact candidates followed by the exact current favor and original promise passage; no prose is published.',
        authoritativeExpectation:
          'Every body read rechecks the captured manifest identity, task-local handles survive snapshot restoration, and the trace records four reads within its retained-byte ceiling.',
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
