# HAR07 | Evidence-verified source navigation

**State: Done (2026-11-17).** **Executor: Cursor.** The clean diagnostic is `e025943facd5ecb4d910299365750a1124ffbdaa`. No case was independently reviewed. **Authority:** [completed C1–C4 source-route audit](../../../../../designs/open/repository-agent-workbench/SOURCE-ROUTE-AUDIT-2026-11-17.md), [HAR06 decision](../../../../../designs/open/repository-agent-workbench/HAR06-DECISION.md), and [existing wiki navigation standard](../../../../../../.agents/references/documentation-navigation-standard.md).

## First screen for Cursor

**Outcome:** A fair, replayable answer to: *Does following real wiki → source-map → code links find evidence that plain lexical lookup misses?* Fix source scoring first, then implement a **bounded real navigation arm** (not wiki results plus the same grep results).

**Before implementation:** inspect the **latest actual** `git rev-parse HEAD`, `git status --short`, root `AGENTS.md`, this selected packet, `scripts/repo-tools/retrieval-funnel-run.mjs`, `wiki-core/retrieval-funnel.mjs`, `retrieval-funnel-oracle.mjs`, `retrieval-funnel-self-test.mjs`, `wiki-core/route.mjs`, `wiki-core/markdown.mjs`, `wiki-core/paths.mjs`, `wiki-core/search.mjs`, `wiki-find.mjs`, `wiki-read.mjs`, and the relevant package README source maps. **Design baseline:** `main@614ecb20786e3d555d28ef9b07dd59b77460e5cc`. Reconcile if Cursor has pushed newer work.

**Trap:** HAR06 B only prepended wiki hits to a copy of A's grep output. That is not link navigation and makes RRF count A twice. HAR06 `matches()` also requires a function name on the same `rg` snippet, so a correct line in `validateImmediateActionProposal()` may be scored as missing. The HAR06 machine report is gitignored; preserve the archived historical packet unchanged.

**Do not edit:** gameplay, application/source behavior, product/technical game specifications, HAR05's snapshot exporter, agent always-on rules, or any optional semantic vendor setup. No model, paid provider, subagent, MCP, Docker or model download.

## One cohesive implementation: make the evaluator faithful

### 1. Separate discovery from verified evidence

- In a versioned **new** funnel report (e.g. `repo.retrieval-funnel.v2`), report `fileCandidateRecall@5/@20/@30` using **source path only**. A matched file/line is a candidate even when its grep snippet omits the enclosing declaration. Retain symbol/heading/line evidence as a **separate** proof tier.
- Verify symbol and claim from an actual **source-exact read at the pinned revision**, ideally via existing TypeScript AST/source-navigation support. A path-only hit is never automatically a verified answer, even when that file contains the golden symbol somewhere else. Record what was read, exact span and proof method; unresolved enclosing symbols remain `unverified`.
- Do **not** use gold path/symbol to *generate* or rank candidates. Gold may be consulted by the independent evaluation stage **after** candidate collection to judge file recall and proof. Keep `unreviewed` cases diagnostic-only.
- Preserve C8 caller-vs-definition, C7 absent exporter, D4 status companion, D5/D7 proposal labeling and D6 archived Change rejection. A source hit mentioning Grafana does not establish an exporter.
- Do not silently mutate old HAR06 `v1` reports or call the new grading comparable to its old numeric scores.

**Required negative fixture:** a C4-like hit `packages/game/src/immediate-actions.ts:384` with text containing “mechanical world effects” but **without** `validateImmediateActionProposal`: file recall succeeds; symbol/behavior stays unverified until an exact source read proves its scope. A different function **in the same file** must not pass symbol verification. C5 definition and C8 caller require distinct evidence.

### 2. Real wiki → source navigation (new independent B arm)

