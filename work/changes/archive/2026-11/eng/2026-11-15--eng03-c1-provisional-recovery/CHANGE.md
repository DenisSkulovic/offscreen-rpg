# ENG03-C1-R | Prevent provisional retry and recover exhausted capture on same G

**State: Done (2026-11-15).** Evidence: [eng03-c1r-provisional-recovery-2026-11-15](../../../../../../evidence/inspections/doc01-legacy-snapshot/programs/engine/evidence/eng03-c1r-provisional-recovery-2026-11-15.md). **Kind:** bounded read/recovery code, additive audit migration and provider-free proof. **Design authority:** [provisional status and same-G rearm V1](../../../../../../evidence/inspections/doc01-legacy-snapshot/programs/engine/decisions/eng03-provisional-recovery-v1.md). **Dependency:** ENG03-narrow and ENG03-C1 core Done. **No provider spend or Admin UI.**

## Cursor first screen

> **Outcome:** a player is never offered an ordinary Storyteller retry for provisional capture G; an explicitly authorized operator can rearm the same frozen G once after three transient CAS failures. The accepted action, hold, root, receipt and G never change.
>
> **Read only first:** [read policy](../../../../../../evidence/inspections/doc01-legacy-snapshot/programs/engine/decisions/eng03-provisional-recovery-v1.md#2-read-and-retry-policy), [rearm transaction](../../../../../../evidence/inspections/doc01-legacy-snapshot/programs/engine/decisions/eng03-provisional-recovery-v1.md#3-explicit-operator-rearm-contract), then current `stories/reads.ts::publicResolutionBlocker`, `storyteller/recovery.ts::retryStoryteller`, `storyteller/capture-materialization.ts::claimCaptureLease` / `releaseCaptureFailure` / `promoteCapture`, `db/schema/storyteller.ts::storytellerContextCapture`. Check the actual branch before editing.

## Bounded execution outcome

1. **Read protection:** include generation kind in snapshot identity and read projection; provisional G always `canRetry=false`. For an exhausted transient capture, return safe blocker `generation/operator`, never raw CAS hash or context JSON. Proven normal and negative cache invalidation.
2. **Lease/exhaustion edge:** distinguish live lease from expired lease, transient exhausted from terminal stale/blocked, and pre-provider capture from post-provider task. Do not change the normal three-attempt bound or automatically wake indefinitely.
3. **Same-G trusted rearm:** implement one idempotent, durable, scoped operator-only application operation using the preconditions in the technical contract. Persist actor/reason/rearmId/epoch evidence and one atomic old-topic notice. Deny when operator audit/capability cannot be enforced. Retain original G and no new `storyResolution`.
4. **Tests:** provider-free unit, disposable SQL two-operator race, crash/replay and source-fence negatives. Verify old tasks and both capture purposes still work.

## Stop rules / exclusions

- No player-facing endpoint or Admin button, unless a separate accepted Admin grant/audit contract is proven and authorized.
- No new generation, provider attempt or automatic paid retry; no additional CAS payload rewrite or fresh live facts.
- No generic retry service, arbitrary number of manual attempts, schema-breaking migration, full ENG03 rewrite or unrelated ENG03 purposes.
- If existing audit machinery cannot satisfy attribution/uniqueness, prepare the smallest additive recovery audit table and report its exact rollback plan before migration.

## Falsifiable exit

**Normal:** attempt 3 fails due to missing source; player cannot retry; authorized rearm after source restoration produces exactly one original-topic wake, same G promotes/publishes, no second resolution, no provider spend in test.

**Negatives:** replayed rearm request; two operators race; current root changed; source corrupt; lease live; capture already promoted; provider attempt uncertain; legacy Storyteller failure; expired lease on a nonexhausted capture; no valid operator authority. Nothing may silently create a second G.

**Evidence:** changed files, SHA before/after, targeted test names/commands/results, duplicate/no-spend assertions, and precise remaining uncertainty. A doc-only merge is not Ready or Done. Owner must separately choose this one packet to start code.
