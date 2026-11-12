# Chamber | reproducible developer laboratory target

**Status:** Selected **engineering design for future implementation** (owner's 2026-11-12 Chamber request). **Method:** declare the desired destination *independently of existing Chamber code*, then audit actual source and define code Changes. **Not implemented or authorized for source edits.** **Scope:** developer tooling across pure game rules, application/DB, workers, Nest, the local workbench and held Storyteller packets. **Not:** player visual/UX redesign, gameplay feature development, a literal room, or live-provider permission.

**Promise:** A developer specifies a meaningful game situation, instantly or quickly obtains the **smallest valid state** that makes it possible, drives the **real** corresponding rule or application operation under controlled time/input/failures, inspects causal before/after evidence, asserts expected results, and can reproduce or compare the experiment **without playing a whole campaign to reach the state**.

## Quick route

| Need | Direct section |
| --- | --- |
| Which testing mode, and why? | [Operating model](#1-operating-model) |
| “Teleport” to a precise state | [Specimens and checkpoints](#2-state-specimens-and-checkpoints) |
| Scenario schema/commands | [Scenario protocol](#3-scenario-protocol-and-api) |
| Clocks, draws and asynchronous work | [Determinism](#4-time-entropy-and-delivery-control) |
| Fault injection | [Failure and concurrency](#5-controlled-failure-and-concurrency) |
| Developer experience | [Workbench](#6-interactive-workbench) |
| Debugging/result quality | [Evidence](#7-inspection-causality-and-evidence) |
| Coverage, money, safety | [Catalogue](#8-mechanics-catalogue), [Isolation](#9-authority-safety-and-cost) |
| Definition of success | [Acceptance C01–C16](#11-verifiable-acceptance-c01c16) |
| Alternative approaches | [Trade-offs](#12-architectural-challenges-and-decisions) |

## 1. Operating model

The Chamber is **a developer laboratory with several execution lanes**, sharing scenario identity and evidence vocabulary, **not one giant UI or a second game engine**.

| Lane | Reuses what | Evidence it can claim | Default setup |
| --- | --- | --- | --- |
| **Bench** | Pure production `@offscreen/game` policies and pure application decisions | Deterministic rule/state-machine behavior | In-process; milliseconds; no DB/browser/Temporal |
| **Sandbox** | Actual application use cases and persisted constraints | Valid state, transactional command, snapshot/receipt | Isolated disposable PostgreSQL, scripted/fake external dependencies |
| **Connected rig** | Nest, DB, Temporal/worker, optional Next player UI | Cross-service admission, delivery, recovery, browser behavior | Explicit opt-in local services; provider-free by default |
| **Packet lab** | Real request construction, canonical evidence selection and held generation | Exact would-be provider packet, schema, budget and zero-dispatch hold | No provider dispatch |
| **Authorized live evaluation** | Real selected route/provider, bounded operation | Model-dependent quality, real usage and failures | Separately authorized, metered; NEVER the default |

No fake Chamber-only rules resolver. A pure run does **not** prove SQL locking, and a fake provider run does **not** prove model quality. Each result labels its tested boundary. CLI, automated test and local web workbench are **three interfaces to the same underlying scenario commands**, not three engines.

### Signature developer journey

> “Load a character 80% through a shift, accepted work active, pause at the due boundary, interrupt with an encounter, deliver a duplicate completion, and show whether wages were paid exactly once.”

Search this *situation* → choose a minimal valid specimen → adjust semantic setup parameters → run/step real operations → see authoritative state + causal timeline + exact before/after diff → assert/investigate → copy scenario ID, seed, fixture version and steps for replay. **Never** start an ordinary fresh campaign and click through unrelated choices merely to get to that point.

## 2. State specimens and checkpoints

**The central primitive is a valid *state specimen*, not a prebuilt fictional world or a manually progressed campaign.**

- A versioned fixture `id@version` describes the **smallest domain state** required: relevant world/rules/character, resource identities, committed story passage, campaign/activity, clock, inventory/obligations and referenced documents *only where germane*. Unknown/unsupported features stay absent, not fabricated as fake defaults.
- **Two materialization paths:** (a) compose real application commands into a valid checkpoint where cheap; (b) privileged **test-only semantic fixture builder** for hard-to-reach persisted states, with schema validation, SQL constraints and a real authorized projection check afterward. The latter is *precondition construction*, not a new game command.
- **Semantic overlays:** set a *valid* fixture parameter (“80% progress”, “one owned item”, “paused commitment”, “due at boundary”, “winter calendar”). Reject overlays that violate ownership, cardinality, state-machine prerequisites or rule-package compatibility. No arbitrary SQL/JSON editing on a normal user database.
- **Checkpoint** is an immutable, versioned content-hashed recipe and/or quiescent disposable DB specimen; it declares schema/canonical root/fixture references. It is **not** a magic snapshot of running Temporal history or external provider effects.
- **Reset/fork** means re-materialize from checkpoint into a new isolated run, then replay the action sequence. Do not “undo” a committed distributed transaction, overwrite a real player's story or restore stale worker lease metadata.
- Composite fixture *primitives* may be shared (accepted shift, due clock, two owners, pending command), with explicit preconditions and deterministic IDs. Avoid deep inheritance/opaque default campaign builders.
- Setup failures report *which invariant* was violated and *which fixture component* caused it; no silent repair that makes the experiment test a different state.
- A pure test may use an in-memory typed specimen; a persisted scenario must prove the actual repository/transaction boundary. Fresh database-per-case is optional and justified by measured cost; a dedicated isolated run DB/template/namespace is selected by correctness and speed, never by convenience alone.

## 3. Scenario protocol and API

One **declarative typed scenario contract** with separate arrange, act, observe and assert stages. Versioned Zod/TypeScript descriptors, explicit drivers, stable IDs and deterministic seeds. Browser cannot submit arbitrary JavaScript, shell commands or SQL.

```text
Scenario:
  id@version, family, title, intent, availability, costClass, supportedLanes
  fixture: checkpoint + typed params + semantic overlays
  controls: timeSource, entropySeed, scriptedProvider, faultSchedule
  steps: [load, inspect, advance, admit, duplicate, pause, read, assert...]
  assertions: [public view, persisted receipt, changed effect, forbidden side effect]
  evidence: [before/after, timeline, provenance, limits]
  cleanup: isolated run disposal / artifact retention
```

**Single command registry:** `scenario.list`, `scenario.load`, `state.inspect`, `time.advanceToBoundary`, `action.admit`, `activity.interrupt`, `delivery.duplicate`, `fault.arm`, `run.step`, `run.compare`, `run.export`. Each command declares parameters, supported lanes, preconditions, permission/cost classification, idempotency policy, bounded output and error semantics. Exact vocabulary can use these names; no universal generic dispatcher passing `any` objects.

**Execution:** run all, step one *logical domain boundary*, run to breakpoint, pause, reset/replay or branch. A breakpoint is a named application/workflow seam (admitted, before settlement, committed, before HTTP ACK), **not** an illusion that JavaScript instructions, Temporal history and the OS can all be frozen at once.

**Assertions** check authoritative facts (expected version, one-time reward, allowed/blocked action, no further token attempt, unchanged ownership, correct time earned). A screenshot, English explanation or a matching fake function invocation count is not proof.

**Parameterization** picks relevant equivalence classes or property-based seeds, not all possible Cartesian products. A scenario may vary owner, early/late boundary, expected revision, alternate calendar or injected transport fault. Versioned runs remain immutable; a new case definition gets a new version.

## 4. Time, entropy and delivery control

Different clocks have different authority: `game time`, `database time`, `worker/Temporal wall time`, `browser display` and `test simulated time`. **One patched `Date.now()` must never be presented as controlling them all.**

- Bench: inject deterministic production-policy clock/entropy through **real narrow seams**, with seed/draw log. Fast freeze/advance to next logical boundary/edge-case and same-tick race.
- Sandbox: use a deliberate test DB-time adapter **only if it preserves the production clock invariant**; otherwise verify real DB-clock semantics at Connected tier. Isolated time control may accelerate simulation only through the *same policy operation*.
- Connected rig: actual worker scheduling/outbox/leases must still be tested where it matters. Expose targeted pause/hold/delay/duplicate at adapter boundaries; never add production-wide “time warp” switches.
- Step, advance, rewind-by-replay and compare are explicit. Record controlled/uncontrolled time domains; deterministic structural assertions require identical relevant initial state + seed + code/fixture version, **not** stable network timing or model prose.
- Random checks, occurrence IDs, order decisions and draws are recorded as typed evidence. Where random draws are injected, a normal production path must still own the effect and receipt.

## 5. Controlled failure and concurrency

Test **named causal failure points**, not random chaos:

```text
intent -> transaction -> outbox -> worker/provider -> receipt -> publication -> ACK
            ^              ^                ^               ^          ^
         rollback        duplicate       timeout/unknown   stale      lost ACK
```

Selected faults: stale revision, forbidden owner, ambiguous response after commit, duplicate same/different ID/payload, delayed/out-of-order messages, worker stop/restart, early/late wake, same-tick ownership collision, provider transport timeout after dispatch, schema-valid but inadmissible proposal, publication conflict, missing canonical document, projection cache outage, failed browser GET.

- Faults attach to real **test-only compositional seams**; no global monkeypatch affecting unrelated users/runs. Each fault has explicit arm/disarm and cleanup.
- A fake provider reproduces the **real admission/retry/usage protocol**, never simulates “free” provider completion while pretending to establish actual settlement.
- Verify persistence/receipts under real DB for exactly-once. Reproducing the *same* input and tracing different execution attempts must never cause multiple game effects, reward or paid calls.
- Persist named fault schedule and cut points in the scenario recipe, so a failed result can be rerun rather than described as “occasionally flaky.”

## 6. Interactive workbench

The developer UI is an **instrument panel for experiment orchestration**, distinct from player-facing visual/UX design.

**Primary capabilities:** searchable scenario browser; lane/cost/prerequisite labels; semantic state setup with clear validation; command palette/console + discoverable GUI controls; step/run/pause/reset; authoritative state inspector; execution timeline/trace; before/after/delta with significant fields; invariant assertions; checkpoints/replay; compare runs; copy reproducibility command; jump to ordinary isolated Play UI when a full browser view is useful.

Operator should see: *what state was manufactured; which authoritative command ran; when and why it was admitted/rejected; what persisted; which work is pending/blocked; what effect happened exactly once; which evidence is missing*. No giant unstructured JSON dump or false claim that an LLM explanation is the source of truth.

**One console grammar** maps to the same typed commands as buttons and automated tests. No `eval`, raw SQL or arbitrary process execution from browser. Narrative visuals/world geometry are unnecessary. A plain accessible UI with powerful truthful controls beats an elaborate admin dashboard.

## 7. Inspection, causality and evidence

- **Causal trace:** typed event records with input, owner/resource ID, operation ID, action stage, time domain, revision/viewVersion, outcome/status/reason and correlation of subsequent worker/provider/persistence. Full raw payload is never automatically pasted into agent context.
- **Before/after semantic delta:** compare authoritative public projection, private authorized mechanics, activity/receipts, canonical roots, operation/outbox and safe accounting where relevant; normalize nondeterministic IDs/timestamps for cross-revision comparisons.
- **No-op explanation:** distinguish invalid input, unavailable prerequisite, accepted-but-pending, stale revision, no due work and legitimate no-op. A report generated from committed typed facts/receipts, not model guesses.
- **Run evidence:** immutable versioned run record containing `git commit/dirty`, scenario/fixture hash, seed, clock setup, driver, code/schema versions, steps, assertions, relevant state delta, fault trace, safe provider-call counter, outcome and evidence limitations. Export **bounded sanitized JSON plus short human-readable Markdown**; raw private artifacts remain off by default.
- **Compare same scenario across revisions** in *independently isolated* runs. Never equate identical snapshots with correct behavior if the contract/assertion failed, and do not compare unstable narrative word-for-word as mechanics proof.
- An inspection is not necessarily a test pass: structural assertions automated, operator taste/human judgment explicitly separate, live model quality separately authorized and labeled.

## 8. Mechanics catalogue and evolution

Catalogue is organized by *mechanic / failure to reproduce*, not by a huge list of bespoke starting stories. Case availability is recorded **per lane** as implemented/available/blocked/planned and names the missing prerequisite. Proposed mechanics are *not* silently installed by adding a test scenario.

**Coverage families:**
- Draft/opening/Start/fork/package revisions; custom and authored starts.
- Choice permission, deterministic immediate checks, effects, item ownership, invalid/stale choices.
- Commitments, work shifts, finite action overlap, time progress, due windows, pause/resume, interruption, cancellation, repeated/blocked activity, earned wages once.
- Calendars/world time, winter constraints, odd-length months/ordinal worlds, same-tick cutoffs.
- Planned continuation versus settled receipt, historical report versus controlling scene, premature publication.
- Canonical documents, evidence handles, active-scene recall, retrieval selected vs final used, private/public projections.
- Generation/budget/attempt admission, held packet, uncertain provider, stale output, duplicate worker/outbox delivery, cache outage.
- Authentication, ownership, version conflicts, SSR/Play observation (selected connected smoke, not every rule through a browser).

When implementing a mechanic, require *at least* a cheap policy specimen and one real-boundary demonstration if persistence/admission is essential. A catalogue can contain blocked future coverage but must not display it as passed. Owner's portfolio benefits from reproducible boundary behavior, not flashy scenario count.

## 9. Authority, safety and cost

- Normal Nest API startup **does not register** developer/Chamber controllers. An explicitly local/isolated dev harness can, using a deliberately provisioned test identity; do not expose fixture mutation on normal hosted player API. Maintain owner scope and no inspector leakage to normal client DTO.
- No scenario may alter a normal/user-owned DB, dispatch an external provider or run destructive reset without explicit task-specific permission. Disposable runs have named connection guards, unique IDs, bounded cleanup and no concurrent reset of one DB/ports.
- **Offline by default** regardless of present environment credentials; held packet may construct request with zero dispatch; live mode requires fresh explicit model/route/budget authorization and verified accounting. Developer console commands declare side effects.
- Pure tests start no Next/Chrome/Temporal/PostgreSQL; connected tests start only necessary local services, reuse warm builds and isolate runs. Size/CPU/time/step/output budgets and artifact retention are part of run setup, not a late cleanup.
- Do not use Chamber itself as a production backdoor or new game policy authority. A test-only builder may materialize a valid starting state; actual gameplay transition and settlement still use real application operations.
- Do not add a microservice, universal plugin system, separate fake game resolver, or paid observability stack just because this is a serious portfolio.

## 10. Architecture and maintainer boundaries

```text
Scenario catalogue + immutable fixture/specimen recipes
     |        typed semantic command registry + execution plan
     +--> Bench driver: pure policy, injected clock/seed
     +--> Sandbox driver: real application + disposable DB
     +--> Connected driver: real Nest/worker/Temporal/browser
     +--> Packet driver: real composition, held provider request
     |
     v
Run orchestrator (one run ID, step/fault plan, reset/replay)
     |
     v
Authoritative inspections + assertions + safe evidence envelope
     |                               |
 CLI / test runner            local Chamber web workbench
```

`@offscreen/game` owns pure rules, `@offscreen/application` owns transactions/state transition, `@offscreen/db` owns persistence, `@offscreen/contracts` owns transport validation, fixture/driver/trace code is developer-only, Nest controllers handle local auth/permission and typed requests, React/TanStack owns workbench state only. Future modular ownership should follow these **reasons to change**, not force every helper into 20 layers.

**Documentation for inexpensive Cursor:** source-adjacent `README` near each real owner with current-vs-target and tests. An individual Change starts with a first-screen source map + exact target criterion + one negative case. This long target is read by heading only.

## 11. Verifiable acceptance C01–C16

| ID | Must work | Contradicting evidence that fails the criterion |
| --- | --- | --- |
| **C01** | Find a mechanic by situation, see valid lane/availability/cost and launch it | Planned/blocked scenario falsely runs or reports passed |
| **C02** | Materialize valid late-stage state *without playing a campaign* | Fixture silently fabricates prerequisites or changes a real user's data |
| **C03** | Same deterministic recipe/seed/version gives same structural outcome | Hidden clock/global RNG causes drift |
| **C04** | Exercise the real production policy rather than a fake Chamber resolver | Changing actual rule does not affect lab result |
| **C05** | Advance/hold time at explicitly controllable domain boundary | Test claims to control Temporal/DB when it controls only browser clock |
| **C06** | Inspect valid before/after state, receipts, versions and causality | Optimistic guessed state labeled authoritative |
| **C07** | Inject named failure at relevant real seam; reset it after run | Fault leaks to next run; GET unexpectedly dispatches provider |
| **C08** | Duplicate/stale/retry cases prove one durable effect under real DB where needed | Only mocked callback count is checked |
| **C09** | Reset/fork by isolated re-materialization, compare runs | “Undo” overwrites committed history/another run |
| **C10** | Export provenance, redacted evidence, assertions and limits | Run silently adopts new fixture or leaks secrets |
| **C11** | CLI, UI and automation share typed commands and validation | Browser executes raw SQL/JS or diverging rules |
| **C12** | Simple mechanic checks don't require entire services/browser/provider | Bench starts full Next/Temporal stack |
| **C13** | Normal API lacks dev endpoints, local harness explicitly enables them | Ordinary user calls privileged Chamber route |
| **C14** | Provider-free run is verified zero-call; held/live segregated | Stored credentials cause unintended model spend |
| **C15** | Catalogue reports real mechanic families with availability per lane | An unimplemented mechanic masquerades as fully tested |
| **C16** | A failed assertion gives reproducible ID/seed/steps and owning source route | Developer must recreate an unrelated long campaign |

## 12. Architectural challenges and decisions

| Tempting alternative | Decision |
| --- | --- |
| A literal testing room or enhanced Play UI | Not the core; scene UI can be used for connected observation |
| A second mock mechanics engine | **Reject**, silently disagrees with production |
| Universal raw state editor/SQL console | **Reject**, creates impossible states and security problems |
| Everything via full-stack Playwright | **Reject** for most mechanics; too slow and hard to control |
| Snapshot/rewind live Temporal/provider side effects | **Reject**; reconstruct isolated checkpoint and replay |
| Fully generic plugin/microservice architecture | **Reject**; small typed scenario commands, vertical scenario families and explicit adapters suffice |
| LLM grading of all rules | **Reject**; deterministic assertions first, human judgment where subjective |
| Replace all current QA tools blindly | **Reject**; source audit must preserve correct fixture/held-packet/evidence machinery |
| Always run latest model, arbitrary free retries | **Reject**; expensive and unsafe |
| Hardcode every scenario in UI | **Reject**; versioned registry and shared driver contracts |

**Conscious trade-off:** building a truly valid persisted checkpoint and controllable clock/fault seam can cost more than a fake scene. Pay that cost **only where it proves real application semantics**, and label evidence accordingly. Do not enforce an arbitrary one-second benchmark before measuring actual local setup.

## 13. Convergence and evidence discipline

The [source audit](../audits/chamber-gap-2026-11-12.md) must compare these criteria to actual code and tests at a named revision, preserve strong existing infrastructure and rank gaps. The [Chamber Change queue](../../changes/README.md) will describe independent future **code-bearing** results, not one huge instruction to a cheap Cursor model. **No implementation is active or authorized** by this document.

Professional design inputs: [testing and evidence](../../../.agents/knowledge/testing-and-quality-evidence.md), [architectural decision space](../../../.agents/knowledge/architecture-decision-space.md), [durable operations](../../../.agents/knowledge/durable-operations.md), [security boundaries](../../../.agents/knowledge/security-and-trust.md). The lane distinction resembles established edit-mode vs play-mode test frameworks ([Unity Test Framework](https://docs.unity3d.com/Manual/com.unity.test-framework.html)); explicit clock injection is a common determinism technique ([Microsoft fake time](https://learn.microsoft.com/en-us/dotnet/core/extensions/timeprovider-testing)). References inform design, not proof of current code.
