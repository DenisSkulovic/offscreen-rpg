# WIKI07 | False-positive and context-budget tests

**Not yet run.** All tests zero-model and local.

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
