## Planning update: modular-monolith finish line expanded (2026-11-21)

**Latest inspected integrated code:** MA10, WR09A, and MA11 on `undertaking/storyteller-workshop`. The Application compatibility package is gone and the 112 tests run from API Integration. Writer response custody is crash-safe under a fake provider. **Revised rough estimate:** modular monolith **~85% complete / ~15% remaining**, Storyteller **~60% / ~40% remaining**, blended undertaking **~70% / ~30% remaining**, **±10–15 percentage points**. Worker generation-evidence typecheck is still not green. Live provider play is not proved.

## Post-MA08 execution choice, November 21

**MA10, WR09A, and MA11 are joined.** [MA10](../../changes/archive/2026-11/other/2026-11-21--ma10-module-boundary-enforcement/CHANGE.md) removed the Application facade and kept all 112 tests. [WR09A](../../changes/archive/2026-11/other/2026-11-21--wr09a-durable-writer-provider-response/CHANGE.md) stores the private provider response and settles the charge in one transaction, using a fake network. [MA11](../../changes/archive/2026-11/other/2026-11-21--ma11-story-engine-boundary-ratchet/CHANGE.md) records Story Engine domain edges and the two host runtime dependencies. The [integration contract](PROGRAM.md#post-ma08-three-lane-execution-contract-2026-11-21) is the historical execution record.

**Progress is now modular monolith ~85% (~15% remaining), Storyteller ~60% (~40% remaining), combined ~70% (~30% remaining), ±10–15 percentage points.** Real Writer worker wiring, authority→Writer inversion, public API/SCC cleanup, longform quality proof and final main landing remain. None of this authorizes a paid provider call.

## Upcoming architecture/operability wave, designed while current Cursors execute (2026-11-21)

**Current implementation wave remains MA10 + WR09A + MA11. Do not swap or interrupt those Cursors.** The next three independent source ownership candidates are [WR09B](../../changes/open/2026-11-21--wr09b-durable-writer-round-replay/CHANGE.md) (private-CAS response → durable tools → next model round → proposal, **blocked until WR09A merged API recheck**), [OPS12](../../changes/open/2026-11-21--ops12-distributed-worker-lifecycle/CHANGE.md) (real partial-start and failed-stop cleanup gaps, READY post-wave), and [DX12](../../changes/open/2026-11-21--dx12-correct-affected-build-checks/CHANGE.md) (safe affected-package local build/typecheck/test and cache evidence, READY post-wave). Their expected source write sets do not overlap; SQL and integration commits have one custodian. **These planning commits do not raise completion estimates.** Long-form playable Writer, funded real provider run, remote crash/scale observation, MA09 Authority boundary inversion and possible later Writer package extraction remain distinct finish gates.

## 🎯 What are we building?

You give a one-sentence premise and enter a persistent fictional life. You can choose, work, wait, leave and come back. The Writer remembers what *actually* happened and narrates the next consequential scene. Old scenes are available to read or fork into a different future. The monorepo beneath it has clear owners and no accumulating `application` junk drawer.

## 📊 Rough completion estimates

| Track | Our current estimate | Remaining | What the number means |
| --- | ---: | ---: | --- |
| 🏗️ **Modular Monolith shaping** | **~85%** | ~15% | The Application package is gone. Authority→Writer inversion and final validation remain |
| 🎭 **Storyteller evolution** | **~60%** | ~40% | Library, scene truth, launch, forks and a scripted scene-1→2→3 gameplay kernel exist; real integrated provider, research, user-facing journey and convincing quality proof are incomplete |
| 🧭 **Combined undertaking** | **~70%** | ~30% | A subjective effort-and-risk blend: roughly **70% Storyteller / 30% architecture**, rounded to the nearest 5 percentage points |

```text
Modular Monolith  85%  █████████████████░░░   ~15% left
Storyteller       60%  ████████████░░░░░░░░   ~40% left
Combined          70%  ██████████████░░░░░░   ~30% left
```

**Confidence:** low-to-moderate, **roughly ±10–15 percentage points**. These are **subjective estimates of remaining engineering effort and integration risk**, not completed-Change ratios, tested-feature coverage, a deadline or a promise that exactly 35% effort remains. Storyteller's *proven end-user experience* lags behind the foundational code. Percentages can go **down** if real provider or long-form acceptance reveals major defects; do not mechanically increase them whenever a packet closes.

**Why these numbers?** Monorepo package extraction is done, production hosts call Story Engine directly, and the Application package is gone. Authority inversion and final integration work remain. Storyteller's core pieces, scripted continued-scene tests, and provider-free research children are present. The live provider journey, narrative quality, and broad fault/end-to-end proof remain. A successful scripted test is not the same as a demonstrated live AI-powered game.

## At a glance

| Major capability | Verified state on undertaking | Human interpretation |
| --- | --- | --- |
| 🧱 Package separation and domain owners | **Mostly achieved** | API, Game Authority, and worker import Story Engine directly. The Application package is removed |
| 📚 Library, Writer Workdesk and immutable scene history | **Implemented** | Source-aware memory foundation and v2 publication are in place |
| 🌿 Historical forks with active commitments | **Implemented** | WR06 is archived; broader player journey still needs acceptance |
| 🚪 One-prompt opening | **Scripted implementation** | WR07B archived; public Launch feature remains gated |
| 🎭 Actual choices and subsequent Writer scenes | **Scripted kernel implemented** | P3-A plus WR08: characterless `observe` on the first scene and a scripted `writer.scene.v1` wake; not a live-model UI |
| 💳 Real provider transport / spending custody | **Code integrated, live proof missing** | P3-B archived, transport and usage-settlement tests exist; end-to-end Writer-loop injection/real spend must still be verified |
| 🧪 Long-form acceptance harness | **Harness integrated** | P3-C archived; does not prove all long-story or live-narrative quality criteria |
| 🔍 Independent research children | **Scripted implementation** | WR04: explicit grant, read-only children, shared operation cap, verified join. Not a live provider proof |
| 🎮 Complete Play/reentry UI | **Gated scripted path implemented** | WR08 archived: Play uses the real action API when the Launch flag is on. History and fork UI were already present. Live provider play is not accepted |
| 🧹 Final monorepo cleanup / main merge | **Outstanding** | Application retirement is joined. Authority inversion, final validation, and undertaking retirement remain |

## 🗺️ The journey

```mermaid
flowchart LR
  A["✅ Foundations / scene truth"] --> B["✅ Scripted Launch + forks"]
  B --> C["✅ Scripted choice → scene 2 → 3"]
  C --> D["🔧 Research + real-provider integration + Play UX"]
  D --> E["🧹 Bulk monorepo cleanup + final tests"]
  E --> F["🏁 Merge main / Done"]
```

**Interpretation:** we've moved beyond building the engine room. The next stretch is turning these pieces into a *complete, observable, trustworthy experience*, then finishing the package structure. It is not 65% of end-user acceptance tests passing.

## ✅ What is already achieved

- Major Story Engine/Admin ownership extraction and core package restructuring.
- Persistent Library and Workdesk, verified sources, Writer missions and historical v2 scene truth.
- WR07B scripted one-prompt opening and WR06 active historical fork reconstruction.
- **P3-A** integrated world-neutral narrative-intent admission, existing fictional-time authority and Writer scene 2→3 publication, with focused scripted tests.
- **P3-B** integrated real Writer transport and usage-settlement custody with provider-free tests. **No funded live call has been proved.**
- **P3-C** integrated a provider-free long-form acceptance runner. Its presence does not by itself certify narrative quality.

## 🔨 What remains, as concrete outcomes

1. **Joined architectural and custody wave:** [MA10](../../changes/archive/2026-11/other/2026-11-21--ma10-module-boundary-enforcement/CHANGE.md), [WR09A](../../changes/archive/2026-11/other/2026-11-21--wr09a-durable-writer-provider-response/CHANGE.md), and [MA11](../../changes/archive/2026-11/other/2026-11-21--ma11-story-engine-boundary-ratchet/CHANGE.md) are on the undertaking branch. Pure legacy tests 215/215, WR09A disposable custody 9/9, module-graph tests 26/26.
2. **Actually run the creative Writer.** A later WR09B wires real provider-shaped model decisions, Worker credential/policy composition, launch/continuation and delegated research into existing admission/publication, first through fake fetch and no paid calls. Provider funding requires separate explicit approval.
3. **Close the authoritative architecture.** MA09 inverts the existing Authority→Writer implementation edges while preserving current SQL locks/receipts; final module SCC/public export ratchet after it, not premature splitting of packages.
4. **Product and release acceptance.** Demonstrate actual prompt → meaningful playable choices → source-faithful long-form scenes → reentry/history/fork, recover after faults, prove owner/permissions/charge/idempotency negatives; reconcile ledgers/STATUS and merge the undertaking to `main` only after end gates.

## 🧭 Current decision and evidence

**MA10, WR09A, and MA11 are joined.** The Application package is gone, writer response settlement is crash-safe with a fake provider, and the two previously undeclared host imports are runtime dependencies. The rough figures above are **85% architecture, 60% Storyteller, 70% combined**, ±10–15 percentage points. No external provider spend has been authorized.

**Integration rule:** Three worktrees can implement in parallel; only one custodian joins `undertaking/storyteller-workshop`, regenerates the lockfile, runs combined proofs, archives and updates the overview. See [exact collision matrix](PROGRAM.md#post-ma08-three-lane-execution-contract-2026-11-21). Future Cursor parents must not independently self-merge these three Changes while siblings remain active.

## ⚑ Required maintenance

- **ChatGPT reads this page first** at Undertaking cold start, rechecks its claims against integrated HEAD/Change receipts and updates **the three numeric estimates** after material integrations, scope or risk changes and before commissioning another wave. Do not leave estimates frozen while underlying capabilities change.
- Preserve **three numbers (Storyteller %, monorepo %, combined %)**, remaining percentages, an uncertainty statement and the reasoning behind movements. Round to 5% increments; prefer a defensible judgment to fake precision. If cannot estimate one axis, explicitly mark it uncertain and explain instead of silently deleting the metric.
- **Proactively show the supervisor the numbers and a plain-language interpretation** at significant milestones and handoffs, with a link here. No need to repeat an unchanged chart after every T-ID; do not promise autonomous background monitoring.
- The **integration custodian** serializes substantive overview edits from accepted receipts. The technical ledger, `STATUS.md` and branch state stay factual authorities; this page is a human communication layer, not a second queue.
- On closure present a final before/after and any limitations, then retire the temporary page with the undertaking.

**Technical evidence:** [Undertaking ledger](UNDERTAKING.md#whole-undertaking-completion-control--living-ledger) · [Execution program](PROGRAM.md) · [Monorepo dossier](../modular-monolith/UNDERTAKING.md) · [Demonstrated status](../../../STATUS.md).
