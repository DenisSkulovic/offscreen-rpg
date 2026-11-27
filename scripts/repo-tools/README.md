# Repository tooling

Repository-level maintenance and architecture checks live here. `module-graph.mjs` discovers workspace packages and inspects their source imports; workspace discovery and source scanning must agree.

## Known limitations

**AC-M01 (Medium; reported by independent Agent Core E1 review, 2026-11-27):** `module-graph.mjs:1429–1440` at [5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe](https://github.com/DenisSkulovic/offscreen-rpg/blob/5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe/scripts/repo-tools/module-graph.mjs) assumes `packages/<package>/src/` in its source scan despite explicit workspace glob support. A nested workspace could be discovered without its real imports being inspected. Include correction in the E1 grouped-workspace compatibility scope; verify that existing flat imports and grouped imports (including forbidden edges) are detected and README-only placeholders excluded. Current fix/proof NOT RUN. Update this entry when evidence exists. See [reviewed Agent Core target](../../docs/technical/platform/agent-core.md).
