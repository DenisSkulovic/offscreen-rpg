# WIKI07 | False-positive and context-budget tests

Self-test and one local measurement were run on 2026-11-17 against dirty `5be8e2a8fa42c684ec16939b9cf8928fd56e996f`. No provider call. The ten questions were written by the implementer. They are not an independent held-out review, and a top hit is not automatically the right owner.

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm wiki:find --self-test` | 0 | Row context stays on its own link. Fenced headings are not sections. Nested H3 stops at the next H3. Truncation hides `FINAL_NEGATIVE_CASE` until expansion. A proposal page stays in the NOT SELECTED lane. A selected page that only says "not authorized by this target alone" stays selected. Historic pages and a gold-file token stay out of the default index. |
| `pnpm wiki:read docs/technical/storyteller/context-and-memory.md --outline` | 0 | 17 headings. `one-owner-per-kind-of-truth` is lines 15–35, 3807 bytes, against a 62459-byte page. `a-concrete-workspace` remains 17307 bytes and is truncated by the default cap. |

Implementer questions, top normative hit, full file characters versus bounded read at the 5000-character cap:

| Id | Top ref | Full file | Shown | Note |
| --- | --- | --- | --- | --- |
| Q1 | `docs/technical/storyteller/context-and-memory.md#one-owner-per-kind-of-truth` | 62459 | 3807 | Specific heading |
| Q2 | `docs/technical/client/architecture.md#4-end-to-end-update-transport-selected-not-future-conjecture` | 35573 | 1790 | Specific heading |
| Q3 | `docs/product/README.md#product` | 2188 | 2188 | Router, not the vision page |
| Q4 | `docs/technical/observability/investigation-and-reconstruction.md#forensic-access-and-read-contract-v1--role-specific-truth-without-a-universal-data-leak` | 17662 | 4988 | Truncated page title. Staff console owner not confirmed |
| Q5 | `docs/technical/lab/chamber-and-fixtures.md#chamber--reproducible-developer-laboratory-target` | 24379 | 4701 | Truncated page title |
| Q6 | `STATUS.md#status--demonstrated-boundary` | 5940 | 4813 | Page title. The question did ask for status |
| Q7 | `docs/technical/observability/identities-and-evidence.md#evidence-graph--typed-durable-historically-faithful-data` | 23971 | 4812 | Normative hit is the evidence graph. The telemetry proposal stays in the proposal lane |
| Q8 | `docs/runbooks/local-development.md#local-development` | 39874 | 4935 | Truncated page title. The stale `test:fast` wording is a WIKI08 repair, not fixed here |
| Q9 | `docs/README.md#documentation` | 2880 | 2880 | Router |
| Q10 | `docs/technical/client/architecture.md#react--nextjs-engineering-target--decided-architecture` | 35573 | 4991 | Does not land on the new admission rule. Lexical miss |

A smaller shown byte count is a proxy for context, not a measured model-token saving.

The requirements below are still the acceptance bar. The table above is what was actually run.

## Required output fidelity

- `wiki:read file.md#anchor` returns the exact current original-text section with line-start/end and an accurate source SHA/dirty indicator. Heading slug is GitHub-compatible, duplicate names unique and Unicode paths supported.
- `--outline` lists H2/H3/H4 and **section sizes**. A nested H3 stops at next H3 or parent H2 correctly.
- A Markdown heading inside code fence is **not** a section; links in fenced code are not normal navigation.
- Truncation at ~5 KB is visible and has a valid continuation. Do not omit or mangle important refusal/negative cases without warning. Explicit expansion reaches complete section.
- Default `wiki:find` returns up to five role-labeled page#heading candidates with first relevant excerpt, match reason, path and estimated read size, not 50-KB bodies.
- A yes/no source-status query suggests normative contract and `STATUS` companion. It does not present a proposed Change as selected gameplay truth.
- Agent Change already names precise heading: direct `wiki:read` must be possible without an unnecessary initial full corpus search.
- Existing WIKI05 benchmark gold must **not** enter the live route ranking. An intentionally query-like benchmark identifier absent from docs cannot reveal hidden answer keys.

## Comparative trial (no LLM)

At frozen SHA, choose **10 subject questions not directly copied from WIKI02 gold**. Run the normal question-table / full file path workflow and new route+section method with identical source. Report per task:
- correct candidate owner heading (reviewed by human/independent reviewer, **not automatically accepted by implementer**);
- total bytes output by direct full-doc read versus bounded route+read;
- number of relevant and irrelevant returned headings; fallback needed and missed owners;
- exact truncated/continuation cases and whether critical negative semantics remained accessible;
- wall time for local CLI and no provider use.

A decrease in bytes is a **proxy**, not provider token cost. Do not declare 75% model token savings from bytes. Do not overfit the canonical wiki to the benchmark questions.

## Commands and safeguards

```bash
git rev-parse HEAD
pnpm wiki:find --self-test
pnpm wiki:read --self-test
pnpm wiki:find "What authorizes time progression?" --kind product --json
pnpm wiki:read docs/technical/storyteller/context-and-memory.md --outline
pnpm wiki:health
python scripts/check_docs.py
git diff --check
```

Show real exits/outputs, no paid model, no writes beyond gitignored reports, no change to all terminal archive blobs, no source/game behavior modifications.
