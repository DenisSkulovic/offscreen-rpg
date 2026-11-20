# DOC02 | Independent knowledgebase audit after DOC01

**Inspection:** GitHub `DenisSkulovic/offscreen-rpg` `main@cda7444e7bb8910e228164cb97a17b504f7c2415`, 2026-11-16. This is an **independent quality-of-knowledge audit**, not a completion review or retroactive endorsement of DOC01. I inspected the complete Git tree and selected high-value document bodies, indexes, legacy targets, Change receipt, agent instructions and tooling. **I did not read every paragraph of every one of the 114 docs**; the remaining claim-by-claim review is required by DOC02.

## Executive finding

**DOC01 achieved a namespace migration but not a complete knowledge-architecture migration.** Some new owners are near-verbatim clones of legacy specs, some permanent targets are short pointers into large historical “evidence” folders, and vital long-term engine/Storyteller/Admin/OBS design remains outside the canonical source-of-truth tree. The new folder names alone cannot answer the questions a fresh ChatGPT investigator needs.

**Disposition:** Treat canonical docs as **incomplete and internally contradictory** until DOC02 repairs them. Do not send an implementation agent a canonical “skeleton” and assume it contains the latest contract. The completed Change archive is **permanently retained by owner direction**; it is not part of the cleanup target.

## 1. Frozen quantitative census

| Surface | Files | Git tree bytes | Interpretation |
| --- | ---: | ---: | --- |
| `docs/` | **114** | **1,573,825** | 19 tracked directories, mixed genuine specs, compatibility clones, and skeletons |
| `evidence/` | **399** | **9,404,987** | Source audits, actual runs **and 312-file legacy snapshot** |
| `work/` | **186** | **976,270** | Open designs, scripts, Change queue **and intentionally retained archive** |
| `research/` | **9** | **112,856** | Curated material mixed with legacy implementation guides and dated audits |
| `.agents/` | **57** | **469,264** | Harness and skill material, some stale migration-era guidance |
| Combined five surfaces | **765** | **12,537,202** | Not all waste; demonstrates that lower docs/ count is not lower searchable knowledge burden |

Additional exact inventory:
- `docs/product/`: **39 files / 279,094 bytes**, including old `foundations,journeys,storytelling` and new `gameplay,experience,storyteller,admin`.
- `docs/technical/`: **69 files / 1,244,664 bytes**, with **21 flat files / 468,607 bytes** alongside new domain directories.
- `docs/product/admin/`: **9 files / 10,353 bytes** including README, versus **26 files / 318,175 bytes** under `evidence/inspections/admin-program-essays-2026-11/`. The material is partly conditional, but even accepted product policy points outward for its detail.
- `docs/technical/observability/`: **5 files / 82,643 bytes**, versus **21 files / 329,264 bytes** of “obs technical essays” retained outside canon.
- `docs/technical/playthroughs/`: **15 files / 154,856 bytes** still described by its own README as “soft-retire.”
- `docs/` has **20 files ≤1,200 bytes**, including valuable small indexes but also clearly labelled empty/skeleton owners.
- `evidence/inspections/doc01-legacy-snapshot/`: **312 files / 5,119,717 bytes** including copies of old product/technical designs and previous audits.

### Direct textual duplication

I located **18 old → new one-to-one source pairs** totaling **463,085 bytes on the legacy side and 465,223 bytes on the “canonical” side**, together **928,308 bytes or 59.0% of the entire `docs/` tree**. Representative pair results, measured on 6-word sequence overlap:

| Canonical vs legacy source | Jaccard overlap of word 6-grams |
| --- | ---: |
| Product gameplay time vs old journeys time | 96% |
| Product gameplay continuity vs old storytelling continuity | 96% |
| Technical platform data vs flat data | 98% |
| Technical platform execution vs flat execution | 97% |
| Engine mechanics vs flat rules/activities | 99% |
| Storyteller request context vs flat context/cost | 99% |
| Lab experiment protocol vs flat chamber protocol | 98% |
| Technical platform topology vs flat architecture | 87% |
| Technical platform identities vs flat client/identity | 96% |
| Platform spending vs flat usage policy | 98% |
| Platform deployment vs flat delivery/validation | 98% |
| Engine chronology vs flat committed-time | 94% |
| Engine lifecycle vs flat story-lifecycle | 97% |
| Storyteller provider boundary vs flat provider review | 97% |
| Product storyteller profiles vs old storyteller settings | 95% |

