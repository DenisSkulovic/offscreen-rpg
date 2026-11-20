# DOC03 | Current-head inventory and disposition register

**Frozen main:** `68736c02c500fc83337c9f6bdd00343cffa4246d`. Full recursive Git tree, untruncated. This **enumerates all 74 canonical docs files and all 16 tracked docs directories**. File labels are provisional recommended investigation/actions from sampled content, **not** a claim that each paragraph has been reviewed or that deletion is safe. The accompanying audit gives actual source examples. Terminal Change archive is protected, not disposable.

## File action totals

| Candidate action | Files | Tree bytes |
| --- | ---: | ---: |
| CLARIFY POLICY | 2 | 34782 |
| CORRECT + SPLIT | 1 | 15924 |
| CORRECT STATUS | 2 | 43121 |
| DECOMPOSE | 1 | 24935 |
| DECOMPOSE OVERLAP | 1 | 62276 |
| KEEP | 7 | 21573 |
| KEEP TARGET | 1 | 10387 |
| KEEP/BOUNDARY | 5 | 117439 |
| KEEP/GATE | 18 | 179351 |
| KEEP/RECONCILE | 15 | 98920 |
| KEEP/STATUS | 16 | 256808 |
| PROMOTE DETAIL | 1 | 16759 |
| PROMOTE SELECTED DETAIL | 1 | 5005 |
| SPLIT CURRENT/NORM | 1 | 20075 |
| VERIFY PROCEDURE | 2 | 40152 |

## All canonical docs file paths

