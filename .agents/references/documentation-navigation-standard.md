# Documentation as a coding-agent knowledge interface

**Independent target, 2026-11-11.** This is a layer-zero standard for the **development agents** reading Offscreen RPG's product/technical docs, not an attempt to redesign the game or the in-world Storyteller. It defines the ideal _before_ considering today's repository.

## The ideal: specification before archaeology

A fresh coding agent should understand the intended behavior, authoritative owner and critical exceptions **before** reading implementation. Its knowledge route is:

1. **Orientation:** short product promise, honest current status, current selected work.
2. **Choose question:** product intent, technical authority, implementation location, evidence, or unfinished design.
3. **Open owner/section:** use a topic map and descriptive heading, not a full repository dump.
4. **Inspect code selectively:** read source only to establish current behavior or implement/check the accepted contract.
5. **Reconcile:** update the owning document when approved decisions change or implementation/source evidence reveals drift.

The goal is lower **total cost of correct engineering**. A clear 60-KB contract read selectively can be cheaper than missing specs and thirty source-file explorations. The byte count of a document alone is not a defect.

## One authoritative home per kind of knowledge

| Material                                                | Owner                                                                                               | What a coding agent should learn                                            | What it must not claim                                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Player outcome, domain concepts, acceptable behavior    | `docs/` product topics                                                                              | **What/why** and important negative examples                                | That a designed feature already works                                                      |
| Architecture, state authority, failure/retry invariants | `docs/technical/`                                                                                   | **Correctness contract**, decisions and alternatives                        | That intended architecture equals the current implementation                               |
| Actual software entry points, package interfaces        | `docs/engineering/code-navigation.md`, package READMEs                                              | Where code and tests live, what currently calls what                        | A second product or technical specification                                                |
| Recorded status, QA, real play                          | `docs/progress.md`, engineering evidence                                                            | Dated evidence, tested boundary and remaining unknowns                      | A general current pass based on historical fixtures                                        |
| Significant implementation work                         | `docs/changes/*/CHANGE.md`, optional `PLAN.md`, and [selection index](../../docs/changes/README.md) | One bounded approved source/test/config outcome, or an explicit empty queue | An archive of initiatives, a design-only task or another permanent technical specification |
| Legacy initiative/design history                        | `docs/features/`                                                                                    | Historical decisions and prior phases when relevant                         | A ready/current Change or fresh approval                                                   |
| Development-agent operation                             | `.agents/`                                                                                          | How Claude/Cursor/ChatGPT retrieve, design, execute and review              | Runtime game-agent policy                                                                  |
| Research and expert references                          | `docs/engineering/`, `.agents/references/`                                                          | Techniques, alternatives and measured experiments                           | Automatic authority over approved product decisions                                        |

The **source of intent** is the product/technical spec; the **source of implementation evidence** is code/tests/traces. When they disagree, investigate and reconcile. Never rewrite a requirement solely to make implemented code look correct.

## Retrieval-quality page structure

- A unique, descriptive H1; meaningful H2/H3 headings with a stable hierarchy. Don't make headings out of formatting or embed giant table-of-contents clones.
- A short opening that says **what this document owns, what nearby owner is different, and whether statements are implemented or still design targets**. No universal repetitive frontmatter requirement.
- On a long page, a **small question-to-section quick route**, ideally with direct anchors. Reading the quick route is not reading the entire contract.
- Important exceptions, non-goals, ordering and idempotency rules **remain beside the decision**. Never delete nuance just to meet a word cap.
- Descriptive cross-links to authoritative headings, with the reason to follow them. Duplicate a conclusion only when it must be locally understood to avoid an error.
- Explicit evidence distinctions when needed: `designed`, `source-inspected`, `fixture-tested`, `live-observed`, `human-accepted`. Date and revision for claims of current behavior.
- Large but coherent technical sections can remain large. Split only when identity, ownership, audience or revision cadence differs enough to justify it.

