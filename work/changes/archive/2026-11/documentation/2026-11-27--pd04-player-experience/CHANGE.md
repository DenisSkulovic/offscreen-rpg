# PD04 | Player experience renewal

**State:** Done — source joined to `implementation/product-documentation-renewal`; joint semantic acceptance pending (PD07/TD10 and Design). **Kind:** DOC. **Base:** `4b621ec9708361a2304efdcff4d34bb7da2b6c88` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. **Target:** `implementation/product-documentation-renewal`. [Accepted Design](../../../../../designs/archive/product-documentation-renewal/README.md) · [Group](../../../../../designs/archive/product-documentation-renewal/implementation-record/README.md).

**Release:** [group readiness and dispatch](../../../../../designs/archive/product-documentation-renewal/implementation-record/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

Nine existing experience owners; preserve the deferred player-experience design and treat the Living Book as a bounded POC. 4 bounded editorial tasks. Parent reads [TASKS](TASKS.md) and [PROOF](PROOF.md); child receives one card and named anchors. [SOURCE-MAP](SOURCE-MAP.md) is planner evidence. No source predecessor; group frozen transfer facts are available at planning base. Verify active ownership and actual HEAD before dispatch. Downstream: PD07. No paid, cluster, DB, provider, runtime, fixture or configuration operations.

## Target and exact write set

- `docs/product/experience/principles.md`
- `docs/product/experience/presentation.md`
- `docs/product/experience/entry-and-onboarding.md`
- `docs/product/experience/navigation-and-stories.md`
- `docs/product/experience/play-and-decisions.md`
- `docs/product/experience/return-and-journal.md`
- `docs/product/experience/settings-and-accessibility.md`
- `docs/product/experience/design-system-and-expression.md`
- `docs/product/experience/living-book-poc.md`

Retain existing path and headings; substantive authority-first rewriting, not label-only. Preserve selected/proposed distinctions, conditions, negative guarantees, unique realization facts and exact proof provenance. No new product/architecture decisions. Only these paths and own closure records may change. Protected AC/OBS/native normative owners excluded. Any active overlap gates only the affected task.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Related owner | Proof |
| --- | --- | --- | --- |
| Product | Listed owners: editorial restructure only, no new semantic authority | exact task anchors and transfer table | meaning-preserving diff and negatives |
| Technical | Unchanged authority; no new commitments | listed read-only canonical anchors | preserve selected constraints |
| Code | Unchanged because DOC only; no executable source/config/test edit | inspected source anchors | actual diff |
| Related | Shared maps/indexes/STATUS reserved to integration; report concrete affected routes | PD07 | navigation and preservation proof |

## Closure

Once separately Ready and commissioned, branch from verified `implementation/product-documentation-renewal` using `change/pd04-player-experience`. Run `node scripts/repo-tools/change-branch-guard.mjs --change PD04 --target implementation/product-documentation-renewal --design product-documentation-renewal` before edits; recheck branch, dirty state, ownership and prerequisites. Parent owns staging, lock, reconciliation, gate and archive. [PROOF](PROOF.md) before join. Archive own packet on implementation target before reporting completion; verify archive present/open absent, report exact SHA. No automatic successor, no independent main merge, no runtime acceptance claim.

## Reconciliation ledger (complete before Done)

| Affected heading | Authority | Target delta / unchanged reason | Source delta and SHA | Evidence tier | Negative proof | Route update |
| --- | --- | --- | --- | --- | --- | --- |

Ledger outcomes (all headings retained; no heading renamed or removed):

| Affected heading | Authority | Target delta | Evidence tier | Negative proof | Route update |
| --- | --- | --- | --- | --- | --- |
| principles: Core promise, Non-negotiables, Demo vs live | Product | Grouped as reader rights; Demo split into authored /demo vs live; transfer facts kept in place | source/diff; NOT RUN runtime | Demo time is not real game time (Demo vs live) | none |
| presentation: Product promises, Honesty gate (C3) | Product | Grouped promises; fallback and no-human-validation made explicit | source/diff | Decorative scene never overrides system status (Product promises); screenshots do not prove comprehension (Honesty gate) | none |
| entry-and-onboarding: Creation IA, Launch, Current POC honesty, Initiative... | Product | Two primary paths stated up front; POC facts as bulleted source-anchored list incl. one-status-read recovery; Start freeze scoped to legacy candidate path | source-inspected `use-story-launch.ts` | Empty presets do not invent a catalogue; lost ack never submits twice; no mandatory preview | none |
| navigation-and-stories: Three navigation contexts, Surfaces table | Product | Contexts framed as reader jobs; Create row no longer implies mandatory Start | doc | mandatory preview excluded in Create row | none |
| play-and-decisions: Choosing, Waiting, Stale offer, Terminal | Product | Promise vs current realization separated; terminal facts kept in place pending TD06 | doc | Reload does not resend stale offer (Denied...stale offer) | none |
| return-and-journal: After absence, Scene checkpoints | Product | Absence as bullets; long-term target separated from narrow current limits, linked to lifecycle Forked continuities | doc | Recap does not replace originals (Reading a long life); current-head copy is not a historical fork (Scene checkpoints) | none |
| settings, design-system, living-book-poc | Product | Accessibility independent of locked policy; vocabulary labelled intent; POC labelled historical, walkthrough NOT RUN | doc | POC acceptance does not establish final UX; locked campaign keeps accessibility; no human run passed | none |

## Closure receipt

- Page commit: `7bcfc9bea8beff1e387b4048162595f2818f9c26`. Changed paths: the nine `docs/product/experience/*.md` owners in the write set.
- Checks: `git diff --check` clean; `python3 scripts/check_docs.py` 96 problems, identical to baseline; `docs-health.mjs` identical to baseline (3 violations). Link health is not semantic proof. Runtime, human walkthrough and joint acceptance NOT RUN.
- Transfer facts: product-side facts preserved in place (demo manual-time/reset/no-provider; current POC route/preset/scripted observe; terminal paragraph; fork/checkpoint implementation notes). PD07 removes them only after TD06 lands on main.
- Deferred findings: Low, `return-and-journal.md` fork conditions delegated to technical Forked continuities (that owner); Low, `entry-and-onboarding.md` POC section anchors to source routes that will move when TD06 lands (group register, custodian).

## Reconstruction pass (R2)

Why: the first pass (`7bcfc9bea`) mostly added status labels to five pages. R2 restructures them. Page commit `b7bfece4a`.

- T01 presentation.md: the three label sub-headings under Product promises became three plain promises; the C3 gate now states the selected contract (color not sole carrier, focus independent of scene styling, deterministic fallback) apart from the PX realization note and the no-human-validation claim.
- T03 play-and-decisions.md: Negatives/Current POC labels folded into Choosing; duplicated illustration sentence replaced with a link to Presentation; duplicate "no required number of choices" bullet removed; Waiting rewritten as one statement; terminal section split into the selected contract (same authority, nested options, operation identity, device pairing, `player-story` scope, `--json`) and implementation notes with proof state.
- T04 living-book-poc.md: duplicate status paragraph merged into one Status opening; Journal reach rewritten as the honesty contract; walkthrough restructured into numbered procedure, fail criteria and NOT RUN state. design-system-and-expression.md: label paragraphs folded into State and the vocabulary intro; duplicate palette and Welcome/Stories/Create sentences consolidated. settings-and-accessibility.md: accessibility independence stated once, linked to Visual hierarchy item 5.
- Pure dash/quote/apostrophe normalisation reverted in principles, entry-and-onboarding, navigation-and-stories.
- Survival check: all facts, numbers, `/demo`, POC route/preset/observe, terminal and fork notes, anchors survive; removed text were duplicates with named survivors.
- Checks: `git diff --check` clean; check_docs 96 problems and docs-health 3 violations, identical to baseline. Link health is not semantic proof.
- Semantic answers: Demo time is not game time (principles, Demo vs live); a decorative scene never overrides system status (presentation, Product promises; design-system, Visual hierarchy); POC acceptance does not establish final UX and the walkthrough is NOT RUN (living-book-poc, Human POC acceptance walkthrough); a locked campaign never removes accessibility (settings, Player settings); reload does not resend a stale offer (play-and-decisions, Denied, waiting, error, lost connection, and a stale offer).
- Deferred Low: accessibility bullets in settings-and-accessibility.md are unchanged; destination PD07 or the page itself.
