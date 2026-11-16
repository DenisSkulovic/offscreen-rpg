# Cursor resumption checkpoint | Local live safety

**QA-SF01 BLOCKED, partly repaired (2026-11-15, provider-free).** story-resolution 8/8, admin-situation 3/3, storyteller 27/33 (was 6/33); 5 subtests remain red on genuine runtime defects. Receipt [qa-sf01](../../evidence/qa-sf01-storyteller-integration-2026-11-15.md). Active Change: QA-SF01 (Blocked, awaiting an owner-selected bounded runtime Change). Live trial still NOT authorized.

**OBS00-L and OBS00-C DONE (2026-11-15, provider-free).** Next phase is QA-SF01 as the owner's one authorized Change (not started). Previous S0–S6 budget permission does **not** carry over.

- Source baseline: OBS00-C built on `main@c887716a53698c2e1afe375b91b41342787f75c3` (OBS00-L); the OBS00-C commit SHA is in the Git log / return message
- Active Change: none (cleared after OBS00-C)
- Latest finished: [OBS00-C](../../../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md), receipt [obs00-c](../../evidence/obs00-c-provider-wire-equality-2026-11-15.md); before it [OBS00-L](../../../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md), receipt [obs00-l](../../evidence/obs00-l-local-story-trial-guards-2026-11-15.md)
- Previous recommendation (now worked): [QA-SF01](../../../../../../../work/changes/open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md) (**not started**). It must also add `prepareWire` attestation to the plain fake providers in `tools/api-integration/test/{storyteller,start-package}.integration.ts` (see OBS00-C receipt finding 2).
- Paid local Story trial: **NOT AUTHORIZED** until the owner approves a new explicit cap; both OBS00-L and OBS00-C guards are now proven provider-free. Generic worker still denied (OBS00-B).
- Total actual provider attempts this wave: 0 real (mock transport only)
- Spend: $0; external HTTP: 0
- Last result (OBS00-C): reviewed packet SHA == `RequestInit.body` SHA/length for one-shot, repair R, memory decision + final rounds, held→released, worker-wrapped and local-Story compositions; a one-byte divergence is refused pre-reserve with 0 HTTP, no attempt row and an untouched review; chamber suite 35/35, new file 15/15.
- Known limits: provider receipt not proven (mock transport only); pre-existing `budget.settle` defect from `7ba3ff1d` blocks the real memory controller loop after round 1 (pinned by a test, separate Change recommended; the local Story profile has no memory reads); `ENG03-M` application live test is red (stale expectation) and rewrites the uncommitted `eng03-lock-measurement` doc; real `story:server` not launched.
- Next exact action: `git status --short; git rev-parse HEAD; pnpm repo:brief`, set Current change to QA-SF01, read its CHANGE.md, run only the named focused suites on disposable `offscreen_auth_test`.
- Next evidence commit: runtime-defect Change (owner to select)
### End each Cursor session with

~~~text
Current UTC:
Selected Change / status:
Git source SHA and current branch:
Command actually executed, exit, elapsed:
Normal source/SQL proof (ID, hash/amount):
Negative source/SQL proof:
External requests / settled / uncertain and remaining cap:
New files and committed Git SHA:
Next one selected Change or safe evaluation:
NEXT EXACT COMMAND:
~~~

**Do not confuse "future intended tests" with actual results.** If owner declines paid provider, stop at provider-free proof and report that honestly.
