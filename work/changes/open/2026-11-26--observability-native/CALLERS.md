# Caller reconciliation — snapshot cb66dfab

Owner supplied git archive of main cb66dfabb3c623cf27e3b2f44a2effdfb19e3135 and worktree listing. Remote main rechecked before commit. Design verdict unchanged. Source-only inspection, no tests or cluster mutations.

## Search scope
Read extracted archive text files throughout repository (extensions md,mjs,js,ts,tsx,json,yaml,yml,sh,py,toml,txt,tpl,cjs,ps1 and extensionless; max 2 MB per file); case-insensitive observability|otel[-_]collector|synthetic[-_]hop|hop-[ab]. Match counts are line counts, not caller counts: work 635, infra 169, evidence 98, docs 76, scripts 41, .agents 27, research 6, .claude 3, STATUS.md 2, .prettierignore 1, packages 1. Binary/vendor bytes and larger text files not claimed searched. Inspect named indirect dispatchers independently of literal matching.

## Executable and test dispositions
| Path (snapshot lines) | Owner / exact disposition |
|---|---|
| infra/platform/common/profile.mjs PLATFORM_HOME/readPlatformProfile | T01 add namespace keys for dev/release and returned object; no other profile changes |
| infra/platform/common/commands.mjs assertPlatformTarget | T02 additive baselineUid, preserve other return fields |
| infra/platform/common/cli.mjs runRenderCli | T05 explicit native observability branch before generic renderer; only all section, preserve legacy/json/yaml output via formatManifestDocuments; no live read |
| infra/platform/common/render.mjs 20,23,31,60; assertPlatformRenderRequest, renderPlatformDocuments, lintPlatformChart | T05 remove old single-chart observability registry and release-only rule; native render entrypoint separate, no stale fallback |
| infra/environments/platform-plan.mjs 31,42,118; supportedServicesForProfile, coreServicesForProfile, corePhases, selectedChartServices, plannedPreflightSteps, runEnsurePreflight, platformRunnerSpawnTimeout, runPlatformPlan | T05 explicit both-profile optional service, preserve core ordering/defaults; remove shell entry, add native plan/ensure argv, Helm preflight, exact ensure exemption, typed phase receipt; no changes to other service policy |
| infra/environments/platform-plan.test.mjs 142,169–179 | T05 extend release existing tests to native argv; test dev explicit/all and unchanged core, no legacy dispatch, timeout/receipt negatives |
| infra/environments/infra-cli.mjs 530–532; observeSelectedServiceState | T05 replace release collector/service read branch and route both profiles through native observer; preserve status presentation/exit semantics |
| infra/environments/infra-cli.test.mjs, infra-cli-operation.test.mjs, infra-presentation.test.mjs | T05 focused shared regression; infra-presentation.mjs:25 service ordering already lists observability, preserve |
| infra/verification/diagnostic.mjs 87,100,121; diagnosticServices, buildDiagnosticChecks, runDiagnostic | T06 retain PL-06, replace legacy test registration, explicit observability selection; default release alone passes allow-absent; 360s worker supervisor; no global optional result change |
| infra/verification/diagnostic-live.mjs observe; diagnostic-engine.mjs runCommand/commandOutcome/executeChecks | T06 exact R34 worker argv and 345s internal budget; preserve generic engine and cluster prerequisite; strict typed receipt |
| infra/verification/provisioning.mjs 26; buildProvisioningChecks, runProvisioning, CLI | T06 remove default release service, dev-only --observability option, reject release before subprocess, 1800s ensure and 360s observation, exact typed receipt; preserve RabbitMQ |
| infra/verification/provisioning.test.mjs 24 | T06 replace default release observe PASS assertion with absence of ensure/observe rows; add dev selected/strict result and release refusal |
| infra/verification/verify.mjs parseVerifyArgs and main; verify.test.mjs, verify-operation.test.mjs, diagnostic.test.mjs | T06 diagnostic-only flag; register native tests with correct Helm requirement, keep workstation fixture line 235 untouched |
| scripts/repo-tools/check-lab-manifests.mjs 67, check-lab-manifests.test.mjs 93 | T08 native render/lint validation outside legacy platform loop, exact values exclusions only; preserve existing service assertions |
| scripts/repo-tools/infra-layout.test.mjs 28,305–310; assertInf15PlatformChartSuccessors | T08 explicit retired observability destinations, assert both old paths absent and native artifacts present; retain root platform directory |
| .prettierignore:16 | T08 remove exact obsolete chart templates exclusion, do not suppress native values or unrelated paths |
| infra/platform/observability/chart/**, install.sh, tests/{install,render}.test.mjs | T01–T04 replacement code/tests; T08 retire old chart and shell only after route replacement; no runtime deletion |
| infra/verification/smoke/observability/{assert_signals.py,hop.py,hops.yaml,setup.sh,smoke.sh,tests/setup.test.mjs} | T07/T08 replace old debug proof with isolated native query harness; no old runnable path or legacy mutation |
| infra/verification/smoke/release.sh | Preserve: inspected DNS/cross-namespace/PVC probe, not observability deployment |
| infra/monitoring/** | Preserve host observer |
| packages/storyteller/src/providers/evidence-lineage.ts:2 | Preserve domain evidence reference |
| scripts/repo-tools/archive-changes*, wiki-core/*, wiki-benchmarks/static-v1.mjs | Preserve archival classification and evidence documentation fixtures |
| apps, tools, .github | No literal hits in scanned text; no application wiring authorized |

## Documentation dispositions
T08 update infra/README.md:46 legacy chart relocation statement; infra/verification/CAPABILITIES.md:27,80 PL-06 current scope and commands; docs/runbooks/kubernetes-observability.md replace runnable legacy instructions, retain historical proof by immutable commit link; docs/runbooks/README.md:23 update route description; docs/runbooks/local-development-platform.md:20 optional both-profile structural support, dev live scope. docs/technical/platform/deployment-and-compatibility.md observability section and topology.md:39,86 distinguish selected native platform from historical proof and proposed application enrollment; preserve historical narrative, add current link. docs/technical/README.md add canonical platform link. Review operator experience/local-developer-platform for concrete stale command only; generic reporting/privacy principles unchanged. STATUS.md evidence/capsule claims untouched unless adding explicit selected/source/live distinction after receipt. Historical work/evidence/research and domain docs not rewritten. Existing canonical authority retains application proposal boundary.

## Remaining limitations
Source map now has line-level direct caller classification plus indirect dispatcher anchors. Full task-local interface and fixture simulation and exact acceptance commands still pending; do not certify G1/G3/G6 yet. Worktree listing shows old K8S07 branch and joined native sibling branches; no new observability Change worktree listed; listing does not establish clean status or active writers. No local runtime claims.
