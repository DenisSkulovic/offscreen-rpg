# LIB08 | Positive and negative proof
1. Exact bytes and existing keys for 0, 1 and maxBytes payloads; no public wire change.
2. File larger than maxBytes rejected without `readFile` or allocating its whole size. Deterministic injected/mutable fixture tests size growth across reads if possible; cap enforcement independent of `stat`.
3. Final-component symlink and non-regular file rejected; no traversal or unintended file content disclosure. Do not claim protection against all parent-symlink races.
4. Missing maps missing; unavailable maps unavailable; try/finally closes file descriptor on all error paths.
5. Existing concurrent put, S3 commands and DocumentStore regression unchanged; no live environment touched.
6. Planner did not run tests. Source-only proof only, not a full filesystem threat model.
