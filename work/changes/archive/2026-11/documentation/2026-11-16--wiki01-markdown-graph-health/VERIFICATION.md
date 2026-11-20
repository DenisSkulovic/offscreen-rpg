# WIKI01 | Verification and falsification

**Not executed.** Tests below are requirements for the coding agent, not claimed passes.

## Fixtures that must pass

1. Inline and reference GFM links, table links, self and cross-file anchors, duplicate GitHub heading slugs (name, name-1), percent/Unicode paths and Windows case-independent validation.
2. Parenthesized Next.js file paths, directory indexes, intentional source code or `thread:` URI, images, literal example inside inline/fenced code.
3. A useful router with many links, focused terminal page with none, 60 KB coherent spec, source-to-evidence citation and completed Change packet with old broken relative links.
4. A clean graph with correct product/technical classifications and shortest path/root reachability, and reproducible JSON with sorted node/edge arrays.

## Negative fixtures that must fail

| Fixture | Expected output |
| --- | --- |
| Wrong `../../docs/` from `work/designs/open/example.md` | Broken path with exact source line |
| Nonexistent `#fragment` target | Broken anchor, distinct from broken file |
| Case mismatch on Windows | Deterministic case error even if file opens |
| Canonical product page lacking any root-link route | Unreachable page, shortest-path null |
| Root link presenting archived implementation handoff as normative owner | Authority-route violation |
| Inline code containing plausible Markdown link | **Must NOT** produce false broken link |
| Duplicate Markdown link to one destination | One graph edge, two link occurrences |
| Source→evidence citation | Typed evidence edge, not normative-page promotion |
| Naive PDF/URL/custom URI | External/unsupported classification, not local missing file |
| Fingerprint same content at two canonical paths | Duplicate candidate warning, not auto-delete |

## Completion commands and evidence

```bash
git status --short
git rev-parse HEAD
pnpm wiki:health --self-test
pnpm wiki:health
pnpm wiki:health --json
pnpm wiki:graph
python scripts/check_docs.py
pnpm repo:docs-health
git diff --check
```

Record OS, full SHA, actual exit code, duration, output paths, numerator/denominator and issues. Show JSON schema version and re-running unchanged graph yields stable semantic content. Demonstrate no Git/working tree mutation except explicitly created gitignored local outputs. Verify no historical Change archive path was touched and no model/provider process was invoked. Do not claim 100% reachability if a real canonical page is still disconnected. Treat parser false positives as tool bugs, not excuses to rewrite valid pages.