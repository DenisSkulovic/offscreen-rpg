# Implementation overview

This is the current project snapshot. Product documents define the experience, technical documents define its contracts, and tests establish the implemented boundary. Keep proposed behavior distinct from verified behavior.

**Current phase:** implement and exercise the solo storyteller POC with local/scripted substitutes. The owner authorized Codex to implement the storyteller features on 2026-09-18. Live inference remains disabled. The OpenRouter adapter and persistent budget controls exist, but no live route, allowance or provider quality has been verified. The original $10 deposit is not a verified balance.

## Coverage

| Area | Current implementation | Boundary |
| --- | --- | --- |
| Workspace and infrastructure | TypeScript monorepo; PostgreSQL, Temporal, web/API/worker; sequential build and selected integration tooling. | Local Windows development. Hosted delivery remains separate work. |
| Identity | Stored sessions, private pages, OAuth initiation, revocation and local developer launcher. | Real GitHub sign-in requires credentials/manual verification; no invitations or membership. |
| Creation | Owned versioned drafts, profile selector, persistent reviewed opening, explicit idempotent Start. Candidate captures profile/configuration; story freezes the selected candidate. | Two JSON profile examples. Offline scenes are authored, not arbitrary-premise generation. |
| Storyteller runtime | Separate opening/continuation preparation, immutable context artifacts, execution, validation, accounting, publication and recovery. | No tool loop or graph framework. Additional task types can share the boundaries without expanding one agent prompt. |
| Choices and progression | Offered intentions resolve through durable generation and fenced atomic publication. Profiled offers require 2–5 distinct labels; no free-text gameplay or automatic life ending. | Narrative consequences only; no generated combat/economy/location effects. Legacy fixtures retain their own contracts. |
| Context and continuity | Bounded recent context plus mandatory source-backed notes; note creation/update/retirement; current and arrival notes publish with their respective passage. | Maximum 20 notes; no embeddings, general world census or semantic truth validator. Overflow holds rather than silently losing required evidence. |
| Time and autonomy | Prepared intervals, real waits, persisted pause/resume, reload/restart and arrival choices use existing story machinery. | Profiled quick-play waits are 20 seconds. Campaign pacing, general autonomy/defaults and mid-journey interruption policies remain separate. |
| Player entry and return | Owned live-story list, profile/source labels, saved history, pending/failure states and explicit retry or read-only refresh. | Local launcher supplies a normal authenticated session. Hosted visitor onboarding is absent. |
| Accounting/provider | Persistent account/run/attempt reservations, caps, exact integer settlement, dispatch uncertainty stop, no automatic retry/fallback, injected HTTP adapter. | Offline simulated evidence only. No operator provisioning/reconciliation UI or approved live execution policy. No real balance or pricing verification. |
| Chamber | Existing scenario catalogue and read-only inspection; profiled inspection adds private captured context and notes behind the local developer boundary. | Interactive fake outcomes, time-warp and fault controls remain later laboratory work. |
| World/shared play | Existing one checked item transfer, chronology and ownership. | No NPC/location census, multiplayer, spatial engine or general world effects. |
| Notifications/showcase | Design and local foundations. | Delivery, sponsored visitor admission, deployments and a public playable portfolio remain unimplemented. |

## Connected solo rehearsal

Launch `pnpm chamber`, navigate to `/stories`, choose a storyteller and create the pineapple/Gary premise. Review the opening and Start. Ask Gary, spend a quiet moment, walk to work, pause/resume, arrive, observe or return home. Reopen through the saved-story list and read previous passages. Fictional weapons and other scene details are prose, not implemented inventory/combat mechanics.

Both example profiles use the same runtime. Profile definitions are data; only the intentionally authored offline source contains scenario branches. Unrecognized premises are stored but receive a clear unadapted-rehearsal message. This demonstrates the application loop and architecture, not an open-ended generative game.

## Evidence and its limits

Production web/API dependency builds passed. AI tests passed 21, shared contract tests 7, and worker tests 4. The final sequential storyteller, Start and generated-resolution integration run passed all 21 checks, including the browser playthrough, retained old evidence, saved-output publication recovery and deferred arrival notes. Documentation links and Git whitespace checks passed. Test processes shut down normally.

The owner asked to stop spending effort chasing minor green checks. No further polish or broad audits were added. The last quality lint found one inline type-import issue, which was corrected; a final lint rerun was not performed.

The selected regression scope includes the new profiled suite plus existing Start and generated-resolution integrations. It exercises the real PostgreSQL/Temporal/browser boundary without inference. The full auth and all legacy suites are not rerun by default on this laptop. Automated structural checks cannot certify profile fidelity, meaningful live agency, enjoyable prose or sustained model continuity.

## Planned mechanical POC expansion

On 2026-09-18 the owner reaffirmed D&D mechanics as fundamental and requested design/handoffs for visible checks, situation-dependent choices, editable storyteller presets/custom tags, locked settings and time controls. These are **designed, not implemented**. The narrative rehearsal has no character-check engine or generated mechanical effects. See the [next feature sequence](features/README.md#mechanical-poc-and-customization). Documentation preparation is authorized; this new implementation sequence has not been requested yet. Checks remain optional.

## Current focus and next gate

The three [storyteller features](features/README.md#storyteller-poc-sequence) hold the current review checkpoints. Generic runtime, continuity, provider adapter, simulated accounting and local UI are implemented. The focused offline checks have passed; any live evaluation remains a separate gate. Retained feature documents provide implementation/review contracts; they are not permission to spend.

Before the first paid run, define a concrete small evaluation, verify current route/pricing and actual remaining allowance, provision explicit account/run limits, and establish operator reconciliation/stop procedures. The owner must deliberately reopen live evaluation under [spending](../.agents/rules/spending.md). No automatic repairs, fallback routes, autonomous calls or model judges should be added to make an unsuccessful evaluation look better.

The later real playthrough must score profile adherence, intention fidelity, option diversity, continuity and readability against specific passages. A valid JSON response is not POC acceptance. If quality fails, retain the evidence and make the smallest targeted change.

## Deferred depth

The full Chamber laboratory, multiplayer, notifications, campaign pace, dynamic interruptions, richer entity state and hosted onboarding remain separate product work. A coherent small solo game does not require detailed population simulation, interactive 3D maps or an agent per NPC. New complexity should earn its place through observed failures in the playable loop.

No live model calls occurred during this implementation. Provider spend is $0; cumulative OpenRouter account usage has not been verified. Local scripted testing remains the default.