- Start from **actual** `wiki:find` ranked headings and authority lanes, *not* oracle owner files. Use existing `wiki-core/route.mjs` `readSection` / `wiki:read` to read bounded heading text with truncation disclosed, then existing `parseMarkdownDocument` / `resolveHref` to follow **real source links**. Avoid a second regex Markdown parser.
- Follow relevant router/technical/product sections to source-map `packages/*/README.md` pages where linked. For package references written as module specifiers (e.g. `@offscreen/game/immediate-actions`), permit a separately labeled **module-reference** edge only after verifying it resolves to a real package export/source. It is not a Markdown link.
- Read those package maps and follow their explicit code links; optionally follow **at most two** inspected import/definition edges from a grounded source file, using repo-native imports or existing TS language services. No invented paths, guessed symbols or hidden lookup using the gold file list.
- Return every candidate with a **trace**: `from path#heading/line → edge kind (wiki-link | source-map-link | verified-module-ref | import | targeted-search) → to path#symbol/line`, together with authority/proposal label, SHA, bytes, hops, reason and any unresolved branch. An inference is not disguised as a literal hyperlink.
- Keep search bounded and report the configured budgets (initial suggested maxima: 8 wiki headings considered, 4 bounded section reads, 12 eligible outbound edges, 2 package-map reads, 2 import hops, 30 candidate results). Adapt caps only transparently with a recorded reason, not until the oracle happens to pass.
- **B is genuinely independent from A.** Do not paste A's grep results into B. If both use an explicitly shared lower-level operation, mark a shared provenance ID and count it once during fusion. Compare A alone, B alone, A∪B, and marginal new owners B contributes. Reject/label proposal and historic content as non-authoritative even if it links to real source.

**Expected possibility:** C3 and C4 have strong existing routes, while C1/C2 have partially implicit last-mile routes. They may still fail. That is evidence about documentation coverage, not license to hard-code gold paths.

### 3. Clean-run replay and honest assessment

- Reuse HAR06/HAR02 comparison modules and zero-provider scripts. Keep existing `pnpm repo:semantic-pilot --funnel` as the simple **recommended** way to exercise the current version; if historical `v1` replay needs preservation, label it explicitly rather than mixing score versions.
- Run in a **clean pinned tree** or dedicated clean worktree. Record source/index SHAs, CLI/tool versions, dirty condition, candidate and read bytes, calls and wall time. If source/index SHA cannot be attested, mark incomparable rather than scoring.
- Preserve original C1–C8/D1–D8 for regression, plus at least two non-gold anti-cheating fixtures: a plausible wrong link in a source map; a proposal-only link that leads to real code but must not count as selected implementation.
- Report **separately**: file candidate presence, symbol proof, fully supported answer, verified absence/abstention, wrong-authority, route hops, marginal B-only file owners, overlap and duplicate attribution. No fabricated live agent/token measurements.
- A measured **failure** is acceptable. Do not add a vector index/reranker/subagent as a fallback when routing fails.

## Acceptance gates: what must be demonstrated

1. C4's correct file/line is no longer a candidate-generation miss just because the snippet omits the function name; an irrelevant same-file line cannot be verified as the target function.
2. At least one **synthetic** end-to-end router → Markdown link → source-map link → source read test passes without any gold lookup, and includes exact hop evidence. Test a real repo C3/C4 path separately. Synthetic green is not a claimed live agent success.
3. The B arm never consists of `[...wiki.hits, ...lexical.hits]`. Duplicate A/B evidence is not double-counted in fusion, and sources with distinct symbols/spans are not incorrectly merged.
4. Wrong or missing links stop/branch with reasons; no secret, `out/`, archival Change or hidden gold is indexed/traversed as selected authority. A valid source reached through a proposal still carries proposal status.
5. Freshness and negative controls pass; new report keeps `reviewed = 0` unless genuinely independent adjudication occurs.
6. Run and document actual self-tests and one clean-tree bounded diagnostic. If local dependencies prevent tests, **do not mark Done**; report blockage, not simulated green.

## Execution boundary and closure

**Permitted:** minimal updates to the existing funnel runner, scorer, fixtures and optional focused source-routing helper; associated developer-harness documentation and evidence. No npm dependencies or new primary CLI. Prefer simple reusable primitives over a “search platform.” Use an isolated worktree while other work may be in progress.

**Verification (actual commands first):**
```bash
pnpm repo:semantic-pilot --self-test
pnpm repo:retrieval-compare --self-test
pnpm wiki:find --self-test
pnpm repo:semantic-pilot --funnel
```
Check additional new focused tests and `pnpm wiki:health` if relevant. Do not invoke providers. The final JSON must show how B found each owner; archived HAR06 is never regraded retroactively.

