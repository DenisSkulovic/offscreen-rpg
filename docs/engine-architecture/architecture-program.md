# Engine architecture initiative | converge the destination before coding

**Status: design program, NOT IMPLEMENTATION AUTHORIZATION.** First pass 2026-11-13. [Target engine](target-engine.md) and [product-driven requirements](product-derived-requirements.md) are architectural recommendations, **not** a selected code migration. Cursor is separately executing UX design; this engine initiative makes **no application changes** and has **no active Change**.

## Our most important decision

**Keep the disciplined modular-monolith foundation, but refuse to freeze today's small POC rule vocabulary, time/actor model and Storyteller behavior as the permanent game engine.**

Current source is not a hopeless write-off; replacing all code would lose already serious concurrency/idempotence/usage work. But “make the code cleaner” is too weak a goal. The engineering work must widen **what players can genuinely do** and guarantee that their lives survive time, model uncertainty, history, concurrency and years of software releases.

The target is a **capability-oriented, time-authoritative, source-backed fiction engine** with explicit cost/consent and a causal business ledger, implemented incrementally as one coherent modular monolith.

## Four architecture phases, then iterative product expansion

### Phase D0 | Deepen product/engine design (CURRENT, no code)

- Cross-check original vision against realistic **solo, nonhuman, social, travel, autonomy and small-party playthroughs**. No generalized rule spec until at least two divergent worlds pass conceptually.
- Audit actual domain transitions, transaction boundaries and cached/public projection structures.
- Critically choose **state ownership**, rules capability envelope, world identity, canonical documents vs SQL mechanics, and group clock/conflict policy.
- Evaluate whether the current Storyteller can propose coherent playable actions from long source history, not merely produce valid JSON.
- Map current database versions, document formats, Temporal workflows, extension cost and release risks.
- Compare product, implementation and operational evidence and document explicitly unknown cases.
- Record decisions that **would reverse** our recommended architecture.
- Preserve development economics: no expensive hosted providers/destructive database tests without explicit permission.

**Exit gate:** the dream and a precise target architecture agree, and critical contradictions have named owners and proposed resolutions. **Not** “all ideas are in Markdown.”

### Phase D1 | Confirm existing foundation and highest-risk correctness seams

Potential bounded evaluations (not necessarily code Changes):
- Reproduce one exactly-once accepted action, a missed HTTP ACK and duplicate worker delivery.
- Trace one full action → timed settlement → Storyteller preparation → publication → history/reentry.
- Verify that retrieved identity/plot evidence actually reaches the final provider request or correctly fails when omitted.
- Inspect write-hot SQL and document-root atomicity, with migration history and recovery assumptions.
- Verify multi-process document reads, or explicitly identify missing shared CAS adapter.
- Inspect current type/package dependency direction and the highest-fanout gameplay change path.
- Determine whether current background dispatcher can backlog/starve mandatory short operations behind slow model calls.

**Exit gate:** evidence labels tell us which parts are already trustworthy versus design-only. Don't replace a proven module because it looks old.

### Phase D2 | Make solo **world generality and continuity** credible

Build capability-based mechanics in **one very small vertical slice**, not a universal rule engine first:
- One supported new effect family across a different world shape, with rule/config/schema, admission, SQL receipt and public projection.
- Prove relevant actor/world identity can persist and be retrieved after multiple Storyteller turns without inventing mechanics.
- Establish a source-backed, non-duplicated causal event/provenance view for Journal/return.
- Make model-generated options adhere to current actor capabilities/conditions and prior attempts.
- Consider bounded custom-intent proposal/accept as a **separate** game contract, not a client textbox.
- Preserve versioned current campaigns and old pending work through migrations.

**Exit gate:** two distinct story genres and one nonhuman scenario share the **same causal engine** while keeping their unique mechanics and capability applicability.

### Phase D3 | Make offscreen autonomy and long-life operation credible

