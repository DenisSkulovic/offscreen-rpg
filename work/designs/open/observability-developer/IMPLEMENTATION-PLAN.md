# Implementation recovery roadmap

**Status:** All eleven current-sprint packets are owner-released for reversible offline candidate implementation. They are not independently READY or certified. Grandfathered integration reference `integration/observability-developer`: do not rename or recreate it, and do not touch its in-flight worktrees. Each Change's implementation coordinator owns that Change's serialized source join. No global queue change. [Acceptance boundary](ACCEPTANCE.md#owner-released-offline-source-assembly-not-certification).

## Finish line and method

Make the existing native development observability infrastructure maintainable and usable with the accepted pinned five-release topology, three retained claims, separate dev telemetry, foreground access, explicit known-predecessor upgrade and meaningful functional verification. No clean-slate rewrite, release mutation, application SDK enrollment, destructive cleanup or paid traffic.

The [submission standard](../../../../.agents/references/planning-artifact-quality.md) is the governing admission gate. The archived [predecessor](../../../changes/archive/2026-11/observability/2026-11-27--observability-developer/CHANGE.md) has 22 tracked files, 19 child assignments plus parent closure and approximately 219 KiB of planning text including mixed repair history (recursive inventory at baseline). It failed admission and is superseded; no dispatch.

Write coherent replacements in large authoring batches, then compare against the original at its immutable SHA. Preserve unique evidence and safeguards, not redundant wording. No serial approval for each document, no new audit diary. Only material authority, safety, source or evidence blockers justify stopping. Keep one current design route; use Git and existing evidence locations for superseded text.

## Release and execution

All eleven packets are commissioned for offline candidate source work under the scoped owner exception. D01 starts after local census, worktree ownership and baseline snapshot. Later packets release when their own source-join edges hold, not on another owner approval and not in one D01-through-D11 line. No constituent Change joins main. Joins to the grandfathered reference are serialized by the Change lifecycle lock. Preserve all existing focused normal and negative tests. Stop only for an actual contradiction, an ownership conflict, or a failed required Change-level proof. Independent readiness remains unverified. Independent review of the amended authority and implementation, plus the actual A1–A12 and V01–V12 evidence, remain mandatory before live use or main integration.

The archived [owner preflight](https://github.com/DenisSkulovic/offscreen-rpg/blob/a82a79ed7d75926166c12154c030b5a1a98faa06/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/preflight-evidence.sh) preserves the local census, offline render and optional isolated Docker experiment. D01 local census and pinned offline renders are executable cheap checks; actual D08/D11 mechanism feasibility is deferred to owner/ChatGPT before activation, not silently waived. No Docker/cluster experiments by Cursor.

## Proposed successor map

Identifiers retained. D01–D11 are open and owner-released for offline source implementation. They are not independently READY, and the independent review is still outstanding. The source-join schedule below replaces the earlier total order. No arbitrary sprint-size limit.

| Proposed outcome | Old cards | Prerequisites / seams | Proof ownership |
| --- | --- | --- | --- |
| [D01 native artifact normalization](../../../changes/open/2026-11-27--obs-d01-native-artifacts/CHANGE.md) | T01 | Current render/install/check callers, values/locks paths, no behavior delta | V01, A1 render parity; A2 path/routing regression |
| [D02 frozen target binding](../../../changes/open/2026-11-27--obs-d02-target-identity/CHANGE.md) | T03 | identity, common target guard and bound observation/mutation call sites; coordinate shared files with D03/D04 | V05 identity, A4 identity; affected A2/A12 |
| [D03 bounded custody/process ownership](../../../changes/open/2026-11-27--obs-d03-operation-custody/CHANGE.md) | T04 | Stable lock inode, pending intent and cancellation; D02 interface, shared process owners | V05 custody, A4 custody; affected A12 |
| [D04 dev topology and classification](../../../changes/open/2026-11-27--obs-d04-collector-topology/CHANGE.md) | T02, T05.1–4 | D01–03; atomic supported-state classification and installer/receipt/caller migration; no early dev activation | V02–04, V11; A1–3, A5, A11 source, A12 |
| [D05 foreground connection](../../../changes/open/2026-11-27--obs-d05-foreground-connection/CHANGE.md) | T06 | D02–04; shared custody, frozen binding, loopback forwarding | V07, affected V05 |
| [D06 known-predecessor upgrade](../../../changes/open/2026-11-27--obs-d06-collector-upgrade/CHANGE.md) | T07 | D02–04; preservation projection, exact upgrade and refusal | V06, V11, A5 install-only regression |
| [D07 synthetic proof ownership](../../../changes/open/2026-11-27--obs-d07-synthetic-proof/CHANGE.md) | T08, synthetic T09 | D02–04; proof host and UID ledger; separate synthetic correctness from developer metrics | V09, A7, affected A12 |
| [D08 developer signal verification](../../../changes/open/2026-11-27--obs-d08-developer-signal-proof/CHANGE.md) | developer T09 | D04/05/07; D06 for occupied-upgrade acceptance path; pinned metric freshness experiment | V03/V08, V06 interaction |
| [D09 datasource/resource verification](../../../changes/open/2026-11-27--obs-d09-health-resource-proof/CHANGE.md) | T10 | D04/05/07; actual bounded forwarding and sampling | V10/A10 |
| [D10 persistence/outage verification](../../../changes/open/2026-11-27--obs-d10-recovery-proof/CHANGE.md) | T11.1–3 | D02–04/07; isolated owner-approved target; restoration and pending semantics | A8, associated V05/V09 |
| [D11 partial-install verification](../../../changes/open/2026-11-27--obs-d11-partial-install-proof/CHANGE.md) | T11.4–6 | D02–04; separately ratified fault mechanism, isolated owner-approved target | A9, associated A4/A5/V05 |
| Normal closure | T12 | Every successor owns its own diff, receipt, docs and integration obligations | A12 affected-source regression; no independent integration task |

## Source-join schedule

Inspected 2026-11-27. `integration/observability-developer` remains the design implementation branch. The linked worktrees for `change/obs-d01-native-artifacts` and `change/obs-d02-target-identity` stay as they are. The remote ref is behind the local branch. Do not rename, recreate, or reset either. This correction does not implement an OBS Change. Where the table above and this schedule disagree, this schedule is the execution order.

- D01 has no source predecessor.
- D02 waits for D01's normalized descriptor and values paths. Both write `artifacts.mjs` and `install.mjs`.
- D03 waits for D02's frozen identity tuple. Both write `install.mjs`.
- D04 waits for D01, D02 and D03.
- D05 waits for D03's forward primitive and D04's classifier and ports. It does not edit at the same time as D06 (`package.json`, `artifacts.mjs`).
- D06 waits for D03's custody and D04's classifier. It does not wait for D05. It does not edit at the same time as D05, or as D10 (`custody.mjs`).
- D07 waits for D04. It may proceed beside D05 or D06.
- D08 waits for D05 and D07. D06 qualifies only the occupied-upgrade acceptance path. D08 does not edit `proof.mjs`, `proof-host.mjs`, or `proof.test.mjs` at the same time as D09, D10, or D11.
- D09 waits for D05 and D07, not for D08, with that same proof-file collision.
- D10 waits for D04's readiness and D07's proof resources. It does not wait for D08 or D09. It serializes `custody.mjs` with D06 and the proof files with D08, D09 and D11.
- D11 waits for D04 and D07's refusal of the direct partial-install executable. It does not wait for D08, D09, or D10. It serializes those proof files. A9 feasibility remains a live-acceptance gate.

The resulting critical path is D01, D02, D03, D04, then D05 and D07, then D08. Offline-only permission, the outstanding independent review, the D08 and D11 feasibility gates, OD-07, the original A1–A12 and V01–V12 joint certification, live authorization, and the ban on a constituent merge to main all remain.

Program-level owners: A6 fresh desired-revision installation is owner-operated on an approved isolated target after D04 and required prerequisites, distinct from V06; A11 conditional release observation remains read-only and separately recorded; V12 is the complete original A1–A12 ledger, including revalidation where later Changes affect earlier evidence. A2 and A12 are cross-cutting, not waived by narrow packet scope. Preserve all exact original predicates in the replacement acceptance matrix before retirement. Do not invent a separate Change for owner-operated no-diff proof.

## Decision and commissioning boundaries

- Existing R5 certification requires all A1–A12 and V01–V12 on one successor candidate before integration. Revised candidate: D01-only parity exception, D02–D11 assembled offline on an explicitly authorized temporary reference and jointly certified before main integration. Exact source order, refusal and exclusion in ACCEPTANCE. Independent defense and owner acceptance required. Until then R5 governs. A non-mutating D01 parity packet can be prepared and reviewed immediately, not silently exempted from authority.
- Keep accepted identity, data/credential preservation, diagnostic isolation, bounded metric dimensions, pending fences and UID cleanup. Evaluate simpler implementations of unratified metric timestamp allocation, deadline/cancellation allocations and A9 fault injection using the pinned evidence and existing contracts. Do not let one unresolved downstream proof mechanism block preparation of unrelated safe work.
- Confirm local worktree/resource ownership before commission. Bundle indispensable owner evidence requests; no local cluster mutation without permission. No invented PASS, no optional ceremony, no blanket live authorization.
- Every delegated Change prefers one lasting outcome, normally 1–5 tasks. Seven tasks is a strong default, not an automatic rejection. Size bands are signals under the current submission and severity rules. G0–G7 remain the readiness dimensions. Only Critical and High findings block the affected scope. Cursor runs focused cheap tests. ChatGPT and the owner own substantial acceptance.
- Original packet archived with immutable provenance at [audited SHA](https://github.com/DenisSkulovic/offscreen-rpg/tree/270a3b6e323872e4735f8d5ceac4a71027433ffd/work/changes/open/2026-11-27--observability-developer) and preserve unique historical findings. No destructive Git rewrite or blind deletion. Known canon/catalog references repaired; full local backlink census remains pending. No parallel active execution plans.

## Original contract disposition (planner lookup)

All 22 predecessor files are preserved byte-for-byte in the [archived packet](../../../changes/archive/2026-11/observability/2026-11-27--observability-developer/CHANGE.md) and [immutable original](https://github.com/DenisSkulovic/offscreen-rpg/tree/8acf432dcdbfea6f99a02dbd6abf547d917e6a78/work/changes/open/2026-11-27--observability-developer); no old task may dispatch.

| Original | Successor / obligation |
| --- | --- |
| artifacts.md | D01 path/descriptor/argv parity; D04 overlay generator, variant and render |
| identity.md | D02 frozen snapshot/CA/endpoint/Docker/UID and bounded reads; D04 callers |
| custody.md | D03 lock/pending/cancellation; D05 forwarding |
| classification.md | D04 inventory, Secret/revision/config projection, prefix, receipts and fixtures |
| observation-callers.md | D04 public ensure/status/diagnostics; D02–04 deadline candidate |
| connection.md | D05 loopback, owned failure/refusal |
| upgrade.md | D06 exact predecessor, no-op, preservation and pending |
| proof-ownership.md | D07 durable UID ledger, scoped cleanup, terminal receipt |
| signal-queries.md | D07 synthetic normal/privacy; D08 developer fixture/raw timestamp/watermark candidate |
| health-resources.md | D09 auth, forwarding, scoped cadence and identity |
| disruptions.md | D10 persistence, outage, bounded restoration and retained identities |
| partial-install.md | D11 real public failure, isolated fault candidate, retained pending and repeat refusal |
| integration.md | Normal closure in each successor, no separate join task |
| TASKS/INTERFACES/SOURCE-MAP | all 19 child cards and closure mapped above; historical source anchors reverify before commission |
| PROOF/READINESS/REVIEW-REPAIR | A/V predicates retained; deadline/cancellation, D4/D4.1 and A9 remain unratified; precise commands and finding history archived |
| preflight-evidence.sh/a9-admission-fault.yaml | historical specimens; owner evidence D04/D05/D08/D09/D11; no permission to execute |

Known canonical/catalog/predecessor links repaired. Remote search returned zero even for known references; full tracked backlink scan remains outstanding. All successor packets are in open and owner-released for offline source implementation only.

**Independent disposition:** [Pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) DEFENDED D01-only staged integration, REVISE AND RE-DEFEND broader staging (OD-05 activation/functional proof dependency; OD-06 legacy public mutation and cleanup paths; OD-07 cross-worktree lock/fence compatibility or owner-controlled exclusion). Existing joint rule remains selected except after owner accepts a defended slice. Drafting successors does not ratify these unresolved boundaries. D04/D06 activation must use safe coordinated candidate proof, not rely on unsafe already-merged changed default; settle exact entrypoint and cross-revision mechanism before affected commission.

**Immediate next action:** an owner instruction such as "Do OBS-D01" runs that Change's routine lifecycle on the grandfathered reference. Successors start when their own edges above hold, without another commission. Joint A1–A12/V01–V12 acceptance still precedes any main merge or Done. No constituent Change joins main.
