# Packet review worksheet | compact reviewer receipt

Use [independent readiness review](packet-readiness-review.md) for meanings and evidence standards, and [finding severity](../../AGENTS.md#finding-severity-and-blocking) for blocking. This worksheet is an output format, not an automatic score and not another packet file. Write it in the user-facing audit or the existing review notes when that is useful. Do not create a permanent review artifact for every small patch, and do not create a document per finding.

## Audit identity
- Repository / Change / integration baseline / candidate SHA / date:
- Commission / permission / authority, separate from readiness:
- Source symbols and tests actually inspected; uninspected indispensable surface:
- Evidence limits:

## Submission signals
- Outcome, actual task count, and any justified exception to the seven-task default.
- Front door, contradictory current text, and mandatory routes that affect dispatch.
- Size or count signals only where their consequence is recorded as a finding.

## Review dimensions (PASS / FAIL / UNVERIFIED / NOT REVIEWED + one evidence line)
| Dimension | Result | Evidence or missing fact |
| --- | --- | --- |
| G0 repo, branch, authority | | |
| G1 source, caller and test truth | | |
| G2 frozen design and compatibility | | |
| G3 affected child dry-runs | | |
| G4 parent first dispatch | | |
| G5 dependency and isolation | | |
| G6 assigned proof boundary | | |
| G7 execution cost and closure | | |

On a correction pass, repeat affected dimensions. Reuse unaffected evidence and say which prior evidence still applies.

## Dispatch route
| T-ID / wave | Anchors | Exclusive writes / resources | Depends on | Assigned check or downstream proof owner | Parallel status |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Findings
| ID | Severity | Scope | Evidence | Consequence | Correction or deferred disposition |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Every Critical or High row states the material consequence. Medium and Low rows are deferred. Do not raise severity to express a preference.

## Final disposition
- Verdict: READY / READY (dependency-gated) / READY WITH EXPLICIT LIMITS / PLANNER-BLOCKED / UNVERIFIED / NOT AUTHORIZED.
- Analysis completed, verdict delivered, and whether persistence is verified or pending.
- **First implementation action:** branch guard plus the first eligible T-ID or wave. No independent design preflight.
- Blocking corrections owned by the planner, as exact edits.
- Deferred findings, retained here. No new Change per finding.
- Proofs the reviewer did not execute.
- Re-review after correction: candidate SHA, former blockers, changed cards, affected dependencies and proof. Do not repeat unaffected simulations.

## Prompts

- Can the child edit from its T-ID, 2–5 anchors and the exact linked sections?
- Which first command fails because a generated type, export, working directory or fixture was omitted?
- Which supposedly parallel tasks share a manifest, lockfile, import barrel, database, port, working directory or Git index?
- Which negative would fail if the implementation allowed the forbidden behavior?
- Which unplanned decision would the executor be tempted to make?
- Does any blocker rest only on a guideline, a count or a formatting preference, without a material consequence?
- Would the same verdict stand after forgetting who authored the packet?
