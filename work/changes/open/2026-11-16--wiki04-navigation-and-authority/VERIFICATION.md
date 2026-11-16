# WIKI04 | Wiki navigation verification

**Required for closure, not yet performed.** Freeze actual pre-change SHA, exact WIKI01/WIKI02 parser+dataset versions and baseline reports first.

## Five surgical repairs

| Case | Concrete navigation assertion |
| --- | --- |
| Runbooks | A user coming from `docs/README.md` reaches `docs/runbooks/README.md` and then `local-development.md` without a historical or work-directory detour |
| Admin console | A technical reader reaches `admin/console-and-read-models.md` via the technical map and via a relevant Admin owner |
| Chamber protocol | `lab/chamber-and-fixtures.md` and `lab/experiment-protocol.md` link contextually in both directions; the protocol is not an isolated weak component |
| Capture | The transition-capture spec is reachable with an explicit proposal or selected-future label matching actual reviewed authority status |
| Telemetry | The OpenTelemetry recommendation is reachable but never presented as deployed; preserve no-spend and no-code-authorization clauses |

## Regression tests

1. Delete one new canonical inbound link in an isolated fixture: canonical reachability must fail with offending path, not silently reduce denominator.
2. Introduce a broken fragment: both Markdown parsers must flag it.
3. Label a proposal as “current implemented design” in a root router: authority guard must warn/fail with a human-review path, not silently accept.
4. Move an unaccepted proposal under `work/designs/open/`: expected canonical denominator changes with a named reclassification receipt, while proposal discoverability remains measurable.
5. Confirm that a historical Change source does not become current proof by adding a link.

## Evidence at close

```bash
git status --short
git rev-parse HEAD
pnpm wiki:health --json
pnpm wiki:graph
python scripts/check_docs.py
pnpm wiki:bench:static --seed 20261116 --json
git diff --check
```

Record actual commands, exit codes, final SHA, canonical reachable numerator/denominator, orphan/component counts, independent link check, exact additions/moves and WIKI02 **v1** baseline limitations. Ensure archived Change bytes/paths preserved; no paid model, live services or game code touched.

**Close only when page classification is honest and all remaining canonical pages are reachable.** Do not count a “moved to open” document as deleted knowledge, or an unapproved technical recommendation as canon.