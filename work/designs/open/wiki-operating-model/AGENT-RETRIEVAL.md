# Wiki retrieval | Find the right subsection, then stop

**Status:** recommended design for developer coding agents. Existing authoritative guidance: [layered retrieval standard](../../../../.agents/references/documentation-navigation-standard.md), [context economics](../../../../.agents/references/context-economics.md), [root agent entry](../../../../AGENTS.md). This document must **not** become a new always-on 10-KB agent rule. WIKI07 will add a tiny invocation rule to those existing owners and an executable retrieval interface.

## The fundamental inefficiency

WIKI01/04 can show that a page is reachable in two hops. A weak agent may still read a 62-KB file to find one paragraph, then read the next 50-KB file and blow its context before source inspection.

At audited revision 91c2845:
- `docs/` contains 74 Markdown files, approximately **956 KB** of canonical prose.
- The ten largest pages contribute approximately **39% of its bytes**; their coherence is not disputed merely by size.
- `docs/technical/storyteller/context-and-memory.md` is ~62 KB, and one H2 section is ~17 KB.
- `docs/technical/storyteller/request-context-and-cost.md` has a ~14-KB H2 section; `operation-and-controller.md` contains a ~3,668-character paragraph.
- `docs/runbooks/local-development.md` is ~40 KB, with a ~16-KB “Local live Story mode” section.
- The wiki is question-routed but several large pages need more **subsection-level signposts**. A hyperlink to the file is not enough if the next interaction dumps the entire file.

This is *retrieval granularity*, not evidence these large technical contracts are intrinsically bad.

## One-agent question protocol (zero-model lookup first)

An agent must classify its **immediate need** before searching:
- **Intent**: what product behavior is selected? → one exact `docs/product` section.
- **Contract**: who owns correctness, invariants and failure semantics? → one exact `docs/technical` section.
- **Reality**: what code/tests/tiers exist? → one `STATUS` row + closest source README/symbol; inspect at actual SHA.
- **Unsettled**: which choice is not ratified? → open design + ratified baseline, labeled proposed.
- **Execution**: what is authorized? → selected `work/changes/open` first screen + contract, no archived packet.
- **Evidence**: what was actually observed? → dated run/fixture linked by status; never historical ChatGPT confidence.

**Procedure, in five operations:**

1. **Anchor known work**: If handed a Change with exact owner/heading references, use them directly. Do not execute a global keyword search as ritual. If starting from a question, open `AGENTS.md` or `docs/README.md` as appropriate; query the maintained wiki index for candidates.
2. **Rank routes, not whole books**: list 3–5 high-value **page#heading** candidates with authority class, why relevant, first ~200–400 characters of the section and estimated section size. Don't transmit full pages just to decide.
3. **Read one bounded section**: choose the most plausible owner. Show exact source path, heading, line span, and enough intact prose/negative examples to answer. Show an explicit continuation when too big.
4. **Check a second authority only when required**: source-status tasks often need contract + `STATUS` + named code/test; a pure accepted-rule question may need only product and a negative example. A Change implementation normally needs selected Change, affected wiki section(s), nearest source owner and one meaningful negative test.
5. **Stop or widen with a reason**: once requirement, invariant, source symbol, relevant counterexample and next action are known, stop reading. If ambiguous/stale/conflicting, expand only to the named neighbor/alternate hypothesis. Report any unresolved conflict instead of inhaling the whole repo.

**Small work packets:** maintain the existing default of 2–5 source files **after** locating the target, not a rigid limit on correctness. For larger architecture, delegate *isolated, focused* investigations when beneficial and authorized; a 1M context window is capacity, not an excuse to preload everything. A Cursor model with 200K can work well when the handoff and sections are precise. A Claude Code agent with more room may still accumulate irrelevant history and become less reliable.

## The proposed CLI ergonomics

Build on the existing WIKI01 AST graph and WIKI02 lexical scorer, not a second renderer or vector database:

```bash
pnpm wiki:find "Who decides whether an interrupted activity earns its reward?" --kind product --top 5
pnpm wiki:find "Can the agent inspect memory?" --kind technical --top 5 --json
pnpm wiki:read docs/technical/storyteller/operation-and-controller.md#supported-behavior-and-evidence-limits
pnpm wiki:read docs/technical/storyteller/context-and-memory.md#one-owner-per-kind-of-truth --max-chars 5000
pnpm wiki:read docs/technical/storyteller/context-and-memory.md --outline
```