- Implement a bounded standing-life routine or a compelling finite-itinerary alternative, with explicit authorization and no unbounded provider wake-ups.
- Add consented safe response to a published unattended decision (separate from routine work).
- Verify 30-day/365-day accelerated **test** simulations and truthful return, preserving original fictional elapsed-time rules.
- Version workflows and detect/control unbounded history growth.
- Establish a shared immutable object store adapter and cross-replica source read/write recovery before claiming scalable hosted deployment.
- Introduce maintenance/release compatibility for old rules, in-flight tasks and schema versions.

**Exit gate:** a player can leave for a long interval and return to accurate, personally meaningful history; an old character survives worker restart and an engine deployment without double reward or lost consent.

### Phase D4 | Small parties, realistic scale and observable service

- Implement a small common storyline with independent character control and an explicit group decision/clock policy.
- One verified notification channel based only on real published decisions/events; notification preferences never change world authority implicitly.
- Add fair scheduling and worker pool isolation to protect short mechanical work from slow Storyteller calls.
- Benchmark **many independent stories** separately from a **hot shared story**; increase conflict granularity only if the latter is a genuine need and semantics are proved.
- Define operational metrics, SLOs, recovery paths and privacy gates; repeat reproducible load tests after consequential changes.
- Keep a short public architectural report demonstrating truthful capacity, not untested scalability claims.

**Exit gate:** realistic multi-node reproduction of the original first-playable promise, with a stated machine/DB/Temporal/model profile and known limits.

**Note:** phases are **design priorities**, not an instruction to wait for D3 before fixing obvious performance or durability bugs. Stop after every small, human-verifiable improvement and reconsider.

## Candidate implementation outcomes to refine into future bounded Changes

**These are _not_ READY tickets.** The exact scope and names will change as evidence improves.

| Candidate | One falsifiable outcome | Why it belongs early/later | Avoid |
| --- | --- | --- | --- |
| **E01: capability contract probe** | Two contrasting game worlds use one supported newly typed capability/effect with end-to-end receipts; optional body/HP states remain valid | Highest product-generalization leverage; **needs exact target spec first** | Build dynamic plugin/DSL engine now |
| **E02: canonical state and source boundary** | Same action/output correctly references SQL mechanic owner and staged immutable narrative root, including crash recovery | Protect one authoritative truth across documents/DB | Migrate every mutable counter into Markdown |
| **E03: causal history projection** | Player-facing source-linked completed events with stable ordering, no secret/future leak | Direct product value; overlap with UX GM05; reconcile owners | A second parallel event-sourcing system |
| **E04: actual source-to-prompt fidelity** | Known prior promise is retrieved and preserved through the exact final model message/output | Great narrative value; prove before installing more retrieval infra | “Vector search worked” as success |
| **E05: production-compatible immutable store** | API+worker replicas publish/read same CAS root without local shared FS and tolerate crash/orphans | True horizontal deployment prerequisite | File paths disguised as distributed storage |
| **E06: Temporal lifecycle/version compatibility** | Old accepted work persists and settles exactly once across a rolling worker version change | Long-lived characters require this before serious hosting | Silent breaking workflow code |
| **E07: accepted action/clock/actor boundary** | One actor/item conflict and one pause/event race produce exactly one lawful result | First multiplayer/generalized time seam | Replace story mutex with unproven concurrent writes |
| **E08: fairness/observability** | Under fake slow provider, required short mechanics aren't starved; queue latency, budget and failure cause visible | Capacity and developer operability | Unmeasured Kafka/K8s migration |
| **E09: bounded autonomy policy** | An approved unattended routine/decision fallback stops at exactly the expected boundary | Product dream, requires consent design | Unlimited chat-driven autopilot |
| **E10: sustained-load exercise** | Published reproducible latency and failure metrics for many independent stories and one hot group | Portfolio quality and architecture decisions | Capacity theater based on synthetic no-op |

These may map onto prior **GM01–GM07** product Changes in the UX program. **Do not duplicate code-bearing Changes** under two initiatives. GM titles are existing future candidates; merge/supersede/extend them when one domain owner and a single accepted scope are chosen. The architecture initiative provides the deeper target and verification, not an alternate ticket economy.

## Recommended *first code* only after further design iterations

