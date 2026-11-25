# Integration outside the Temporal folder

Proposed design only. Existing source inventory; no changes authorized.

The uploaded snapshot is the original design baseline; subsequent main commits contain this design and its index. Read AGENTS.md, CHATGPT.md, repository design catalog and planner standards; design lifecycle requires acceptance before canon/Change promotion.

Observed source outside excluded folder:
- infra/platform/postgres/chart/profiles/development.yaml: namespace offscreen-dev-postgres, cluster dev-pg, 2Gi storage, 100 max_connections, one instance, 384Mi request/1Gi limit.
- infra/platform/postgres/chart/profiles/release.yaml: namespace lab-postgres, cluster lab-pg, 1Gi storage, 20 max_connections, one instance, 256Mi request/768Mi limit.
- infra/platform/redis/chart/{values.yaml,profiles/,templates/}: useful baseline/profile organization, not an obligation to own vendor templates.
- infra/environments/platform-plan.mjs: corePhases routes dev Temporal to tools/dev-environments/src/adapters/dev-temporal-bootstrap-cli.mjs and release to infra/platform/temporal/install.sh; DEV_ENSURE_ENV provides explicit dev authorization. parsePlatformServiceSelection allows individual services and core/all; chart-render preflight currently applies to chart services. Preserve public selection semantics; explicitly adapt preflight to verify upstream archive and render via Helm, not local JSON-specific manifest constraints. Temporal-only selection must verify PG dependency and refuse if absent, not silently install unrelated infrastructure. Plan is read-only.
- infra/environments/{dev,release}/platform.mjs and tools/dev-environments callers are integration surfaces, not alternative Temporal owners.
- infra/verification/verify.mjs, diagnostic-live.mjs, smoke/release.sh and dev-environments/dev-temporal-tenant-trial.mjs are existing proof integration surfaces. Reconcile rather than create parallel global verifier.
- Release naming remains lab-based at least for PostgreSQL; do not rename cluster/namespace as a side effect. PostgreSQL README confirms context kind-offscreen-release and legacy resource names lab-postgres/lab-pg. Preserve these distinct identities; verify live target before mutation.

Third-pass source audit of uploaded baseline outside excluded directory establishes these exact integration anchors:

| Existing owner / caller | Target responsibility |
| --- | --- |
| infra/platform/common/profile.mjs readPlatformProfile | sole context/namespace owner; dev offscreen-dev-temporal, release lab-temporal |
| infra/environments/platform-plan.mjs corePhases | route both profiles to one Temporal adapter with explicit profile/operation; preserve plan and authorization semantics |
| platform-plan.mjs selectedChartServices, plannedPreflightSteps, runChartRenderPreflight, runEnsurePreflight | exclude Temporal from JSON-local-chart path only; preserve all other services; Helm availability check for dev AND release when Temporal selected; use upstream Helm lint/template against verified archive |
| infra/platform/common/render.mjs SERVICE_SECTIONS, resolvePlatformChartPath, parsePlatformDocuments | remove old Temporal local-chart route once all consumers migrate; do not broaden JSON parser or allow Secret documents globally |
| infra/platform/common/pins.mjs TEMPORAL_IMAGE_PIN_KEYS | retire legacy pin contract only after callers moved; reuse generic parser/checksum functions |
| infra/environments/infra-cli.mjs | existing readiness and SQL-schema-policy imports need replacement; keep diagnostic CLI behavior |
| tools/dev-environments/src/adapters/dev-temporal-bootstrap-cli.mjs | eliminate parallel bootstrap authority; thin compatibility forwarding only if needed during cutover |
| tools/dev-environments/src/application/dev-shared-core-readiness.mjs | consume shared read-only health operation |
| tools/dev-environments/src/application/dev-slot-startup.mjs | remove legacy identity import and inline admin pod creation; preserve read-only shared readiness, tenant ensure and slot lifecycle |
| tools/dev-environments/src/adapters/dev-temporal-tenant.mjs | consume shared endpoint/namespace identity, not server-image constants; preserve existing ownership/retention semantics pending migration review |
| infra/verification/dev-environments/dev-temporal-tenant-trial.mjs | migrate imported bootstrap identity; keep tenant trial |
| infra/verification/diagnostic.mjs and smoke/temporal/smoke.sh | update legacy test paths and install guidance; retain existing runner and smoke location |

This is an import/caller inventory, not a completed symbol-level migration map. Audit other scripts, docs, tests and command registration before deleting anything. Existing local render contract parses JSON-per-line and rejects Secret documents; upstream Helm YAML cannot be passed into it. Do not disable unrelated preflight or weaken its safeguards. This is not yet a full compatibility audit because of the explicit exclusion. Existing folder may be opened only at owner-approved migration review, never as the architecture template.

## Migration rule

New architecture replaces old authority, not runs beside it. Existing Temporal folder remains excluded until explicit migration review. Before commissioning, freeze exact caller/symbol/test mappings and prove target identities; no agent research assignment. Keep platform profile, selection, confirmation, host admission, dev slot ownership, and existing verification runner. Do not expand PostgreSQL scope or rename legacy resources as incidental cleanup.

## Fourth-pass concrete caller findings (baseline fc367bb)

- `dev-shared-core-readiness.mjs:1–4,69–92` explicitly requires shared cores installed separately. `sampleTemporalReady(run)` currently calls observeDevTemporalReady with adapted runner. Replace with observeTemporalReady('dev', {run: ...}); do not add bootstrap or upgrades. Its adaptRunForPlatform currently calculates timeoutMs without passing it to the underlying runner; preserve effective bounded read-only execution and fix forwarding when mapping callers.
- `dev-slot-startup.mjs:395–399,470–576` imports legacy bootstrap constants and implements identity/describe/create inline. It starts disposable admin pods with hard-coded admin-tools:1.32.2 and short address temporal-server:7233. Replace inline CLI transport with exec into chart-owned admin deployment, use shared profile identity and verified Helm release ownership; no per-slot admin image download or new pod. Keep namespace creation in environment tenant lifecycle. The candidate is now chart 1.8.0 with admin-tools 1.32.2, matching the existing hard-coded caller version. Still verify CLI behavior before migration; do not infer existing server version or compatibility from that caller.
- `dev-temporal-tenant.mjs:1–19,67–103` derives namespace from existing slot identity, fixes retention at 86400 seconds, requires a specific live authorization token and checks context/namespace/owner/image. Preserve authorization, identity and one-day retention. Replace old single-server image equality with equivalent verified release/role identity, not weaker unconditional success. New address temporal-frontend.offscreen-dev-temporal.svc:7233 is fresh-design only; trace downstream projection consumers before cutover. Existing parser treats broad 'not found' text as namespace absence: narrow to actual namespace-not-found outcome, never pod/service/transport absence; exact CLI error format remains to verify.
- `infra-cli.mjs:492–631,729–730` release diagnostic assumes temporal-postgres, temporal-server, temporal-admin and schema Job names; it queries both schema tables via old DB deployment and probes RPC. New read-only observation must replace topology-specific deployment assumptions. Successful schema hook can be absent; preserve any separately required schema compatibility diagnostic without direct SQL on each slot startup. Dev branch already uses observeDevTemporalReady; both should consume same new observer.
- `dev-temporal-bootstrap-cli.mjs:4–5,26–51` imports old bootstrap/probe and checks mutation token. Retire after platform-plan corePhases routes explicit dev/release ensure to install.mjs; preserve explicit target confirmation and admission. Never treat injected test output as live authorization.

These source findings correct the earlier speculative conditional slot bootstrap. No existing Temporal folder read; exact final rendered names and endpoint migration still require review.
