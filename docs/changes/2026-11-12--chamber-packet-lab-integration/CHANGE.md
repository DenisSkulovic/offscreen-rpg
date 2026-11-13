# Change CH14 | Integrate existing held Storyteller packet tools with LabRun evidence

> **Cursor first look:** [launcher/packet source map](../../../tools/chamber/src/README.md) → `packet-review.ts`, `memory-packet-review.ts`, `live-evaluation-run.ts`; [application developer map](../../../packages/application/src/developer-tools/README.md) for hold/fail/release controls. **Target:** [C06/C10/C14/C15](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol 2/8](../../technical/chamber-lab-protocol.md#2-architecture-and-drivers), [audit H05/H08](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** a successfully prepared/held provider packet is NOT a dispatched provider response or proof of narrative quality.

**State: Done** (2026-11-13). Owner authorized via continue after CH13. **Depends on:** CH06, CH09, CH12 (Done). **No paid operation.** Existing `chamber:packet` aliases unchanged; new `packet-lab` evidence adapter wraps held snapshots.

**Evidence:** `lab/packet-lab.ts`. Tests: `packet-lab.test.mjs` 2/2. Normal: held snapshot → redacted capsule `providerMode:held`, zero attempts/charge, reproduction ref. Negatives: dispatch tripwire; hash mismatch; authorized-live without route/cap/token refused; raw prompt absent from default export.

## One code-bearing outcome

Expose **existing** exact held opening/continuation/memory packet captures as separate `packet-lab` scenario drivers that produce the same CH09 run evidence/provenance and safe inspection format as mechanical Bench/Sandbox. Preserve hashes, budget estimates, attempts, zero-cost verification, version, selected route and held generation IDs. Existing local command aliases remain functional.

## Binding decisions

- Do not replace `DispatchReview` or Storyteller runtime/budget policy; reuse their actual application adapters and existing preflight. A provider key in environment cannot make a normal offline/held scenario dispatch.
- Separate `held` and `authorized-live` as different driver modes and permission contracts. Live release requires *fresh* explicit selected route/model, price/cap, one-step authorization, transaction/accounting preflight and reconciled outcome; never add auto retry.
- Connect packet state (prepared/held/rejected/uncertain/settled) to run trace with only safe metadata in default report. Raw prompts, canonical context, private human notes and provider replies are private drill-down artifacts.
- QA run may link packet LabRun evidence; no human narrative taste score inferred from structural JSON validity.

## Proof

**Normal:** held packet scenario produces exact hash, request budget/bytes, trace, zero provider attempts/charge and a copyable reproduction reference.  
**Negative:** provider transport tripwire triggers if a held/offline scenario attempts HTTP dispatch; missing/changed hash or unsupported live authority refuses release; redacted export omits private prompt.  
**Check:** existing packet-capture fake-provider integration + new redaction unit test; **no live eval** in this Change.

**Handoff:** source-specific packet functions and new run evidence only; do not refactor all Storyteller internals or authorize model experiments.
