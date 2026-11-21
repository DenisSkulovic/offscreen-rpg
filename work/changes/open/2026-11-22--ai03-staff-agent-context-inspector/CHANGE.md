# AI03 | Agent Inspector: context anatomy, timeline, scene comparison and Temporal links

**Status: PROPOSED / PLANNER-GATED until AI02 data+reader and current Admin/Web UI composition are source-inspected.** Baseline `undertaking/storyteller-workshop` at `f8a45a7e0a0daa408f05651eb1bb2997ec2daf22`. This is a **sensitive read-only staff product**, not a global debug route and not permission to disclose raw prompts to ordinary support.

**User journey:** authorized engineer opens a campaign and selects scene 7, sees a timeline of the Writer mission and its model rounds; selects an exact archived round to inspect (a) system/user messages and strict output schema, (b) pinned Library root/checkpoint/scene/skill/profile and allowed tools, (c) tool invocation request/result with hashes and evidence status, (d) delivered response and final proposal/published scene, (e) optional linked Temporal workflow/activity IDs and failure/retry timeline, (f) model/token/cost only where actually recorded. Compare scene 7 to scene 4 by **structured sections** and context hashes, not dumping two undifferentiated JSON blobs. Side-by-side section diff and transcript thread view. No tool reexecution, no inference rerun or fork mutation while inspecting.

## Hard privacy design

Current `@offscreen/admin` exposes `ai.operation.read` and `forensics.campaign.situation.read`, but the first returns **sanitized operation information** and the second is **body-free, case/campaign-bound**. Neither authorizes full private prompts/tool arguments. Create a **new explicit** `forensics.agent.context.read` capability, bound to exact `campaignId` **and** an already-authorized support/engineering `caseId`, opt-in private-data sensitivity/retention classification and audited access. It is not included in admin-reader, engineering-observer, support-operator or generic situation-read packages. Grant issuance remains trusted-steward-only; source must choose a narrowly versioned new staff package or gated engineering-investigator extension, not auto-give it to every admin. Unauthorized lookup returns privacy 404 with no count/timing/content leak; exported raw bodies never appear in ordinary Admin audit, app logs, OTel or browser analytics.

**Selected vertical:**
- `packages/admin/src/agent-context-reads.ts` read-only scoped projection around AI02's `agent-execution-trace.v1`, with no DocumentStore list-all or unbounded SQL scan.
- `packages/contracts/src/admin-agent-inspection.ts` distinct schemas for summary index, round evidence, raw section (explicit case-bound), diff. Zod strict bounded page lengths/byte sizes.
- `apps/api/src/modules/admin/.../agent-context-controller.ts` after HR01 route refactor, inject AdminActorService and one permission-gated reader, GET only:
  `/api/admin/campaigns/:campaignId/agent-executions?cursor=...`,
  `/api/admin/campaigns/:campaignId/agent-executions/:missionId`,
  `/api/admin/campaigns/:campaignId/agent-executions/:missionId/rounds/:ordinal?caseId=...`,
  `/api/admin/campaigns/:campaignId/agent-executions/compare?leftMissionId=...&rightMissionId=...&caseId=...`.
  No raw private bodies in index by default; raw section requires stronger case-bound capability.
- `apps/web` existing authenticated Admin feature route: add **Agent Inspector** page with section tabs `Context / Messages / Tools / Results / Timeline / Diff`, transcript entries and a compare selector by scene/mission. Human readable key-value tree for nested sections, collapsible long text, safe text rendering, explicit unavailable/redacted badges, content hash copy and optional local redacted JSON export. UI fetches admin endpoint only, **never SQL/CAS directly**, and doesn't hydrate unauthorized raw data as a preload shared with player pages.

## Evidence/Temporal limits

Temporal history contains workflow/activity scheduling, retries and IDs, **not** a model's conversation transcript. Link Temporal workflow ID/run ID only when actually persisted and accessible to staff, with status `unlinked` when missing. Avoid assuming provider 'reasoning' is available: show reasoning token count/returned provider fields only when captured and permitted; hidden internal reasoning is not reconstructed. There are two different context questions: *exact historical prompt*, and *hypothetical newly generated prompt from a fork*. UI v1 implements historical read/diff only; a future simulator/reassembler requires explicit no-side-effect isolation and versioned compiler, not a button that invisibly creates a new mission.

## Known source ownership and gate

`packages/admin/src/{registry,policy,diagnostics-reads}.ts`, `apps/api/src/modules/admin/{controller,admin-actor-service,admin-http-errors}.ts`, `packages/contracts/src/admin*.ts` and post-HR01 `apps/web` Admin area; exact current Web Admin route must be identified **by ChatGPT** before readiness (not verified in this baseline; do not invent one). New SQL migration should be avoided unless a genuine audit write need lacks an existing audit sink, in which case return to ChatGPT. Do not touch Story Engine Writer data/custody, Temporal workflows, DB schema migration or CL01 story-only bearer.

**Depends on:** AI02 actual transcript reader, AI01 navigation, HR01 Admin controller reorganization and existing Admin authorization policy. Not safe to commission concurrently with HR01 or AI02. Source and design chosen; implementation blocked on current interfaces and approval of new raw-data staff access scope.

**Acceptance:** scoped staff can navigate and diff two actually archived rounds, exact/hash/current-only statuses never misrepresented, raw content never exposed to general support or player, no staff token stored in client logs, audit view recorded, missing/corrupt source clearly signaled, no writes/provider calls, large output bounded. Unauthorized staff/owner/case/browser responses denied without body, app SSR/GET cache disabled for private sections.

[Source map](SOURCE-MAP.md) · [tasks](TASKS.md) · [proof](PROOF.md).