| Path | Git bytes | Investigate / action | Exact issue or independent owner criterion |
| --- | ---: | --- | --- |
| `docs/decisions/D-0001--modular-engine.md` | 960 | KEEP | Selected decision rationale, never duplicate normative contract |
| `docs/decisions/D-0002--react-next-client.md` | 901 | KEEP | Selected decision rationale, never duplicate normative contract |
| `docs/decisions/README.md` | 598 | KEEP | Selected decision rationale, never duplicate normative contract |
| `docs/product/admin/ai-engineering-and-investigation.md` | 5003 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/admin/authority-and-governance.md` | 6202 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/admin/charter-and-personas.md` | 6249 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/admin/command-center-and-insights.md` | 4890 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/admin/commercial-and-trust.md` | 6922 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/admin/gameplay-and-liveops.md` | 5509 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/admin/operator-workflows.md` | 4569 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/admin/player-360-and-support.md` | 4625 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/admin/README.md` | 1566 | KEEP/GATE | Accepted Admin charter vs proposed grants and commercial/liveops powers |
| `docs/product/experience/entry-and-onboarding.md` | 7664 | KEEP/RECONCILE | Selected UX detail vs draft shared play, presentation and replay |
| `docs/product/experience/navigation-and-stories.md` | 2312 | KEEP/RECONCILE | Selected UX detail vs draft shared play, presentation and replay |
| `docs/product/experience/play-and-decisions.md` | 2133 | KEEP/RECONCILE | Selected UX detail vs draft shared play, presentation and replay |
| `docs/product/experience/presentation.md` | 1098 | KEEP/RECONCILE | Selected UX detail vs draft shared play, presentation and replay |
| `docs/product/experience/principles.md` | 2391 | KEEP/RECONCILE | Selected UX detail vs draft shared play, presentation and replay |
| `docs/product/experience/return-and-journal.md` | 1814 | KEEP/RECONCILE | Selected UX detail vs draft shared play, presentation and replay |
| `docs/product/experience/settings-and-accessibility.md` | 1607 | KEEP/RECONCILE | Selected UX detail vs draft shared play, presentation and replay |
| `docs/product/foundations/concepts.md` | 10733 | KEEP | Definitions and current vocabulary, not active feature statuses |
| `docs/product/foundations/vision.md` | 14671 | CLARIFY POLICY | Autonomous unanswered choices and small-group aspiration vs accepted time/GM07 gate |
| `docs/product/gameplay/acceptance-scenarios.md` | 19350 | KEEP/RECONCILE | Mechanics, acceptance, continuity: one product norm owner and negative case |
| `docs/product/gameplay/actions-and-commitments.md` | 5885 | KEEP/RECONCILE | Mechanics, acceptance, continuity: one product norm owner and negative case |
| `docs/product/gameplay/continuity.md` | 16141 | KEEP/RECONCILE | Mechanics, acceptance, continuity: one product norm owner and negative case |
| `docs/product/gameplay/rules.md` | 9287 | KEEP/RECONCILE | Mechanics, acceptance, continuity: one product norm owner and negative case |
| `docs/product/gameplay/time-and-autonomy.md` | 20111 | CLARIFY POLICY | Keep no-accepted-execution no-time; distinguish future defaults from chamber fixture |
| `docs/product/gameplay/worlds-and-characters.md` | 2962 | KEEP/RECONCILE | Mechanics, acceptance, continuity: one product norm owner and negative case |
| `docs/product/README.md` | 2188 | KEEP | Useful query router; check authoritative heading and no historical routes |
| `docs/product/storyteller/behavior-and-quality.md` | 8417 | KEEP/RECONCILE | DM intent vs bounded controller and memory source, remove DOC01 provenance |
| `docs/product/storyteller/memory-and-continuity.md` | 4930 | KEEP/RECONCILE | DM intent vs bounded controller and memory source, remove DOC01 provenance |
| `docs/product/storyteller/profiles-and-settings.md` | 12929 | KEEP/RECONCILE | DM intent vs bounded controller and memory source, remove DOC01 provenance |
| `docs/README.md` | 2771 | KEEP | Useful query router; check authoritative heading and no historical routes |
| `docs/runbooks/local-development.md` | 39874 | VERIFY PROCEDURE | Live command/safety accuracy, split only by independent maintenance |
| `docs/runbooks/README.md` | 278 | VERIFY PROCEDURE | Live command/safety accuracy, split only by independent maintenance |
| `docs/technical/admin/commands-and-audit.md` | 10421 | KEEP/GATE | Staff security/read commands vs proposed production rights |
| `docs/technical/admin/console-and-read-models.md` | 9864 | KEEP/GATE | Staff security/read commands vs proposed production rights |
| `docs/technical/admin/investigation-and-privacy.md` | 11630 | KEEP/GATE | Staff security/read commands vs proposed production rights |
| `docs/technical/admin/topology-and-authorization.md` | 10784 | KEEP/GATE | Staff security/read commands vs proposed production rights |
| `docs/technical/client/accessibility-and-performance.md` | 2348 | KEEP/STATUS | Client selected contract; W16/W17/current Query source evidence |
| `docs/technical/client/architecture.md` | 35208 | KEEP/STATUS | Client selected contract; W16/W17/current Query source evidence |
| `docs/technical/client/interaction-contracts.md` | 2735 | KEEP/STATUS | Client selected contract; W16/W17/current Query source evidence |
| `docs/technical/client/presentation-runtime.md` | 16759 | PROMOTE DETAIL | Selected presentation-language contract currently in DOC01 unpromoted |
| `docs/technical/client/state-and-server-boundary.md` | 4504 | KEEP/STATUS | Client selected contract; W16/W17/current Query source evidence |
| `docs/technical/engine/authority-and-transitions.md` | 20075 | SPLIT CURRENT/NORM | Old solo-POC implementation text vs enduring engine invariants |
| `docs/technical/engine/calendars-and-world-time.md` | 18772 | KEEP/STATUS | Engine domain invariant, local negative and actual C1/C2 vs full ENG03 |
| `docs/technical/engine/chronology-and-activities.md` | 17751 | KEEP/STATUS | Engine domain invariant, local negative and actual C1/C2 vs full ENG03 |
| `docs/technical/engine/concurrency-and-recovery.md` | 4152 | KEEP/STATUS | Engine domain invariant, local negative and actual C1/C2 vs full ENG03 |
| `docs/technical/engine/lifecycle-and-compatibility.md` | 21889 | KEEP/STATUS | Engine domain invariant, local negative and actual C1/C2 vs full ENG03 |
| `docs/technical/engine/mechanics-and-capabilities.md` | 31081 | KEEP/STATUS | Engine domain invariant, local negative and actual C1/C2 vs full ENG03 |
| `docs/technical/engine/selected-architecture.md` | 10387 | KEEP TARGET | Selected modular end state, reconcile kernel/CAS selected detailed decisions |
| `docs/technical/engine/ticks-and-tags.md` | 9542 | KEEP/STATUS | Engine domain invariant, local negative and actual C1/C2 vs full ENG03 |
| `docs/technical/lab/chamber-and-fixtures.md` | 23821 | CORRECT STATUS | CH implementation exists; blanket future/no-code status false |
| `docs/technical/lab/experiment-protocol.md` | 19300 | CORRECT STATUS | CH implementation exists; blanket future/no-code status false |
| `docs/technical/observability/capture-and-provenance.md` | 13587 | KEEP/GATE | Causal evidence/retention design selected vs proposed vs synthetic proof |
| `docs/technical/observability/identities-and-evidence.md` | 23432 | KEEP/GATE | Causal evidence/retention design selected vs proposed vs synthetic proof |
| `docs/technical/observability/investigation-and-reconstruction.md` | 17485 | KEEP/GATE | Causal evidence/retention design selected vs proposed vs synthetic proof |
| `docs/technical/observability/retention-and-access.md` | 20090 | KEEP/GATE | Causal evidence/retention design selected vs proposed vs synthetic proof |
| `docs/technical/observability/telemetry-and-diagnostics.md` | 16523 | KEEP/GATE | Causal evidence/retention design selected vs proposed vs synthetic proof |
| `docs/technical/platform/data-and-persistence.md` | 34654 | KEEP/STATUS | Shared platform invariant; remove stale present-state banners |
| `docs/technical/platform/deployment-and-compatibility.md` | 24935 | DECOMPOSE | Deployment, POC history, Chamber, tests and implementation order coexist |
| `docs/technical/platform/execution-and-delivery.md` | 29589 | KEEP/STATUS | Shared platform invariant; remove stale present-state banners |
| `docs/technical/platform/identities-and-access.md` | 15924 | CORRECT + SPLIT | SSE marked unimplemented despite W16/W17/source; client and shared-play mixed |
| `docs/technical/platform/notifications.md` | 7163 | KEEP/STATUS | Shared platform invariant; remove stale present-state banners |
| `docs/technical/platform/persistence-and-caching.md` | 4057 | KEEP/STATUS | Shared platform invariant; remove stale present-state banners |
| `docs/technical/platform/spending-and-entitlements.md` | 17638 | KEEP/STATUS | Shared platform invariant; remove stale present-state banners |
| `docs/technical/platform/topology.md` | 15725 | KEEP/STATUS | Shared platform invariant; remove stale present-state banners |
| `docs/technical/README.md` | 3422 | KEEP | Useful query router; check authoritative heading and no historical routes |
| `docs/technical/storyteller/context-and-memory.md` | 62276 | DECOMPOSE OVERLAP | 62 KB, canonical source+working-cycle+retrieval; nearby controller/cost owners |
| `docs/technical/storyteller/generation-and-publication.md` | 2652 | KEEP/BOUNDARY | Controller, packet, provider, context, publication each one invariant |
| `docs/technical/storyteller/operation-and-controller.md` | 39383 | KEEP/BOUNDARY | Controller, packet, provider, context, publication each one invariant |
| `docs/technical/storyteller/prompts-and-tools.md` | 5005 | PROMOTE SELECTED DETAIL | A 13.8 KB selected prompt-tools design still sits in DOC01 unpromoted |
| `docs/technical/storyteller/provider-boundary.md` | 13851 | KEEP/BOUNDARY | Controller, packet, provider, context, publication each one invariant |
| `docs/technical/storyteller/request-context-and-cost.md` | 51586 | KEEP/BOUNDARY | Controller, packet, provider, context, publication each one invariant |
| `docs/technical/storyteller/versioned-settings.md` | 9967 | KEEP/BOUNDARY | Controller, packet, provider, context, publication each one invariant |

