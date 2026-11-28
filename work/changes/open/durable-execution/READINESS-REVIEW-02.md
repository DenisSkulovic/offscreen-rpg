# **Durable Execution E1 | Independent readiness re-review 02**

**Review date:** 2026-11-28\
**Scope:** DE-E1-IR-H01 and DE-E1-IR-H02\
**Verdict:** Both High findings are **CLOSED**. All three Changes are implementation-ready, subject to their existing dispatch prerequisites.

DE-E1-01 · Unchanged verdict

**Temporal runtime**

READY

DE-E1-02 · Re-reviewed

**Qualification consumers**

READY

DE-E1-03 · Re-reviewed

**Joint qualification**

READY

Critical open

# **0**

High open

# **0**

High closed

# **2/2**

Medium retained

# **4**

All READY verdicts are dependency-gated. No implementation commission or live-operation authorization is implied.

## **1. Verified repository identity**

| Reference             | Verified revision                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository            | [DenisSkulovic/offscreen-rpg](https://github.com/DenisSkulovic/offscreen-rpg?utm_source=chatgpt.com)                                                                |
| Review branch         | `main`                                                                                                                                                              |
| **Reviewed HEAD**     | [`94da6ab0e187d8a4decd6f03f659940dbfc1b8f5`](https://github.com/DenisSkulovic/offscreen-rpg/commit/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5?utm_source=chatgpt.com) |
| Previous reviewed SHA | [`22e788b30d271ce24b8adf83af12f6cbd4c0c478`](https://github.com/DenisSkulovic/offscreen-rpg/commit/22e788b30d271ce24b8adf83af12f6cbd4c0c478?utm_source=chatgpt.com) |
| Observability E2 HEAD | [`8a0ae4c9eaf972a74f2a6d08fcc60c36a9c79f35`](https://github.com/DenisSkulovic/offscreen-rpg/commit/8a0ae4c9eaf972a74f2a6d08fcc60c36a9c79f35?utm_source=chatgpt.com) |
| Defended architecture | `a2e5eea430df62bc9527c85978f8b93f5e9fc154`                                                                                                                          |

The current main is two commits ahead of the previous reviewed candidate, with no divergence.

The [commit comparison](https://github.com/DenisSkulovic/offscreen-rpg/compare/22e788b30d271ce24b8adf83af12f6cbd4c0c478...94da6ab0e187d8a4decd6f03f659940dbfc1b8f5?utm_source=chatgpt.com) confirms that the delta consists of the readiness receipt, affected packet corrections, register updates and unrelated product/wiki design work. No implementation source changed.

Observability E2 HEAD is unchanged from review 01.

Applicable repository instructions were retrieved, including [AGENTS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/AGENTS.md?utm_source=chatgpt.com), `CHATGPT.md`, the planner investigation standard, workflow guidance and the [packet-readiness review standard](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/.agents/references/packet-readiness-review.md?utm_source=chatgpt.com).

All unaffected conclusions from [READINESS-REVIEW-01.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/work/changes/open/durable-execution/READINESS-REVIEW-01.md?utm_source=chatgpt.com) are retained.

## **2. DE-E1-IR-H01: Interrupted custody evidence**

CLOSED

Previously HIGH · DE-E1-02 T03 / DE-E1-03 T02

The correction establishes an incremental, persistent custody journal rather than relying on a final process summary.

Primary contract: [DE-E1-02 EXECUTION.md, Incremental custody receipt](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/work/changes/open/durable-execution/2026-11-28--de-e1-02-qualification-consumers/EXECUTION.md?utm_source=chatgpt.com#incremental-custody-receipt-ir-h01).

### **Custody ordering**

Selected construction contract. Not evidence of implemented or executed behavior.

### **Verification results**

| Required correction                           | Result |
| --------------------------------------------- | ------ |
| Incremental persistence independent of stdout | PASS   |
| Exclusive private journal creation            | PASS   |
| Intent persisted before mutation              | PASS   |
| Acknowledgment persisted before consumption   | PASS   |
| Exact acknowledged Run ID ownership           | PASS   |
| Late acknowledgment handling                  | PASS   |
| Ambiguous creation/start refusal              | PASS   |
| Duplicate execution ownership preservation    | PASS   |
| Interrupted-process evidence retention        | PASS   |
| Owned cleanup and residual reporting          | PASS   |
| Offline discriminating fixtures               | PASS   |

The important distinction is now sufficiently explicit: an intended mutation, an acknowledged resource and an uncertain outcome are three different custody states.

The corrected contract addresses the original failure path even when the process cannot emit its final summary.

Particularly significant safeguards include:

- A fresh, exclusively opened `custody.jsonl`, synchronous complete record writes and `fsyncSync` before returning from each append.
- Recording `firstExecutionRunId` inside the native promise continuation before exposing the acknowledged handle to scenario code.
- Preserving acknowledged in-memory ownership when subsequent journal persistence fails, permitting bounded safe cleanup without adopting unknown executions.
- Treating unpaired intents, truncated records and missing final records as uncertainty or failure, never successful qualification.
- Retaining the journal independently of process exit status, including forced termination.

The offline owned-child interruption fixture is discriminating. It directly reproduces the evidence-loss condition behind H01 without requiring Temporal, Kubernetes or an additional native experiment.

The corresponding [DE-E1-03 joint acceptance contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/work/changes/open/durable-execution/2026-11-28--de-e1-03-joint-qualification/PROOF.md?utm_source=chatgpt.com#native-gate) correctly requires journal retention, identity reconciliation, intent/result binding, cleanup evidence and successful finalization.

**Conclusion:** H01 is fully resolved at the implementation-planning boundary. No additional custody infrastructure or planning iteration is required.

## **3. DE-E1-IR-H02: Observation completeness and finalization**

CLOSED

Previously HIGH · DE-E1-02 T04/T05 / DE-E1-03 T02

The corrected contract establishes a fixed, independently validated observation oracle.

Primary contract: [Independent observation oracle and finalization](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/work/changes/open/durable-execution/2026-11-28--de-e1-02-qualification-consumers/EXECUTION.md?utm_source=chatgpt.com#independent-observation-oracle-and-finalization-ir-h02).

### **Frozen positive-case matrix**

Mandatory positive cases

# **5**

Exact backend spans

# **28**

Separate negative case

# **1**

Plain normal

3

Plain retry

4

Plain replacement

8

Agent researcher-tool

5

Agent fresh-worker

8

Exact required cardinalities, not measured runtime results. The exporter-negative case requires three locally valid spans and no backend query.

I checked the matrix against the actual Agent Core [qualification scenarios](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/packages/ai/agent-core/test/qualification-scenarios.mjs?utm_source=chatgpt.com) and [recovery suite](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/packages/ai/agent-core/test/qualification-recovery.mjs?utm_source=chatgpt.com).

The selected `researcher-tool` and `fresh-worker` cases are actual maintained scenarios. Their required model/tool observations are consistent with the existing fixture and recovery contracts.

No fixture timing, retry behavior or underlying Agent Core execution semantics need to change.

### **Independent completeness oracle**

This removes the self-certifying producer problem identified in review 01. A producer that omits an entire observation category cannot pass merely because Tempo returns precisely the spans that the deficient producer submitted.

### **Finalization and timing**

Client completion is not the physical observation finalization boundary.

The finalization rule now correctly waits for the owning suite's assertions, closed duplicate checks, replay checks, graceful Worker termination and host closure.

It retains earlier generation buckets and admits late physical terminal observations before quiescence. It rejects post-seal observations rather than silently changing an already validated receipt.

This is compatible with the actual [model fixture](https://github.com/DenisSkulovic/offscreen-rpg/blob/94da6ab0e187d8a4decd6f03f659940dbfc1b8f5/packages/ai/agent-core/test/fixtures/model.mjs?utm_source=chatgpt.com), including its 12-second timeout hold and explicit physical observation phases.

### **Adversarial proof assessment**

| Failure condition                | Required response                | Assessment |
| -------------------------------- | -------------------------------- | ---------- |
| Entire observation kind omitted  | Fail local completeness          | Pass       |
| Empty expected span set          | Refuse qualification             | Pass       |
| Missing mandatory case           | Fail joint acceptance            | Pass       |
| Late terminal before quiescence  | Include actual observation       | Pass       |
| Observation after sealing        | Fail qualification               | Pass       |
| Unmatched required observation   | Fail positive predicate          | Pass       |
| Unmatched diagnostic observation | Retain incomplete evidence       | Pass       |
| Duplicate physical observation   | Fail completeness                | Pass       |
| Duplicate backend span ID        | Fail despite set equality        | Pass       |
| Incorrect run/outcome/retry      | Fail exact comparison            | Pass       |
| Exporter failure                 | Preserve native execution result | Pass       |

The offline fixtures, static oracle and actual backend query are assigned to their appropriate construction and qualification owners.

The bounded shared 30-second backend retrieval deadline does not introduce an unbounded wait. No additional sleeps, fixture timing changes or Collector modifications are required.

**Conclusion:** H02 is fully resolved. The selected E1 telemetry acceptance contract now distinguishes native execution, physical observation completeness, span construction, export and backend retrieval sufficiently for implementation.

## **4. Nonblocking dispositions**

All four Medium findings are preserved.

| Finding      | Disposition                                                      | Durable destination                    |
| ------------ | ---------------------------------------------------------------- | -------------------------------------- |
| DE-E1-AR-M01 | Exact initial/final Run ID and physical recovery counts retained | Maintained qualification suites        |
| DE-E1-AR-M02 | Physical starts, terminals and client outcomes remain distinct   | Observation tooling and suite receipts |
| DE-E1-IR-M03 | Explicit `followRuns: false` selected                            | Maintained suites and their READMEs    |
| DE-E1-IR-M04 | History retention distinguished from namespace deletion          | Temporal owner README and runbook      |

M03 and M04 have received inexpensive, compatible clarifications in the corrected packets. Neither has been converted into an independent blocking gate.

No new substantive finding emerged from the targeted re-review.

## **5. Affected readiness audit**

| Review dimension                  | DE-E1-02 | DE-E1-03 |
| --------------------------------- | -------- | -------- |
| G0 · Repository and authority     | Pass     | Pass     |
| G1 · Source truth                 | Pass     | Pass     |
| G2 · Decisions closed             | Pass     | Pass     |
| G3 · Child context                | Pass     | Pass     |
| G4 · Parent dispatch              | Pass     | Pass     |
| G5 · Dependencies and concurrency | Pass     | Pass     |
| G6 · Assigned proof               | Pass     | Pass     |
| G7 · Execution cost and closure   | Pass     | Pass     |

Unaffected gate conclusions are inherited from review 01. Affected task contracts and proof obligations were re-reviewed directly.

### **Individual task disposition**

| Change | Task                         | Standing               |
| ------ | ---------------------------- | ---------------------- |
| 02     | T01 Plain native suite       | Ready                  |
| 02     | T02 Agent Core rehosting     | Ready                  |
| 02     | T03 Runner and custody       | Ready · H01 closed     |
| 02     | T04 Trace evidence           | Ready · H02 closed     |
| 02     | T05 Focused integration      | Ready                  |
| 03     | T01 Joined compatibility     | Ready                  |
| 03     | T02 Authorized qualification | Ready · H01/H02 closed |
| 03     | T03 Acceptance and closure   | Ready                  |

Existing sequential task dependencies remain applicable.

The construction/qualification separation is preserved: DE-E1-02 can complete its source construction and join without executing native qualification. DE-E1-03 owns the outstanding native evidence.

## **6. Eligible dispatch sequence**

**Architecture and packet readiness**

Complete. No outstanding blocking findings.

**Observability E2 acceptance and integration**

Existing external dispatch prerequisite.

**Targeted source reconciliation**

Verify affected anchors and establish implementation/durable-execution.

**DE-E1-01**

Runtime host and strict namespace owner · T01–T03

Ready

**DE-E1-02**

Maintained consumers, custody and traces · T01–T05

Ready

**DE-E1-03**

Offline compatibility, authorized native proof and closure

Ready

**Owner acceptance and Design integration**

Exact qualified candidate, final reconciliation and main join.

After the existing E2 and reconciliation prerequisites hold, the first eligible commissioned task is DE-E1-01 T01.

No further independent planning review is required unless targeted reconciliation exposes a material change to an accepted contract.

## **7. Final committee disposition**

**DE-E1-IR-H01**

CLOSED

**DE-E1-IR-H02**

CLOSED

**DE-E1-02**

READY (dependency-gated)

**DE-E1-03**

READY (dependency-gated)

| Remaining condition                       | Standing                            |
| ----------------------------------------- | ----------------------------------- |
| Architectural defense                     | DEFENDED, unchanged                 |
| DE-E1-01 readiness                        | READY (dependency-gated), unchanged |
| Additional planning corrections           | None required                       |
| Additional preliminary native experiments | None required                       |
| Further architecture review               | Not required                        |
| Implementation commission                 | Not granted                         |
| Native qualification                      | NOT RUN                             |
| Repository mutations                      | None                                |
| Live operations                           | None                                |

**Evidence limitations:** This was a read-only GitHub source and packet review. Local worktree state, implementation compilation, runtime tests and native infrastructure behavior were not verified. The finding closures concern the sufficiency of the corrected implementation contracts, not their as-yet-unimplemented realization. Severity and closure determinations are independent reviewer judgments.

**Receipt destination:**

`work/changes/open/durable-execution/READINESS-REVIEW-02.md`

**Exact reviewed candidate:**

`94da6ab0e187d8a4decd6f03f659940dbfc1b8f5`

**Committee conclusion: Accept both corrections, close H01 and H02, and release the complete three-Change batch for dependency-gated commissioning. The planning cycle is complete. Proceed to construction and qualification without another review iteration.**