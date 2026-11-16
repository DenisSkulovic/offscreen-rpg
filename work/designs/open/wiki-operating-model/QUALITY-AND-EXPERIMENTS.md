# Wiki quality observatory | Does the reader leave with true, useful knowledge?

**State:** proposed quality protocol. Graph path integrity and lexical search are necessary, **not sufficient**. WIKI08 will implement deterministic content-risk discovery and a small reviewed claim suite, not a magical truth detector. Real model trials remain **off** until owner explicitly approves model, budget and proven sandbox.

## 1. Four independent axes: never one decorative health score

| Axis | Example measurement | What it cannot prove |
| --- | --- | --- |
| **Structure** | Broken link/anchor; 74/74 canonical pages reachable; BFS/hops/orphans | Truth of text or relevance of a reachable page |
| **Findability** | Correct heading Recall@k, complete-answer@k, Hopper and wrong-authority exposure, exact failed routes | Whether the quoted sentence is actually correct |
| **Content quality** | Selected-claim sample accuracy, contradiction count, information density, accepted/proposed clarity, actionable negative case and source status fidelity | User satisfaction or actual production behavior without source proof |
| **Agent outcomes** | Correct task conclusion/permission, first-right-owner time, tool/file reads, source verification, tokens if exposed, wrong detours | General claims from one model/run; invisible tool reads or fake harness |

A wiki can earn 100% graph coverage while still telling a reader not to invoke an existing test script. A fast hallucinated answer is worse than a deliberate accurate one. Report all axes separately.

## 2. Zero-model content-risk scan

Implement `pnpm wiki:content-health` under WIKI08 to **emit review candidates**, not auto-mutate wiki or assign semantic truth.

Deterministic risk categories:
- **Temporal language outside appropriate owner:** “planned, not implemented,” “as of 2026-11-12,” “no code authorized,” “first wave only,” “current package,” “will land in W21”; show page line and current status/code/Change target candidate. These words are *not* errors in every context.
- **Proposal-only canonical ambiguity:** canonical technical/product pages whose first paragraph explicitly disclaims selection or code approval; flag for decision-owner review. Don't mistake “selected target, code not done” for a proposal.
- **Source-reference rot:** backticked repo paths/symbols in maintained docs that appear to be absent, e.g. removed canonical-file names; validate path existence first, optionally source export presence with a scope-aware index. Ignore illustrative examples and retained version history; do not call static text search proof a symbol is live.
- **History contamination:** DOC01/P3 migration details, retired W-series implementation diary or legacy as chosen present guide in first 20 lines. Separate research citation from execution routing.
- **Retrieval friction:** H2/H3 blocks exceeding calibrated size, paragraphs exceeding ~1.5–3 KB, poor large-page question routes, missing nearest owner/scope/negative case. Warning, not automatic deletion/splitting.
- **Repeated prose:** exact and near-duplicate **current normative claims** across wiki owners, using candidate shingle/semantic-overlap heuristics. Do not treat a short summary or two independent rejection examples as harmful duplication.
- **Unmaintained breadcrumbs:** high-use root/agent maps that route current implementation through `research/legacy-*` or `evidence/inspections/doc01-...` instead of actual current source README. Proof citations are allowed.
- **Change drift candidates:** use Git diff of touched code/exports/schemas and named source maps to suggest affected wiki owners/`STATUS` rows. No automatic “changed file ⇒ docs wrong” assertions.

**Output contract:** risk type, severity candidate (critical/high/medium/advisory), file line and heading, exact quote span, reason, **counterexample/false-positive rule**, nearest authority owner and recommended next check. Distinguish `detected`, `human-confirmed`, `false-positive`, `remediated` and `blocked`. Include actual SHA and whether worktree is dirty. The same text should not generate hundreds of duplicated false alarms.

**No repository-wide regex rewrite.** The tool can identify “W20 planned” as an actionable candidate; code/package inspection establishes whether it is actually false.

## 3. Content sampling and trusted answer checks

Start with a fixed **30-claim** cohort, not one subjective 1–10 grade per 74 pages:

- 8 **high-risk authority** claims: player autonomy/absence, earned consequence, privacy/Support grants, provider cost, Storyteller vs engine truth, event settlement/idempotency, rollback, data visibility.
- 8 **implementation reality** claims: SSE, Chamber lanes, W-series scripts, S3/document CAS, adaptive Storyteller loop, ENG03 partial, presentation pipeline and OTel source.
- 8 **selected future target** claims: world-neutral kernel, prompt/tool bounds, provenance, player controls, replay, admin topology, client state, storage migration. Grade whether it is **selected versus unapproved**, not implemented.
- 6 **navigation/rejection** claims: old migration pointers, proposal-vs-canon distinction, first-screen source authority, ambiguous heading, legacy reference vs valid current source, absence of proof.

Each claim record, reviewed at actual SHA, has:
- User-language question and intended owner `page#heading`, exact selected assertion and critical rejected alternative;
- Source/tests or decision/provenance evidence as needed, including exact SHA and tier;
- At least one meaningful negative/counterexample, so pleasant prose alone cannot pass;
- Reviewer's verdict: `correct`, `incorrect`, `insufficiently evidenced`, `ambiguous/misowned` or `not applicable`; unresolved items are visible, not silently counted correct;
- Current check command and side-effect safety when verification is executable.

