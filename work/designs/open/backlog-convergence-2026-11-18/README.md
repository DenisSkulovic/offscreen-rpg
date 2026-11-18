# Backlog convergence | 2026-11-18

**Authority:** execution/triage decision for the 16 `work/changes/open` packets on committed `main@92ed12ba2884fd9a65d54a83b926c306d49b8833`. This is **not** a substitute for canonical product/technical specifications, code receipts, or completed validation. Owner requested design-to-execution rather than passive Blocked/Parked statuses. **No** paid dispatch, non-disposable DB reset, production entitlement grant, or destructive recovery is authorized.

**Executor entry:** [CURSOR-HANDOFF](CURSOR-HANDOFF.md). **DIR02 exact seam:** [writer blueprint](DIR02-WRITER-BLUEPRINT.md). **Decisions and migration boundaries:** [CONTRACT-DECISIONS](CONTRACT-DECISIONS.md). The [Change queue](../../../changes/README.md) remains the source for one selected current change at a time. This initiative is not a 17th mega-Change.

## What was wrong with the queue

1. **Done in code, open in paperwork:** BOOK01 and BOOK02 report the source, tests, and technical documentation updates already landed; the queue still calls them Ready. This is a maintenance failure. Archive with link rewrite and ledger reconciliation, not another implementation.
2. **Missing implementation mislabeled as forbidden:** DIR02 reported that `story_passage.appearance` exists and the authoritative insert omitted it. The subset writer later landed. Do not rebuild it. It did not require a new agent, model spend, or schema migration.
3. **A red test treated as a scheduling blocker:** QA-SF01 has genuine remaining failures after fixture repair; HK03 can preserve and isolate failing cases without requiring a green suite first. Fix the runtime separately under the original assertions.
4. **Real security/custody blockers:** HK01's CLI is the only current saved-response uncertain-attempt recovery described in the packet; deletion without replacement loses a safety capability. OBS00-B lacks independent current server-owned entitlement, and `story.usagePolicy` is a captured snapshot. Reusing it as current entitlement would be a security bug. These require **building missing owners**, not lifting the fences.
5. **Gates with no decisive next action:** GM03, SA07, and ENG03 list feasibility questions but give coding agents permission only to ask for further permission. A provider-free discriminator with a specified stop/go decision is legitimate actionable work. Investigations must produce an accepted implemented remedy, a falsified need, or an exact source repro; they must not re-park themselves for lack of enthusiasm.
6. **Authorization vs evidence confusion:** Ready means the **safe bounded work is authorized by this owner request**. It does not mean the work has passed, a provider call is approved, production billing is live, or a nondisposable database may be touched.

## Packet-by-packet disposition

