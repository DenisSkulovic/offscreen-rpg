# Agent Core foundation | reviewed target and remaining limitations

**Standing:** independent committee reported DEFENDED for R10 E1 on 2026-11-27, candidate [5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe](https://github.com/DenisSkulovic/offscreen-rpg/tree/5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe/work/designs/open/agent-core-monorepo-map). This is a durable review/conclusions record, not owner ratification, canonical promotion of a new guarantee, implementation or certification. Formal verdict persistence and explicit owner acceptance remain separate. Existing [execution](execution-and-delivery.md), [trust](security-and-trust-boundaries.md), [spending](spending-and-entitlements.md) and [provider](../storyteller/provider-boundary.md) contracts remain authoritative.

## Reviewed boundary

E1 proposes one new grouped workspace `packages/ai/agent-core` (`@offscreen/agent-core`) with pure mission contracts and a Workflow-safe execution entrypoint. Temporal owns execution history/progress; Vercel AI SDK owns model/tool iteration; Agent Core owns admission, context, static capabilities, limits and outcome mapping. Host/test composition owns Worker/client, plugin and fixture effects. Production workflows and Worker remain unchanged. Use five organizational families (domain, ai, commerce, platform, foundation), preserve all 23 existing flat workspaces and activate no other new workspace. README-only future packages grant no authority. Existing package identity, production dependencies, data and deployment behavior must remain unchanged.

Evidence: three native integrations passed 12 synthetic missions; patched Vercel passed four additional missions and replayed one completed 23-event history. Proposed pins: `ai` 7.0.183, `@temporalio/vercel-ai-sdk` 2.0.0, aligned Temporal SDK 1.24.0, `@ai-sdk/provider` 4.0.39, `@ai-sdk/mcp` 2.0.66 where required, Zod 4.6.7. Isolated npm audit reported zero vulnerabilities after Zod upgrade; packaged unionfs license was inspected. These are owner-operated isolated experiments, not monorepo lockfile/security assurance, scale benchmarks, crash recovery or production proof. Detailed experimental provenance is in the immutable reviewed candidate above. Final pnpm closure, notices and security verification remain required.

## Review findings and follow-through

| Finding | Meaning and intended disposition | Owner / trigger |
| --- | --- | --- |
| AC-M01 (Medium) | Nested-workspace import scanner may miss imports even when manifest discovery works; see [repo tooling](../../../scripts/repo-tools/README.md). Include in grouped workspace compatibility work. | Workspace tooling; before E1 joint acceptance |
| AC-M02 (Medium) | Nonempty model output alone is not successful termination. Distinguish normal stop, truncation, invalid/unresolved tools and other errors using native SDK results and denial/limit/failure precedence. No success from text after a failed or denied call. | Agent Core loop/outcomes; focused negatives and joint qualification |
| AC-M03 (Medium) | Temporal plugin default downloader can act before model invocation. Text-only fixture input excludes the path; explicitly configure a rejecting download hook in isolated host as defense in depth. No implicit fetch, URL or file access. | Test host composition; assert rejection/no dispatch |
| AC-M04 (Medium) | Ordinary root/Turbo tests must remain offline; live Temporal qualification has a separate explicit command with isolated namespace, loopback endpoint, unique task queue and bounded ownership/cleanup. | Package scripts and qualification harness |
| AC-L01 (Low) | Historical dossier navigation noise; no extra cleanup cycle. Retire ordinary temporary research through normal lifecycle and keep immutable provenance. Not a runtime defect. | Design custodian, normal retirement |

All four Medium findings are proposed refinements within already scoped E1 work, not new architectural prerequisites or separate packets. Implementation and evidence are NOT RUN. The existing Worker Zod finding is separate; see [Worker limitations](../../../apps/worker/README.md#known-limitations-and-security-follow-up). The future package README should link this owner and document its current usage/limitations rather than duplicate this table. Update the table with actual evidence when resolved.

## Intentionally limited resolution and future gates

| Area | Current E1 restriction | Revisit when |
| --- | --- | --- |
| Model selection, provider transport, shared direct inference | One synthetic text model; no real provider, streaming, credentials, model routing, hidden fallback, image/video or paid dispatch | Before real inference; settle trusted routing, compatibility, grant, budget reservation, idempotent attempt identity and uncertain-result custody under existing spending/provider owners |
| Domain capabilities | Static allowlisted pure fixture read/calculation only; no Library, SQL, object-store, game or other real effects; no hosted/MCP/URL tools | Before external or authoritative effects; establish actual resource authorization, revocation, effect identity/recovery and negative tests |
| Execution state | One mission per unique Workflow identity; retained history only; no persistent instance, permanent deduplication, general resume API or external state journal | Concrete persistent lifecycle/recovery consumer, with retention and concurrency decisions |
| Context and delegation | Bounded instructions/text; no memory, retrieval, compaction, child agent or dynamic grants | Concrete requirement; decide provenance/fidelity, context budget and non-amplifying child grant/cancellation |
| Isolation, telemetry, operations | Synthetic payloads only; no external traces/raw prompt logging; local isolated qualification, not production tenant or scale assurance | Before production exposure; settle retention, tenancy, tracing, egress, cancellation and operational proof |
| Monorepo | Mixed flat/grouped layout; no physical migration or domain splits | Before moving packages; inspect path consumers, graph, image closure, build, migration and rollback |

## Residual E1 proof (not yet run for maintained source)

Construction may join the isolated design implementation branch under its assigned source checks. Joint qualification must prove build/typecheck/exports and unchanged production closure; genericity with two independently configured definitions and P0/P1 output/activity counts; unknown/denied/malformed tools and bounded inputs/steps/parallel tool reservations; nonterminal finish, model/tool failure and cancellation/timeout without further dispatch; completed-history replay and Worker restart at a recorded Activity boundary without duplicate completed Activity dispatch; synthetic-only isolation and patched pnpm dependency/license closure. These are required before final E1 acceptance, not a demand to repeat every proof on each construction Change. No exact-once external effect claim or production activation follows. No live provider calls, schema migrations or Storyteller cutover are authorized.