## Every current docs directory

Proof criteria and reasons to keep each distinct authority/domain are in [TARGET.md](./TARGET.md#3-every-existing-docs-directory-must-earn-its-place). This directory census is complete:

- `docs/decisions/`: 3 descendant files, 2459 bytes.
- `docs/product/`: 28 descendant files, 192158 bytes.
- `docs/product/admin/`: 9 descendant files, 45535 bytes.
- `docs/product/experience/`: 7 descendant files, 19019 bytes.
- `docs/product/foundations/`: 2 descendant files, 25404 bytes.
- `docs/product/gameplay/`: 6 descendant files, 73736 bytes.
- `docs/product/storyteller/`: 3 descendant files, 26276 bytes.
- `docs/runbooks/`: 2 descendant files, 40152 bytes.
- `docs/technical/`: 40 descendant files, 709967 bytes.
- `docs/technical/admin/`: 4 descendant files, 42699 bytes.
- `docs/technical/client/`: 5 descendant files, 61554 bytes.
- `docs/technical/engine/`: 8 descendant files, 133649 bytes.
- `docs/technical/lab/`: 2 descendant files, 43121 bytes.
- `docs/technical/observability/`: 5 descendant files, 91117 bytes.
- `docs/technical/platform/`: 8 descendant files, 149685 bytes.
- `docs/technical/storyteller/`: 7 descendant files, 184720 bytes.

## Important surrounding searchable surfaces

| Class | Path | Files | Git bytes | Retention principle |
| --- | --- | ---: | ---: | --- |
| Open DOC01 unpromoted design | `work/designs/open/doc01-unpromoted-design/` | 95 | 996369 | Section-level life-cycle/provenance review required |
| Finished DOC01 migration scripts | `work/designs/open/doc01-migration/` | 25 | 82760 | Section-level life-cycle/provenance review required |
| Legacy initiative audit | `work/designs/open/legacy-initiatives-index/` | 3 | 20568 | Section-level life-cycle/provenance review required |
| Retained inspection attic | `evidence/inspections/doc01-retained-observations/` | 140 | 3035698 | Section-level life-cycle/provenance review required |
| Real run evidence | `evidence/runs/` | 35 | 3410025 | Section-level life-cycle/provenance review required |
| Legacy engineering research | `research/legacy-engineering/` | 5 | 122150 | Section-level life-cycle/provenance review required |
| Authored nonnormative scenarios | `research/authored-scenarios/` | 15 | 154987 | Section-level life-cycle/provenance review required |
| Agent harness and manuals | `.agents/` | 57 | 469355 | Section-level life-cycle/provenance review required |
| Terminal Change archive, KEEP | `work/changes/archive/` | 149 | 977552 | **Permanently retain unchanged** |

## Binding content-atom verification gate

For each substantive section before promoting/retiring, record:
- Exact source path@blobSHA#heading, statement and normal/negative case.
- Whether selected, accepted, proposed, superseded, observed source, provider-free proven, live observed, or historical.
- Unique current owner heading, deferred subject gate, dated evidence manifest, or Git-only recovery commit.
- Conflicting current claim and inspected source SHA / tests if implementation is asserted.
- Every active inbound consumer; resolve links and code-path references before removal.
- Reviewer sign-off that a selected technical target was **not** discarded by calling it unpromoted legacy.

The distinction is critical: **Git history alone is not adequate preservation of active selected normative design**. Conversely, a thick proposal cannot be promoted to accepted policy merely to empty the open folder. No full packet in `work/changes/archive/` may be pruned or rewritten as part of DOC03.
