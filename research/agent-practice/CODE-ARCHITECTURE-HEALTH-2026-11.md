# Code architecture health | concluded MA/DO research

Non-normative historical evidence. Owner retired the design on 2026-11-27; [engineering rules](../../.agents/rules/code-quality.md) own enduring practice, [topology](../../docs/technical/platform/topology.md#code-organization) owns existing selected code organization, and [Agent Core](../../work/designs/open/agent-core-monorepo-map/README.md) explores a successor. No package partition or runtime proof follows from this record.

## Findings worth retaining

- At `fa8e486533943e952c908c21af8d7a73aae84efa`, Application contained 180 TypeScript modules / 1,747,669 bytes; Storyteller subdirectory held 63 direct files / 741,865 bytes. At `e122d080677263aa6f38961f8734713664827c55`, Story Engine contained 160 TS modules / ~1,533 KiB; Application mostly forwarded 136 exports, with ~95% of remaining source bytes in developer tools. Moving files did not itself solve internal coupling.
- Post-MA06A static relative-import analysis found 381 edges and three SCCs: generations/Writer dispatch and openings, Writer child/mission custody/store, campaign action execution/narrative settlement. These included possible type-only edges; no AST runtime graph or runtime proof claimed. Reassess actual current source before treating any as debt.
- Authority resolution called Writer preparation despite an injected preparation seam; campaign narration/report capture called Writer internals. Candidate: freeze authoritative facts/notice inside existing transaction, perform bounded materialization outside locks with durable identity and recovery; not ratified, no untracked post-commit work or duplicate reports. Publication direction may be legitimate when authority fences hold.
- Reopen questions: Writer tool validation/grants/root/replay; capture schema versions, SQL leases, pins and canonical hashes; provider reservation/transport/uncertain settlement/publication; hosted admin capability authority; actual package exports, consumers and cycles. These are investigation prompts, not assigned tasks.
- Historical DO01–07 source closures removed the generic contracts workspace according to recorded receipts; preserve domain-owned wire shapes, local internal types, explicit dependencies and private protocol restrictions. Existing package topology is not a requirement for clean-slate design. No runtime proof inferred.

## Original materials (immutable)

- [DO-PARALLEL-EXECUTION.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/e1e7dd68862a2e282894f395726a97b8bebc7ce3/work/designs/open/code-architecture-health/DO-PARALLEL-EXECUTION.md)
- [DOMAIN-OWNERSHIP-REFERENCE-INVENTORY.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/e1e7dd68862a2e282894f395726a97b8bebc7ce3/work/designs/open/code-architecture-health/DOMAIN-OWNERSHIP-REFERENCE-INVENTORY.md)
- [DOMAIN-OWNERSHIP-RETIREMENT.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/e1e7dd68862a2e282894f395726a97b8bebc7ce3/work/designs/open/code-architecture-health/DOMAIN-OWNERSHIP-RETIREMENT.md)
- [MONOREPO-MODULE-OWNERSHIP.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/e1e7dd68862a2e282894f395726a97b8bebc7ce3/work/designs/open/code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md)
- [POST-MA06A-ARCHITECTURE-AUDIT.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/e1e7dd68862a2e282894f395726a97b8bebc7ce3/work/designs/open/code-architecture-health/POST-MA06A-ARCHITECTURE-AUDIT.md)
- [README.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/e1e7dd68862a2e282894f395726a97b8bebc7ce3/work/designs/open/code-architecture-health/README.md)

These preserve the exact module ownership maps, reference census, original audit, dispatch dependencies and proof limitations. Historical schedules and candidate package splits are superseded; independently tracked Changes retain their own lifecycle and must be refreshed before promotion. No age-based loss of these research locators.
