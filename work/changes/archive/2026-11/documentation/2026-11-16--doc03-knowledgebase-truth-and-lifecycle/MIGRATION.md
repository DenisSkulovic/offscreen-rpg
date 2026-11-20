# DOC03 | Bounded repair and independent verification procedure

**Design only.** This does not change any current product/technical contract, game code, provider budget, production system, or active Change selection. After explicit owner selection, Cursor may implement documentation and minimal knowledge-check tooling changes on an isolated branch. The complete `work/changes/archive/` **must remain intact**.

## P0. Pin actual inputs and run honest baseline checks

1. Inspect `git status --short`, `git rev-parse HEAD`, branch, and all changes since audit baseline `68736c02`. Preserve concurrent work. Enumerate docs, designs, evidence, research, .agents and source-adjacent README consumers, not just docs.
2. Run without paid inference: `python scripts/check_docs.py`, `pnpm repo:brief`, `pnpm repo:docs-health`, `node scripts/repo-tools/knowledge-health.mjs` and `git diff --check`. Record exit code/stdout/SHA; no claim these prove semantic accuracy.
3. Freeze a **before** ChatGPT/independent reader benchmark, including a misleading legacy excerpt. Record actual answers, wrong detours and documents opened; one canned expected-route sheet is not a test.
4. Count canonical docs 74, open DOC01 unpromoted 95, retained observations 140, migration scripts 25, exact duplicate blob groups 15. Compare to current SHA rather than assuming these counts remain current.
5. Verify `work/changes/archive/` files and blob SHA inventory: **149 files at baseline, no deletions**.

**Exit:** pinned branch and baseline tests, before retrieval result, unmodified user work, archive guard.

## P1. Reconcile epistemic claims, not filenames

Use [REGISTER.md](./REGISTER.md) to check **every** canonical docs file and the surrounding legacy folders. For each consequential source section, capture:

    source SHA/path/heading
    owner question, actual claim, required negative case
    accepted | selected future | proposed | superseded | observed | expired
    current-code evidence if any (inspected source SHA, tests, connected/live limitations)
    unique target heading, actual topic-owned draft, evidence manifest, or Git-only history
    competing statement and resolution reason
    active inbound links / scripts / source maps
    reviewer and verified disposition

Prioritize the 95-file `work/designs/open/doc01-unpromoted-design`, including: selected presentation-language and prompt-tools design, selected conceptual world-capability kernel and ENG05 CAS choice, ENG03 conditional capture contracts, completed GM01/02 plan, unsettled temporal philosophy/standing-life/GM07 and shared-play. **Do not classify all of these as one Open design.**

Independently scrutinize the 140-file `evidence/inspections/doc01-retained-observations`: preserve actual dated source audits, meaningful negative results and unique records; old handoffs, transcripts, engineering reference manuals and duplicate artifacts have different owners/retention. Do not make a new `doc03-retained-legacy` folder.

**Exit:** no selected/current claim depends exclusively on a mixed DOC01 program copy; each actual unresolved proposal is discoverable by product question and owner gate, not legacy wave; removal candidates have unique-content signoff.

## P2. Repair product scope from owner-approved end state

1. **Vision / time / autonomy:** revise `product/foundations/vision` to label autonomous unanswered decisions as future conditional behavior, while preserving the intended living-world dream. Keep accepted no-time-without-admitted-commitment rule under `gameplay/time-and-autonomy`. Distinguish (a) indefinite hold, (b) a specifically admitted Chamber timed-default fixture, and (c) proposed general GM07 consented delegation. Recap language cannot imply an unaccepted global autopilot.
2. **Gameplay/world:** reconcile accepted D&D rule applicability, world-neutral capability kernel, changes to current form, accepted time, interruption and resource ownership; preserve exactly one owner for each rule.
3. **Experience/presentation:** compare selected full presentation-language and semantic motion/visual contracts to the current `technical/client/presentation-runtime` and product experience. Promote approved technical vocabulary and counterexamples, keep exploration/render comps only where actual ongoing use is justified. Separate unapproved group policy/replay proposals under actual `work/designs/open/shared-play` and `player-replay` with meaningful decision options instead of no-content pointer READMEs.
4. **Storyteller product:** ensure creative neutrality, canon invention, long-term memory quality, player agency, failure and privacy remain accepted and concrete; don't silently accept new autonomy policy.
5. **Admin:** retain the actual substantive charter and selected design, but keep unapproved live rights/kill-switch/refund/raw prompt/retention policies explicitly pending.

