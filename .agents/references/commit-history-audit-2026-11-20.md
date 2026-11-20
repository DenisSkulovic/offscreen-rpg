# Commit-message history audit | 2026-11-20

**Question:** Which features make hundreds of historical commits intelligible at a glance: kind of work, subsystem/Change, achieved result, causal reason, evidence and unfinished boundary?

**Method/source:** GitHub `DenisSkulovic/offscreen-rpg` history on `main` through `44272d9`, 40 commits/page. Inspected **all 640 messages on pages 1–16** (November 18–20) plus **400 on ten older sample pages** 17, 19, 22, 25, 28, 31, 34, 37, 40, 43 (September 17–November 18): **1,040 sampled messages**. This is not an exhaustive history census; identical subjects can occur on merges/cherry-picks. Message claims are not proof of tests.

## Findings

- In recent 640, **544 (85%)** already use a recognized Conventional-style `type(scope)` or `type:` header. Only **179 (28%)** have a body; **107 (17%)** mention a Change code in their subject; **148 (23%)** have subjects over 80 characters.
- In 400 older sampled messages, **274 (69%)** have recognized type prefixes; **112 (28%)** have bodies. Older free-form commits were often clear English but not machine-categorized. Combined sample: **818/1,040 (~79%)** with recognized type headers and **291/1,040 (~28%)** with bodies. Different sample dates are unevenly represented; do not project these as exact full-history rates.
- Repeated subjects make history hard to scan: `docs(plan): supersede broker-to-Temporal assumption after ARCH02 merge` and `docs(vision): require scene-state history and any-scene branching` appeared **eight times each** among the latest 640. This may reflect branch duplication rather than identical diffs.
- Type vocabularies drift: `feat`, `fix`, `docs`, `test` and `refactor` coexist with `policy`, `lab`, `app`, `tools` and completely unstructured “Fix”/“Add” sentences. `policy` and `lab` are useful distinct outcomes; `app` and `tools` are locations, not change types.

## Historic patterns worth retaining

| Example | Information gained | What the new rule adds |
| --- | --- | --- |
| `3992437` “Make isolated Storyteller families the HK03 acceptance suite” + body | Describes test isolation problem, reversal of bad timeouts and two 44/44 runs | Type/scope and explicitly labeled evidence |
| `3a1c9df` `app(story02): merge the provider-free generation claim` + body | Excellent honesty: *running Activity does not yet use claim* and workflow still one activity | Replace `app` with semantic type; put unfinished boundary in `Remaining:` |
| `93d57ca` `docs(queue): start the historical fork, the cluster pin Job, and the duplicate-import fix` + body | Notes “one writer holds the kind cluster” and other work parked | One coherent outcome/commit and explicit proof |
| `e612338` `feat(k8s): prove one synthetic two-hop trace on the kind lab` + body | Labels trace synthetic, records missing-hop negative and removed cluster | Name test command and keep synthetic qualification |
| `55b014c` `fix: stop recoverable storyteller failures from freezing play` | Excellent symptom-oriented subject | Add subsystem scope and what was checked |
| Numerous repeated `docs(work): ...` subjects with no body | Machine-readable category and stable scope | Distinguish causal reason and proof per commit |

**Decision:** Extend existing `type(scope): achieved outcome` convention with mandatory short `Why:` and truthful `Evidence:`, conditional `Remaining:` and optional `Refs:`. Do not rewrite old SHAs, fake checks, introduce an inflexible scope registry or pay for CI merely to police punctuation. The [canonical rule](../rules/git-commits.md), tested Node validator and repo-local `commit-msg` hook implement the decision. API commits require self-validation and GitHub server does not automatically run local hooks.
