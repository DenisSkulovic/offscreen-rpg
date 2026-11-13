# Chamber laboratory | implementation program for Cursor

**Selected end state:** [developer laboratory C01–C16](targets/chamber-laboratory.md). **Normative implementation decisions:** [typed scenario/driver/state protocol](../technical/chamber-lab-protocol.md). **Evidence of current source:** [2026-11-12 Chamber audit H01–H14](audits/chamber-gap-2026-11-12.md). **State:** 16 CH packets defined; **CH01–CH10 Done** (through QA/LabRun bridge); CH11–CH16 Proposed. The React/Next modernization W01–W22 queue is complete (W12 superseded). Existing W12 **is superseded for future Chamber implementation** by this program (see below).

**Start for inexpensive Cursor:** one approved `CHxx/CHANGE.md` → its one adjacent source README → the **exact** protocol heading linked from its first screen → named source/test symbols only. Do not load all three documents in full or reverse-engineer the launcher unless the selected CH packet calls for that section.

## Architectural destination in one screen

```text
Scenario catalogue (versioned, searchable, truthful availability)
       |
       +-- minimal valid fixture + semantic overlays + seed
       |
       v
Typed step/run/fault/clock orchestration
       |
       +-- Bench      real pure game policies, no services
       +-- Sandbox    real application + guarded disposable DB
       +-- Connected  real Nest/Temporal/worker + optional Next
       +-- Packet     existing held Storyteller request, 0 calls
       +-- Live       explicit separate model/cost authorization
       |
       v
Authoritative inspection + causal events + semantic diff + assertions
       |
       +-- CLI / test runner
       +-- Chamber React workbench
       +-- versioned redacted evidence and replay
```

**The deliberate hierarchy:** machinery first, UI afterward; validate real application authority before optimizing the console. “Teleporting” creates a valid isolated *specimen*, not an arbitrary SQL state or resurrected Temporal history. No new game mechanic is fabricated merely because a catalogue card exists.

## CH01–CH16 dependency-ordered delivery

| Workstream | Change and exact implementation result | Depends on | Primary code owner |
| --- | --- | --- | --- |
| **1: catalogue** | [CH01 Scenario registry](../changes/2026-11-12--chamber-scenario-catalogue/CHANGE.md): typed versioned scenarios, per-lane availability | none | `packages/contracts/chamber`, application QA catalogue |
| **1: fast proof** | [CH02 Bench runner](../changes/2026-11-12--chamber-bench-execution/CHANGE.md): **Done** — real pure game rules, `pnpm chamber:bench` | CH01 | `@offscreen/game` policies, tool CLI |
| **1: specimen** | [CH03 State recipes](../changes/2026-11-12--chamber-state-specimens/CHANGE.md): **Done** — minimal valid semantic overlays + content hash | CH01 | application fixture/contracts |
| **2: persistence** | [CH04 Isolated Sandbox](../changes/2026-11-12--chamber-sandbox-materializer/CHANGE.md): **Done** — guarded `offscreen_chamber_run_*` + memory materialize; live PG provision still gated | CH03 | application use cases + local DB provision |
| **2: determinism** | [CH05 Clock and entropy](../changes/2026-11-12--chamber-clock-entropy/CHANGE.md): **Done** — honest time domains, reproducible draws | CH02 CH04 | game/application clock selectors |
| **2: execution** | [CH06 Step/run protocol](../changes/2026-11-12--chamber-run-orchestrator/CHANGE.md): **Done** — typed logical-step runner and replay | CH01 CH02 CH04 CH05 | application lab run orchestration |
| **3: diagnostics** | [CH07 Inspector/delta](../changes/2026-11-12--chamber-inspection-deltas/CHANGE.md): **Done** — authoritative facets and causal before/after | CH04 CH06 | application Chamber inspector |
| **3: adversity** | [CH08 Fault cut points](../changes/2026-11-12--chamber-controlled-faults/CHANGE.md): **Done** — typed FaultPlan + three fake-adapter seams; live outbox gated | CH05 CH06 CH07 | application test adapters/outbox |
| **3: memory** | [CH09 Evidence/replay capsule](../changes/2026-11-12--chamber-run-evidence/CHANGE.md): **Done** — immutable redacted capsule + replay command; QA authority separate | CH06 CH07 | application LabRun + artifact owner |
| **4: QA bridge** | [CH10 Human QA/auto-run bridge](../changes/2026-11-12--chamber-qa-bridge/CHANGE.md): **Done** — curated stage bindings; machine pass requires LabRun capsule | CH01 CH06 CH09 | `qa-journeys` / registry |
| **4: workbench** | [CH11 Developer workbench](../changes/2026-11-12--chamber-workbench/CHANGE.md): compose, step, inspect, assert, compare | CH01 CH06 CH07 CH09 CH10 and **W15** | web Chamber; TanStack Query |
| **4: launch** | [CH12 Fast CLI/modes](../changes/2026-11-12--chamber-launcher-modes/CHANGE.md): cheap entry and preserved local safeguards | CH02 CH04 | `tools/chamber` launcher |
| **5: connected** | [CH13 Worker/DB rig](../changes/2026-11-12--chamber-connected-rig/CHANGE.md): isolated real cross-service proof | CH04 CH06 CH08 CH09 CH12 | integration test helpers |
| **5: provider** | [CH14 Held packet lab](../changes/2026-11-12--chamber-packet-lab-integration/CHANGE.md): preserve zero-call review while linking run evidence | CH06 CH09 CH12 | existing packet-review modes |
| **5: breadth** | [CH15 Mechanics coverage](../changes/2026-11-12--chamber-mechanics-coverage/CHANGE.md): real-policy catalogue by family and lane | CH01 CH02 CH03 CH06 CH09 CH10 | registry and owning game policies |
| **6: acceptance** | [CH16 Replay/differential](../changes/2026-11-12--chamber-replay-comparison/CHANGE.md): compare revisions and map C01–C16 proof | CH04 CH06 CH07 CH09 CH11 CH12 CH15; CH13 for connected proof | run diff/evidence and workbench |

