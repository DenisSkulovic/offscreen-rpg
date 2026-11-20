# WIKI08 | Falsifiable content-quality proof

**Not run by the design author.** This checks a real content-risk detector and *real corrected claims*, not a green navigation dashboard.

## Run on 2026-11-17

`pnpm wiki:content-health --self-test` passed. A fenced "not yet implemented" snippet does not count, and a sentence that calls an old note dated evidence does not count. The live scan's remaining candidates are the two observability pages that say "proposal only" and "not installed or authorized". They stay in `docs/technical` because STATUS already records them as proposal-status pages. They were not moved and not ratified. `test:fast` and `test:watch` exist in package.json. No test suite was run, so the runbook does not claim they pass. `pnpm wiki:health` on `024c05b5` was 74/74 reachable. `pnpm wiki:bench:static --self-test` passed. `python scripts/check_docs.py` reported 0 problems. [CLAIMS.md](CLAIMS.md) is an author draft, not an independent audit. The packet is closed on that basis.

## Static risk fixtures

- Detect a current runbook phrase “W20 `test:fast` is not implemented” **as a review candidate** when root `package.json` contains the script. Presence is not proof the command/test succeeds.
- Detect proposal-only Observability content inside the normative technical corpus as `authority-needs-selection`, without falsely treating `selected future, source absent` as a defect.
- Flag “current code navigation” pointing to old `evidence/inspections`/`research/legacy-engineering`; allow a clearly historical citation to the same path.
- Warn when an H2 is ~17 KB without finer route; don't hard-fail a long, coherent selected contract solely by byte size.
- Detect a fake code-reference path absent from the repo; do not treat a fenced-code example as a real repo path.
- Distinguish a duplicate full normative clause from a legitimate short summary in two documents; require review for semantic contradictions.
- A small, precise page without “Owns:” template must not be considered broken merely for lacking a banner.
- No automatic model summarization, no paid calls, no mutation of canonical files from the scanner itself.

## Source-grounded remediation acceptance

| Claim/topic | Must be demonstrated |
| --- | --- |
| Runbook `test:fast` and `test:watch` | Verify actual root/web `package.json` scripts, scopes and safety, then correct false `planned` paragraph; W21 CI inspected separately and not asserted green just because archived |
| Frontend playbook | Current normative skill/source README replaces “chosen legacy playbook” as agent default, unique safe command hints preserved |
| Product experience intros | Old DOC01/P2 “reconciled from ...” migration provenance no longer displaces present rule in first screen; original negative cases and selected promise remain |
| Technical topology/context maps | Current code owners named from source READMEs; old evidence remains dated, not current executable routing |
| Large Storyteller sections | Exact owner heading/range and original negative interleavings preserved; measured target-question excerpt smaller or accurately continuable |
| Capture/telemetry/identity proposals | Ratified clauses separated from unapproved options; exact OBS04 links remain; no new raw Support permission, OpenTelemetry installation or writer code authorized |
| 30-claim audit | Each has accepted source/decision evidence, correct tier or explicit not-yet-reviewed; unresolved not hidden behind aggregate “pass” |

## Commands and output

```bash
git status --short
git rev-parse HEAD
pnpm wiki:content-health --self-test
pnpm wiki:content-health --json
pnpm wiki:health --json
pnpm wiki:bench:static --seed 20261116 --json
pnpm wiki:find "When is W20 test:fast available?" --top 5
pnpm wiki:read docs/technical/storyteller/context-and-memory.md --outline
python scripts/check_docs.py
pnpm repo:docs-health
git diff --check
```

At close, report actual exits and full SHAs, content findings with confirmed/false-positive statuses, total canonical page count and reachability after any reclassification, before/after context excerpt bytes, a claim-level correctness ledger and remaining blocked owner choices.

**Hard stop:** false production permission / money policy, silent ratification of future gameplay, unproven “now implemented” claim, archive packet removal, missing negative cases, or model/provider calls. Do not rewrite historical completed Changes to satisfy current link checks. Do not claim all wiki content is reviewed merely because 30 selected claims passed.
