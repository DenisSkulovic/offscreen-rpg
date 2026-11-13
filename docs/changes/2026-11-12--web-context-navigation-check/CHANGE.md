# Change W22: Source-map discovery and Markdown heading-link verification

> **Cursor first look (current source ≠ selected target):** [Nested source-map example](../../../apps/web/src/features/play/README.md) as the local example. **Primary contract:** [retrieval L0–L4](../../../.agents/references/documentation-navigation-standard.md#2026-11-12-explicit-layered-retrieval-contract-for-cheap-coding-agents).  
> **Pre-investigated trap:** Current `scripts/check_docs.py` does **not** scan nested source READMEs or heading anchors; don't claim they are guarded.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done** (2026-11-13). Owner authorized via continue after W14. **Purpose:** keep the new layered coding-agent retrieval system navigable and honest as Cursor restructures frontend code. **Dependencies:** none for static docs checking. This is a **code-bearing test/tool change**, not a fake documentation-only Change.

**Evidence:** `python scripts/check_docs.py --self-test` (nested over-traverse, missing heading, unmatched backtick, em-dash/duplicate anchors, route-group path, encoded path) and full `python scripts/check_docs.py` → 259 files, 0 problems, ~5.8s. Nested chamber map path fixes + honest pre-existing fragment repairs so the stricter checker stays green.

**Destination:** [information-retrieval standard](../../../.agents/references/documentation-navigation-standard.md#2026-11-12-explicit-layered-retrieval-contract-for-cheap-coding-agents) + [documentation rule](../../../.agents/rules/documentation.md). **Observed gap:** `scripts/check_docs.py` currently scans top-level package/app/tool README files but not nested source-adjacent `README.md`, and checks target files but not `#heading` fragments. A moved heading/source map can silently break a precise cheap-model retrieval route even with a green old checker.

**Observed regressions motivating the checker:** The first nine generated nested source maps contained **49 incorrect same-directory links** that traversed too many `../` segments. Separately, CH01–CH15 first-screen packets briefly shipped mangled link text with an unmatched backtick inside the link label (protocol section examples), which path-only checkers treat as fine while Markdown renderers break the link. Both were repaired after independent review; a permanent cheap check is still needed. **Mandatory negative fixtures:** (1) a nested `README.md` link written as `../../../../../view.tsx` when `view.tsx` is actually in the same directory must fail rather than be counted as valid; (2) a Markdown link whose label contains an unmatched backtick before the closing `]` must fail as malformed link text, not pass on URL existence alone.

## Binding design and bounded diff

- Extend the **existing** zero-third-party-dependency `scripts/check_docs.py`, not introduce a search server, heavy Markdown renderer, language-model verifier or new documentation framework.
- Include nested `README.md` under `apps/`, `packages/` and `tools/` while respecting generated/ignored trees (`node_modules`, `dist`, `.next`, `.turbo`, build outputs). Keep normal performance fast on Windows.
- Validate local file and directory targets **and** stable heading fragments for relevant Markdown docs. Implement a tested GitHub-compatible anchor subset (common H1/H2/H3, inline code/formatting, punctuation, duplicate headings); if a page requires unsupported semantics, report limitation explicitly rather than guessing or manufacturing false green. Avoid arbitrary anchor rewrites in documentation to satisfy a weak checker.
- Add a small standard-library fixture test: valid nested README link, missing nested target, valid heading, missing heading, repeated headings and encoded local path. Keep `python scripts/check_docs.py` an inexpensive single command. Update current `.github/workflows/docs.yml` only to invoke the same command, not add expensive runners.
- **Freshness boundary:** no static checker can prove source-symbol semantics (e.g. whether `PlayScene` still owns a command). Human/agent source-map maintenance is triggered only by actual owner/contract changes; avoid brittle global TypeScript regex scans disguised as semantic proof.

## Normal and negative proof

**Normal:** a shallow and a nested source README with correct links/heading anchors pass quickly without any Node install, Next build, API, DB, Docker or provider.  
**Negative:** broken heading anchor in `docs/engineering/targets/react-next.md` or broken relative path in `apps/web/src/features/play/README.md` fails with precise file/line and exit code; deep generated output is not crawled.  
**Evidence:** fixture run and full docs-link check with measured elapsed time; record any pre-existing broken paths honestly, do not weaken assertion.  

**Excluded:** changing source TypeScript, bulk-annotating files, generic source-symbol correctness claims, npm Markdown toolchain, CI infrastructure rewrite (W21), gameplay or visual redesign.

**Cursor handoff:** start with `scripts/check_docs.py`, `.github/workflows/docs.yml`, the [current source maps](../../../apps/web/README.md) and one fixture. Implement only the documented checker improvement and return actual commands/outputs; no paid providers or destructive operations.
