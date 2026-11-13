# Final architecture design review | what is and is not ready for Cursor

**Status:** review of design evidence completed 2026-11-13; **no engine code has been modified** and no Change state has been set to Ready. **Code baseline:** `main@a313d0aad9ba6bee5a06d83d534abba5037a4c29`, subject to Cursor's ongoing frontend changes. **Review evidence:** source inspection and product reasoning, not production tests or human play.

## The decisive architecture decisions

| Decision | Selected answer | Confidence / unresolved implementation |
| --- | --- | --- |
| Fundamental topology | **Modular monolith**, stateless HTTP/worker replicas and SQL causal authority | High; source largely supports it, distributed deployment unproved |
| Product game loop | Storyteller proposes; player/approved actor intends; rules/time settle; committed source/history persists | High as product direction |
| Mechanics generality | Optional **typed capability families** with D&D one supported rules family | Moderate-high; first actual capability proof pending |
| First engine Change | **Mechanical unique-object transfer** through existing `story_item` and checked finite action | High as bounded *design*; no code run yet |
| Actor representation | Sparse identities, optional capabilities, old Character as legacy adapter | Moderate; exact schema/migration remains open for ENG02 |
| Event history | SQL receipts/current facts + source-backed causal projection, **not full event-sourcing rewrite** | High for solo baseline |
| Context preparation | Short captured authority; external source I/O off write lock; fenced publication | Moderate-high; exact task capture needs ENG03 design |
| Early result speculation | **Not universal**; keep only when dependency set is demonstrably complete | High as correctness policy; detailed invalidation before new effects |
| Time | One accepted clock owner for solo; small group likely lockstep | High for solo; multi-actor policy still future |
| Scalability | Sparse boundary scheduling, bounded reads, shared CAS, worker fair pools under measured demand | High as direction; no load numbers |
| Old stories | Additive contracts and pinned operation semantics; deliberate migrations | High as invariant; no rollout proof yet |
| Storyteller | Source-fenced proposals with bounded spend and actual final-request evidence | High as product/authority; creative quality still unproved |

## Product stress scenarios reviewed

- Harbor: a short accepted transfer followed by saved consequence.
- Abstract logical token: same scarce-holder semantics without a human inventory assumption.
- Microbe: HP-less actor target with environmental sensing and bounded absorption (ENG02, not ENG01).
- Wizard inside an apple: containment/capability change remains a later nontrivial rule family; item holder string alone is insufficient.
- Months-long quiet life: bounded work events and source-backed reminders, not one model request/tick.
- Ten-hour journey: actual earned distance/time, interruption before arrival, honest return.
- Two actor claim on one object: one transfer wins; actual per-actor authority comes later.
- Old operation after software deploy: captured rule/effect and Temporal compatibility.
- Lost paid ACK: no blind provider retry.
- Huge historical chronology: current read cost must not grow with archived tasks.

**Scope honesty:** no fixture has been executed during design review. These are discriminating acceptance scenarios, not test results.

## Which Changes can be handed to Cursor?

| Change | Design decision | Implementation go/no-go | Missing proof |
| --- | --- | --- | --- |
| **ENG01 item transfer** | **SELECTED** | **GO after owner explicitly authorizes this one packet and Cursor rechecks current source** | First actual code/tests; disposable DB permission for integration |
| ENG04 bounded current reads | Selected narrow performance idea | GO after source check/owner authorization, but **not alongside overlapping ENG01 source edits** | Query plans and source coverage |
| ENG07 final-request memory proof | Conditional | NO-GO if existing tests already prove it; otherwise approve a tiny diagnostic Change | Last-mile source audit |
| ENG02 optional actor shape | Selected target | **NO-GO** | Exact schema/legacy migration and in-flight tasks |
| ENG03 short-lock source capture | Selected target | **NO-GO** | Captured DTO, staleness matrix, old task compatibility |
| ENG05 shared immutable store | Selected target | **NO-GO** | Storage backend, auth/retention, disposable topology |
| ENG06 Temporal compatibility | Selected target | **NO-GO** | Installed SDK/server versioning approach and old-running workflow fixture |
| UX GM01–GM07, small-party, notifications | Preserved original vision | Separate code authority; **NO automatic coupling** | Product-specific semantics and consent |

**Why not implement all now?** A successful item-transfer vertical slice may overturn our planned abstractions or reveal smaller ways to generalize. That's the evidence we need before reshuffling a large monorepo.

## Evidence examined

- Source: `packages/game/src/state.ts`, `effects.ts`, `checks.ts`, `immediate-actions.ts`, `activities.ts`; campaign action/settlement/reads; story item, passage and canonical source publication; Storyteller context/dispatch/budget; outbox and Temporal worker modules.
- Current tests: mechanical offer/quantity/ability, narrative item transfers, source passage publication, long-story lexical memory, controlled work and timing. **Presence of tests is not evidence they were executed in this turn.**
- Repo expertise: `.agents/knowledge` durable operations, schema migrations, caching/performance, testing and release engineering; `.agents/references/change-work-unit-standard.md`.
- Public authority: PostgreSQL row locks are held until the transaction ends ([PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html)); Temporal recommends controlling workflow history growth/worker version compatibility ([Temporal](https://docs.temporal.io/best-practices/worker)). No runtime toolchain compatibility assumed without a current install/test.

## Known limitations of this design review

1. **No local application tests, Postgres/Temporal run, profiler, or model calls** were executed.
2. **No actually rendered engine UI** inspected; Cursor's frontend work is a separate branch/task.
3. **No human users** played the proposed new gameplay.
4. Source analysis covered key paths, not every transitive code symbol or all DB migrations.
5. First item-transfer feature still needs local source-based implementation choices regarding effect type and holder-ineligible outcome.
6. Actor capability v2 and group time policy are not yet locked to a physical schema.
7. No measured 10k story/1k reconnect service capacity or object-store deployment.

These limitations must be retained in the handoff; a clean Markdown program isn't production evidence.

## Final judgment

**Architecture design has converged sufficiently to prepare a first implementation wave.** It is **not** a justification to rewrite the engine wholesale. The first code-bearing slice ENG01 should prove the proposed architecture through a real new consequence, while preserving existing item state, time, receipts, and Storyteller isolation.

**Next decision belongs to the owner:** after frontend stabilizes, explicitly authorize ENG01 on a fresh source-compatible branch. Do not automatically mark all future Changes Ready. Inspect actual implementation and resulting tests, then revise design before authorizing ENG02 or even a broad registry.

The goal is to make the engine genuinely capable of more kinds of fictional life, not to create the impression of enterprise architecture by renaming directories.
