# LIB03 | Release-safe source-only acceptance

**Not run by planner.** Acceptance is from actual executor working HEAD, not synthetic assertions.

| Claim | Focused positive | Required negative / disconfirmation |
| --- | --- | --- |
| Stable world/rule/start manifests | Existing directory+API fixture produces identical root SHA, entry IDs and sorted paths before/after move | Duplicate normalized path, symlink, path traversal, >file-count, >per-file and >total bytes rejected |
| Source pin authority | WORLD.md and RULES.md orientation, rules engine and license, START.md activation and structured JSON behave unchanged | Forged source package root, wrong pinned rule engine/revision, invalid start schema |
| Instantiation identity | Existing v1 and v2 Library base, retry, provenance, reserved reference JSON and collision tests pass | Wrong campaign ID/revision, existing path collision, provenance overflow, mismatched envelope |
| Package direction | Workspace graph acyclic; Documents does not depend on content-packages or Story Engine | A moved export left in Documents barrel or unseen caller makes build fail |
| Broader regression | Documents unit, content-packages unit, Story Engine build/tests, api + GA + chamber + api-integration targeted typecheck/build | No SQL/schema migration, store codec edits, cluster writes, fake PASS |
| Quality | Changed modules pass repository formatting and quality checks; no unexplained large mixed-responsibility file | No refactor of validations while relocating code |

**Readiness audit (planner G1–G7):** product authority established in LIB01; current implementation and callers inventoried in SOURCE-MAP; direction chosen; source-only permissions; no shared runtime data. **Remaining gate:** exact current-HEAD conflicts after LIB02, unit-test move ownership and dependency graph verification. If any contradict the map, HOLD and return file/symbol rather than broad Cursor discovery. Keep staged packets in backlog until owner explicitly promotes.
