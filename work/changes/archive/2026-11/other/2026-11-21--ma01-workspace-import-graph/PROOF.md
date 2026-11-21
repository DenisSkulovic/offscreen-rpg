# MA01 | test matrix

Positive: all 15 manifest workspaces resolved; `application → storyteller`, `contracts → documents`, `cache → application` measured in baseline; source `stories→storyteller`, `storyteller→stories`, `stories→developer-tools` shown; JSON stable across rerun; `--mermaid` useful and parseable.

Negative: undeclared workspace import reported; unknown package export reported; runtime package cycle fails; type-only SCC distinguished from runtime; missing relative file reported with exact path/symbol; generated/dist/tests excluded from production graph but tests allowed separate dependencies; import containing `index.js` resolves correctly under NodeNext; no state mutation on report. Run `pnpm repo:module-graph:test`, normal and JSON commands, changed-file Prettier/quality lint, standard root script validation. Do not claim a complete graph before scanner traverses actual checkout. No database/provider required.
