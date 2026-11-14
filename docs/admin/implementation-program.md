# Offscreen Control | staged technical implementation program

**Status:** Scoped core technical target selected, **AD01–AD08 Changes Proposed, not Ready**, 2026-11-14. **Product authority:** [accepted product direction](product-acceptance-and-scope.md). **Technical authority:** [technical index](technical/README.md) and [architecture review](technical/architecture-review-2026-11-14.md). **Source basis:** [audited snapshot](technical/source-baseline-2026-11-14.md), which must be rechecked against Cursor's current `main` before execution. **No application code was changed, tests run, live spend authorized or current Change selected** by writing this program.

## Program objective

Deliver a **small, genuinely secure Admin foundation** that can scale into the approved operating platform: explicit staff sessions, bounded grants, read-only Player 360, source-backed gameplay/AI/usage diagnostics, a Next operator experience, staff access review and minimal case-linked support. It is *not* a mandate to ship all ten workspaces at once.

All packets are expected to change **code, executable schema or tests** when implemented. Product design and architecture investigation are not masquerading as Changes.

## Dependency routes

```text
AD01 Staff principal, session + audit bootstrap
  └── AD02 Bounded grant policy and Nest Admin guard
         └── AD03 Safe Player search + Player 360 read API
                ├── AD04 Protected Next /control shell + browser privacy proof
                │      ├── AD05 Campaign/AI status drilldown
                │      ├── AD06 Technical usage exposure (not billing)
                │      └── AD07 Staff access and audit review
                │                     └── AD08 Support case anchors and assignment
                └── AD05 source read/API can be prepared independently
```

**One active packet at a time by default**, especially when several touch `apps/api/src/app.ts` or the shared admin auth guard. Read one packet first, then 1–2 source-owner maps and relevant implementation symbols. Do not load all documents into Cursor context.

## Proposed Change catalogue

| ID | Code-bearing outcome | Dependencies | Packet |
| --- | --- | --- | --- |
| **AD01** | Explicit staff principal, revocable Admin-purpose session, inert bootstrap package assignment and audited out-of-band bootstrap; no customer permissions before AD02 | None; current source recheck | [Staff session](../changes/2026-11-14--admin-staff-session/CHANGE.md) |
| **AD02** | Typed scoped complete-grant evaluator, deny-by-default Nest Admin guard | AD01 | [Grant policy](../changes/2026-11-14--admin-grant-policy/CHANGE.md) |
| **AD03** | Secure exact-ref player search and redacted Player 360 read API | AD02 | [Player safe reads](../changes/2026-11-14--admin-player-safe-reads/CHANGE.md) |
| **AD04** | Dedicated Next `/control` SSR shell, isolated Query and revoked-session behavior | AD01–AD03 | [Operator shell](../changes/2026-11-14--admin-operator-shell/CHANGE.md) |
| **AD05** | Safe campaign metadata -> generation status drilldown; no raw prompts/narrative | AD03, AD04 for UI | [Game/AI diagnostics](../changes/2026-11-14--admin-game-ai-diagnostics/CHANGE.md) |
| **AD06** | Technical-only funded usage/status views, reservations/uncertainty/freshness | AD03, AD04; coordinate AD05 source owners | [Usage exposure](../changes/2026-11-14--admin-usage-exposure/CHANGE.md) |
| **AD07** | Staff effective access, safe audit review, no privilege-changing UI | AD01–AD04 | [Access and audit review](../changes/2026-11-14--admin-staff-access-review/CHANGE.md) |
| **AD08** | Native minimal support case anchors and governed assignment, no authority laundering | AD02, AD03, AD07 | [Case anchors](../changes/2026-11-14--admin-support-case-anchors/CHANGE.md) |

## Milestone acceptance

- **M1 (AD01+AD02):** a player-only cookie cannot use Admin, staff sessions revoke, complete grants never merge into unintended authority, bootstrap is deliberate and audited. Still **no customer data UI**.
- **M2 (AD03+AD04):** an authorized employee finds a named customer and sees only permitted source-backed metadata, with SSR/browser/query isolation proved against nonstaff and revocation.
- **M3 (AD05+AD06):** source-backed campaign/AI/technical-usage status can be investigated without raw story content, fake paid subscription data or provider spend.
- **M4 (AD07+AD08):** access provenance and safe support case references are reviewable; case assignment does not create unrelated privilege.

**Do not claim a milestone complete because a fixture UI renders.** V0 pure policy, V2 disposable DB/Nest and V3 browser verification are mandatory at the seams identified by each packet.

## Future capability streams (NOT authorized to draft into Ready yet)

- Granular staff invitations and privilege assignment workflows with independently verified acceptance/assurance.
- Purpose-bound private narrative/model-context access, and truly non-mutating View as Player.
- User-facing subscription/refund/compensation with approved customer metering and provider reconciliation.
- Shared-campaign participant rights, legitimate collaborative repair, diagnostic sandbox/Chamber-safe bridge.
- Controlled platform sponsored-spend stop after dispatch-seam proof.
- Real LiveOps version/rollout commands, safe data-rights handling, Trust cases and Growth campaigns.
- Advisory AI investigator under scoped evidence and human approval.

Those are not AD09 automatically. Each needs specific accepted policy, source/architecture review and bounded measurable code outcome before creating its own packet.

## Handoff protocol

Before Cursor:
1. Fetch latest `main`, re-inspect touched modules because Cursor may be working locally; inspect both the design branch and any new engine/frontend changes.
2. Import only Admin documentation and **the chosen** Change packet; avoid overwriting `docs/changes/README.md` or unrelated working tree.
3. Confirm one selected packet is source-valid, change its state to **Ready** with explicit owner instruction, and update the single current Change pointer in `docs/changes/README.md`.
4. Run safe focused proof; disposable `offscreen_auth_test` reset only with explicit permission. No real LLM/billing, deployment, destructive non-test data or broad CI spend.
5. Review actual delta/evidence, mark Done/Blocked, clear current Change and select next dependency-ready unit.

**Current change stays `none`.** This design branch is a proposed handoff package until the owner actually selects a code Change for Cursor.
