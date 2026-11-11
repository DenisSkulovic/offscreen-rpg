# Documentation as a coding-agent knowledge interface

**Independent target, 2026-11-11.** This is a layer-zero standard for the **development agents** reading Offscreen RPG's product/technical docs, not an attempt to redesign the game or the in-world Storyteller. It defines the ideal *before* considering today's repository.

## The ideal: specification before archaeology

A fresh coding agent should understand the intended behavior, authoritative owner and critical exceptions **before** reading implementation. Its knowledge route is:

1. **Orientation:** short product promise, honest current status, current selected work.
2. **Choose question:** product intent, technical authority, implementation location, evidence, or unfinished design.
3. **Open owner/section:** use a topic map and descriptive heading, not a full repository dump.
4. **Inspect code selectively:** read source only to establish current behavior or implement/check the accepted contract.
5. **Reconcile:** update the owning document when approved decisions change or implementation/source evidence reveals drift.

The goal is lower **total cost of correct engineering**. A clear 60-KB contract read selectively can be cheaper than missing specs and thirty source-file explorations. The byte count of a document alone is not a defect.

## One authoritative home per kind of knowledge

| Material | Owner | What a coding agent should learn | What it must not claim |
| --- | --- | --- | --- |
| Player outcome, domain concepts, acceptable behavior | `docs/` product topics | **What/why** and important negative examples | That a designed feature already works |
| Architecture, state authority, failure/retry invariants | `docs/technical/` | **Correctness contract**, decisions and alternatives | That intended architecture equals the current implementation |
| Actual software entry points, package interfaces | `docs/engineering/code-navigation.md`, package READMEs | Where code and tests live, what currently calls what | A second product or technical specification |
| Recorded status, QA, real play | `docs/progress.md`, engineering evidence | Dated evidence, tested boundary and remaining unknowns | A general current pass based on historical fixtures |
| Temporary feature decisions and next work | Selected `docs/features/*/FEATURE.md` and `PLAN.md` | Accepted scope and one next implementation slice | An archival copy of all permanent documentation |
| Development-agent operation | `.agents/` | How Claude/Cursor/ChatGPT retrieve, design, execute and review | Runtime game-agent policy |
| Research and expert references | `docs/engineering/`, `.agents/references/` | Techniques, alternatives and measured experiments | Automatic authority over approved product decisions |

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

`README.md` → `docs/README.md` → topic-specific **`docs/technical/README.md`** or **`docs/engineering/README.md`** → *exact authoritative heading* → selected source if needed.

The root product docs need not move into `docs/product/`: doing so would break useful links and add migration work without demonstrated benefit. Topic indexes are **routers, not a fourth authority layer**. An agent should follow one route, not read every router in sequence.

## Maintenance without documentation theater

- New behavior: settle product, then technical owner, then code. Source verification updates evidence/status separately.
- Existing bug: inspect the spec before debugging code; preserve already-correct product intent. Document only genuine design changes or newly discovered invariants.
- Navigation-only cleanup: preserve all approved content, update routes/headings/links and document current limitations. Do **not** silently change feature claims.
- On deprecation: inspect incoming links and unique decisions before deleting or moving text. Git retains history, but active canonical knowledge must stay findable.
- Validate repository links using the existing `python scripts/check_docs.py` rather than building another checker. Passing links does not establish semantic correctness.
- Measure with fresh-agent questions: documents read, wrong detours, authoritative answer correctness, duplicate reads, human interventions and actual reported model tokens **if available**. No invented savings percentages.

## Current audit against this ideal

**Measured 2026-11-11 from the GitHub tracked tree:** 91 Markdown files under `docs/`, approximately 1.36 MB. The top-level product/map group is 16 files (~217 KB); 19 direct technical contracts (~432 KB); technical playthrough atlas 15 files (~160 KB); engineering 13 files (~234 KB); feature dossiers 27 files (~310 KB); one supporting skill elsewhere.

**Already good:** short project README, `docs/README.md` question map, a product/technical/evidence distinction, technical playthrough index, package READMEs, concise selected PLAN checkpoints, existing documentation-link checks.

**Navigation problems:** no area-level landing page for technical or engineering docs; long technical contracts without a one-glance within-page route; possible confusion between `docs/engineering/agentic-systems-field-manual.md` (research for the *game's agent*) and `docs/engineering/ai-development-system.md` (the *coding-agent workflow*). These are worth fixing **without rewriting their domain content**.

**Separate future audit, not authorized content editing here:** some technical docs mix desired future ownership with claims about implemented SQL/canonical storage. `docs/technical/data.md`, `canonical-files.md` and `storyteller-runtime.md` need a source-grounded *accuracy* comparison when their behavior is next touched. A formatting pass cannot certify their status. Review use cases before reorganizing more folders.
