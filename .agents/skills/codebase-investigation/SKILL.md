---
name: codebase-investigation
description: Trace an existing Offscreen RPG runtime path, diagnose a defect or assess refactor feasibility from code and evidence before writing a technical proposal. Read-only by default.
---

# Bounded codebase investigation

Use for architecture investigation, debugging, finding the authoritative owner, risky change feasibility, or explaining why live behavior differs from the spec. **Do not implement or rewrite product docs during investigation** unless separately requested.

1. Write the **specific question** and expected product/technical contract in one or two sentences. Select one route from `docs/README.md` / `docs/engineering/code-navigation.md` and one relevant package README.
2. Search filenames, symbols and heading anchors before reading big files. Trace the entry point to authoritative operation, persistence/side effect, public result and at least one critical rejection/retry path. Read only needed sections/callers. Source-map facts with path and symbol or line.
3. Separate **intended**, **observed in code**, **tested/fixture**, **live evidence**, and **unknown**. Avoid treating snapshots, diagrams or a saved model response as proof of runtime publication.
4. For a bug, rank plausible causes by how well they explain the *whole trace*; identify the next discriminating inspection or test. For an architecture decision, give 2-3 real alternatives, with consequences and the simplest one that meets scope.
5. Return a **compact investigation packet** for a creative architect or implementer:
   - question and bottom-line finding;
   - 3-8 authoritative file/symbol anchors;
   - exact invariant/contract and discrepancy;
   - risks, genuine unknowns and one proposed next experiment or slice.

Avoid pasted full files, generic architecture sermons, duplicate documentation or invasive test setup just to investigate. If a key source is unreadable/truncated, report it rather than bluff. Provider calls and database mutations require independent explicit authorization.
