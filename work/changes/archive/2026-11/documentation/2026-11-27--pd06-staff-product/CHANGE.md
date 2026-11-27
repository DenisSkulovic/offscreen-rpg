# PD06 | Staff product renewal

**State:** Done — source joined to implementation/product-documentation-renewal; joint semantic acceptance pending (PD07/TD10 and Design). **Kind:** DOC. **Base:** `4b621ec9708361a2304efdcff4d34bb7da2b6c88` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. **Target:** `implementation/product-documentation-renewal`. [Accepted Design](../../../../../designs/archive/product-documentation-renewal/README.md) · [Group](../../../../../designs/archive/product-documentation-renewal/implementation-record/README.md).

**Release:** [group readiness and dispatch](../../../../../designs/archive/product-documentation-renewal/implementation-record/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

Nine product Admin pages; retain permission and disclosure policy without asserting production console capability. 4 bounded editorial tasks. Parent reads [TASKS](TASKS.md) and [PROOF](PROOF.md); child receives one card and named anchors. [SOURCE-MAP](SOURCE-MAP.md) is planner evidence. No source predecessor; group frozen transfer facts are available at planning base. Verify active ownership and actual HEAD before dispatch. Downstream: PD07. No paid, cluster, DB, provider, runtime, fixture or configuration operations.

## Target and exact write set

- `docs/product/admin/README.md`
- `docs/product/admin/charter-and-personas.md`
- `docs/product/admin/authority-and-governance.md`
- `docs/product/admin/operator-workflows.md`
- `docs/product/admin/player-360-and-support.md`
- `docs/product/admin/gameplay-and-liveops.md`
- `docs/product/admin/commercial-and-trust.md`
- `docs/product/admin/command-center-and-insights.md`
- `docs/product/admin/ai-engineering-and-investigation.md`

Retain existing path and headings; substantive authority-first rewriting, not label-only. Preserve selected/proposed distinctions, conditions, negative guarantees, unique realization facts and exact proof provenance. No new product/architecture decisions. Only these paths and own closure records may change. Protected AC/OBS/native normative owners excluded. Any active overlap gates only the affected task.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Related owner | Proof |
| --- | --- | --- | --- |
| Product | Listed owners: editorial restructure only, no new semantic authority | exact task anchors and transfer table | meaning-preserving diff and negatives |
| Technical | Unchanged authority; no new commitments | listed read-only canonical anchors | preserve selected constraints |
| Code | Unchanged because DOC only; no executable source/config/test edit | inspected source anchors | actual diff |
| Related | Shared maps/indexes/STATUS reserved to integration; report concrete affected routes | PD07 | navigation and preservation proof |

## Closure

Once separately Ready and commissioned, branch from verified `implementation/product-documentation-renewal` using `change/pd06-staff-product`. Run `node scripts/repo-tools/change-branch-guard.mjs --change PD06 --target implementation/product-documentation-renewal --design product-documentation-renewal` before edits; recheck branch, dirty state, ownership and prerequisites. Parent owns staging, lock, reconciliation, gate and archive. [PROOF](PROOF.md) before join. Archive own packet on implementation target before reporting completion; verify archive present/open absent, report exact SHA. No automatic successor, no independent main merge, no runtime acceptance claim.

## Reconciliation ledger (complete before Done)

| Affected heading | Authority | Target delta / unchanged reason | Source delta and SHA | Evidence tier | Negative proof | Route update |
| --- | --- | --- | --- | --- | --- | --- |
| Admin README: top, Page map, Future historical game and configuration exploration | Product Admin index | Added selected-intent/current-realization lead; page-map heading; Proposed ADI01-03/CFG03 table, AI03/CFG02 kept separate | page commit 0ecbce445c833748397f3279f8231e186ef0224d | PASS (source-inspected diff) | History exploration stays Proposed, no raw-content grant | None (PD07 owns index) |
| Charter and personas: top, Product job owners | Product | Lead split into intent/realization; five terms table; Support-persona negative kept | same | PASS (source-inspected) | Persona/case grants nothing | None |
| Authority and governance: top | Product | Intent/realization lead; grant, packages, three modes, adversarial list unchanged | same | PASS (source-inspected) | Persona or case assignment grants no raw story | None |
| Operator workflows: top, Journeys, Negative | Product | Intent/realization lead; two negatives added derived from existing completion rule | same | PASS (source-inspected) | Case closure not refund proof; lookup no raw prompt | None |
| Player 360 and support: top, answer section, Shared campaigns, Timeline | Product | Target vs current narrow projections separated; shared campaigns marked deferred with link; provenance/minimal projection and lookup negatives added | same | PASS (source-inspected) | Case resolution not refund/repair; lookup no raw prompt | None |
| Gameplay and liveops: top, Worked negatives | Product | Intent/realization lead; emergency-stop negative added | same | PASS (source-inspected) | Stop not repair/export | None |
| Commercial and trust: top, Negative | Product | Intent/realization lead; subscription-vs-sponsored-usage negative | same | PASS (source-inspected) | Subscription not unlimited usage | None |
| Command center and insights: top, Freshness and search | Product | Intent/realization lead; missing metric is unknown not zero | same | PASS (source-inspected) | Missing metric not zero | None |
| AI engineering and investigation: top, Disclosure, Incident shape | Product | Intent/realization lead; Tier C separation, no-replay and no-zero negatives | same | PASS (source-inspected) | Metadata permission not raw packet; incident review not replay | None |

## Closure receipt

- Page commit: `0ecbce445c833748397f3279f8231e186ef0224d`. Changed paths: the nine `docs/product/admin/*.md` pages only (plus this packet).
- Checks: `git diff --check` PASS; `python3 scripts/check_docs.py` 96 problems, identical to baseline (no new); `docs-health.mjs` 3 violations, identical to baseline. Link health is not semantic proof. No runtime, provider or cluster work; acceptance NOT RUN.
- Semantic answers (rewritten text): persona/case grants no raw story access: Charter lead and Product job owners negative, Authority lead; case resolution proves no refund/repair, lookup reveals no raw prompt: Operator workflows Negative, Player 360 "What the operator must be able to answer" and Timeline negative; emergency stop is not repair/export, subscription is not unlimited sponsored usage: Gameplay Worked negatives, Commercial Negative; raw packet does not follow metadata permission, missing metric is not zero, incident review is not replay: AI Disclosure and Incident shape, Command center Freshness and search.
- Heading mapping: all original headings retained unchanged; added headings only in README ("What this section establishes, and what it does not", "Page map"). Status lines became labeled intent/realization paragraphs; no unique fact removed. Product transfer facts remain in place for PD07.
- Deferred Medium/Low: the page-level "Status" proposed/pending-owner-review limits remain in each page's own header (Low: pages still carry long-form illustrative-example sentences; destination each page's status block). Technical receivers TD07/TD08 mirror status facts; no product removal done.

