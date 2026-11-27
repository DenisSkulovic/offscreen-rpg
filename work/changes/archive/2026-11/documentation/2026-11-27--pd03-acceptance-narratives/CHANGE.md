# PD03 | Acceptance narratives and long-life benchmarks

**State:** Done — source joined to `implementation/product-documentation-renewal`; joint semantic acceptance pending (PD07/TD10 and Design).

**Kind:** documentation (DOC). **Approval:** E1 design owner-accepted 2026-11-27; implementation release recorded in group. **Target:** `implementation/product-documentation-renewal`. **Source baseline:** `c7058958ec3f43fd37ec680d05757561d628926b` (main); original snapshot `94808654fdf93e3102469ed3f5d5b2d476ff6f8d`, intervening docs only. [Accepted Design](../../../../../designs/open/product-documentation-renewal/README.md) · [Group](../../../../open/product-documentation-renewal/README.md).

**Release:** [group readiness and dispatch](../../../../open/product-documentation-renewal/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

2 bounded editorial tasks. Parent reads this front door, [TASKS](TASKS.md), named source route and [PROOF](PROOF.md); child receives one task card and listed exact anchors. No runtime tests/live operations. No claim of time or token savings. Dependencies: None for local construction; PD01 keeps the existing first-playable heading and selected meaning. PD07 reconciles both.

## Target alignment and outcome

Authored future oracles readable as product acceptance, not delivered features or a mandatory implementation plan. The accepted E1 chooses substantial restructuring of existing owners over adding disclaimers or replacing the wiki. Existing correct paragraphs may survive; no new product or runtime decisions. [SOURCE-MAP](SOURCE-MAP.md) contains inspected claims and concrete contradictions. Actual changes confined to named pages; no new files or moved headings planned.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/gameplay/acceptance-scenarios.md`, `docs/product/gameplay/long-life-benchmark-playthroughs.md` | foundation, gameplay and selected acceptance routes | task semantic negatives |
| Technical | unchanged because this packet changes product expression only; existing authority contracts and legacy transfer facts remain | existing engine and Storyteller authority links, TD05 transfer where named | source and claim map |
| Code | unchanged because documentation-only; no executable modifications authorized | no scripts, source, config, fixtures or tests changed | inspected diff; semantic negative in PROOF |
| Related | unchanged for shared indexes and STATUS because group integration owner reconciles; preserve exact affected heading paths, report stale dependent routes to integration owner | [SOURCE-MAP](SOURCE-MAP.md) and existing typed dependency headings | no link regression or lost claim |

## Scope and proof

May write only `docs/product/gameplay/acceptance-scenarios.md`, `docs/product/gameplay/long-life-benchmark-playthroughs.md` and own packet closure records. No sibling, shared index, native contract, active packet or runtime writes. Preserve all existing accepted conditions, refusal rules and scoped evidence; no policy, entitlement, source or new proof credit. [PROOF](PROOF.md) owns assigned semantic gate. An authored scenario is described as PASS; a legacy deadline becomes a general consent policy; duration or licensed setting becomes compulsory.

## Handoff and closure

When separately Ready and commissioned, use one linked worktree from verified `implementation/product-documentation-renewal` and `change/pd03-acceptance-narratives`; run `node scripts/repo-tools/change-branch-guard.mjs --change PD03 --target implementation/product-documentation-renewal --design product-documentation-renewal` before edits. Recheck actual HEAD and active ownership; do not override unrelated work. Execute tasks in order, compare exact changed claims and all retained negatives; run assigned docs checks at join. Stop on changed authority, unpreserved unique fact, active file overlap, or failed gate. No automatic successor. Archive own leaf on design branch after assigned gate and reconciliation; target-locked join, verify archive present and open absent, then report exact SHA. Joint semantic acceptance remains with PD07; no constituent main merge.

## Reconciliation ledger (complete before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/product/gameplay/acceptance-scenarios.md` (task headings) | product | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (source-inspected; semantic reading, no runtime) | answered in closure receipt | no heading renamed; routes preserved |
| `docs/product/gameplay/long-life-benchmark-playthroughs.md` (task headings) | product | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (source-inspected; semantic reading, no runtime) | answered in closure receipt | no heading renamed; routes preserved |
| Known typed dependents (SOURCE-MAP) | related | unchanged selected authority; confirm each actual dependency | no source behavior changed | PASS (source-inspected) | no heading changed, so no dependent route affected | none |

## Closure receipt

- Page commit: `56fd7f842b79116b57540641c3c6d0f7bc6b433d`. Changed: `docs/product/gameplay/acceptance-scenarios.md`, `docs/product/gameplay/long-life-benchmark-playthroughs.md`. No heading renamed or removed.
- Checks: `git diff --check` clean; `check_docs.py` 96 problems, identical to baseline; `docs-health.mjs` identical to baseline. Link health is not semantic proof. No runtime tests (NOT RUN by design).
- Acceptance scenarios: opening replaced by a four-part route plus one status statement; shared-play/delegation boundary stated once up front (local counterexamples in sections 3, 5, 6 and the obligation list retained, GM07 paragraph in "3. Meet the goblin" kept); reading note says Provider shape is illustrative, not an imposed call count; "1. Arrive and create" marks the preview and correction as a conditional historical shared vignette versus the selected no-mandatory-preview solo target.
- Long-life: added "How to read a benchmark" (authored oracle, durations illustrative, licensed setting not required) and Expected outcome / Forbidden shortcut blocks for Vvardenfell, space, small or abstract, routine-to-scene and chained journey; benchmark questions and causal-order section unchanged.
- Semantic negatives: authored scenario not PASS, per route/status statement under `Acceptance scenarios` opening and the harbor `Stage/Missing/Failure` line. Legacy deadline not general consent, per "5. Respond or miss the window" and "3. Meet the goblin" scope paragraph. Duration or licensed setting not compulsory, per `Long-life benchmark playthroughs` "How to read a benchmark". Harbor rejects duplicate credits and auto-resume (harbor table, H4 and B-then-A rows). Preview not mandatory ("1. Arrive and create"). Scene 137 fork cannot see 138 (fork narrative, unchanged). Cargo pay only on delivery, no forced narration, hypothetical itinerary not geography (space and chained-journey Forbidden shortcut).
- Findings: Low, the long-life page still repeats the Proposed/Blocked fallback disclaimer in three places because each is a local counterexample; destination group register (custodian).

## Reconstruction pass (R2)

- Why: the first pass was annotative and left the shared-play disclaimer repeated at the top, mechanical "Provider shape (illustrative)" labels and duplicate paragraphs.
- Page commit: 47147a5a4 (`docs/product/gameplay/acceptance-scenarios.md`).
- T01 Algorithm now executed: opening rewritten into a route plus Status, one shared-play statement (goblin-deadline and long-life repeats removed; local counterexamples kept in sections 3 and 5), one statement that model-work notes are illustrative reading aids; section 1-6 provider labels turned into prose; section 1 duplicate first-playable and aspiration sentences merged; obligation list split into three short paragraphs with duplicate links removed. All five narratives, harbor rows, GM07 scope paragraph, headings and anchors untouched.
- T02: `long-life-benchmark-playthroughs.md` spot-checked (cuirass, captain, wages, Expected outcome and Forbidden shortcut blocks present); no edit needed.
- Survival check: every fact in the inventory (old page copy) survives; removed text was duplicate (goblin deadline sentence survives in section 3, shared-play status in the opening).
- Checks: `git diff --check` clean; check_docs 96 problems = baseline; docs-health no new violations.
- Semantics: harbor duplicate credits/auto-resume rejected (Harbor table, tick 25 and H4); wizard timeout cannot invent consent (section 5); preview not mandatory (section 1); scene 137 fork cannot see 138 (Fork during an unfinished journey).
- Deferred Low: sections 2-6 remain long; none blocking.
