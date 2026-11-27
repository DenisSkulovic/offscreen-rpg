# TD07 | source and claim map

Inspected frozen main `4b621ec9708361a2304efdcff4d34bb7da2b6c88`. Heading inventory and source anchors below identify the actual owners; source existence is not live qualification. Read-only source checks, no runtime or provider operations.

## T01 | Staff topology and session

Owned existing headings:

- `docs/technical/admin/topology-and-authorization.md`: 1: Admin control-plane architecture | selected long-term technical topology; 5: 1. The architecture choice; 18: Authorization claim map; 30: Contract dependencies; 37: 2. Trust boundaries and request flow; 63: Do not use these shortcuts; 73: 3. Code-owner map (destination, NOT existing folders); 91: 4. Separation of command and observation; 99: 5. Model consistency and asynchronous work; 107: 6. Initial delivery boundary; 119: 7. Dependency and trade-off rationale; 125: 8. Architecture rejection cases

- `docs/technical/admin/console-and-read-models.md`: 1: Admin frontend, navigation and interaction contracts; 5: 1. One staff shell with isolated authentication and data; 18: 2. Session and cache isolation; 27: 3. Logical navigation and roles; 37: 4. Shared interaction building blocks; 61: 5. Transport and Next boundary; 70: 6. Screenshot/interaction states for future Storybook; 86: 7. Boundary with player UI and developer Chamber; 92: 8. Frontend negative acceptance


Controlling/evidence anchors: `packages/admin/src/session.ts`; `packages/admin/src/policy.ts`; `apps/web/src/server/admin-actor.ts`. Selected transformation and negative in TASKS T01.

## T02 | Sensitive reads and governed actions

Owned existing headings:

- `docs/technical/admin/investigation-and-privacy.md`: 1: Admin read projections, search, provenance and privacy boundaries; 5: 1. The problem to solve; 11: 2. Required projection families; 28: Envelope conventions; 46: 3. Relationship semantics and current single-owner source; 54: 4. Read model ownership, assembly and missing data; 66: 5. Safe search and cross-entity navigation; 80: 6. Sensitive evidence hierarchy; 98: 7. Freshness, deletion and historical coverage; 109: 8. Negative proof matrix

- `docs/technical/admin/commands-and-audit.md`: 1: Governed Admin actions, approvals, durable receipts and audit; 5: 1. Operational intent is not a raw CRUD mutation; 20: 2. Bounded envelope and identities; 43: 3. User-visible lifecycle; 59: Approval binding; 65: 4. State owners and transaction guarantees; 82: 5. Administrative audit is a product ledger, not a console.log; 98: 6. Case, incident and cross-service relationship; 111: 7. First-wave enabled operations; 125: 8. Negative acceptance


Controlling/evidence anchors: `packages/admin/src/player-reads.ts`; `packages/admin/src/audit-reads.ts`; `packages/admin/src/case-writes.ts`. Selected transformation and negative in TASKS T02.

## T03 | Identity and trust

Owned existing headings:

- `docs/technical/platform/identities-and-access.md`: 1: Identity and access; 6: Who owns the boundary; 22: Authentication and sessions; 44: Boundaries that stay next door; 50: Terminal pairing authorization boundary

- `docs/technical/platform/security-and-trust-boundaries.md`: 1: Platform trust boundaries; 15: Boundary map; 30: Cross-owner 404; 42: Staff grant and case; 56: Provider packet redaction; 68: Story-specific document handles; 80: SSE hint; 92: What this page does not grant; 106: Contract dependencies; 119: Unknowns; 132: Evidence read


Controlling/evidence anchors: `packages/identity-persistence/src/auth.ts`; `packages/identity-persistence/src/terminal-auth.ts`; `packages/admin/src/policy.ts`. Selected transformation and negative in TASKS T03.

## T04 | Financial policy and primitive standing

Owned existing headings:

- `docs/technical/platform/spending-and-entitlements.md`: 1: Account usage policy, windows and recovery; 5: Who owns the boundary; 23: Distinct authorities; 35: Configuration surface; 56: Free, subscription and on-demand profiles; 68: Window accounting and admission; 82: Hold and recovery semantics; 92: Historical recovery evidence — September 2026; 98: Conservative development preset and first paid gate; 111: Evidence required before live evaluation; 115: Future provider billing evidence and reconciliation (planning only, 2026-11-22)


Controlling/evidence anchors: `packages/usage-policy/src/usage-policy.ts`; `packages/story-engine/src/storyteller/usage-policy-resolution.ts`; `packages/story-engine/src/storyteller/usage-policy-defaults.ts`. Selected transformation and negative in TASKS T04.