## Reconstruction pass (R2)

Why: the first pass (page commit 0ecbce445) mostly added "Selected intent / Current realization" prefix blocks. R2 replaces that scaffolding with rewritten prose. Page commit 4cf9eec86.

- T01: README owns the single "Illustrative examples" statement; charter drops its prefix blocks and rewrites the persona table as jobs and everyday questions, keeping the five-term table; authority folds its status into one paragraph plus the three rules (coherent grant, request/approve/execute separate, explicit modes), verified against the unchanged "A grant is one coherent permission" and "Request, approve and execute are separate" body text.
- T02: operator lifecycle gains accountable, scoped, no-silent-mutation prose; duplicate "clicked, approved" line removed; Player 360 has a section "Target Player 360 and current support projections" and a "Provenance, freshness and minimal projection" subsection.
- T03: commercial body states entitlement, funding, usage and external payment/refund as separate objects; liveops status folds intent into one paragraph.
- T04: command center is a work queue (not surveillance or exhaustive analytics); freshness/search and growth framed as scoped jobs; AI page folds tier C and incident negatives.
- Consolidated: the four-page "Illustrative Support, impersonation, ..." sentence now lives once in README, others link to it.
- Survival check: all facts, negatives, tables, ADI/CFG table and links preserved; removals were duplicates only. Unchanged and kept as is: liveops adoption and controls sections, commercial and trust tables.
- Checks: git diff --check clean; check_docs.py 96 and docs-health 3 equal baseline.
- Semantics: persona/case assignment grants no raw story access (charter, Personas); case resolution proves no refund or repair (operator Negative; Player 360 Timeline); lookup reveals no raw prompt (Player 360 Provenance); emergency stop implies no repair or export (liveops Worked negatives); subscription is not unlimited sponsored usage (commercial Negative); Tier C separate from metadata, missing metric not zero, incident review not replay (AI Disclosure and Incident shape).
- Deferred Low: liveops and the Trust half of commercial were left mostly unchanged; no further rewrite judged necessary.