Three additional pairs (solo-gameplay/authority, canonical-files/context-memory, storyteller-runtime/operation) were verified by matching substantial headings/near-equal text lengths but not included in the above computed Jaccard list. **This is a pairwise documentation redundancy diagnosis, not proof that every differing sentence is dispensable.**

At the Git object level, **70 sets of identical blobs** across the repository contain **4,312,010 additional path-listed bytes** beyond one copy per blob. The 1,586,834-byte `obs07-support-situation-synthetic.png` screenshot appears **three times** (legacy snapshot, an OBS07 evidence run and another OBS evidence collection). Git object storage can deduplicate identical blobs, but filenames, checkout, navigation and search continue to see distinct copies. Two UX screenshots and many deep Admin/OBS essays also appear twice.

## 2. Priority findings and supporting examples

### P0 F1. Accepted target architecture was moved *out of authority*, not synthesized into it

The new `docs/technical/storyteller/operation-and-controller.md` (36 KB) mirrors `docs/technical/storyteller-runtime.md` (36 KB), with the old “Storyteller runtime and model routing” headings. By contrast, the **18.8 KB** previous `programs/storyteller/target-operating-model.md` includes a two-loop model, responsibility decomposition, task catalogue, adaptive investigation, stopping rules, session/plan lifecycle and quality controller. That target exists under `evidence/inspections/doc01-legacy-snapshot/programs/storyteller/`. Six-word shared sequences with the new operation file were **zero in the tested pair**; that is not proof of total semantic absence, but it demonstrates it was not substantially merged verbatim.

Similarly, `docs/technical/engine/authority-and-transitions.md` is a near copy of the prior `solo-gameplay-contract.md`, while `programs/engine/target-engine.md` (11.3 KB) articulates the modular-monolith destination, six logical subsystems, causal spine, alternatives and evolution strategy from the independently chosen future design. The tested pair had **zero overlapping six-word sequences**. The canonical target cannot simply be the old source-era contract with a new label.

**Required correction:** choose the approved latest product/technical *destination* for each domain; reconcile detailed target contract with older current-state/prototype design and actual source. Future accepted design must be canonical, while “what currently runs” is separately evidenced. If a target was never approved, label it as a draft rather than invent ratification.

### P0 F2. Admin product canon is an index of summaries to historical essays

Examples:

- `docs/product/admin/gameplay-and-liveops.md` is **695 bytes**, while the old LiveOps design is **15,115 bytes** with release lifecycle, compatibility, blast radius, emergency controls, experiments and ten explicit sections.
- `docs/product/admin/player-360-and-support.md` is **1,285 bytes** while `player-360-service-blueprint.md` is **14,607 bytes** with payer/participant separation, shared-campaign perspective, privacy, workflows and negative scenarios.
- `docs/product/admin/authority-and-governance.md` is **1,914 bytes** while `authority-operating-policy.md` is **15,166 bytes** with grant scope, approval friction, view/assist/sandbox and adversarial cases.
- Some old essays are **Proposed**; they may not be promoted as accepted policy. But hiding the complete selected/proposed destination inside a dated `evidence/inspections` directory does not give ChatGPT a clean authoritative answer either.

**Required correction:** split each domain's content by explicit `accepted invariant / conditional proposal / historical investigation`. Promote accepted normative detail into product docs. Put unresolved future design in a discoverable **topic-owned design dossier**, not evidence. Link genuine evidence only when proving something actually happened.

### P0 F3. “Compatibility stubs” contain whole old specifications