**Closure:** record source SHA, executed commands and outputs, negative fixtures, reviewed/unreviewed distinctions, A/B increments and costs, unresolved questions and authority impact. Reconcile developer harness docs + `STATUS.md` + Change ledger/queue; archive to `work/changes/archive/2026-11/other/` only on actual verification. Preserve HAR05 separate and Verifying until its own proof exists.

## Trial result

Clean tree `e025943facd5ecb4d910299365750a1124ffbdaa`. Report schema `repo.retrieval-funnel.v2`. Every case stays `unreviewed`, so `verifiedCount` is 0 and the run is diagnostic only. Arm C stays uncomparable because its index revision is not attested. No model was called.

Commands completed: `pnpm repo:semantic-pilot --self-test`, `pnpm repo:retrieval-compare --self-test`, `pnpm wiki:find --self-test`, and `pnpm repo:semantic-pilot --funnel`. `pnpm wiki:health` was not required for this slice.

C4's rejection line is a file candidate even though that line does not name the function. An enclosing read proves `validateImmediateActionProposal`. Fused rank is 5, so the diagnostic evidence check is true. Arm A (short text search) found that line at rank 2. Arm B did not: `wiki:find` never placed `docs/technical/engine/mechanics-and-capabilities.md` in the eight headings. A separate fixture that starts from that page does follow `@offscreen/game/immediate-actions` to the same function. A line whose enclosing read names a different function stays unverified.

C1, C2 and C3 still miss their owner files in both arms. B's traces show where navigation stopped:

- C1 starts at `docs/technical/platform/data-and-persistence.md#implemented-item-transfer`, resolves `@offscreen/application/stories` to `packages/application/src/stories/index.ts`, and does not follow `./persistence` because that import specifier shares no question token. The 12-edge budget is then spent. `itemTransferBlocked` is not reached.
- C2 reaches `packages/application/README.md` through two source-map hops. The edge budget is already spent, so the Execution row is not opened and `execution-stages.ts` is not reached.
- C3 reaches the same application README, after spending edges inside `packages/storyteller` context modules. `publication.ts` is not reached.

Arm B is not a copy of arm A. C4's owner is A-only. The C1–C3 source files above are B-only and are not the oracle owners. Shared provenance is counted once. Distinct symbols in one file stay separate.

N1 stays hidden. C7 abstains. D8 stays freshness-only. A proposal edge does not become selected authority.

Files named for the close check: `scripts/repo-tools/wiki-core/source-route.mjs`, `scripts/repo-tools/wiki-core/retrieval-funnel.mjs`, `scripts/repo-tools/retrieval-funnel-run.mjs`, `scripts/repo-tools/retrieval-funnel-self-test.mjs`, `scripts/repo-tools/semantic-pilot.mjs`, `.agents/README.md`, `STATUS.md`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`, and `work/designs/open/repository-agent-workbench/README.md`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product or technical game behavior impacted | none | unchanged: navigation scores recorded hits and does not change gameplay or Storyteller rules | scripts/repo-tools/wiki-core/source-route.mjs at e025943facd5ecb4d910299365750a1124ffbdaa | fixture-tested | a different function in the same file stays unverified, and a secret path is not traversed | N/A |
| scripts/repo-tools/wiki-core/retrieval-funnel.mjs | evidence | changed: file recall is separate from an enclosing-read symbol proof | scripts/repo-tools/wiki-core/retrieval-funnel.mjs at e025943facd5ecb4d910299365750a1124ffbdaa | fixture-tested | the C4 line without a matching enclosing symbol is a file hit and not evidence | retrieval-funnel.mjs |
| scripts/repo-tools/retrieval-funnel-run.mjs | evidence | changed: arm B follows wiki headings, maps and imports, and does not copy arm A | scripts/repo-tools/wiki-core/source-route.mjs at e025943facd5ecb4d910299365750a1124ffbdaa | source-observed | a missing link, an excluded secret path, and a spent edge budget stop with a reason | retrieval-funnel-run.mjs |
| .agents/README.md | evidence | changed: the command list says arm B navigates links and an unattested index stays uncomparable | scripts/repo-tools/semantic-pilot.mjs | fixture-tested | the self-test covers the synthetic route, the real mechanics-page route, and a duplicated provenance id | .agents/README.md |
| STATUS.md#orientation | evidence | changed: orientation records a diagnostic navigation run and does not claim a verified win | STATUS.md | source-observed | zero cases are independently reviewed and C1–C3 still miss | STATUS.md |