**Independent review:** the implementer should draft 30 candidates but must not certify that its own gold truth is independently verified. Two reviewers where available can disagree; disagreements form an owner-decision gate. Sampling is intentionally focused on risk, not statistically representative of every paragraph. Report denominators honestly.

Quantitative reports: **critical factual errors count (must be 0 before claiming trusted on audited subset)**; accepted-vs-proposal misclassification count; wrong or missing source proof count; verified-claim fraction of reviewed (not total wiki) claims; sample negative-case completeness; median and p95 section bytes read to satisfy each query; content-density review scores. Do not extrapolate `28/30` directly to `93% of wiki truth`.

## 4. An end-to-end authoring test for every Change

Quality is maintained if a newly implemented Change leaves the correct reader view. Add an *affected-claim reconciliation* check to the Change close workflow:

1. Identify selected owner headings from packet, plus code files the diff actually touched. Verify both sets are sensible, not a template of every folder.
2. Record **target stayed same/changed** and **source tier stayed same/changed** independently. A code-only fulfillment of a selected target normally changes status/source maps, not product law.
3. Find stale present-tense claims in touched owner headings (not whole repo) and fix/block them.
4. Run relevant negative checks, current-source proof and structural links. No required paid/remote test.
5. Mark each authority heading `reconciled`, `unchanged with reason` or `blocked by explicit product gate`. A blank checkbox does not pass.

**A Change cannot mark Done** when a credible source-contradicting claim remains in its affected topic or implementation exceeded approved product scope. Yet it should not be forced to reread 74 documents for a 4-file code change.

## 5. Independent agent experiments, once the wiki is ready

A cheap model with a nominal 200K context and a more capable larger-context model are useful **separate readers**, but model differences confound comparisons. Test each model in a **same-model paired design** first.

Suggested **two-stage trial**:

**Pilot A (instrument + instructions):** 10–12 withheld tasks, one fresh isolated session per task; one arm uses existing `AGENTS`+manual index; another uses new `wiki:find`/`wiki:read` with same wiki/code SHA, model and tools. Answers and code-status evidence are blinded to rubric author where possible. Report correct outcome, permission/tier mistakes, time to first correct owner, actual read/tool events, input/cache tokens (if client exposes them), wall time and negative-case fidelity. A subagent reusing the previous chat's context is **not** independent.

**Pilot B (content repair effect):** Same tool/retrieval and model across **before vs after** content remediation, using a fixed code snapshot where feasible, frozen claim rubric and independent held-out questions. This isolates whether better page content, not better tooling, improved correct answers.

A lightweight model is a useful stress-test for ambiguity and context overload, **not** a guarantee that the strong model will fail or succeed the same way. A 1M context setting is a ceiling, not a performance measurement; look for the first correctly cited source and the *actual* wrong turns.

**Safety boundary:** A real model run requires separately approved model/provider/tool, actual maximum attempts, wall timeout and usage/spend policy, and real sandbox inaccessible to gold/secret files; default WIKI03 fake harness cannot do this. If CLI usage does not expose true billable costs, an invocation cap is enforceable but a dollar cap may not be. Never claim actual agent latency/tokens or model confidence without real traces.

## 6. Mutation testing, not dashboard theater

Before treating `wiki:content-health` as useful, deliberately introduce safe fixture mutations and ensure they are detected:

| Mutation | Expected detection |
| --- | --- |
| Runbook says command absent while a scoped package script exists | Source-status drift **candidate**, confirmed after checking package script and side effects |
| Page contains `proposal only` but root index sells it as ratified | Authority ambiguity candidate |
| Add a 25-KB single H2 block with no subheading/quick route | Retrieval-friction warning |
| Replace a direct current source README link with old archived copy as “binding map” | Legacy routing violation |
| Duplicate accepted rule with contradictory permissions in two owners | Multiple-owner candidate and human review, not silent auto-merge |
| Add a plausible old “Done” Change citation | Allowed as history, forbidden as current implementation permission |
| Insert an illustrative snippet ``not implemented`` in a code fence | Not a false source-status failure |

**Don't make it easy to game:** small pages are not automatically good, negative cases have real context, and near-duplicate detection is advisory. Use synthetic fixture data outside canonical source to prove flags, then review actual wiki defects manually.

## 7. Success and next cadence

- **On every relevant docs/agent-rule change:** zero-model `wiki:health` integrity, `wiki:content-health` risk delta for changed pages, path/anchor negative test.
- **On a code-bearing Change close:** cheap affected-claim reconciliation and targeted evidence; no forced model or global benchmark.
- **On significant wiki rewrite/ratification:** WIKI02 held-out static questions, no gold leakage or altered scoring without version bump.
- **After major improvements and explicit model permission:** isolated fresh-agent pilot and blinded correctness grading. Avoid scheduled nightly paid agents.

The failure we want to prevent is not “a page has five links instead of ten.” It is “a cheap agent opened 40 KB of unneeded context, believed a stale source-status sentence, implemented the wrong policy, then closed a green Change.” Everything else serves that outcome.
