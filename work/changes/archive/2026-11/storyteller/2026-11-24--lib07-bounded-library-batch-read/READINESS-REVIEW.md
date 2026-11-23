# LIB07 | Planner adversarial readiness

**Verdict:** READY after LIB06 at `f6a796f4`. `createPinnedLibraryNavigation().open` still reauthorizes through `requireAccess()`, preserves the six error codes, and returns the citation fields this helper copies. Extra `kind`, `authority`, and `visibility` stay on `open` and are omitted from the batch item so an unavailable row cannot carry them. No runtime permission changes.

G0 current source: baseline inspected. G1 dependency: LIB06 may change navigation internals, not intended public `open` contract; verify after merge. G2 design: sequential reads; only `not-found` mapped to generic unavailable, auth/corrupt/stale abort; 1–8 paths, 4096 chars each, 32 KiB serialized total. G3 tasks: bounded new module + single tests. G4 concurrency: no overlapping file edits but wait for LIB06 proof. G5 negative: revocation during reads, private metadata, duplicate paths, Unicode, error mapping, byte caps. G6 tests: NOT RUN. G7 integration: only after current source check; no release lab.

**Caution:** returning `totalCharacters` for missing/private documents would be a leak; unavailable items must contain no metadata except input path and generic status. Authorization failure must not be softened into not-found. Successful results may include restricted document metadata only when read permission exists.
