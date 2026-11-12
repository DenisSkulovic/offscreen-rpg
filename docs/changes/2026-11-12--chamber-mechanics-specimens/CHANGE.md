# Change CH15 | Golden mechanical experiments and truthful coverage

> **Cursor first look:** [QA catalogue and fixture owner map](../../../packages/application/src/developer-tools/README.md), [real app story operators](../../../packages/application/src/stories/README.md), existing `qa-catalog/activity-lifecycle.ts`, `calendar-and-live-evaluation.ts` and `chamber-fixtures.ts`. **Target:** [C01/C02/C05/C08/C15/C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol `9](../../technical/chamber-lab-protocol.md#9-catalogue-evolution-and-handoff), [audit H01/H12](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** scenario registration must never implement a missing mechanic just to make a test pass.

**State:** Specified/Proposed, not code-authorized. **Depends on:** CH03, CH05, CH06, CH07, CH08, CH09, CH13. **Baseline:** `470a5df`.

## One bounded executable outcome

Introduce a small **golden scenario pack** of reproducible, source-backed mechanical situations that prove the laboratory's value and serve as future fixture examples. Begin with ~six well-chosen scenarios, not an exhaustive universe:
1. A valid partially completed shift, early/late due and one-time earned wage;
2. Pause/interrupt/block/resume at an accepted commitment boundary **only if actually supported**;
3. Duplicate accepted finite action/worker completion with one persisted result;
4. Same-tick decision/default collision and no stale overwrite;
5. Item handoff and repeat request with no second transfer;
6. Nonhuman/alternate-calendar world with missing fantasy defaults and consequential deadline.

## Binding design

Each entry must specify exact production capability, minimal valid fixture, lane, preconditions, seed, step trace, positive/negative assertion and honest availability. If current engine cannot support an interrupted activity, list it **blocked** and select a supported neighboring boundary; do **not** backdoor a gameplay feature into Chamber. Reuse `chamber.v1–v5` and existing QA cases as provenance rather than deleting them. No cost-bearing Storyteller required.

## Proof

**Normal:** a developer loads any available golden situation directly, runs a small number of steps and obtains exact before/after result/receipt/replay without new ordinary campaign setup.  
**Negative:** duplicate work never pays twice, stale or conflicting state blocks rather than silently repairs, missing mechanic cannot be labeled passed; one seeded case intentionally catches a relevant wrong implementation.  
**Check:** Bench tests for pure rules, one authorized real DB/worker scenario per distinct persistence guarantee, no universal browser E2E.

**Handoff:** choose the actual supported mechanics from named source and existing tests; owner/ChatGPT receives explicit blocked rows and reasons. No new player features or generic fixture framework.