**Exit:** fresh reader knows the real selected product goal, exact accepted negative boundary and which alternatives still require owner choice, without reading DOC01 migration material.

## P3. Repair technical authority and capability coverage

1. Establish `STATUS.md` major-capability matrix, linked to exact normative heading, source owner and **inspected** SHA/test/Change/run tier. Do not duplicate W16/W17 and CH lists across dozens of specs. Preserve nuance: source present != test passed != live deployed.
2. Correct **SSE status** in `technical/platform/identities-and-access` and relevant source maps; inspect `apps/web/src/features/play/use-story-live-updates.ts`, `src/shared/api/story-update-stream.ts`, archived W16/W17 and tests before claiming a particular connected proof. Move full client Query/SSE implementation design into `technical/client`; leave only platform auth security invariant in platform.
3. Correct **Chamber status** in both `technical/lab` documents and `packages/application/src/developer-tools/README.md` after inspecting CH01–CH16 receipts, LabRun source, controller and tests. Separate fake adapter, disposable DB, connected worker, local workbench and paid-provider lanes. A partial CH lane cannot certify everything, but “no Lab code” is false.
4. Update source-adjacent and root README status claims in `apps/web/README.md` and .agents. Remove “future code” language for implemented Query/SSE without claiming all F1–F15 human acceptance.
5. Reconcile `technical/engine/selected-architecture` and detailed selected ENG05, world kernel, ENG03/C1/C2 target decisions. Move current solo-POC receipts and changing status to coverage/evidence; keep portable engine invariants and exact negative races in canonical owners.
6. Reconcile selected `Storyteller` prompt/tool design, bounded controller and publication with the current narrow memory loop. Assign exactly one contract to controller, prompt compilation, canonical memory, per-request cost, and publication fence. Do not proclaim general adaptive loop live because a provider-free controller supports optional bounded context.
7. Factor `technical/platform/deployment-and-compatibility`: deployment/release/compatibility contract remains; local troubleshooting belongs in runbook; historical first-playable checklist and future implementation order belong to Change/evidence/history only if retained; Chamber belongs to lab.
8. Inspect exact source of misleading status banners in `.agents/rules/documentation.md` and `.agents/references/documentation-navigation-standard.md`: W22 is Done and nested README + heading check exists. Reconcile actual checker behavior. Remove stale DOC01 cutover messages in `AGENTS.md`, `.agents/README.md`, `work/changes/README.md`, and `.agents/HARNESS.md`.

**Exit:** no wrong current-state claim remains among all inspected high-priority pages and entrypoints; target design is independent of implementation coverage; source maps are dated and consistent with their own named symbols.

## P4. Retire truly transient folders, while retaining correct history

