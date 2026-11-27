# TD10 | Technical integration and semantic acceptance

**State:** Done — source joined to `implementation/technical-documentation-renewal`; shared-file custody released (Agent Core E1 and developer observability accepted on main `5b8cb8859`); technical joint semantic acceptance and owner acceptance recorded at Design level, not here. **Kind:** DOC. **Base:** `4b621ec9708361a2304efdcff4d34bb7da2b6c88` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. **Target:** `implementation/technical-documentation-renewal`. [Accepted Design](../../../../designs/open/technical-documentation-renewal/README.md) · [Group](../README.md).

**Release:** [group readiness and dispatch](../README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

Final technical join after TD01–TD08. TD09 remains protected. All shared edits in this single Change; M02/M03/M04 and all transfer survivors. 7 bounded editorial tasks. Parent reads [TASKS](TASKS.md) and [PROOF](PROOF.md); child receives one card and named anchors. [SOURCE-MAP](SOURCE-MAP.md) is planner evidence. TD01–TD08 archived on technical implementation target; refresh actual main and active protected ownership before final reconciliation. AC08 owns packages/README and final status; OBS final closure also touches STATUS. Hold only affected shared-file work until actual custody is released and accepted changes are incorporated. Technical successor facts must be on technical target before final main join. Downstream: Design-level final integration and owner acceptance; no constituent merge directly to main. No paid, cluster, DB, provider, runtime, fixture or configuration operations.

## Target and exact write set

- `README.md`
- `docs/README.md`
- `STATUS.md`
- `docs/technical/README.md`
- `docs/architecture/README.md`
- `docs/architecture/00-human-tour.md`
- `docs/architecture/01-system-and-ownership.md`
- `docs/architecture/02-one-turn.md`
- `docs/architecture/03-data-and-transactions.md`
- `docs/architecture/04-failure-and-recovery.md`
- `docs/architecture/05-scenes-and-forks.md`
- `docs/architecture/08-gaps-and-decisions.md`
- `docs/architecture/07-client-and-trust.md`
- `docs/architecture/11-visitor-and-session.md`
- `docs/architecture/12-creating-a-story.md`
- `docs/architecture/09-chaos-and-zero-token-play.md`
- `docs/architecture/13-playing-and-forking.md`
- `docs/architecture/14-admin-tour.md`
- `packages/README.md`
- `apps/api/README.md`
- `apps/web/README.md`

Retain existing path and headings; substantive authority-first rewriting, not label-only. Preserve selected/proposed distinctions, conditions, negative guarantees, unique realization facts and exact proof provenance. No new product/architecture decisions. Only these paths and own closure records may change. Protected AC/OBS/native normative owners excluded. Any active overlap gates only the affected task.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Related owner | Proof |
| --- | --- | --- | --- |
| Technical | Listed owners: editorial restructure only, no new semantic authority | exact task anchors and transfer table | meaning-preserving diff and negatives |
| Product | Unchanged authority; no new commitments | listed read-only canonical anchors | preserve selected constraints |
| Code | Unchanged because DOC only; no executable source/config/test edit | inspected source anchors | actual diff |
| Related | Shared maps/status only listed paths; all other owners unchanged | Design-level final integration and owner acceptance; no constituent merge directly to main | navigation and preservation proof |

## Closure

Once separately Ready and commissioned, branch from verified `implementation/technical-documentation-renewal` using `change/td10-technical-integration`. Run `node scripts/repo-tools/change-branch-guard.mjs --change TD10 --target implementation/technical-documentation-renewal --design technical-documentation-renewal` before edits; recheck branch, dirty state, ownership and prerequisites. Parent owns staging, lock, reconciliation, gate and archive. [PROOF](PROOF.md) before join. Archive own packet on implementation target before reporting completion; verify archive present/open absent, report exact SHA. No automatic successor, no independent main merge, no runtime acceptance claim.

## Implementation receipt (fenced)

**Commit:** page commit `5a70c14ffa` (`docs(TD10): reconstruct front doors, routers, Atlas and source maps ...`) on `change/td10-technical-integration`, based on target `7cf8222f3cde878d369347a2e2a894bdc3e69107`. Not archived, not joined, not retired.

**Changed paths (19):** `README.md`; `docs/README.md`; `docs/technical/README.md`; `docs/architecture/{README,00-human-tour,01-system-and-ownership,02-one-turn,03-data-and-transactions,04-failure-and-recovery,05-scenes-and-forks,07-client-and-trust,08-gaps-and-decisions,09-chaos-and-zero-token-play,11-visitor-and-session,12-creating-a-story,13-playing-and-forking,14-admin-tour}.md`; `apps/api/README.md`; `apps/web/README.md`. No heading removed or renamed.

**Checks vs baseline** (before-first-edit runs saved in scratchpad): `git diff --check` clean. `check_docs.py` 80 -> 77 problems; the only difference is three broken `work/changes/open/...turn03.../PROOF.md` links removed (retargeted to the archived, cancelled TURN03 record); none new. `docs-health.mjs` 3 violations, identical to baseline. `wiki-health.mjs` run (output only to ignored `out/`; reports pre-existing dead-end findings). Link health is not semantic proof. No runtime, cluster, DB or provider operation. Side effect: the first `pnpm` invocation (wiki:find) ran a dependency install into this worktree's ignored `node_modules`; no tracked change.

**Semantic answers (from rewritten text):**
- T01 proposed feature looks shipped: no; README "three layers" and Project status state selection, existence and proof are separate axes; Agent Core is "selected design plus isolated SDK experiments". Old not-on-main entry presented current: no; README states `packages/application` no longer exists. POC consumer demotes a qualified primitive: no; README Reality check and docs/README "What exists" keep narrow evidenced mechanisms' standing.
- T02 diagram or historical decision becomes binding: no; Atlas README opening and technical README "Architecture at a glance" caption say so, and D-0001 is split into standing safety rule vs dated working shape. Legacy retrieval result as accepted target: no; technical README four-kind legend (Legacy realization licenses nothing about retention).
- T03 model or worker owns committed truth: no; 02 "What remains genuinely unproven" lead and 03 "custody is not adoption". S3 atomic with SQL: no; 03 stage-then-select unchanged. Source diagram proves a live turn: no; 02 reading order and 00 "Three kinds of done".
- T04 retry doubles spend: no; 04 rule (2) and the provider section. Current-head snapshot substitutes past: no; 05 authority statement and 04 rule (3). Cancelled gate counted passed: no; 08 gates paragraph and 13 "TURN03 proves nothing, because it never ran".
- T05 OAuth grants story access: no; 11 "Sign-in proves a provider identity and nothing else". Uncertain ACK restarts launch: no; 12 "Uncertainty never restarts a launch". Scripted opening proves arbitrary prompt play: no; 12 Important limit.
- T06 random fault test proves all recoveries: no; 09 "What is real" table and its closing sentence. Staff may impersonate: no; 14 opening. Script equals product acceptance: no; 13 TURN03 note and 12 Status.
- T07 deleted route authoritative: no; API/Web READMEs and Atlas README route sentence. agent-core API invented: no; both READMEs state no Agent Core consumer (grep of apps/api, apps/web for `@offscreen/application`/agent-core: none). Runtime instructions expanded: no; READMEs add no command.

**Source corrections made (read against source):** Game Authority launch/start/fork seam and `storytellerDistributedV1` present at current tree; `adoptSavedStorytellerGeneration` exists in `packages/story-engine/src/storyteller/generation-adoption.ts` (the 584b594 "missing bridge" is baseline-only); workflow identity `storyteller/{id}` implemented for both topics (`apps/worker/src/outbox/dispatch.ts`); stale `packages/application` routes in the owned Atlas pages re-pointed to `packages/story-engine`; TURN03 recorded as cancelled 2026-11-27.

**Transfer-completeness receipt (group README "Frozen transfer subset"; destination heading exists and contains the fact set with provenance, checked on this branch by section extraction plus manual read of rows 4, 5b, 6, 11):**

| # | Row | Receiver destination | Result |
| --- | --- | --- | --- |
| 1 | PD01 concepts -> TD05 | operation-and-controller.md / Current prototype runtime (result.scene, story_passage, dual-publication example, scoped legacy realization) | PASS |
| 2 | PD02 rules (authority split, POC subset, entry limits, resumption) -> TD04 | mechanics-and-capabilities.md / Supported mechanisms and the future kernel; Persistence and known limits (fixtures, D&D subset, clock-wait.v1, item.create/transfer.v1, fact.set.v1, private offer/path, exclusions) | PASS |
| 3 | PD02 executable library shape -> TD05 | prompts-and-tools.md / Selected compilation and tool contract (adapter identity+version, topic metadata, deterministic recipes, bounded mechanism, license) | PASS |
| 4 | PD02 rehearsal adapter -> TD04 | ticks-and-tags.md / Fixed real-second scheduling and fictional time (twenty real seconds, injected wait, immediate zero, mechanical-clock exclusion, source constants) | PASS |
| 5 | PD02 continuity -> TD04/TD05 | mechanics-and-capabilities.md / Opportunity boundary (scene-frame.v1); context-selection-and-recall.md / Storyteller-facing memory tools (ask_memory/read_memory, lead, not a general agent) | PASS |
| 6 | PD05 settings -> TD05 | versioned-settings.md / Current adapters (editor counts, revision projection, lock/pause, limits) | PASS |
| 7 | PD04 entry -> TD06 | interaction-contracts.md / Drafts and forms (/stories/new, /stories/launch redirect, server presets, legacy drafts, scripted, no live model proof) | PASS |
| 8 | PD04 demo -> TD06 | presentation-runtime.md / Source-grounded baseline (/demo manual time, reset, no sign-in, no provider) | PASS |
| 9 | PD04 fork key -> TD06 | living-book-poc.md / Data and command invariants (disjoint historical key, no live snapshot reuse, no historic offer command, not proof) | PASS |
| 10 | PD06 admin status -> TD07 | topology-and-authorization.md / Authorization claim map; investigation-and-privacy.md / Relationship semantics (landed access/audit, OBS06/07 synthetic or disposable-grant proof, no production grant, no full Turn Capsule) | PASS |
| 11 | PD06 ai status -> TD08 | investigation-and-reconstruction.md / Owner map (redacted reads exist, not full workspace, no raw prompt grant) | PASS |
| 12 | PD03 GM07 -> TD03 | data-and-persistence.md / Implemented decision deadline; execution-and-delivery.md / Implemented solo response deadline (narrow harmless exception, never general delegation, product reference kept) | PASS |

12/12 PASS, no FAIL. Product-side copies remain in place (PD07 removes them after the successor is on main, not just this branch).

**M02 (semantic retrieval), five assigned `wiki:find` queries, each hit inspected by path/heading:** mechanical authority -> selected-architecture.md headings and Selected engine architecture in the top five (selected meaning reachable; top hit is the "Source-reality checkpoint" heading, not a legacy adapter); 20 real seconds -> ticks-and-tags.md "Existing narrative rehearsal adapter (legacy narrative-only path)" and "Fixed real-second ..." first, then the two Implemented deadline headings (selected guarantee not replaced; but the retrieval lane labels that legacy heading `normative`/`selected-technical`, see Finding 1); forensic transition capture -> capture-and-provenance.md "Committed transition capture V1" and Owner map (proposal status is in the page, hit labelled normative); provider uncertain delivery -> execution-and-delivery.md "Retry boundaries and uncertain side effects" first; native observability qualification -> observability-native-infrastructure.md "Certification continuity" first (protected page, not read or edited). Outcome: PASS on accessibility of selected meaning; no route defect requiring an edit in this write set.
**M03 (front doors read together):** README, docs/README, technical README and Atlas README/00 now agree: three layers (foundation, Agent Core selected, legacy POC), D-0001 split (standing prohibition vs dated modular-monolith shape with revisit rule), no `packages/application`. STATUS.md was read (Orientation and 2026-11-27 baseline) but not written. Outcome: PASS for written front doors; STATUS leg NOT RUN (fenced).
**M04 (independent primitive standing):** README Reality check, docs/README maturity row and technical README legend state a narrow evidenced mechanism keeps its own standing under an exploratory consumer; no row demotes a primitive wholesale. PASS for written pages.
**Protected pages:** `docs/technical/platform/agent-core.md`, `docs/runbooks/kubernetes-observability.md`, `docs/technical/platform/observability-native-infrastructure.md` not touched (diff name list confirms). The full seven-page comparison against refreshed main and the 60-disposition review are NOT RUN here (belongs to final joint acceptance).

**Findings (deferred):**
1. Low: wiki lane classification labels the legacy "Existing narrative rehearsal adapter" heading `normative`; page text states legacy, no route defect. Destination: retrieval owner, or custodian register.
2. Medium: `packages/application` still appears as dated provenance in `docs/technical/{http-api-and-client-contracts,security-and-trust-boundaries,topology,selected-architecture,authority-and-transitions,chronology-and-activities,capture-and-provenance,telemetry-and-diagnostics,generation-and-publication}` and `docs/runbooks/uncertain-work-recovery.md`; outside this write set, already noted by TD04/TD05/TD08 receipts. Destination: group register (custodian).
3. Low (inherited, not in write set): INF29 broken link in verification-programmes.md (TD01); missing `## Reconciliation ledger` heading in TD03's archived packet; 3 pre-existing docs-health violations (Agent Core design links, repository-agent-workbench audit).
4. Low: Atlas 08 gap-table rows remain a dated 2026-11-19 ledger (captioned as such); full per-row status refresh would need cluster/TURN evidence that does not exist.
5. Medium (carried): product-side transfer copies coexist with technical successors until PD07; group register/custodian retains the frozen-table receipt per DOC-E1-IR-M01.

**Fence released and closed (2026-11-27, main `5b8cb88596efae72c43ced9e51a59b76f2d08214`).** Main was merged into this Change branch (no conflicts) so STATUS.md and packages/README.md were written from the accepted AC08/OBS text, not over it. `STATUS.md`: baseline retained; scoped-primitive sentence added; a `Dated checkpoints below (historical, not current claims)` heading now separates the baseline from dated receipts; no dated observation deleted or rewritten. `packages/README.md`: deleted-`packages/application` route sentence and Agent Core row status (`Initial foundation, owner-accepted (E1)`); AC08's text untouched. Three repair defects handled narrowly outside the original write set under the commission: Atlas 02 obsolete default-Compose wording (Compose retired by DXK06); HTTP API links and data-and-persistence/topology ownership prose re-pointed from removed `packages/application` / `@offscreen/application` to `packages/story-engine` (all six link targets verified to exist); wiki classification of `capture-and-provenance.md` (a proposal page that retrieval labelled selected-technical normative) fixed by one explicit `Status:` line the classifier already reads. `wiki:find "forensic transition capture proposal"` now returns that page's headings in the proposal lane. The legacy `Existing narrative rehearsal adapter` heading stays in the selected owner's lane: the classifier has no legacy lane, the heading and text say legacy, and the selected fixed-real-second section ranks beside it (Low, deferred, no tool change).

**Closing checks (post-merge baseline, this branch):** `git diff --check` clean; `check_docs.py` 65 problems (77 before; none introduced); `docs-health.mjs` 1 violation (3 before; the remaining one is the pre-existing `repository-agent-workbench` audit link); `wiki-health.mjs` reports only pre-existing dead-end findings. No runtime, cluster, database or provider operation. Joint semantic acceptance and the protected-page comparison are recorded at Design level.

## Reconciliation ledger` heading in TD03's archived packet; 3 pre-existing docs-health violations (Agent Core design links, repository-agent-workbench audit).
4. Low: Atlas 08 gap-table rows remain a dated 2026-11-19 ledger (captioned as such); full per-row status refresh would need cluster/TURN evidence that does not exist.
5. Medium (carried): product-side transfer copies coexist with technical successors until PD07; group register/custodian retains the frozen-table receipt per DOC-E1-IR-M01.

**Remaining fenced work and release condition:**
- `STATUS.md` (T01): update the Orientation/Capability coverage framing and move dated checkpoints beneath the historical route. Release when `implementation/observability-developer` final acceptance has landed on main (STATUS.md custody) and this target has been reconciled to include it; then write from the integrated text without overwriting its edits.
- `packages/README.md` (T07): update affected package-map paragraphs. Release when `implementation/agent-core-monorepo-map` (AC08, final Agent Core status) has landed and this target includes it.
- Then: re-run the PROOF Change gate for those two paths, update this ledger, archive, integrate. Joint semantic acceptance and owner acceptance remain NOT RUN.

## Reconciliation ledger (complete before Done)

| Affected heading | Authority | Target delta / unchanged reason | Source delta and SHA | Evidence tier | Negative proof | Route update |
| --- | --- | --- | --- | --- | --- | --- |
| T01 `README.md`, `docs/README.md`, `STATUS.md` | technical | changed: three-axis posture, three-layer description, maturity routes; STATUS baseline kept, historical-checkpoint heading added | page `5a70c14ff`; STATUS closure commit on this branch | source-inspected docs diff | answered below | none |
| T02 `docs/technical/README.md`, Atlas `README.md`, `00-human-tour.md` | technical | changed: four-kind legend, D-0001 split (rule vs dated shape), diagrams-are-not-binding, no-`packages/application` | `5a70c14ff` | source-inspected | answered below | headings kept |
| T03 Atlas 01, 02, 03 | technical | changed: baseline vs later source vs target separated; routes re-pointed to story-engine; adoption bridge reconciled to `generation-adoption.ts` | `5a70c14ff` | source-inspected | answered below | headings kept |
| T04 Atlas 04, 05, 08 | technical | changed: four failure rules, routes, workflow-identity finding marked resolved with source evidence, TURN03 cancellation | `5a70c14ff` | source-inspected | answered below | headings kept |
| T05 Atlas 07, 11, 12 | technical | changed: authority lead, sign-in vs actor/membership, realized-vs-selected launch, uncertainty never restarts | `5a70c14ff` | source-inspected | answered below | headings kept |
| T06 Atlas 09, 13, 14 | technical | changed: what-is-real table, TURN03 cancelled (proves nothing), narrow staff source vs control-plane goal | `5a70c14ff` | source-inspected | answered below | 06/10 untouched (TD02) |
| T07 `apps/api/README.md`, `apps/web/README.md`, `packages/README.md` | technical | changed: legacy-POC scope, no Agent Core consumer, routes not proof; packages map notes the removed Application package and Agent Core row status | `5a70c14ff`; closure commit | source-inspected (grep: no web/api import of `@offscreen/application` or agent-core) | answered below | none |
| Transfer completeness (12 rows), M02, M03, M04 | technical | verified, no edit | see receipt | source-inspected + wiki:find | see receipt | none |
| Defects: Atlas 02 Compose wording; HTTP API / persistence / topology Application routes; capture-and-provenance wiki lane | technical | changed narrowly (see closure paragraph) | closure commit | source-inspected; link targets verified; `wiki:find` re-run | no new current route into removed Application | none |
