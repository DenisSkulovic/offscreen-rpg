# WR07 | decided execution design (planner-owned)
**Depends on WR03's captured writer and WR05's complete scene selector.** Nest authenticated controller owns HTTP; application coordinator owns durable Launch; private GA owns first playable scene.

## Wire contract
Versioned `launch.v1` request: `{operationId:UUID, input:{kind:'prompt',text:string}|{kind:'prepared',startRootHash:string, optionalOverride?:string}, optionalHints, inventionPolicy, timePolicy, usageAuthorization}`. The freeform text may be one word; max bytes explicit and validated. No required human character, body, title, profile dropdown or rules adapter. Owner from auth context, not body. Launch immutable request hash bound to (owner, operationId); same exact retry returns same status/scene; changed request same key → conflict. A preset reference must resolve to a rights-admitted immutable source root **before** chargeable dispatch, never latest by filename.

## Durable states and recovery
`pending -> preparing -> composing -> ready`; alternatives `held|failed|uncertain`. Store captured request and selected source/profile/skill hashes and writer mission id in a small SQL Launch row (no giant Markdown bodies in SQL; prompt immutable CAS with exact text). Create stable story ID before processing, but story remains not playable until WR05 scene 1 selector. For provider uncertainty preserve existing attempt/reservation; status uncertain, **no retry dispatch**. On restart recover from stored state, not draft editor. A completed prepared bundle may omit extra preparatory LLM; Writer still composes when required.
- `STORY_PROMPT.md` is raw user intent; `STORYTELLER_PROFILE.md` creative-only; `START.md` orientation; pinned source overlays have explicit conflicts/visibility.
- Execute WR03 mission on exact captured root. Accept its final proposal through WR05 Game Authority transaction. Scene 1 response and status read **only** selected scene commit. Do not accumulate clock merely while the model works; only admitted active plan progresses.
- Leave old `PUT :id/start` compatibility route in place initially; new named `PUT /stories/launches/:operationId` and `GET /stories/launches/:operationId` (or exact Nest-adjacent route consistent with existing route namespace), routed via existing authorized private seam. Avoid duplicate user-facing wizard server flow.

## Patch order
1. Request/result DTO validation + anonymous and invalid-input tests.
2. SQL Launch custody + immutable prompt/source capture and idempotency.
3. Application coordinator state machine and WR03 mission call with no unapproved spend.
4. WR05 first-scene adoption, stable retry/receipt, no invisible timer.
5. Authenticated Nest request/status route and provider-free e2e; prepared/BAH/galaxy/uncertain tests.

**Hard stops:** WR03 or WR05 API not landed, missing private `StorySeam` operation, preset authorization unresolved. Return exact seam to ChatGPT; do not implement model dispatch directly in a controller.