| Packet | 2026-11-18 source diagnosis | Concrete path out | Closure condition |
| --- | --- | --- | --- |
| BOOK01 | BookSurface/BookContents/StoryFrame implemented; packet receipt reports 202 fast tests, web build and typecheck | **Close/archive housekeeping** with inbound link repair | Archived Done; no new code |
| BOOK02 | Journal overview/reader implemented; packet receipt reports 205 fast tests and typecheck | **Close/archive housekeeping** | Archived Done; no fabricated search/recap |
| HAR05 | Clean checkout export at `dfb25d72` is ready: 294 pages, 2112 sections, 0 broken links. The source-only ZIP stays disabled | **Done** | The indexed ZIP matches that commit and a sensitive path has no GitHub fallback |
| DIR02 | Optional JSONB exists. The publication insert can store a validated scene subset. The worker supplies no candidate | **Done** | Invalid candidates are omitted. SQL publication was not executed |
| DIR03 | Depends on DIR02; live model budget/quality genuinely absent | **Build offline optional-output parsing + comparative fixture**, preserve no-spend | Provider-free author sidecar supports valid and absent; live adoption separately requires spend |
| HK01 | A working local uncertain-attempt settlement path would be lost | **Replace recovery first**, then safely retire old entry | Trusted identity, hash/attempt match, idempotent no-cost dry-run + carefully authorized commit path |
| HK03 | QA-SF01 baseline red; monolith hard to debug | **Split without asserting green** and preserve exact test IDs and test totals | Full parity and targeted failure isolation, no skip |
| HK04 | The pure launch plan denies a bad database and a missing Story authorization. Ordinary Chamber stays provider-disabled. The process boot stays in main.ts | **Done** | Live Chamber tests were not executed |
| QA-SF01 | Instant settlement stops at a controlling world deadline. The focused suites had 0 failures | **Done** | The fifty-five second expectation stayed. A succeeded generation still cannot keep an operation open |
| OBS00-B | No independently loaded current policy/entitlement on default worker | **Build server-owned current authority chain; default deny throughout** | Revoke/owner/route/funding negatives + exact on-wire mock attestation |
| OBS04 | E0 writer and physical schema are not built | **One finite-action transactional witness** with bounded schema | Source/E0 atomically paired; rollback/duplicate/interrupt proof |
| ENG03 | C1/C2 narrow source capture already implemented; parent describes an overlarge old rewrite | **Source-family inventory then one remaining measured off-lock slice** | 2s slow I/O off lock, exact old source fence, no migration of unrelated purposes |
| GM03 | Existing bounded accepted plans may satisfy quiet-watch use case | **Compare 3-step existing itinerary vs repeat contract**; ship minimal path | Three exact 600-second segments or documented demonstrated equivalence; no new autoplay bus |
| GM07 | Timed defaults exist for legacy decision, but per-decision consent does not | **Implement precise one-decision consent and expiry race**, reuse existing atomic selection | No consent -> no auto answer; exact option, revocation/expiry races |
| SA07 | Existing ask/read memory explorer may cover cases with lexical/alias correction | **Label failure first**, only add one read op if necessary | Verified case retrieval & final packing improve or prove tool unnecessary |
| S3a | The local report separates proposed, published, retained, selected, and packed evidence. A missing field is unknown | **Done** | A proposed body is omitted. A catalogue-only handle is not packed |

**Classification:** closed-but-unarchived 2; verifying 1; source-authorable deterministic 4 (DIR02, HK03, HK04, S3a); constrained runtime repair 2 (QA-SF01, HK01); privacy/spend-critical architectural 1 (OBS00); selected experimental or bounded-mechanics 6 (DIR03, OBS04, ENG03, GM03, GM07, SA07). The exact grouping is for triage, not an implementation metric.

## Evidence and technical red lines

- `packages/application/src/stories/persistence.ts::insertContinuationPassage` inserts no `appearance`, and `packages/application/src/storyteller/publication.ts` calls it after its settled/stale and revision checks. `packages/db/src/schema/stories.ts` already declares optional `storyPassage.appearance`.
- `packages/application/src/storyteller/config.ts` explicitly omits `dispatchAuthority`; `packages/application/src/storyteller/usage-policy-resolution.ts` intersects profiles **passed in**, but does not load independently current entitlements. `story.usagePolicy` is a snapshot, not an entitlement registry.
- `scripts/repo-tools/reconcile-storyteller-response.mjs` checks uncertain generation+attempt and saved response, then calls `budget.settle`; deleting the file without an equivalent safe recovery owner eliminates that action.
- `packages/application/src/stories/timing.ts` already resolves timed defaults for a different contract. GM07 adds per-decision consent, not another universal clock.
- `packages/application/src/campaign/accepted-plans.ts` already has horizon/entry constraints. GM03 must justify a new routine against that capability.
- Source ZIP `SNAPSHOT.json` and `WIKI-INDEX.json` both declare source commit `92ed12ba...`; summary: 292 pages, 2,103 sections, 195 omitted archived links and zero broken links. Local `node --test scripts/repo-tools/chatgpt-snapshot.test.mjs`: 2/2 passing against extracted source, **not** a clean-checkout pnpm command.

## Decision protocol that prevents fake blockage

For each selected Change, Cursor must (a) cite the precise current source and missing assertion, (b) make the smallest safe code/test/docs delta, (c) run every **permitted** test it can actually run, (d) record honest pass/fail/skip, (e) close/archive Done only after evidence, or (f) record a **specific next executable repair** when a real failure persists. Merely restating “needs design”, "owner approval", “risky”, or “not Ready” after this scoped authorization is not an acceptable outcome. Inability to run a destructive/live test must not be disguised as a passing test; it also need not stop source-safe implementation and local unit fixtures. A failed experimental discriminator is a **completed decision with proof**, not a forever-pending Change.