`docs/product/journeys/time-and-autonomy.md` (~20 KB), `docs/product/storytelling/continuity-and-consequences.md` (~16 KB) and numerous flat `docs/technical/*.md` are original substantive documents with a brief “DOC01 compatibility stub” note. They are not redirects. The same lines can be edited in two places by an agent, which makes uniqueness depend on someone noticing a banner. Both `docs/product/README.md` and `docs/technical/README.md` openly call them temporary after DOC01 is Done.

**Required correction:** eliminate the old copies from HEAD after input/anchor/consumer migration. Unless an actual externally published link contract requires it, there are to be **no redirects**, not even tiny permanent stubs. Git history is the recovery mechanism. Backwards compatibility of Markdown *internal repo paths* is not a product feature.

### P0 F4. Rescued history has turned into a second searchable product bible

The old `programs/` design was copied wholesale under `evidence/inspections/doc01-legacy-snapshot/`; Admin and OBS essays were copied **again** into their own inspection folders. These are mostly design specifications, not observations about runtime source. The canonical `docs/README.md` explicitly routes questions through those historical trees; the fake “retired” material is still in an agent's navigation path.

**Required correction:** do not delete unique design unexamined; resolve sections into accepted canonical owners, named open designs, actual experiment evidence or a no-longer-needed Git-only historical source. Then delete *redundant copy paths from HEAD*. Preserve reproducibility-critical run inputs/outputs and Change archive, not blanket snapshots of every old essay.

### P0 F5. The implementation claims “Done” while the knowledge system still says “until cutover”

`STATUS.md` explicitly says DOC01 Done, yet `ROADMAP.md` is a redirect to `TODO.md`; `docs/progress.md` redirects to `STATUS.md`; `docs/questions.md` is a redirect to a 367-byte draft basket that itself links back to the stub. `docs/product/README.md` and `docs/technical/README.md` still describe temporary duplicate routes. `work/designs/open/doc01-migration/` contains migration-only scripts and check-point files although DOC01 is closed.

The DOC01 G2-DROP register explicitly states: “Bulk resolved=false inventory stubs are superseded by domain certify + this DROP register for P6 purposes. Not a claim that every historical heading was re-edited into canonical owners.” The G2 priority certification separately acknowledges deep OBS/Admin essays still outside the canonical owners. A no-loss **copy** was accepted in place of a no-loss **semantic promotion**.

**Required correction:** do not treat the previous checkboxes as evidence of finished knowledge governance. Close the semantic promotion gate for each domain, then remove temporary scaffolding and update status accurately.

### P1 F6. `docs/decisions` is a ceremonial empty namespace

The only tracked file is a format README (566 bytes), yet many significant selected decisions and alternatives live in old program `decisions/`, DOC01 archived work, and technical prose. An empty ADR directory does not improve navigation. Either populate with a strictly limited set of genuinely owner-accepted choices and supersession rules, or delete the directory until needed. Never make ADRs into another normative source competing with technical contracts.

### P1 F7. Unclassifiable “example” pages continue to live as technical law

`docs/technical/playthroughs/` contains 15 files (~155 KB), explicitly “soft-retired”. Batman, SpongeBob, Vvardenfell, nonhuman, wizard, harbor, etc. can be legitimate adversarial examples, but not automatically technical contracts. For each decide: (a) normative acceptance scenario with distinguishing property, (b) reproducible fixture/test, (c) useful research prototype, or (d) story transcript/historical illustration with no ongoing maintenance value. Extract unique scenarios, then eliminate this mixed-owner leaf.

### P1 F8. The primary navigation surface is biased toward legacy archaeology

`docs/README.md` is ~8.7 KB and includes direct routes to old snapshot `programs/`, legacy `history/`, obsolete engineering pages, and old progress/TODO. It still has both a broad “level of detail” table and a long “dimension” table and tells readers to consult historic material for design programs. For the user's primary task, **fresh ChatGPT knowledge retrieval**, old snapshots should not be advertised on first hop.

