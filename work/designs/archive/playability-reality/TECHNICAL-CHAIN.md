# REAL technical contract | One bounded causal chain

**Status:** source-grounded target and gap map, not selected implementation authority. Inspected lean source at `43d5ddfc068aced3825e25692ec1b2bb14259e2a`; GitHub's subsequent audit-only commits through `3d67347` did not alter runtime. Reinspect current source before any implementation.

## The chain to prove

User sees an authored choice → exact offer/plan validates → admitted intent locks a work/receipt identity → deterministic world effects/clock commit → task receives *that* state and a finite source selection → model proposes narration, optional document changes and next plans → application validates and publishes against captured root/offer/revision → durable canonical document and passage exist → later task selects exact relevant source → new narration correctly respects evidence and any absences.

Neither every step's code existence nor a stand-alone staged-document test proves the **entire chain**. A "memory" count is not a recall result.

## Ownership at each boundary

| Boundary | Present observed owner | Cannot do |
| --- | --- | --- |
| Mechanical effects | packages/game/src/effects.ts, immediate-actions.ts | Invent a transfer merely from prose; infer a missing offered choice |
| Storyteller proposal shape | packages/storyteller/src/tasks/task-contracts.ts and document-changes.ts | Treat a model's proposed change as published canon |
| Semantic cue helper | packages/storyteller/src/tasks/descriptive-materialization.ts | Discover cues by itself from narration; it is referenced in tests/developer harness, not normal publication |
| Prompt guidance | packages/storyteller/src/tasks/index.ts #documentChangeRules | Guarantee model proposes a needed identity, promise or attribution |
| Admission and publication | packages/application/src/storyteller/admission.ts; publication.ts; stories/passage-documents.ts | Fix an omitted social commitment or re-interpret a failed transfer without admitted source |
| Canonical campaign knowledge | packages/documents and application canonical-knowledge / memory adapters | Make stale/hidden/superseded data authoritative |
| Dependency & return | docs/technical/storyteller/context-selection-and-recall.md; actual context-selection code | Assume mechanical-choice document dependencies already landed (they remain S3 design) |
| Human experience | human play and inspected evidence | Be proven solely by source files or synthetic JSON |

Note: `capture-materialization.ts` is ENG03 context capture and off-lock CAS; it is **not** the same thing as progressive *semantic NPC materialization*. Treating the shared word "materialization" as one implemented system is a serious source-reading error.

## Evidence sequence for REAL02

**R0: actual happy path.** Start from a correctly declared item with holder; choose a currently offered, permitted transfer; commit once; produce a supported narrative result with exactly one appropriate proposed relationship document; stage and commit a source-linked passage and document to a local canonical store using actual publication code if fixtures permit. Inspect document path, kind, authority, visibility, source link, root hash/revision, no duplicate effect.

**R1: omitted meaning.** Same committed transfer, model emits empty documentChanges despite a later meaningful promise. This is structurally valid in the source contract. Report as **semantic missing-witness gap**; do not falsely mark as preserved relationship merely because the original passage is present. Return to provider prompt/creation policy after proof, not a mandatory entity scanner.

**R2: failed transfer.** Attempt with wrong holder or failed check, but result claims a successful gift and proposes a canonical favor. Gate must not materialize the uncommitted gift. If existing publication cannot reject the *semantic contradiction* without additional actor evidence, characterize it as **not enforced** rather than assuming helper presence solves it.

**R3: rumor.** Named claimant alleges a dangerous fact. Attributed lore must not silently become established canon; preserve source speaker and evidence class.

**R4: restart/recall.** Add irrelevant turns, discard invocation context, reenter with captured source version. Verify selected canonical ID, source and exact exposed body are in final task context. A catalogue handle or indexed hit alone is insufficient.

**R5: stale/hidden/duplicate.** Superseded revision, off-scope/private note, repeated publish and duplicate selection must not alter public world facts or leak private context.

**R6: cost-famine.** No provider budget: receipt/clock remain committed; no fabricated narrative repair, no automatic retry or double effect.

Fixture's intentional failures must be documented as limitations, not merged as green "success" evaluations.

## Zero new architecture until this test tells us what is missing

Use current `documentChanges` shapes (max 8), existing canonical-file CAS/version fences, source pointers and explicit `recallAs`/selection rules. Test semantic detection/coverage separately from canonical-store correctness. A document that simply exists is **not** proof that the right future task sees it.

Narrow implementation options if R1 fails in genuinely played traces, ranked by cost and risk:
1. Make the existing task guidance and captured evidence more precise; require source-grounded proposals only for a small named set of event types.
2. Attach exact semantic-cue checks at existing admission/publication for a **known committed transfer**, but only after defining who produces cue booleans and where actor identity comes from; fail safely if uncertain.
3. Add a separately billed model extraction pass only if the first two fail and its measured quality/price earns it. Never the default merely because the words "semantic graph" sound powerful.

The desired eventual architecture may be **minimal code and better source selection**. No Cognee/embeddings decision follows from this experiment.

## Blockers and conditions

The authored harbor GS-01…GS-07 fixture has a stranger and evidence but no recorded named gift/promise. The SA09 Mira Vale fixture has the social case but is a **separate synthetic fixture**. Joining them is experimental; do not assert the composite happened live or that one regression suite already covers it.

A live multi-round provider test also faces the documented `budget.settle` continuation limitation; avoid conflating that with R0–R5 provider-free proof. Production/hosted DB and paid provider access remain outside scope. If actual safe publication integration would require redesigning large runtime interfaces, stop at a narrow tested seam and make the blocker explicit.

## Evidence-tier ladder

Design proposal → source-observed symbol → targeted deterministic test **run** → source-linked integrated publication/reentry test **run** → capped live model operation **run** → sustained human-play and qualitative/cost result. Promote claims only with a dated receipt identifying exact commit, environment, fixtures and limits.