**Implementing order is not arbitrary numeric ceremony.** CH01/CH02 can yield a useful laboratory result without a browser. CH03/CH04 establish the first real persisted specimen. CH12 can follow their completion without awaiting React. CH11 deliberately waits for W15 because the selected frontend architecture already decided TanStack Query; don't introduce a second state-cache and later redo it.

## Supersession and history

The earlier [W12 React Chamber/QA isolation](../changes/2026-11-12--web-chamber-qa-isolation/CHANGE.md) is a **planning packet only**. **Do not run it independently**: it would renovate the old UI before its architecture is replaced. Its genuine guarantees survive as CH10–CH11 acceptance: viewer-partitioned Query, auth/owner safeguards, lab inspector isolation, correct polling, safe no-leak caches and existing Nest `developerTools` conditional controller registration. W12 is retained as a historical cross-reference, not removed.

Historical source constructs to preserve during migration:
- `chamber.v1–v5` scene identities and existing stored stories.
- 15 versioned QA cases, immutable stored definitions, stage evidence/revision fences, operator rubric and past exports.
- Existing owner-scoped inspector facets, provider accounting and explicit hold/fail/release controls.
- Local launcher guards, retained manual Chamber DB, no-credential provider-free paths and deliberate paid preflight.

A CH packet may legitimately **keep** a strong source subsystem and adapt only the boundaries that fail its target. Deleting working fixtures as “vibecode” would be poor engineering judgment.

## Four cost/trust milestones (selected)

1. **M1: fast and real:** CH01 + CH02. A pure case runs through production policy with fixture/seed, no API/DB/worker/browsers. Measure time and output footprint.
2. **M2: teleport to valid persisted state:** CH03 + CH04 + CH05 + CH06. A late-stage shift starts reproducibly and can be stepped without whole-story generation. Auth/DB setup is genuinely isolated.
3. **M3: explain and replay a failure:** CH07–CH10 (CH08 as required by failure). The run exposes before/after, ordering, one-effect assertion and an immutable evidence capsule. Manual QA doesn't masquerade as machine proof.
4. **M4: excellent operator experience:** CH11–CH16 as dependencies permit. One workbench/CLI registry, connected/packet drivers, mechanic family coverage, reproducible comparison and honest target-to-proof matrix.

**Execution economy:** risk-weighted checks at a Change boundary, broad real API/Temporal tests at actual integration milestones, not after every edit. Explicitly named disposable DB only; **no model spend** or local reset authorized by these Markdown packets. Use [tooling/verification economy](frontend-execution-playbook.md#4-verification-ladder-stop-checking-every-keystroke) and source-adjacent maps rather than loading entire test catalogues.

## Design review: four traps to prevent

- **Fake “teleportation”:** UI lets user alter JSON or a mocked in-memory story but no real application operation can accept it. Reject the fixture rather than claim a valid game-state experiment.
- **Fake replay:** “reset” simply reloads the same dirty state or attempts to rewind persisted provider/Temporal effects. Reset must rematerialize a new isolated checkpoint.
- **Fake pass:** QA operator clicks passed, or an LLM says output seems fine, and the workbench labels it automated invariant proof. Preserve provenance and evidence tier.
- **Fake speed:** a new CLI still boots PostgreSQL, Next, Chrome, Temporal and builder before a pure rule check. CH02 must demonstrate a true low-cost path.

A relevant **counterargument** to this program is that a universal scenario framework can itself become a huge maintenance burden. Prevent it through two real pilot cases, small semantic commands only, and rejecting abstraction without multiple genuine consumers. Do not implement CH01–CH16 in one uncontrolled Cursor session.

## Start and handoff

Architecture is settled; specific code authorization is **not**. Cursor is given only one chosen CH Change and the nearest owner map. The source audit records what was inspected and not run. If implementation disproves an assumed seam, return precise file/symbol, current behavior and one counterexample to ChatGPT before modifying the protocol. Keep `docs/changes/README.md` single `Current change: none` until owner selects code work.
