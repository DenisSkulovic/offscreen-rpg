# INF17 | proof

Source-only. Actual local Helm when chart changes; fake runners for external commands. Verify exact retired paths absent and current executable callers updated; retain historical proof. No live cluster/Tilt/Docker operations or tenant mutations. 

- T01 Collapse slot loader entrypoint: run concrete tests in EXECUTION T01; negative assertions must distinguish stale/unreadable/foreign or unsafe paths from success.
- T02 Dev-only sync/rebuild contract: run concrete tests in EXECUTION T02; negative assertions must distinguish stale/unreadable/foreign or unsafe paths from success.
- T03 Single root Tilt graph: run concrete tests in EXECUTION T03; negative assertions must distinguish stale/unreadable/foreign or unsafe paths from success.

Record test commands/counts, bash -n/node --check, changed-source format/quality and pnpm repo:docs-health. Required missing proof NOT-RUN, not PASS. Archive/integrate only after source acceptance. Live NOT-RUN.
