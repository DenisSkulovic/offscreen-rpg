/** Author-checked targets for the local search trial. This list is not an independent review. */

export const CODE_CASES = [
  {
    id: 'C1',
    query: 'where is an item transfer refused when the current holder does not match',
    owners: ['packages/game/src/immediate-actions.ts'],
    symbol: 'itemTransferBlocked',
  },
  {
    id: 'C2',
    query: 'where is a repeated storyteller execution stage stored only once',
    owners: ['packages/application/src/storyteller/execution-stages.ts'],
    symbol: 'idempotencyKey',
  },
  {
    id: 'C3',
    query: 'where does a generated storyteller result become a published passage',
    owners: ['packages/application/src/storyteller/publication.ts'],
    symbol: 'publishStorytellerResult',
  },
  {
    id: 'C4',
    query: 'where is a generated plan rejected for including mechanical world effects',
    owners: ['packages/game/src/immediate-actions.ts'],
    symbol: 'validateImmediateActionProposal',
  },
  {
    id: 'C5',
    query: 'settleProcessBoundary',
    owners: ['packages/game/src/activities.ts'],
    symbol: 'settleProcessBoundary',
    exact: true,
  },
  {
    id: 'C6',
    query: 'activity boundary block text',
    owners: ['packages/game/src/activities.ts'],
    symbol: 'activityBoundaryBlockText',
    decoy: 'settleProcessBoundary',
  },
  {
    id: 'C7',
    query: 'where is the Grafana metrics exporter implemented',
    absent: true,
    forbidden: 'grafana',
  },
  {
    id: 'C8',
    query: 'settleProcessBoundary',
    owners: ['packages/game/src/activities.ts'],
    symbol: 'settleProcessBoundary',
    callers: true,
  },
];

export const DOC_CASES = [
  {
    id: 'D1',
    query: 'when the player is away how does fictional time keep moving',
    owners: ['docs/product/gameplay/time-and-autonomy.md'],
  },
  {
    id: 'D2',
    query: 'what is a storyteller model forbidden to commit on its own',
    owners: ['docs/technical/storyteller/operation-and-controller.md'],
  },
  {
    id: 'D3',
    query: 'may support staff read a private narrative or a raw model prompt',
    owners: ['docs/product/admin/commercial-and-trust.md'],
    authority: 'proposal',
  },
  {
    id: 'D4',
    query: 'which selected client architecture is actually implemented',
    owners: ['docs/technical/client/architecture.md'],
    status: true,
  },
  {
    id: 'D5',
    query: 'is operational telemetry installed or authorized',
    owners: ['docs/technical/observability/telemetry-and-diagnostics.md'],
    authority: 'proposal',
  },
  {
    id: 'D6',
    query: 'which archived change authorizes new product work',
    owners: ['AGENTS.md'],
    archiveForbidden: true,
  },
  {
    id: 'D7',
    query: 'does a quiet hour with no model calls count as an outage',
    owners: ['docs/product/admin/ai-engineering-and-investigation.md'],
    authority: 'proposal',
  },
  {
    id: 'D8',
    query: 'stale index after a new commit',
    freshness: true,
  },
];