Not a giant refactor. Prefer the smallest piece that demonstrates a real **new kind of life** and tests the intended capability boundary, while preserving existing game reliability.

Two competing strong candidates:
- **Generalization slice:** implement a typed, optional capability not reducible to quantity/fact, with a microbe or wizard fixture. Reveals whether our engine model actually supports arbitrary worlds.
- **Continuity slice:** source-grounded identity/event acknowledgment across multiple Storyteller turns, including a tiny ordinary remembered relationship or promised item. Reveals whether the game is a convincing lasting life.

The right order depends on whether actual long-story/source tests show the existing memory pipeline already works. **Do not select based on which package has the most files.**

Parallel low-risk hardening (only after scope proof) may include shared CAS adapter and workflow compatibility, but the first product outcome should be unmistakable.

## Dependency and compatibility discipline

1. **UX in Cursor is independent.** Don't touch Play/Next/React files in this initiative, don't rewrite its design target.
2. **Engine read/public contracts may change later**, but all migrations must be versioned and the UI must consume published compatible DTOs, never private plan structs.
3. **Multiple long-running campaigns are valuable state**, not disposable demo records. Plan an upgrade/rollback path before changing character schema or effects.
4. **One Change at a time by default**, per [repo Change standard](../../.agents/references/change-work-unit-standard.md), unless the owner explicitly authorizes coordinated independent work with nonoverlapping ownership.
5. **No live provider calls, production data mutation, destructive integration runs or releases** from an architectural design ticket.
6. **No unapproved code churn** merely because source ownership could be aesthetically improved.

## Architecture-quality rubric

A proposed change should improve one or more of:

- **Gameplay adequacy:** can an actual new character/world/action now behave correctly rather than only narratively?
- **Causal integrity:** are time, rules, ownership, receipts, source and history consistent under fault/replay?
- **Extensibility:** can a new capability be added without copying validation/admission across multiple unrelated “engines”?
- **Narrative relevance:** do past choices matter accurately after dozens of turns?
- **Player trust:** are autonomy, risk, spending and nonresponse permissions clear and observed?
- **Evolution:** do older campaigns, tasks and rules remain valid through deployments/migrations?
- **Scale/operability:** does the system exhibit predictable, measurable behavior under many stories and hotspots?
- **Cost/maintainability:** is the simplest justified solution chosen and testable by an affordable coding-agent workflow?

**A refactor that only shrinks files earns no inherent credit.** A purposeful rewrite that allows one new lawful gameplay family may be a major win. A huge infrastructure build with no improved life experience may be a loss.

## Red-team the target before calling it ready

- Is a “capability kernel” secretly overengineering a game that could use a handful of static rule branches?
- Does SQL + canonical files make **two** authoritative roots with unclear recovery?
- Is a global story-row mutex good enough for every planned scenario, including small party? If yes, don't replace it.
- Does a proposed event journal duplicate existing receipts and introduce double chronology?
- Will story/document/schema versioning costs dwarf actual game experimentation at this stage?
- Does the custom-intent pipeline reject so many imaginative attempts that the player feels imprisoned by the rules?
- Can the current Storyteller pipeline produce fun, remembered, surprising scenes at acceptable cost? If not, another storage layer won't make it creative.
- Can we deliver an honest hosted demo and recruiter-grade engineering evidence **without** building 10,000-user infrastructure immediately?

## Owner decisions before Cursor receives engine Changes

1. Approve the **engine philosophy** (modular monolith, deterministic authority, optional typed capabilities, sparse source memory).
2. Choose the first **product-evidence** benchmark: a new world capability or consequential long-memory story.
3. Approve state/canon ownership where current and proposed document migrations conflict.
4. For any code change, review exact stored schema, migrations, rolling-version behavior and safe verification side effects.
5. Explicitly select one bounded Change and authorize coding, just as was done for UX01.

**Current verdict: NOT READY for engine implementation.** This is pass 1, with a strong desired architecture and an initial source audit. The next passes must inspect the hardest source transactions and challenge the capability/time model against realistic scenarios before generating execution-ready Cursor packets.