These commands are **designed, not implemented** by this file. WIKI07 owns executable implementation and tests.

**`wiki:find` output for each candidate:**
- Page + exact heading/slug and source line range (no guess about heading anchors);
- **authority:** ratified product, selected technical, status/evidence, open proposal, historic (opt-in), source map;
- 1 sentence excerpt/quote with source line and link label / Q→page route that exposed it;
- query term match score, matched heading/label/body, **estimated read size** and one relevant negative/risk signal where available;
- why a sibling page is different (“contract vs implementation status”);
- no entire body and no historical/current blending in a single undifferentiated rank list.

**`wiki:read` output:**
- Only the chosen H2/H3 subsection/anchor, with source line boundaries and original wording, not a model-written summary.
- Default bounded excerpt (suggest ~4–6 KB max characters, calibrated after tests); cap is **soft for completeness**. Do not silently chop a numbered rule, multiline code fence or essential counterexample; show a continuation cursor when needed.
- When the section exceeds the budget, give an accurate outline of subheadings and 1–2 opening excerpts, with explicit commands/ranges for next chunk. If one paragraph alone is longer than the cap, split into stable line/character chunks with incomplete-sentence warning.
- `--outline` shows headings, starting line, estimated subsection size and optional in-page question index. Do not assume one whole H2 is cheap.
- `--json` versioned schema with actual path/revision/dirty flag, exact quote and source range. No placeholder “status live” invented from file presence.

**Existing scripts:** `pnpm wiki:bench:static` is a benchmark, not a production question-answer service. Avoid reusing the **gold dataset** in `wiki:find`; otherwise a user-facing search silently learns the benchmark answers. Search uses the actual maintained wiki content only.

## Index and ranking safety

**Role-aware ranking:** prioritize canonical owner for accepted-rule questions; retrieve proposed work in a separate explicitly labeled lane. A source-status query should suggest both canonical technical and `STATUS.md`, and prompt a code verification rather than answer from design alone. For Change tasks, rank the selected packet and exact owner heading before unrelated historical documents.

**Fallback for weak lexical overlap:** first try question table routes and nearby headings; if ranker gives no confident primary owner, show subject map candidate and suggest scoped `rg -n`. Do not claim a low BM25 score makes a page irrelevant. Include aliases/synonyms only when editorially justified; do not invent keyword soup or inject the 30 golden questions into canonical content.

**Authority warnings without deleting access:** archived Changes and evidence must still be searchable on an explicitly historical/proof request, but default normative answers never choose them as primary authority. Annotate proposal/retired links; keep real historical paths reachable for forensic use.

**Source-aware navigation:** code refs are hints, not proof the symbol still exists. Verify the exact file/symbol before writing or claiming runtime behavior. A source README's inspection date is not current execution evidence on its own.

## Context budgets are guidance, not brittle gates

Use an **adaptive output envelope**:
- **Candidate discovery:** at most 5 default results; ~200–400 character preview each. User may expand.
- **First evidence read:** one targeted section, often 800–2,000 words or less; don't enforce universal 2K tokens when a critical 4K-token concurrency invariant is actually needed.
- **Next reading:** only on a named unresolved question. Protect negative cases; don't trim code fences or cut a safety disclaimer to meet a byte quota.
- **Handoff:** Change first-screen outcome, exact owner/section links, 2–5 likely code symbols, minimal meaningful failing case and checks. Avoid copying product contracts into the Change.

Track **actual read output bytes** as a proxy, but *never* claim those bytes equal model tokens. When client exposes usage, capture actual input/cache tokens, time-to-first-right-owner and wrong reads; absent metrics stay unknown. Avoid copying the same 10-KB page again after compaction.

## How to tell whether it helped

A successful agent can:
- Find `time-and-autonomy#response-windows-and-absence` and stop without reading 15 pages.
- For Storyteller loop, open the controller's current proof subsection and then inspect source, rather than reading two entire 50-KB essays.
- Answer a source-status question with selected design *and* the reality tier, not just a technical future.
- For a new code slice, cite product clause, technical invariant, source/test and a negative counterexample.
- Detect that a candidate is proposal-only without consuming its full design unless that unresolved decision is the task.

**Independent pilot later:** freeze 10–12 fresh questions, compare `AGENTS + direct source grep` with `AGENTS + route/section preview` using one fresh session per question. Keep model/version/tools/actual SHA constant, grade correctness first, measure host time/calls/observed reads second. Do not run paid models without separate approved cap and true filesystem isolation. WIKI07 itself uses no model.
