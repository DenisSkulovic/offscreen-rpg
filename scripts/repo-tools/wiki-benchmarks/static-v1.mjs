/**
 * Frozen static questions for WIKI02.
 * Headings were checked against the docs at implementation time.
 * This is an implementer-validated dataset, not an independent human study.
 * WIKI03 must exclude this directory from any agent-visible snapshot.
 */
export const DATASET_VERSION = 'wiki-static-v1';
export const REVIEW_STATUS = 'implementer-checked-headings';
export const INDEPENDENT_REVIEW = false;

export const CASES = [
  {
    id: 'P01',
    category: 'P',
    question: 'What makes this a living RPG rather than a chat conversation?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/foundations/vision.md', headingText: 'Earned life', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['A chat transcript is the game state'],
  },
  {
    id: 'P02',
    category: 'P',
    question: 'Does fictional time advance if I have not accepted any action?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/gameplay/time-and-autonomy.md', headingText: 'Response windows and absence', role: 'mandatory', grade: 3, hopper: true },
      { path: 'docs/technical/engine/chronology-and-activities.md', headingText: 'Permission to advance', role: 'companion', grade: 2 },
    ],
    prohibited: ['Unanswered choices automatically advance time'],
  },
  {
    id: 'P03',
    category: 'P',
    question: 'What qualifies as an accepted commitment rather than a narrated intention?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/gameplay/actions-and-commitments.md', headingText: 'From intention to continuation', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['Narrated intention is already a commitment'],
  },
  {
    id: 'P04',
    category: 'P',
    question: 'Who decides whether I earned an item or the dice result?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/gameplay/rules.md', headingText: 'Authority split', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['The Storyteller decides the dice result'],
  },
  {
    id: 'P05',
    category: 'P',
    question: 'Can a character be nonhuman without a standard humanoid inventory?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/gameplay/worlds-and-characters.md', headingText: 'Flexible settings and protagonists', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['Every character has a humanoid inventory'],
  },
  {
    id: 'P06',
    category: 'P',
    question: 'What should a player see in the journal after returning?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/experience/return-and-journal.md', headingText: 'After absence', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['Opening the story list marks every story read'],
  },
  {
    id: 'P07',
    category: 'P',
    question: 'What may the Storyteller invent, and what must it refuse to invent?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/storyteller/behavior-and-quality.md', headingText: 'What it must not do', role: 'mandatory', grade: 3, hopper: true },
      { path: 'docs/product/storyteller/behavior-and-quality.md', headingText: 'What it may do', role: 'companion', grade: 2 },
    ],
    prohibited: ['The Storyteller may invent mechanical rewards'],
  },
  {
    id: 'T01',
    category: 'T',
    question: 'What is the intended engine architecture, and who owns mechanical truth?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/engine/selected-architecture.md', headingText: 'Ownership lines', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['Model prose is mechanical truth'],
  },
  {
    id: 'T02',
    category: 'T',
    question: 'How should a stalled external context read avoid holding a story lock?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/engine/concurrency-and-recovery.md', headingText: 'What C1 and C2 actually proved', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['The full short-lock refactor is finished'],
  },
  {
    id: 'T03',
    category: 'T',
    question: 'How do provider reservations and paid attempt settlement work?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/storyteller/provider-boundary.md', headingText: 'Exact packet boundary', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['A failed attempt is always free and unrecorded'],
  },
  {
    id: 'T04',
    category: 'T',
    question: 'When may the Storyteller inspect memory and when must its loop stop?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/storyteller/prompts-and-tools.md', headingText: 'Stopping', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['The model loop may continue until it is satisfied'],
  },
  {
    id: 'T05',
    category: 'T',
    question: 'Which data is narrative evidence versus committed mechanical state?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/storyteller/context-and-memory.md', headingText: 'One owner per kind of truth', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['A prose document can move an item'],
  },
  {
    id: 'T06',
    category: 'T',
    question: 'What happens when a stored document is missing during S3 cutover?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/platform/data-and-persistence.md', headingText: 'Selected document store', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['A missing object is silently replaced by a generated body'],
  },
  {
    id: 'T07',
    category: 'T',
    question: 'What belongs to Next server render versus client/query state?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/client/state-and-server-boundary.md', headingText: 'Ownership', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['The client cache is the mechanical authority'],
  },
  {
    id: 'S01',
    category: 'S',
    question: 'Is authenticated SSE invalidation actually implemented?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/client/architecture.md', headingText: '4. End-to-end update transport (selected, not future conjecture)', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['SSE is absent', 'Production hosting of SSE is proved'],
  },
  {
    id: 'S02',
    category: 'S',
    question: 'Does the Chamber have a connected lane today, and is paid-provider proof done?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/lab/chamber-and-fixtures.md', headingText: '9. Authority, safety and cost', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['The paid-provider Chamber lane is proved'],
  },
  {
    id: 'S03',
    category: 'S',
    question: 'Do ENG03-C1 and C2 mean the full lock refactor is complete?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/engine/concurrency-and-recovery.md', headingText: 'What is still not done', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['C1 and C2 complete the short-lock refactor'],
  },
  {
    id: 'S04',
    category: 'S',
    question: 'Is the adaptive Storyteller investigation loop live by default?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/storyteller/operation-and-controller.md', headingText: 'Supported behavior and evidence limits', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['ask_memory is the live default'],
  },
  {
    id: 'S05',
    category: 'S',
    question: 'Does production Support currently have a raw-prompt access grant?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/admin/authority-and-governance.md', headingText: 'A grant is one coherent permission', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['Production Support has a raw-prompt grant'],
  },
  {
    id: 'S06',
    category: 'S',
    question: 'Can current forensic evidence reconstruct every past turn causally?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/observability/investigation-and-reconstruction.md', headingText: 'Reconstruction steps', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['Every past turn can be causally reconstructed'],
  },
  {
    id: 'D01',
    category: 'D',
    question: 'Can the character pursue an unattended standing routine?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/gameplay/time-and-autonomy.md', headingText: 'Response windows and absence', role: 'mandatory', grade: 3, hopper: true },
      { path: 'work/designs/open/time-and-autonomy/gm03-bounded-routine-v1.md', headingText: '1. Fixture decision and existing-rule constraint', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['Standing life is already accepted product behavior'],
  },
  {
    id: 'D02',
    category: 'D',
    question: 'Can a missed decision get a preapproved default?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/gameplay/time-and-autonomy.md', headingText: 'Response windows and absence', role: 'mandatory', grade: 3, hopper: true },
      { path: 'work/designs/open/time-and-autonomy/gm07-consented-default-v1.md', headingText: '1. Make consent tangible, not "AI personality"', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['Missed decisions already use an automatic default'],
  },
  {
    id: 'D03',
    category: 'D',
    question: 'Who decides the pause policy in a shared story?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/gameplay/time-and-autonomy.md', headingText: 'Pause and resume', role: 'mandatory', grade: 3, hopper: true },
      { path: 'work/designs/open/shared-play/README.md', headingText: 'Shared play | open design', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['Shared pause policy is an accepted product rule'],
  },
  {
    id: 'D04',
    category: 'D',
    question: 'Is player-facing replay the same as the Support forensic reconstruction?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/experience/return-and-journal.md', headingText: 'Separation from staff forensics and replay product', role: 'mandatory', grade: 3, hopper: true },
      { path: 'work/designs/backlog/player-replay/README.md', headingText: 'Player replay | deferred design', role: 'mandatory', grade: 3 },
      { path: 'docs/technical/observability/investigation-and-reconstruction.md', headingText: 'Reconstruction steps', role: 'companion', grade: 2 },
    ],
    prohibited: ['Player replay is the Support forensic tool'],
  },
  {
    id: 'A01',
    category: 'A',
    question: 'A legacy technical page says SSE is not implemented. Should I trust that?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/client/architecture.md', headingText: '4. End-to-end update transport (selected, not future conjecture)', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['Trust the legacy page over the client contract and STATUS'],
  },
  {
    id: 'A02',
    category: 'A',
    question: 'A design says unanswered choices automatically move time. Is that approved today?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/gameplay/time-and-autonomy.md', headingText: 'Response windows and absence', role: 'mandatory', grade: 3, hopper: true },
      { path: 'work/designs/open/time-and-autonomy/gm07-consented-default-v1.md', headingText: '1. Make consent tangible, not "AI personality"', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['The design is already the accepted rule'],
  },
  {
    id: 'A03',
    category: 'A',
    question: 'OBS07 has a synthetic Support screenshot. Does this grant production prompt access?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/admin/authority-and-governance.md', headingText: 'A grant is one coherent permission', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['A synthetic screenshot grants production prompt access'],
  },
  {
    id: 'A04',
    category: 'A',
    question: 'An old ENG05 design says no code authorized. Is the S3 adapter absent?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/technical/platform/data-and-persistence.md', headingText: 'Selected document store', role: 'mandatory', grade: 3, hopper: true },
      { path: 'STATUS.md', headingText: 'Capability coverage', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['The S3 adapter is absent because an old design said no code'],
  },
  {
    id: 'A05',
    category: 'A',
    question: 'A historical experience essay calls itself the replacement specification. Is it binding?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'docs/product/experience/principles.md', headingText: 'Non-negotiables', role: 'mandatory', grade: 3, hopper: true },
    ],
    prohibited: ['A retired experience essay is the binding specification'],
  },
  {
    id: 'A06',
    category: 'A',
    question: 'An archived Change says Done. Can I run that packet again without new approval?',
    entrypoint: 'docs/README.md',
    owners: [
      { path: 'work/changes/README.md', headingText: 'Work changes | selection queue', role: 'mandatory', grade: 3, hopper: true },
      { path: 'AGENTS.md', headingText: 'Boundaries', role: 'mandatory', grade: 3 },
    ],
    prohibited: ['A Done packet may be implemented again without a new selection'],
  },
];