New canonical files such as `docs/product/experience/collaboration.md` (341 bytes), `docs/product/experience/replay.md` (435), `docs/technical/client/state-and-server-boundary.md` (238), `docs/technical/storyteller/generation-and-publication.md` (283) and `docs/technical/storyteller/prompts-and-tools.md` (303) explicitly say skeleton or proposed with almost no content. They create false-positive discovery success.

### P1 F9. Docs validation does not verify the actual knowledge/search surface

`scripts/check_docs.py` checks root/docs/agent and source-adjacent README Markdown links, **not** arbitrary `work`, `evidence`, `research` Markdown. A focused audit of **16 high-traffic documents/entrypoints** checked **293 relative-link occurrences** and found **seven missing path targets** in `evidence/inspections/admin-program-essays-2026-11/README.md`, including `technical/README.md`, `technical/source-baseline-2026-11-14.md` and `../../product/admin/README.md` relative to its current folder. These paths now resolve incorrectly. This is a targeted path check, not an exhaustive Markdown parser or a whole-repo result.

`scripts/repo-tools/docs-health.mjs` mainly counts Change checkpoints and checks folder-name allowlists; it does **not** detect 20 KB compat copies, obsolete status, empty ADRs, missing targets or competing normative claims. Some `.agents/rules/documentation.md` prose says `check_docs.py` does not scan nested source READMEs, while the inspected Python code now explicitly scans them. Even the process instructions have drifted.

### P1 F10. DOC01's cold-reader “proof” is not an independent reader benchmark

`P7-COLD-READER.md` supplies a route mapping with “≤2 hops” assertion and no independently measured discovery/answer quality. Its Q1 is “Product vision”, while `VERIFICATION.md` Q1 asked **when fictional time advances without an admitted action**. Other numbered questions differ, and no before/after user/task-error record is supplied. The stated acceptance method was not genuinely exercised. Do not use this memo to claim retrieval improvements.

### P2 F11. Secondary operational and research stores lack lifecycle discipline

`work/designs/open/doc01-migration/` includes >20 scripts/manifests for a completed one-off migration; `work/designs/open/legacy-initiatives-index/` retains earlier parked registers; `work/designs/open/product-open-questions.md` is a short pointer to another pointer. The `research/legacy-engineering/` folder retains a connected proof report and frontend execution playbook; `research/legacy-audits/` contains dated code gaps. Their original functions differ: dated evidence, operating runbook/skill, and actual research. A generic legacy bucket is not a domain owner.

**Important exception:** `work/changes/archive/` is **intentional, permanent and retained**. The owner explicitly prefers keeping terminal Change specifications and their history in the repository. Do not compress/delete that archive in DOC02. The ledger may remain an optional search index, but must not replace actual dossiers.

## 3. Why this happened

The original DOC01 procedure correctly specified the information-lifecycle boundary but allowed **route-level certification** and retention waivers to replace **semantic authority migration**. It was possible to pass structural checks by (1) creating destination filenames, (2) copying old source documents into them, (3) prepending “compatibility stub” to old copies, and (4) moving all difficult deep essays into snapshots so they were technically not deleted. The folder names became correct, but the hard question “Where is the selected contract and who maintains it?” remained often unanswered.

The new DOC02 must begin from the *end user query* and the desired product/technical state, not from file move operations. The goal is accurate, low-friction answers and changes with exactly one owner.

## 4. Epistemic limits and next work

Facts above involving file counts/sizes/SHAs are full-tree Git metadata. Content conclusions are from selective direct reads and pairwise comparisons, not a paragraph-level audit of every file. We have **not** run repository-local commands or a real independent cold-reader benchmark; the existing DOC01 receipt reports its own commands. DOC02 must inspect every current canonical owner for scope, status, provenance and future-design coverage, then document each survivor's justified owner.

**Next:** [TARGET.md](TARGET.md) defines the independent desired architecture; [CURRENT-DISPOSITION.md](CURRENT-DISPOSITION.md) inventories current canonical files without cosmetic presumption; [MIGRATION.md](MIGRATION.md) defines promotion and pruning; [VERIFICATION.md](VERIFICATION.md) falsifies success.
