# LIB07 | Planner adversarial readiness

**Verdict:** PLANNER-GATED until LIB06 integration. Source interface anchored in `createPinnedLibraryNavigation().open` at `ed0837d0`; no runtime permission changes.

G0 current source: baseline inspected. G1 dependency: LIB06 may change navigation internals, not intended public `open` contract; verify after merge. G2 design: sequential reads; only `not-found` mapped to generic unavailable, auth/corrupt/stale abort; 1–8 paths, 4096 chars each, 32 KiB serialized total. G3 tasks: bounded new module + single tests. G4 concurrency: no overlapping file edits but wait for LIB06 proof. G5 negative: revocation during reads, private metadata, duplicate paths, Unicode, error mapping, byte caps. G6 tests: NOT RUN. G7 integration: only after current source check; no release lab.

**Caution:** returning `totalCharacters` for missing/private documents would be a leak; unavailable items must contain no metadata except input path and generic status. Authorization failure must not be softened into not-found. Successful results may include restricted document metadata only when read permission exists.