- **Do not delete or compress `work/changes/archive/`.** It is an explicit owner preference and permanent work-history repository.
- Resolve all 25 files in `work/designs/open/doc01-migration/`: prove no active script imports them, migrate genuinely reusable helper (with tests) to `scripts/repo-tools` if valuable, otherwise Git-only retirement. DOC01/DOC02 execution is Done and these are not active designs.
- Dismantle `work/designs/open/doc01-unpromoted-design` by content classification. **No generic replacement attic.** Selected norms into their owners; unresolved decisions under actual topic; superseded programs/handoffs to Git-only after no-loss reconciliation.
- Reconcile `work/designs/open/legacy-initiatives-index` dated audit and parked summaries into actual decision gates; preserve the owner-retained canon-invention proposal and any important negative requirement. Consider `work/designs/parked/` for genuinely dormant retained design.
- `work/designs/open/product-open-questions.md` is a self-referential stale redirect. Replace with real topic-owned pending decisions or remove after extracted; do not replace with another alias.
- Triage all 140 retained-observations files. Separate exact dated inspections/unique run evidence from generic engineering research and old executor handoff. Use Git SHA recovery for redundant history, not another permanent snapshot in HEAD.
- Deduplicate 15 exact-Git-blob groups where redundant, **excluding** intentional archive preservation. Keep one canonical copy of OBS07 synthetic image with a manifest/hash and consumer links. Retain original S1–S3 trial artifacts *one time* when reproducibility requires; update paths carefully.
- `research/authored-scenarios/` 15 examples: preserve unique benchmark cases under a clear nonnormative example/class or executable QA fixtures; reject broad narrative transcripts that have no maintained acceptance or learning role. `research/legacy-engineering/`: classify proof as evidence, run instructions as a maintained skill/runbook, actual expert research as research, and redundant source snapshots as Git-only.
- Clean outdated references in `.agents` and core source-adjacent READMEs, not just `docs/`.

**Exit:** no DOC01 migration or unpromoted attic under open; evidence folder contains actual dated observations, not old agent handoffs; canon remains substantive and complete; terminal Change archive unchanged.

## P5. Repair checks that previously passed false confidence

1. Make the Markdown checker cover **maintained** `docs, work/designs, evidence inspections/runs manifests, research and .agents`. Exclude terminal historical Changes from *present-day link-success enforcement* while still keeping archive accessible. Add self-link/redirect detection at active entrypoints; stale own-heading links are semantically invalid even when syntactically valid.
2. Expand `knowledge-health` beyond small banned phrase/path lists: catch open `doc01-migration` and `doc01-unpromoted-design`, generic `handoff` under active evidence, exact identical **current evidence** artifacts, stale DOC01 cutover language in agent/root and source maps, but don't ban honest quotes in historical docs.
3. Validate capability/STATUS update trigger when a Change touches relevant source or test/API contract. Avoid overengineering full static semantic proof; require one accountable reviewer to reconcile the applicable capability row and normative heading.
4. Introduce positive+negative fixtures: valid long coherent spec must pass, deliberate archived Change must pass, current duplicate/expired alias must fail, required evidence retained must pass.
5. Re-run link checker, capability checks, Change queue and source-path references; visually inspect repaired high-risk maps.

**Exit:** relevant false-status examples and stale alias sites would be detected in a future regression; no new mandatory 50-file header ceremony.

## P6. Real retrieval acceptance, not a route table

Run the same frozen independent test suite against before/after trees, including adversarial bait (a stale SSE selection sentence; stale Chamber “no code” line; selected prompt tools in DOC01 open design; old OBS07 synthetic record; proposed GM07 default). The new reader must deliver **correct product rule, implementation evidence class, negative case and owner path**. Record exact files opened, wrong detours, time/token metrics only when actually measured, and final correctness. DOC02's reported one-time fresh chat, without baseline or bait, is not a substitute.

If real fresh-chat testing is unavailable, record the limitation and **do not claim retrieval passed**. A deterministic smoke test plus an independent human review is a partial gate, not equivalent.

## P7. Close only after the knowledge system is ready

Complete a section-level promotion ledger, before/after path and exact blob inventories, evidence manifests, key status contradictions resolved against source, independent query results and the Change Reconciliation ledger. Record actual checks and skipped environments. Update STATUS and root docs routers. Archive full DOC03 packet under `work/changes/archive/`. No high-risk owner-selected design may remain only in the “unpromoted” attic. If owner approval is missing for a consequential policy, keep the right draft open and declare that domain gate; **do not waive semantic promotion just to mark DOC03 Done**.

### Boundaries

No gameplay/backend/frontend runtime change, provider call, deploy, live DB migration, secrets, paid evaluation, product-policy ratification or removal of unique evidence is authorized by DOC03. Only docs and minimal knowledge verification/navigation tooling once owner explicitly selects DOC03. Ensure local concurrent Cursor work is not overwritten.
