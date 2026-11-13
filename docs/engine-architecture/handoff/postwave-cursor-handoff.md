# Post-wave Cursor handoff | resolve engine gates without repeating the redesign

**Status:** design handoff prepared on Nov 13 2026. **No code authorization, no active Change selection.** Baseline main `23fe6b5676c68853a7e864ccc177f0a6b3ea5c53` after ENG01/ENG04/ENG02. Read [independent review](../evidence/postwave-implementation-review.md) before selecting next code work. New execution packets remain **Proposed** until the user authorizes one.

## The short answer to "why not Ready?"

A `Proposed / NOT Ready` Change is not a failed build or an unresolved Cursor exception. It is a deliberate design guard: before code touches source-version/SQL locks, object-store authority, or Temporal history, the executor needs a chosen compatibility and failure contract. The first-pass packets had **named missing decisions**; this review settled several without modifying runtime code.

## Recommended next work, separated by urgency

| Position | Change | Readiness | Justification |
| --- | --- | --- | --- |
| **1** | [ENG08 deny unauthorized provider-origin item effects](../../changes/2026-11-13--eng-provider-world-effect-gate/CHANGE.md) | **Design-ready; owner authorization still required** | Prevent the newly introduced world effect from bypassing actor/item permission through a model-authored plan |
| **1b** | [ENG09 item-interruption reentry](../../changes/2026-11-13--eng-item-interruption-reentry/CHANGE.md) | **Needs one source-backed negative fixture and selected consequence lifecycle** | Current mid-flight holder-change may leave no new playable offer; prove before redesign |
| **2** | [ENG05 shared S3-compatible CAS adapter](../../changes/2026-11-13--eng-shared-cas-store/CHANGE.md) | **Design-ready; owner authorization still required** | One remote immutable store for independent API/worker replicas, with no production/cloud spend |
| **3** | [ENG06 local Temporal replay-compatibility proof](../../changes/2026-11-13--eng-workflow-versioning/CHANGE.md) | **Design-ready for first test/replay slice only** | Protect old accepted timers/activities before future workflow refactors |
| **4** | [ENG03 short-lock context capture](../../changes/2026-11-13--eng-short-lock-context/CHANGE.md) | **NOT Ready for full refactor; measurement plan settled** | First measure object I/O under write lock, then choose minimal source-capture operation; avoid a second unproven orchestration system |

**No broad ENG02 continuation now** merely because an actor-envelope helper exists. A complete nonhuman campaign and form-change validity need separate source/migration plans. Do not merge UX/GM or presentation code into ENG08/ENG05.

## Exact first Cursor prompt: ENG08 (only if owner authorizes)

```text
ROLE: Cursor, bounded implementation executor; do not redesign product/game.
GOAL: Disallow newly model-authored mechanical worldEffects (especially
item.transfer.v1) unless selected by an exact, trusted, preauthorized
plan reference. Keep existing scripted ENG01 transfer fixtures valid.

AUTHORITY:
docs/engine-architecture/evidence/postwave-implementation-review.md
docs/changes/2026-11-13--eng-provider-world-effect-gate/CHANGE.md

READ CURRENT SOURCE:
- packages/game/src/immediate-actions.ts::validateImmediateActionProposal
- packages/storyteller/src/tasks/task-contracts.ts
- packages/application/src/storyteller/publication.ts
- packages/application/src/campaign/actions.ts
- relevant scripted ENG01 and provider-plan validation tests

BEFORE EDITING:
Reinspect main and any ongoing Cursor changes. Check how authorized
opening plan references differ from newly proposed plan bodies.
Don't conflate item existence with actor control permission.

IMPLEMENT:
- Reject nonempty new generated worldEffects by default.
- Preserve exact trusted authorized-plan references, existing current
  scripted effects and valid ordinary generated fact/quantity actions.
- Keep diagnostics bounded without private source leaks.
- No SQL schema/plan migration unless owner explicitly agrees.

PROVE:
- Negative: provider proposes automatic transfer of Mara-held item
  to player; offer rejected, no public selectable world-effect plan.
- Negative: model reconstructs a trusted plan body but has no trusted
  reference identity; cannot bypass authorization.
- Positive: exact authorized reference and existing ENG01 scripted
  transfer remain valid, due-boundary and duplicate behavior unchanged.
- Provider-free tests only; no model spending or destructive DB work.

DO NOT:
Move game clock, introduce actors/permissions registry, revise Frontend
or Storyteller tone, write a new inventory, start ENG09 or ENG05.
No commit/push/deploy without owner approval.

RETURN:
Changed files, actual commands and tests, one rejected proposal trace,
one authorized reference trace, compatibility/remaining gaps.
Stop if reference-vs-new-proposal source identity is ambiguous.
```

## Then ENG09 as separate review

Before implementation, add assertions to the existing disposable mid-flight test: is there a current `offer`, `decision hold`, `generation` or safe recovery control after holder invalidation? A no-offer idle state confirms the suspected product dead end. Select one idempotent, sourced interruption follow-up, **not** a frontend button that grants free time/retries. [ENG09](../../changes/2026-11-13--eng-item-interruption-reentry/CHANGE.md) retains its NOT Ready state until this contract is chosen.

## Then ENG05, whose design choices are now settled

Read [selected S3 adapter contract](../decisions/eng05-shared-cas-contract.md) and [ENG05](../../changes/2026-11-13--eng-shared-cas-store/CHANGE.md). Implement one private object backend behind `DocumentStore`, preserve existing local defaults and canonical JSON/hash, and test with a disposable local S3-compatible service and separate processes. **No cloud credentials, production cutover, automatic GC or migration of legacy local files.** Return exact cross-process byte/hash evidence and failure cases before any live rollout.

## ENG06: replay-first, not cloud infrastructure

Read [Temporal compatibility policy](../decisions/eng06-temporal-compatibility-policy.md). Installed SDK v1.24.0; begin with old-history replay fixtures, deliberately incompatible negative, and worker restart of a saved operation. Do not assume the dev CLI image has production Worker Deployment API support. Actual hosted version pinning is later.

## ENG03: the only substantial gate intentionally still closed

Read [ENG03 measurement-first decision](../decisions/eng03-instrument-before-refactor.md). Capture lock durations with injected slow canonical reads and classify task types. Design an exact versioned context intent only after that evidence. Do not move mutable source reads outside a lock by fiat; don't hold a PostgreSQL transaction open around a new remote object-store read.

## Architecture review checkpoint

After each bounded Change, bring back the actual diff and testing evidence. A green test does not prove narrative quality, independent-replica production operation, nor every old campaign compatibility path. **The product remains the north star**: actual player autonomy and remembered consequences matter more than a fancy directory tree.
