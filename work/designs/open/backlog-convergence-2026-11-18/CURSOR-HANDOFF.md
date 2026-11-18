# Cursor execution handoff | backlog convergence, 2026-11-18

**Scope:** implement existing 16 open packets to a genuine terminal outcome. Read [audit](README.md) and [selected decisions](CONTRACT-DECISIONS.md). This handoff is a sequencing guide **not** a mega-Change; retain the repository's one-current-Change practice. Owner has authorized bounded design and code preparation/implementation in this conversation. No paid provider, actual production spend, nondisposable database reset, unreviewed accounting settlement or bypass of a security boundary.

## Queue in the order that removes dependencies

**Wave 0, housekeeping and source verification:**
1. **BOOK01 then BOOK02:** confirm exact source/build receipts, mark Done and run `node scripts/repo-tools/archive-changes.mjs --dry-run` then `--apply`. Fix every inbound relative link and ledger/STATUS/phase-2 records. Do not re-implement a working reader.
2. **HAR05:** in real checkout run `pnpm repo:snapshot:chatgpt:test`, `pnpm repo:snapshot:chatgpt`, `pnpm wiki:find --self-test`, `pnpm wiki:health`. Inspect ZIP `SNAPSHOT.json` and `WIKI-INDEX.json`: same HEAD, no dirty contents, no unsafe fallback; archive Done if green. Uploaded prior ZIP already has matching manifest and portable index; independent extracted exporter tests were 2/2.

**Wave 1, independent no-spend work:**
3. **DIR02:** optional exact publication INSERT of validated V1 atmosphere through `stories/persistence.ts`, `storyteller/publication.ts`; verify `stories/reads.ts` and `apps/web/src/features/play/ui/appearance-roundtrip.test.tsx`. Deterministic fixture, duplicate/stale/invalid tests. Do not install DIR03 here.
4. **HK04:** mode matrix and pure launch plan, provider-disabled denial tests, one contained orchestrator extraction. `tools/chamber/src/main.ts`, `modes/cli-flags.ts`, `story-funding.ts`, `story-provider.ts`, `stop.ts`.
5. **S3a:** `scripts/repo-tools/story-session-report.mjs` only; source-linked five-state provenance, read-only fixtures.

**Wave 2, recover honest testability and safe uncertain outcomes:**
6. **QA-SF01:** against the documented disposable `offscreen_auth_test` only, reproduce the named five surviving Storyteller failures at HEAD. Fix runtime owners without changing behavioral expectations; keep separate failure receipts for unrelated faults. Do not run connected test commands without checking the target and safety script.
7. **HK03:** after capturing the red baseline, split the integration suite with test count/name parity, preserve known reds and negatives; then re-run after QA fixes. The extraction does **not** need to wait for every runtime defect to be solved.
8. **HK01:** pure saved-response validator, safe review command and explicit current local settlement behavior; fixture tests. Replace old recovery script only after the replacement proves uncertain/duplicate/wrong evidence cases.

**Wave 3, authority and provenance:**
9. **OBS00-B:** versioned independent persisted platform/entitlement/restriction/funding provenance; worker resolver; deny-by-default; mock on-wire equality for every provider round. Do not enable live sending while tests/sources are incomplete.
10. **OBS04:** bounded E0 source-transaction evidence for finite settle/interruption; measure lock and byte overhead in permitted disposable environment.

**Wave 4, small mechanistic feasibility decisions with actual implementation or decisive no-need proof:**
11. **ENG03:** measured per-family source snapshot of the next actual slow I/O case; exact consistency and conflict test. Keep C1/C2 intact.
12. **SA07:** 12-case and 200/2000-scene affordable corpus, choose one missing authorized source; direct cue fix or one typed read op, with provenance. No vector-service install.
13. **GM03:** three-entry accepted itinerary vs bounded standing routine. Implement the smallest source-faithful behavior, stop at each new decision and 1800 fictional seconds.
14. **GM07:** exact per-published-decision consent, 20-real-minute expiry, row-lock race and revocation test.
15. **DIR03:** **after DIR02**, optional model-output sidecar parser/validation with provider-free fixtures and five-passage creative review. A live trial is a separately explicit paid authorization; output correct prose without direction.

## Every Change exit checklist

- Refresh `git rev-parse HEAD`, `git status --short`, and `pnpm repo:brief --json`. If Cursor is already editing, do not stomp uncommitted work.
- Read the relevant current canonical product + technical owner and code owners; record exact retained behavior, expected new behavior and the distinguishing negative. Run focused provider-free tests, then only explicitly safe integration environments.
- Update the **canonical product/technical docs where the change actually modifies their claims**. Append a completed P/T/Code/Related reconciliation ledger with concrete source/test evidence, not “unchanged” by habit. Update maps and STATUS.
- Distinguish **source inspected**, **unit proven**, **DB proven**, **browser observed**, **live paid observed**. Never describe an unrun check as passed.
- Archive Done only with evidence and links reconciled; a finding that the requested *new* code is unnecessary can be Done as a source-backed adopted existing path, not as a forgotten feature. If an independent external authorization or real system failure blocks a live step, implement every safe local part, report the exact remaining test and failure and proceed with other independent packets.

## Do not do

Do not dismiss this initiative as “everything remains blocked”. Do not make a mega-refactor of ENG03. Do not change game time/calendar expectations to make QA green. Do not remove the unique local saved-response repair before a replacement exists. Do not fake new standing-life mechanics or automatically select model-authored art. Do not start network/provider/DB operations on assumed user permission. **Engineering is finished when the behavior or honest experiment is finished, not when someone changes a Markdown adjective.**
