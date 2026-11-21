# Packet review worksheet | compact reviewer receipt

Use [independent readiness review](packet-readiness-review.md) for meanings, hard blockers and evidence standards. This worksheet is an **output format**, not an automatic score or another Change packet file. Write the result in the user-facing audit or the existing packet's review notes only when useful. Do not create a permanent separate review artifact for every tiny PATCH.

## Audit identity
- Change / profile / integration branch / verified HEAD / date:
- Commission / permission / authority:
- Source symbols and tests actually inspected; uninspected critical surface:

## Hard gates (PASS / FAIL / UNVERIFIED + one evidence line each)
| Gate | Result | Source-specific evidence or missing fact |
| --- | --- | --- |
| G0 repo, branch, authority | | |
| G1 source/caller/test truth | | |
| G2 frozen design/compatibility | | |
| G3 each child dry-run | | |
| G4 parent first-dispatch dry-run | | |
| G5 dependency DAG/parallel isolation | | |
| G6 positive + diagnostic negative proof | | |
| G7 reasonable execution cost/closure | | |

## Dispatch wave matrix
| T-ID / wave | Read anchors | Exclusive writes/resources | Depends on | Negative observation | Parallel status |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Final disposition
- Verdict: READY / READY WITH EXPLICIT LIMITS / PLANNER-BLOCKED / UNVERIFIED / NOT AUTHORIZED.
- **First Cursor action:** <guard + first T-ID or eligible parallel wave>; no independent design preflight.
- Blocking fixes **owned by ChatGPT** (path/symbol and edit, not “investigate”):
- Advisory cost improvements (not blockers):
- Proofs *not* executed by reviewer:
- Re-audit after repair: current HEAD, changed task cards, first-dispatch and parallel-wave recheck.

## Red-team prompts

- If I remove the deep source map, can a child still edit using only a T-ID and 2–5 named anchors?
- Which first command fails because we forgot a generated type, exported symbol, cwd or fixture?
- Which “parallel” tasks touch the same manifest, lockfile, import barrel, test database, port, working directory or shared Git index?
- Is there a single meaningful negative that would fail if the implementation silently allowed the forbidden behavior?
- What exact unplanned decision would Cursor be tempted to make, and why wasn't it settled by ChatGPT?
- Would I sign the same readiness verdict after forgetting who authored the packet?