For task-oriented tutorials, explanation, reference and how-to, adapt [Diátaxis](https://diataxis.fr/) **as an information-design principle**, not four mandatory new folder trees. Follow [Google's heading guidance](https://developers.google.com/style/headings) and [cross-reference guidance](https://developers.google.com/style/cross-references). Use [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/) for the idea of a small agent map, indexed repository knowledge, enforceable navigation and documentation gardening.

## Minimal route topology

`README.md` → `docs/README.md` → topic-specific **`docs/technical/README.md`** or **`docs/engineering/README.md`** → _exact authoritative heading_ → selected source if needed.

The root product docs need not move into `docs/product/`: doing so would break useful links and add migration work without demonstrated benefit. Topic indexes are **routers, not a fourth authority layer**. An agent should follow one route, not read every router in sequence.

## Maintenance without documentation theater

- New behavior: settle product, then technical owner, then code. Source verification updates evidence/status separately.
- Existing bug: inspect the spec before debugging code; preserve already-correct product intent. Document only genuine design changes or newly discovered invariants.
- Navigation-only cleanup: preserve all approved content, update routes/headings/links and document current limitations. Do **not** silently change feature claims.
- On deprecation: inspect incoming links and unique decisions before deleting or moving text. Git retains history, but active canonical knowledge must stay findable.
- Validate repository links using the existing `python scripts/check_docs.py` rather than building another checker. Passing links does not establish semantic correctness.
- Measure with fresh-agent questions: documents read, wrong detours, authoritative answer correctness, duplicate reads, human interventions and actual reported model tokens **if available**. No invented savings percentages.

## 2026-11-12: explicit layered retrieval contract for cheap coding agents

**The real failure to prevent:** a repo can contain 2 MB of excellent Markdown yet require a 200k-context coding model to locate two relevant paragraphs. “Read narrowly” is insufficient unless the **first screen** tells the agent _which_ narrow owner or heading to read. Optimize for smallest sufficient **context footprint**, while preserving deeper explanations for genuinely difficult cases.

| Layer                               | Answer it must deliver                                                | File type/owner                                                                             | Load trigger                                        |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **L0, automatically applied**       | Safety, selected-work authority, _where to start_                     | Short root §AGENTS.md§ and one matching Cursor rule, not full architecture                  | Every applicable coding task                        |
| **L1, one-task entry**              | Outcome, affected owner, one failure proof, where to expand           | Only the active §CHANGE.md§ first-screen brief, or scoped user instruction                  | Selected Change                                     |
| **L2, source-adjacent orientation** | Actual current file/symbol and input→output→side-effect route         | Nearest §apps/_/src/\**/README.md§ or §packages/_/src/**/README.md§; 20-line useful top     | Agent needs ownership before reading code           |
| **L3, contractual depth**           | Why invariant/architecture is correct, failure semantics, decisions   | Exact section/heading of §docs/technical/*§ or selected engineering target; read _by range_ | Detail missing from L1–L2                           |
| **L4, source and proof**            | Current implementation, call sites, tests and actual runtime evidence | Named code symbols, test fixture or controlled command                                      | Required code edit, new discrepancy or verification |

**Rule:** stop at the first layer that answers the question. Do not force every layer into one context. L1 and L2 **summarize and route**, L3 owns the complete explanation, L4 establishes actual implementation. A concise duplicate of a critical hazard at L2 is acceptable; copying the entire L3 contract is not.

### First-screen requirement for long/high-traffic files

Within approximately the **first 10–20 lines**, a returning agent should see:

1. **What it owns** and the single most consequential current fact or risk.
2. **Current source vs selected destination**, explicitly separate; “planned Query” is not “Query exists.”
3. **Where to go:** 2–5 named paths/symbols or exact heading links, not 25 file links with no decision rule.
4. **When NOT to read more:** named nearest owner and stopping/expansion condition.
5. **Provenance** only when needed to distinguish a dated source inspection from a fresh runtime claim.

For a technical **long doc**, lead with a compact question→heading route, ideally direct anchors. For a **source README**, lead with “first look/start”, then a small responsibility/route table, one dangerous interleaving, and test anchors. For a **Change**, first screen presents authoritative outcome, actual owner and acceptance; the full packet remains binding for execution. For an **agent skill**, frontmatter accurately indicates the trigger and the body tells the agent which supporting section to open.

### Source files and preambles: selective, not a banner tax

Do **not** add repetitive header comments to every TypeScript file. Source-local comments are justified for **surprising, hard-to-reconstruct invariants** (e.g. “GET must not re-dispatch a charged attempt,” “this version tie is intentional”) and belong beside the governing code. Navigational source maps belong in the nearest README. If a complex module benefits from a 3–6-line top comment, summarize its responsibility and the true correctness trap, not its syntax, imports or speculative future design. No universal banner boilerplate.

### Mechanical retrieval protocol, including Windows

- Start with a **known Change path** (or source-adjacent README) rather than §rg§ of the whole repo.
- Inspect a document's first ~20 lines, then §rg -n '^#{1,4} ' <exact-doc>§ for headings and read **only the matching range**. In PowerShell: §Get-Content <path> -TotalCount 20§, then §Get-Content <path> | Select-Object -Skip N -First M§. Model input sees only selected output, not the whole document.
- Use §rg -n -C 5 'SymbolName' <specific-files>§ to inspect nearby code; add immediate callers/tests only if a named behavior crosses that seam.
- If the needed contract is already resolved by the selected Change, skip professional reference manuals unless an _actual contradiction_ requires design review. Do not load historical minutes automatically when the Change's decision is current.
- Avoid building a custom semantic-search service, generated mega-index, universal file banners or a script that feeds every grep result into the model. The **search target** matters more than a faster search command.

### Freshness and maintenance: small, triggered updates

- Each source-adjacent map says **source-inspected revision/date** and labels code §Current§ versus future §Target§. Source changes do not retroactively prove all adjacent docs wrong, but the executor rechecks any path/symbol touched by the selected Change.
- When a Change **moves an owner, changes a public export/wire response/status, identity/retry invariant or module boundary**, update its nearest README and inbound links _in that Change_. A local JSX/class rename does not require a documentation rewrite.
- A technical architecture decision changes the authoritative contract; a source map gets a **short pointer and current-vs-target note** only. A completed Change's test result goes into evidence/receipt, not copied into every map.
- The existing §scripts/check_docs.py§ checks paths in top-level package READMEs but **does not traverse nested source-adjacent README files** or verify Markdown heading anchors. This is now a known coverage gap; [W22](../../docs/changes/2026-11-12--web-context-navigation-check/CHANGE.md) will add a cheap source-map/anchor validation lane. Until W22 runs, path-level checks must include newly added nested maps explicitly. Do not call this proven until executed.
- Keep overview docs honest about stale maps; no universal mandated word limit. A ~1–2-page map is useful when it prevents source archaeology, but if a reader must open 5 maps to start, **the routing is defective**.

### Retrieval drills before claiming savings

At minimum run (in fresh read-only Cursor contexts) one React story-state task, one Start/command failure task, one Nest SSE/commit boundary and one unrelated gameplay-source question. For each: check correct owner, smallest sufficient headings/source range, **actual** model tool/file reads, token usage if reported, human clarifications, wrong turns and acceptance. Compare against a fixed task without the curated route at a comparable code revision. Do not infer a 20% saving from document sizes or wishful byte-to-token conversion.

**Current information inventory (GitHub tree source metadata, 2026-11-12):** ~240 Markdown/rule files totaling ~2.1 MB; some single docs exceed 30–60 KB. This is not an indictment of deep material, but it makes first-screen routing and source-adjacent maps materially important. No actual Cursor retrieval benchmark has been run in this documentation session.

## Current audit against this ideal

**Measured 2026-11-11 from the GitHub tracked tree:** 91 Markdown files under `docs/`, approximately 1.36 MB. The top-level product/map group is 16 files (~217 KB); 19 direct technical contracts (~432 KB); technical playthrough atlas 15 files (~160 KB); engineering 13 files (~234 KB); feature dossiers 27 files (~310 KB); one supporting skill elsewhere.

**Already good:** short project README, `docs/README.md` question map, a product/technical/evidence distinction, technical playthrough index, package READMEs, concise selected PLAN checkpoints, existing documentation-link checks.

**Navigation problems:** no area-level landing page for technical or engineering docs; long technical contracts without a one-glance within-page route; possible confusion between `docs/engineering/agentic-systems-field-manual.md` (research for the _game's agent_) and `docs/engineering/ai-development-system.md` (the _coding-agent workflow_). These are worth fixing **without rewriting their domain content**.

**Separate future audit, not authorized content editing here:** some technical docs mix desired future ownership with claims about implemented SQL/canonical storage. `docs/technical/data.md`, `canonical-files.md` and `storyteller-runtime.md` need a source-grounded _accuracy_ comparison when their behavior is next touched. A formatting pass cannot certify their status. Review use cases before reorganizing more folders.
