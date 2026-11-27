# TD06 | Client and API contracts

**State:** Done — source joined to implementation/technical-documentation-renewal; joint semantic acceptance pending (PD07/TD10 and Design). **Kind:** DOC. **Base:** `4b621ec9708361a2304efdcff4d34bb7da2b6c88` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. **Target:** `implementation/technical-documentation-renewal`. [Accepted Design](../../../../../designs/open/technical-documentation-renewal/README.md) · [Group](../../../../open/technical-documentation-renewal/README.md).

**Release:** [group readiness and dispatch](../../../../open/technical-documentation-renewal/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

Ten technical pages; receive product experience realization without selecting a new frontend. 5 bounded editorial tasks. Parent reads [TASKS](TASKS.md) and [PROOF](PROOF.md); child receives one card and named anchors. [SOURCE-MAP](SOURCE-MAP.md) is planner evidence. No source predecessor; group frozen transfer facts are available at planning base. Verify active ownership and actual HEAD before dispatch. Downstream: TD10. No paid, cluster, DB, provider, runtime, fixture or configuration operations.

## Target and exact write set

- `docs/technical/client/architecture.md`
- `docs/technical/client/interaction-contracts.md`
- `docs/technical/client/state-and-server-boundary.md`
- `docs/technical/platform/http-api-and-client-contracts.md`
- `docs/technical/client/living-book-poc.md`
- `docs/technical/client/accessibility-and-performance.md`
- `docs/technical/client/presentation-runtime.md`
- `docs/technical/client/semantic-design-foundation.md`
- `docs/technical/client/scene-direction-production.md`
- `docs/technical/platform/notifications.md`

Retain existing path and headings; substantive authority-first rewriting, not label-only. Preserve selected/proposed distinctions, conditions, negative guarantees, unique realization facts and exact proof provenance. No new product/architecture decisions. Only these paths and own closure records may change. Protected AC/OBS/native normative owners excluded. Any active overlap gates only the affected task.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Related owner | Proof |
| --- | --- | --- | --- |
| Technical | Listed owners: editorial restructure only, no new semantic authority | exact task anchors and transfer table | meaning-preserving diff and negatives |
| Product | Unchanged authority; no new commitments | listed read-only canonical anchors | preserve selected constraints |
| Code | Unchanged because DOC only; no executable source/config/test edit | inspected source anchors | actual diff |
| Related | Shared maps/indexes/STATUS reserved to integration; report concrete affected routes | TD10 | navigation and preservation proof |

## Closure

Once separately Ready and commissioned, branch from verified `implementation/technical-documentation-renewal` using `change/td06-client-api`. Run `node scripts/repo-tools/change-branch-guard.mjs --change TD06 --target implementation/technical-documentation-renewal --design technical-documentation-renewal` before edits; recheck branch, dirty state, ownership and prerequisites. Parent owns staging, lock, reconciliation, gate and archive. [PROOF](PROOF.md) before join. Archive own packet on implementation target before reporting completion; verify archive present/open absent, report exact SHA. No automatic successor, no independent main merge, no runtime acceptance claim.

## Reconciliation ledger (complete before Done)

| Affected heading | Authority | Target delta / unchanged reason | Source delta and SHA | Evidence tier | Negative proof | Route update |
| --- | --- | --- | --- | --- | --- | --- |
| client pages, HTTP contract, notifications (all headings kept) | Technical owners; product authority unchanged | Authority/realization separated per heading; PD04 rows landed | `f48e374ab5deed5a98ef500330664e4d7e26b879`; source anchors read-only | Source-inspected docs; no runtime | T01 to T05 negatives answered below | None (shared routes reserved to TD10) |

## Closure receipt

**Page commit:** `f48e374ab5deed5a98ef500330664e4d7e26b879`. **Paths:** the ten owned pages only.

**Transfer facts landed (PD04 rows, mirrored with provenance, product text left in place):** interaction-contracts.md / Drafts and forms / Current launch realization (/stories/new, /stories/launch redirect, server presets only with `presets={[]}` at source, legacy drafts /stories/[id], scripted observe and continuation, no live model proof); presentation-runtime.md / Source-grounded baseline (/demo manual time, reset on refresh, no sign-in, no provider); living-book-poc.md / Data and command invariants (disjoint historical key, no live snapshot reuse, no historic offer commandability, not proof; product guarantees retained).

**Restructuring:** architecture.md (scope/routing block, dated W status moved into section 9, section 4 split into selected contract and dated realization); presentation-runtime.md (appearance bridge moved to the dated baseline); living-book-poc.md (reconciliation merged into the BOOK section, Journal requirement rewritten as selected); semantic-design-foundation.md (audited starting facts moved to the end as dated provenance); scene-direction-production.md (link C split into bullets, dated sections deduplicated); http-api page (opening rewritten, duplicate negative folded into the table); notifications.md (status tiers, internal hint versus external delivery, subscription paragraph moved under Contact); state-and-server-boundary.md (selected contract versus dated realization). No heading removed or renamed.

**Checks:** `git diff --check` clean. `check_docs.py` 96 problems, identical to the baseline. `docs-health` identical to the baseline (3 violations). Link health is not semantic proof.

**Semantic negatives (controlling heading):** cached prior actor data refused (architecture 1 Data ownership invariants; state Negative); accepted 202 is not the committed scene (http Accepted response versus committed world); new PUT after uncertain ACK refused (architecture 3, http Frozen operation identity Negative); SSE payload is not authority (http GET truth and SSE hints; state Dated realization); terminal bypassing identity refused (http Frozen operation identity Negative; state Commands and hints); stale revision never overwrites (architecture 2 Snapshot and update policy); rewritten recap never replaces saved prose (living-book Data and command invariants); snapshot test is not human comprehension (accessibility Status; living-book acceptance bar); POC selects no design system (living-book What this spec does not select); unknown presentation token runs no code (presentation-runtime V1 language); art direction never changes gameplay (scene-direction Authority; semantic Tokens); deterministic fixture is not live authoring (scene-direction link C and dated sections); SSE hint is not device delivery, expired push admits no old action, logout unlinks subscription (notifications Status, Delivery flow, Contact).

**Deferred findings (destination: group register, custodian):** Medium: state-and-server-boundary Topology and Ownership still overlap architecture sections 1 and 2 (unique facts retained in both); accessibility-and-performance and interaction-contracts received lighter restructuring than other pages. Low: terminal source package not inspected, the historical-scene reader consumer in apps/web not verified. Acceptance NOT RUN.

## Reconstruction pass (R2)

**Why:** the first pass was mostly annotative; the audit left T03 (accessibility) not done and T02 (HTTP/state) partial. **Page commit:** `c7a771d225b6bd0485d9573de23007e719016fad`.

**Algorithm now executed:** T03 accessibility-and-performance organized by evidence tier (selected requirement, source-present vitest-axe/focus/refetch checks, measured NOT RUN), body rewritten, status paragraph removed. T02 http page opens with the selected topology as five owned authority rules, per-heading Owner lines removed, 401/404/409/202 negatives consolidated into the error table, review table shortened to one failure sentence; state-and-server-boundary Topology and Ownership reduced to the boundary plus pointers to architecture 1 and 2. T04 presentation-runtime reordered (selected V1 before the dated baseline, lead tightened, /demo transfer facts verbatim); semantic-design-foundation duplicate path line and direction words fixed (already ordered per card).

**Survival check:** every number, threshold (2 s, about 30 s, 4.5:1 and 3:1 where present), status, heading and anchor kept; removed text is duplicate with surviving copy in architecture 1 to 2 (state page) or the error table (http page).

**Checks:** `git diff --check` clean; check_docs 80 problems and docs-health 3 violations, identical to the worktree base, none in changed pages except the pre-existing packages/application links in the http Evidence read list.

**Semantic answers:** SSE payload is not authority (http GET truth and SSE hints); terminal bypasses no identity (http Frozen operation identity); stale revision never overwrites (architecture Snapshot and update policy); a snapshot test is not human comprehension and no WCAG claim (accessibility Evidence tiers).

**Deferred:** Low: interaction-contracts not restructured further; terminal source package still not inspected.

