# DOC02 | Current canonical file disposition register

**Pinned main:** `cda7444e7bb8910e228164cb97a17b504f7c2415`, 2026-11-16. This table covers **all 114 tracked files under docs/** at that SHA (1573825 Git tree bytes). **Dispositions are provisional, based on path and sampled content; they are NOT proof that every file body has undergone full semantic audit.** Do not drop anything until line/section ownership is reconciled. The separate `work/changes/archive/` is permanently preserved under owner direction.

## Distribution of proposed operations

| Action | Files | Git bytes |
| --- | ---: | ---: |
| CLASSIFY SCENARIO | 15 | 154856 |
| DELETE ALIAS | 2 | 556 |
| DELETE DUPLICATE | 9 | 134320 |
| DRAFT OR FILL | 2 | 776 |
| FILL OR MERGE | 3 | 709 |
| FOLD UNIQUE | 5 | 49870 |
| JUSTIFY OR RETIRE | 1 | 566 |
| KEEP/RECONCILE | 12 | 191925 |
| KEEP/STRENGTHEN | 7 | 29741 |
| REBUILD GAP | 3 | 1413 |
| REBUILD PRODUCT | 8 | 9002 |
| RECONCILE DEEP | 9 | 126783 |
| RECONCILE TARGET | 8 | 256434 |
| REMOVE ALIAS | 15 | 414002 |
| REWRITE | 1 | 8688 |
| REWRITE DETAIL | 3 | 3809 |
| REWRITE ROUTER | 3 | 10323 |
| REWRITE TARGET | 6 | 139795 |
| TRIM | 1 | 361 |
| VALIDATE | 1 | 39896 |

## Exhaustive current-docs path register

| Path | Bytes | Proposed action | Destination | Required proof |
| --- | ---: | --- | --- | --- |
| `docs/decisions/README.md` | 566 | JUSTIFY OR RETIRE | docs/decisions/ | empty ADR registry; seed actual accepted decisions or remove ceremonial folder |
| `docs/product/admin/ai-engineering-and-investigation.md` | 654 | REBUILD PRODUCT | same path or regroup by staff task | current summary points to 318KB old essays; preserve accepted details, draft conditionals |
| `docs/product/admin/authority-and-governance.md` | 1914 | REBUILD PRODUCT | same path or regroup by staff task | current summary points to 318KB old essays; preserve accepted details, draft conditionals |
| `docs/product/admin/charter-and-personas.md` | 2356 | REBUILD PRODUCT | same path or regroup by staff task | current summary points to 318KB old essays; preserve accepted details, draft conditionals |
| `docs/product/admin/command-center-and-insights.md` | 552 | REBUILD PRODUCT | same path or regroup by staff task | current summary points to 318KB old essays; preserve accepted details, draft conditionals |
| `docs/product/admin/commercial-and-trust.md` | 871 | REBUILD PRODUCT | same path or regroup by staff task | current summary points to 318KB old essays; preserve accepted details, draft conditionals |
| `docs/product/admin/gameplay-and-liveops.md` | 695 | REBUILD PRODUCT | same path or regroup by staff task | current summary points to 318KB old essays; preserve accepted details, draft conditionals |
| `docs/product/admin/operator-workflows.md` | 675 | REBUILD PRODUCT | same path or regroup by staff task | current summary points to 318KB old essays; preserve accepted details, draft conditionals |
| `docs/product/admin/player-360-and-support.md` | 1285 | REBUILD PRODUCT | same path or regroup by staff task | current summary points to 318KB old essays; preserve accepted details, draft conditionals |
| `docs/product/admin/README.md` | 1351 | REWRITE ROUTER | same path | staff product direct owners without essay archive dependencies |
| `docs/product/experience/collaboration.md` | 341 | DRAFT OR FILL | work/designs/ or accepted product experience | unapproved future feature; substantive design not a tiny placeholder |
| `docs/product/experience/entry-and-onboarding.md` | 4039 | KEEP/STRENGTHEN | same path | reconcile source program richness and one complete user journey |
| `docs/product/experience/navigation-and-stories.md` | 2312 | KEEP/STRENGTHEN | same path | reconcile source program richness and one complete user journey |
| `docs/product/experience/play-and-decisions.md` | 2133 | KEEP/STRENGTHEN | same path | reconcile source program richness and one complete user journey |
| `docs/product/experience/presentation.md` | 1098 | REWRITE DETAIL | docs/product/experience/ | consolidate accepted UX criteria, examples, negatives; remove historical backlinks |
| `docs/product/experience/principles.md` | 2271 | KEEP/STRENGTHEN | same path | reconcile source program richness and one complete user journey |
| `docs/product/experience/replay.md` | 435 | DRAFT OR FILL | work/designs/ or accepted product experience | unapproved future feature; substantive design not a tiny placeholder |
| `docs/product/experience/return-and-journal.md` | 1773 | KEEP/STRENGTHEN | same path | reconcile source program richness and one complete user journey |
| `docs/product/experience/settings-and-accessibility.md` | 1607 | REWRITE DETAIL | docs/product/experience/ | consolidate accepted UX criteria, examples, negatives; remove historical backlinks |
| `docs/product/foundations/concepts.md` | 10686 | KEEP/RECONCILE | same path | shared accepted product identity; verify single authority |
| `docs/product/foundations/game-rules.md` | 13600 | DELETE DUPLICATE | docs/product/gameplay/ | old full compat document; transfer any unique clauses |
| `docs/product/foundations/gameplay.md` | 12846 | DELETE DUPLICATE | docs/product/gameplay/ | old full compat document; transfer any unique clauses |
| `docs/product/foundations/vision.md` | 14630 | KEEP/RECONCILE | same path | shared accepted product identity; verify single authority |
| `docs/product/gameplay/acceptance-scenarios.md` | 19365 | KEEP/RECONCILE | same domain | verify coverage and no conflict with older selected target; preserve scenarios |
| `docs/product/gameplay/actions-and-commitments.md` | 5862 | KEEP/RECONCILE | same domain | verify coverage and no conflict with older selected target; preserve scenarios |
| `docs/product/gameplay/continuity.md` | 16300 | KEEP/RECONCILE | same domain | verify coverage and no conflict with older selected target; preserve scenarios |
| `docs/product/gameplay/rules.md` | 5901 | KEEP/RECONCILE | same domain | verify coverage and no conflict with older selected target; preserve scenarios |
| `docs/product/gameplay/time-and-autonomy.md` | 20152 | KEEP/RECONCILE | same domain | verify coverage and no conflict with older selected target; preserve scenarios |
| `docs/product/gameplay/worlds-and-characters.md` | 2962 | KEEP/RECONCILE | same domain | verify coverage and no conflict with older selected target; preserve scenarios |
| `docs/product/journeys/player-experience.md` | 10740 | DELETE DUPLICATE | docs/product/{gameplay,experience,storyteller}/ | legacy complete doc + redirect banner; route claims/links to one owner |
| `docs/product/journeys/playthroughs.md` | 19216 | DELETE DUPLICATE | docs/product/{gameplay,experience,storyteller}/ | legacy complete doc + redirect banner; route claims/links to one owner |
| `docs/product/journeys/story-creation.md` | 11807 | DELETE DUPLICATE | docs/product/{gameplay,experience,storyteller}/ | legacy complete doc + redirect banner; route claims/links to one owner |
| `docs/product/journeys/time-and-autonomy.md` | 20031 | DELETE DUPLICATE | docs/product/{gameplay,experience,storyteller}/ | legacy complete doc + redirect banner; route claims/links to one owner |
| `docs/product/README.md` | 4237 | REWRITE ROUTER | same path | remove soft-retire/cutover/legacy routes; direct approved headings |
| `docs/product/storyteller/behavior-and-quality.md` | 4193 | KEEP/STRENGTHEN | same path | reconcile constitution/target and approval status; remove old full copies |
| `docs/product/storyteller/memory-and-continuity.md` | 1104 | REWRITE DETAIL | same path | thin summary; full accepted creative-memory contract vs future target |
| `docs/product/storyteller/profiles-and-settings.md` | 13020 | KEEP/STRENGTHEN | same path | reconcile constitution/target and approval status; remove old full copies |
| `docs/product/storytelling/continuity-and-consequences.md` | 16160 | DELETE DUPLICATE | docs/product/{gameplay,experience,storyteller}/ | legacy complete doc + redirect banner; route claims/links to one owner |
| `docs/product/storytelling/storyteller-settings.md` | 12892 | DELETE DUPLICATE | docs/product/{gameplay,experience,storyteller}/ | legacy complete doc + redirect banner; route claims/links to one owner |
| `docs/product/storytelling/storytelling.md` | 17028 | DELETE DUPLICATE | docs/product/{gameplay,experience,storyteller}/ | legacy complete doc + redirect banner; route claims/links to one owner |
| `docs/progress.md` | 273 | DELETE ALIAS | STATUS.md or work/designs | consumer and live-link cutover; unique open decisions extracted |
| `docs/questions.md` | 283 | DELETE ALIAS | STATUS.md or work/designs | consumer and live-link cutover; unique open decisions extracted |
| `docs/README.md` | 8688 | REWRITE | docs/README.md | small ChatGPT-first direct topic index; remove legacy/navigation archaeology |
| `docs/runbooks/local-development.md` | 39896 | VALIDATE | docs/runbooks/local-development.md | commands/environment current, split only if distinct revision owner |
| `docs/runbooks/README.md` | 361 | TRIM | docs/runbooks/ | only actual procedures; no status duplication |
| `docs/technical/admin/commands-and-audit.md` | 10610 | RECONCILE DEEP | docs/technical/admin/ | large source target; compare unpromoted Admin product/tech, status, privacy and grants |
| `docs/technical/admin/console-and-read-models.md` | 10102 | RECONCILE DEEP | docs/technical/admin/ | large source target; compare unpromoted Admin product/tech, status, privacy and grants |
| `docs/technical/admin/investigation-and-privacy.md` | 12189 | RECONCILE DEEP | docs/technical/admin/ | large source target; compare unpromoted Admin product/tech, status, privacy and grants |
| `docs/technical/admin/topology-and-authorization.md` | 11239 | RECONCILE DEEP | docs/technical/admin/ | large source target; compare unpromoted Admin product/tech, status, privacy and grants |
| `docs/technical/architecture.md` | 15542 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/calendars-and-world-time.md` | 18957 | FOLD UNIQUE | domain owner by actual invariant | review meaningful unique technical claims before removing flat path |
| `docs/technical/canonical-files.md` | 62459 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/chamber-lab-protocol.md` | 19424 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/client-and-identity.md` | 16016 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/client/accessibility-and-performance.md` | 256 | FILL OR MERGE | docs/technical/client/ | tiny skeleton; owner question must be answered by substantive text |
| `docs/technical/client/architecture.md` | 35481 | KEEP/RECONCILE | docs/technical/client/ | selected React/presentation architecture; verify source and product outcomes |
| `docs/technical/client/interaction-contracts.md` | 215 | FILL OR MERGE | docs/technical/client/ | tiny skeleton; owner question must be answered by substantive text |
| `docs/technical/client/presentation-runtime.md` | 17007 | KEEP/RECONCILE | docs/technical/client/ | selected React/presentation architecture; verify source and product outcomes |
| `docs/technical/client/state-and-server-boundary.md` | 238 | FILL OR MERGE | docs/technical/client/ | tiny skeleton; owner question must be answered by substantive text |
| `docs/technical/committed-time.md` | 17842 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/context-and-cost.md` | 51947 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/data.md` | 34765 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/delivery-and-validation.md` | 25122 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/engine/authority-and-transitions.md` | 20325 | RECONCILE TARGET | docs/technical/engine/ | legacy runtime contract plus desired engine destination; split truth vs implemented |
| `docs/technical/engine/chronology-and-activities.md` | 18138 | RECONCILE TARGET | docs/technical/engine/ | legacy runtime contract plus desired engine destination; split truth vs implemented |
| `docs/technical/engine/concurrency-and-recovery.md` | 827 | REBUILD GAP | docs/technical/engine/ | skeleton; extract ENG03/CAS/Temporal source and selected future invariants |
| `docs/technical/engine/lifecycle-and-compatibility.md` | 22078 | RECONCILE TARGET | docs/technical/engine/ | legacy runtime contract plus desired engine destination; split truth vs implemented |
| `docs/technical/engine/mechanics-and-capabilities.md` | 31377 | RECONCILE TARGET | docs/technical/engine/ | legacy runtime contract plus desired engine destination; split truth vs implemented |
| `docs/technical/execution.md` | 29677 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/lab/chamber-and-fixtures.md` | 24057 | KEEP/RECONCILE | docs/technical/lab/ | approved Chamber contract; remove flat twin and retained trial instructions |
| `docs/technical/lab/experiment-protocol.md` | 19522 | KEEP/RECONCILE | docs/technical/lab/ | approved Chamber contract; remove flat twin and retained trial instructions |
| `docs/technical/notifications.md` | 7163 | FOLD UNIQUE | domain owner by actual invariant | review meaningful unique technical claims before removing flat path |
| `docs/technical/observability/capture-and-provenance.md` | 12523 | RECONCILE DEEP | docs/technical/observability/ | 82KB owner summaries vs 329KB old technical essays; retrieve unique invariants |
| `docs/technical/observability/identities-and-evidence.md` | 18900 | RECONCILE DEEP | docs/technical/observability/ | 82KB owner summaries vs 329KB old technical essays; retrieve unique invariants |
| `docs/technical/observability/investigation-and-reconstruction.md` | 14972 | RECONCILE DEEP | docs/technical/observability/ | 82KB owner summaries vs 329KB old technical essays; retrieve unique invariants |
| `docs/technical/observability/retention-and-access.md` | 20282 | RECONCILE DEEP | docs/technical/observability/ | 82KB owner summaries vs 329KB old technical essays; retrieve unique invariants |
| `docs/technical/observability/telemetry-and-diagnostics.md` | 15966 | RECONCILE DEEP | docs/technical/observability/ | 82KB owner summaries vs 329KB old technical essays; retrieve unique invariants |
| `docs/technical/persistence-and-caching.md` | 4057 | FOLD UNIQUE | domain owner by actual invariant | review meaningful unique technical claims before removing flat path |
| `docs/technical/platform/data-and-persistence.md` | 34932 | REWRITE TARGET | docs/technical/platform/ | source-era clone requires merger with selected target and cross-domain authority |
| `docs/technical/platform/deployment-and-compatibility.md` | 25195 | REWRITE TARGET | docs/technical/platform/ | source-era clone requires merger with selected target and cross-domain authority |
| `docs/technical/platform/execution-and-delivery.md` | 29806 | REWRITE TARGET | docs/technical/platform/ | source-era clone requires merger with selected target and cross-domain authority |
| `docs/technical/platform/identities-and-access.md` | 16145 | REWRITE TARGET | docs/technical/platform/ | source-era clone requires merger with selected target and cross-domain authority |
| `docs/technical/platform/spending-and-entitlements.md` | 17858 | REWRITE TARGET | docs/technical/platform/ | source-era clone requires merger with selected target and cross-domain authority |
| `docs/technical/platform/topology.md` | 15859 | REWRITE TARGET | docs/technical/platform/ | source-era clone requires merger with selected target and cross-domain authority |
| `docs/technical/playthroughs/batman.md` | 8613 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/beacon.md` | 10319 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/cargo.md` | 6065 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/execution-language.md` | 11042 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/greywake-memory.md` | 12670 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/harbor-session.md` | 12706 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/local-opportunities.md` | 13578 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/nonhuman.md` | 7647 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/poc.md` | 14317 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/README.md` | 975 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/red-mountain.md` | 8568 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/spongebob.md` | 9883 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/storyteller.md` | 19402 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/vvardenfell.md` | 10453 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/playthroughs/wizard.md` | 8618 | CLASSIFY SCENARIO | docs/product/gameplay, tests, evidence or Git history | acceptance contract/test fixture/dated run/story example; retire technical category |
| `docs/technical/provider-dispatch-review.md` | 13996 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/README.md` | 4735 | REWRITE ROUTER | same path | remove soft-retire/cutover/legacy routes; direct approved headings |
| `docs/technical/rules-and-activities.md` | 31293 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/solo-gameplay-contract.md` | 20200 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/story-lifecycle.md` | 21960 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/story-settings.md` | 9905 | FOLD UNIQUE | domain owner by actual invariant | review meaningful unique technical claims before removing flat path |
| `docs/technical/storyteller-runtime.md` | 35969 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |
| `docs/technical/storyteller/context-and-memory.md` | 62586 | RECONCILE TARGET | docs/technical/storyteller/ | legacy source-era contract; promote genuine selected Storyteller architecture |
| `docs/technical/storyteller/generation-and-publication.md` | 283 | REBUILD GAP | docs/technical/storyteller/ | skeleton; agent loop/typed recipes/publication target not specified here |
| `docs/technical/storyteller/operation-and-controller.md` | 36072 | RECONCILE TARGET | docs/technical/storyteller/ | legacy source-era contract; promote genuine selected Storyteller architecture |
| `docs/technical/storyteller/prompts-and-tools.md` | 303 | REBUILD GAP | docs/technical/storyteller/ | skeleton; agent loop/typed recipes/publication target not specified here |
| `docs/technical/storyteller/provider-boundary.md` | 14083 | RECONCILE TARGET | docs/technical/storyteller/ | legacy source-era contract; promote genuine selected Storyteller architecture |
| `docs/technical/storyteller/request-context-and-cost.md` | 51775 | RECONCILE TARGET | docs/technical/storyteller/ | legacy source-era contract; promote genuine selected Storyteller architecture |
| `docs/technical/ticks-and-tags.md` | 9788 | FOLD UNIQUE | domain owner by actual invariant | review meaningful unique technical claims before removing flat path |
| `docs/technical/usage-policy.md` | 17790 | REMOVE ALIAS | docs/technical/<domain>/ | near-full cloned prior spec; compare exceptional text/anchors first |

## Mandatory section-review record

For each substantive source section, reviewer shall record: `source@blob#heading`, question/claim, accepted vs proposed status, target owner and heading, actual current implementation status if asserted, important normal and negative cases, relevant old design versions, link consumers, disposition, and independent verification. The table above is a **start**, not the outcome of that review.

For material under `evidence/inspections/doc01-legacy-snapshot`, `admin-program-essays`, `obs-technical-essays`, `research/legacy-*` and `work/designs/open`, use the [surface audit](AUDIT.md) and [migration](MIGRATION.md) to decide **only the unique atoms**, not how to preserve whole folders. Do not count an archival pointer as successful normative promotion.

## Directory justification / deletion

Existing canonical domain folders are *candidates* if they own one independently revisable question family:

- `docs/product/foundations`: shared vision/vocabulary. Remove duplicate game-rules/gameplay files; they belong in gameplay.
- `docs/product/gameplay`: game mechanics, agency, time, world and continuity. Keep.
- `docs/product/experience`: player navigation, moments and presentation. Keep if substantive; remove stub-leaf pages.
- `docs/product/storyteller`: DM quality and settings. Keep, ensure accepted target.
- `docs/product/admin`: long-term staff product. Keep but rebuild richness.
- `docs/product/journeys`, `docs/product/storytelling`: legacy phase taxonomy. **Delete** after claim/link extraction.
- `docs/technical/{platform,engine,storyteller,client,admin,observability,lab}`: genuinely different technical authority domains. Keep only with unique invariants.
- `docs/technical/playthroughs`: mixed authored example class, not technical owner. **Delete folder** after scenario classification.
- `docs/technical/` flat docs: full aliases or unincorporated unique topics; no durable flat duplicates. **Delete flat documents**, except README, after migration.
- `docs/decisions`: no accepted ADRs yet. Instantiate real accepted records or retire empty directory.
- `docs/runbooks`: repeatable human procedures; keep if commands maintained.
- `docs/` root: one compact router; delete progress/questions stubs.

**No hard file-count cap.** A strong doc has one owner, intended audience, authoritative obligations, negative cases and stable links. A 200-word page can be valuable if it actually answers a question; a 200-word pointer to a 15 KB historical target is not a completed permanent contract.
