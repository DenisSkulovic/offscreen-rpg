# Implementation overview

> **DOC01 compatibility stub.** Canonical orientation: [STATUS.md](../STATUS.md). Prefer editing STATUS for current demonstrated state.

## Orientation

**Status (reconciled 2026-11-15):** Local pre-POC **engineering portfolio**. Nov 12–15 waves landed substantial code (React W, Chamber CH, UX/PX/PF, ENG postwave, Admin AD, Storyteller SA, forensic OBS, GM slices). Sustained 10–15-turn live creative quality and production Support grants remain **unproved / absent**.

**What worked (historical gameplay, Sep 24 2026):** Six successful Sol generations, exact 1,800-fictional-second warehouse shift, six septims paid once, coherent short-term conversation. Deterministic mechanics, saved generation/publication, canonical storage and bounded provider accounting are connected. October 23 rediscovery corrected the earlier “no notes/lost all recall” diagnosis without a new live run.

**Current development priority:**
1. Keep [work/changes/README.md](../work/changes/README.md) as the selection owner. **Current change:** [DOC01 documentation architecture](../work/changes/open/2026-11-16--doc01-documentation-architecture/CHANGE.md) (**Selected**, P2/P3 product+technical owners landing). QA-SF01 remains **Blocked** open (fixture remainders / runtime defects — not current).
2. Open product/governance gaps (not auto-authorized): production Support grant steward; **OBS00-B** default-worker entitlement; OBS04 E0; live Story trial only with a **fresh** spend cap.
3. Permanent hubs were reconciled 2026-11-15 — see [documentation convergence ledger](../evidence/inspections/doc01-legacy-snapshot/engineering/evidence/documentation-convergence-2026-11-15.md). Do not treat stale “Proposed / no code” banners as truth.

Gameplay dossiers such as [S3a continuity](../work/changes/open/2026-11-11--s3a-continuity-report/CHANGE.md) remain deferred, not cancelled.

## Evidence and limits

The [connected proof](../research/legacy-engineering/connected-poc-proof.md#latest-evidence--2026-09-24) owns the dated Sep/Oct run identity. Forensic connected evaluation: [S0–S6 FINAL-HANDOFF](../evidence/inspections/doc01-legacy-snapshot/programs/observability/evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md) (0 paid). Post-trial safety: [FINAL-HANDOFF](../evidence/inspections/doc01-legacy-snapshot/programs/observability/evaluations/2026-11-15--post-trial-safety/FINAL-HANDOFF.md) (OBS00-L/C Done; QA-SF01 Blocked).

**Lifecycle:** Pre-POC, solo development on `main`, disposable local data. Checks under [verification](../.agents/rules/verification.md). Inference under [spending](../.agents/rules/spending.md).

## Implemented boundary (Nov 15 portfolio truth)

| Area | Exists now | Important limit |
| --- | --- | --- |
| Workspace | Next/Nest/Temporal/Postgres; shared packages; Chamber | Maps in [code navigation](../evidence/inspections/doc01-legacy-snapshot/engineering/code-navigation.md) |
| Frontend engineering | **W01–W11, W13–W22 Done**; TanStack Query SSR | F1–F15 remain the **target** contract ([react-next](../evidence/inspections/doc01-legacy-snapshot/engineering/targets/react-next.md)) |
| Player UX / presentation | **UX01–UX12, PX01–PX07, PF01–PF05 Done** | Human UX comprehension not validated |
| Engine | **ENG01/02/04/05/06/08/09 Done**; ENG03 **partial**; ENG07 Cancelled | Full short-lock refactor still Proposed |
| Admin | **AD01–AD08 Done**; `/api/admin` + `/control` | No production Support grant issuer |
| Storyteller packets | **SA01–SA12 Done** (scoped) | Creative quality / paid SA12 live unproved |
| Forensic / OBS | OBS00-A/L/C, OBS01–03/05, OBS06/07 synthetic **Done** | OBS00-B blocked; OBS04 Proposed; raw archive/E0/OTel absent |
| Mechanics GM | GM01/02/04/05/06 **Done** | GM03/GM07 Proposed |
| Provider/accounting | Review, reserve, dispatch, settle; wire equality; local trial caps | `budget.settle` continue defect deferred; commercial OBS00-B absent |
| Integration honesty | story-resolution 8/8; admin-situation 3/3; storyteller 27/33 | QA-SF01 Blocked remainders |

## Where to go next

Start at [changes queue](../work/changes/README.md) and [documentation map](README.md). Convergence program closed hubs vs code; remaining items are **implementation deviations** and **governance** — listed in the [ledger](../evidence/inspections/doc01-legacy-snapshot/engineering/evidence/documentation-convergence-2026-11-15.md) and [ChatGPT handoff](../evidence/inspections/doc01-legacy-snapshot/engineering/evidence/documentation-convergence-chatgpt-handoff-2026-11-15.md).

## What can be tried

[Development](../docs/runbooks/local-development.md). `pnpm chamber` offline; `pnpm story:local` with separately authorized live generation. `/demo` is browser-only prototype. Green fixtures ≠ meaningful agency or owner enjoyment.
