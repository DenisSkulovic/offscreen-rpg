/**
 * Host-only HAR08 questions. This directory is excluded from agent snapshots.
 * review stays unreviewed until someone other than the author checks the oracle.
 * Question text must not name the gold path or symbol.
 */

export const HAR08_TASKS = [
  {
    id: 'H1',
    category: 'implementation-enforcement',
    review: 'unreviewed',
    question: 'When a player submits an answer, can that request also name the next scene or the mechanical effects to apply?',
    requiredAssertions: [
      'The accepted submission is an interaction id plus a selected option.',
      'The server validates that submission against its own current offer.',
      'The submission does not commit effects.',
    ],
    prohibited: [
      'the browser names the next scene',
      'the answer includes mechanical effects',
    ],
    roles: [
      { path: 'packages/contracts/src/interactions.ts', symbol: 'interactionSubmissionSchema' },
      { path: 'packages/contracts/src/stories.ts', symbol: 'respondToStorySchema' },
    ],
    temptingWrongInference: 'A route that accepts a player answer is treated as accepting a client-supplied scene or effect list.',
    negative: 'Rejecting an extra JSON field is not the same as having applied the story consequence.',
  },
  {
    id: 'H2',
    category: 'selected-versus-realized',
    review: 'unreviewed',
    question: 'Is automatic deletion of stored document bodies part of the current contract, or only a later policy?',
    requiredAssertions: [
      'The selected document-store contract has no automatic deletion.',
      'Objects are not deleted by age.',
      'An S3 adapter is not a hosted deletion or cutover proof.',
    ],
    prohibited: [
      'automatic deletion is implemented',
      'documents are deleted by age',
    ],
    roles: [
      { path: 'docs/technical/platform/data-and-persistence.md', symbol: 'selected-document-store' },
      { path: 'packages/documents/src/s3-store.ts', symbol: null },
    ],
    temptingWrongInference: 'Because an S3 client exists, garbage collection must already exist.',
    negative: 'A local-or-S3 mode switch does not prove old bodies are cleaned up.',
  },
  {
    id: 'H3',
    category: 'multi-package-responsibility',
    review: 'unreviewed',
    question: 'Does the code that validates a draft transport shape also perform that draft database write?',
    requiredAssertions: [
      'Transport validation and the database write have different owners.',
      'The transport schema does not open the database.',
    ],
    prohibited: ['the transport schema writes the database'],
    roles: [
      { path: 'packages/contracts/src/drafts.ts', symbol: 'saveDraftSchema' },
      { path: 'packages/application/src/drafts/index.ts', symbol: 'createDrafts' },
    ],
    temptingWrongInference: 'One draft module both checks the shape and inserts the row.',
    negative: 'Sharing a draft id does not merge the two owners.',
  },
  {
    id: 'H4',
    category: 'absence-or-negative-authorization',
    review: 'unreviewed',
    question: 'Is the Storyteller authorized to use a general web search or a shell while preparing narration?',
    requiredAssertions: [
      'Web search and a shell are outside the approved read vocabulary.',
      'The model is not given the shell or the web.',
      'A memory question is not a web search.',
    ],
    prohibited: ['web search is authorized', 'the shell is an approved tool'],
    roles: [
      { path: 'docs/technical/storyteller/prompts-and-tools.md', symbol: null },
      { path: 'packages/storyteller/src/tasks/memory-exploration.ts', symbol: 'ask_memory' },
    ],
    temptingWrongInference: 'An approved memory read is permission to browse or run commands.',
    negative: 'ask_memory returns repository leads. It does not authorize the public web or a shell.',
  },
  {
    id: 'H5',
    category: 'historical-decision',
    review: 'unreviewed',
    question: 'Why was the web client kept as a Next.js application instead of being migrated to a separate single-page application?',
    requiredAssertions: [
      'The selected client target keeps the existing Next.js App Router and server-rendered pages.',
      'That target rejects a migration to a separate single-page application.',
      'The choice is a frontend architecture decision, not a new game rule.',
    ],
    prohibited: ['a single-page application migration is the selected target'],
    roles: [{ path: 'docs/technical/client/architecture.md', symbol: null }],
    temptingWrongInference: 'Naming React means the selected plan was to leave Next and become a standalone SPA.',
    negative: 'The architecture decision does not prove that every listed UI library is already installed.',
  },
  {
    id: 'H6',
    category: 'conceptual-contradiction',
    review: 'unreviewed',
    question: 'If a document body was stored and the database commit then failed, is that body a published scene?',
    requiredAssertions: [
      'A staged object whose commit failed is unreferenced garbage.',
      'It is not a published scene.',
      'Storing bytes is not publication.',
    ],
    prohibited: ['a stored object is a published scene'],
    roles: [{ path: 'docs/technical/platform/data-and-persistence.md', symbol: 'selected-document-store' }],
    temptingWrongInference: 'Anything that reached storage has been published.',
    negative: 'Keeping a receipt of the failed commit does not publish the scene.',
  },
];
