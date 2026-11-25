# Operational file contracts

Status: proposed, design only. Baseline main fc367bb0283a2cb255c6b3b4c85ddd5ca28ab041. No existing Temporal directory inspected. Configuration specimen: [specimen/](specimen/README.md).

## Decisions

- Explicit infrastructure ensure is the **only** shared Temporal mutation entrypoint. Dev slot startup already requires shared cores to be installed separately (dev-shared-core-readiness.mjs:1–4); preserve that contract. Delete the speculative bootstrap operation. No Helm installation, upgrades or artifact download on ordinary slot startup.
- Two implementation files: install.mjs and readiness.mjs. No controller, manifest generator, vendor chart fork, generic state machine library or extra CLI framework.
- Native Helm owns release lifecycle. Existing platform CLI owns service selection, progress, target confirmation and host memory admission. Both dev and release explicit ensure delegate to the same installer. Tenant registration remains in environment lifecycle.

## install.mjs

One exported function `ensureTemporal({profileId, confirmation}, {run = runPlatformCommand} = {})`, synchronous to fit the present platform runner, plus guarded CLI entrypoint `node install.mjs <dev|release> <plan|ensure> [--confirm <context>]`. Proposed API, not current command. No side effects on import. Plan reads local configuration and outputs target + intended command, without cluster access or downloading; invalid pin may be displayed as unresolved, but must fail ensure. Published 1.8.0 pin is now present in specimen; archive bytes still require verification.

Use file paths resolved relative to import.meta.url, not caller cwd. Resolve profile with readPlatformProfile(profileId). Release name temporal is the fresh-install contract; namespace from profile.namespaces.temporal. Adoption mapping must be settled first. Use common commands.mjs runPlatformCommand and assertPlatformTarget, common pins.mjs parsePins/verifyManifestBytes. Do not introduce dependency injection framework: runner injection only; filesystem tests use temporary directories. Result at caller boundary: existing {ok, detail} convention, exit code 0 iff successful; detailed failure classification internally, not a new global schema.

### Internal functions and order

| Function (private unless noted) | Responsibility |
| --- | --- |
| resolveInputs | Validate profile/operation, resolve immutable target and file paths; explicit confirmation equals context for ensure |
| readChartPin | parsePins with CHART_VERSION, CHART_URL, CHART_SHA256; validate exact HTTPS artifact URL against approved source; reject unresolved specimen |
| acquireChart | Download only on a mutating install/upgrade into a private temporary directory, verify bytes; remove temporary files on exit |
| inspectRelease | Reuse readiness.mjs release observation; compare Helm's recorded chart and supplied values with desired chart/overlays |
| assertPrerequisites | Verify target, owned namespace and prepared database/Secret contract; no database or role management here |
| runHelm | Construct fixed argv; invoke native Helm once with explicit bounds |
| ensureTemporal (export) | Orchestrate these steps; final readiness result, failure detail and lock release |

Avoid making every table row a separate module or forcing functions where a few readable statements suffice. Artifact acquisition follows the existing PostgreSQL install.sh pattern (private mktemp directory, curl, checksum), reusing common pins.mjs. There is no need for a persistent cache: acquisition runs only on explicit changes, not normal slot startup or unchanged ensure. Use mkdtempSync under os.tmpdir(), curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --connect-timeout 10 --max-time 90 --output <archive> <approved URL>, then verifyManifestBytes(readFileSync(archive), pin.CHART_SHA256); clean only this owned temp directory in finally. Reject unexpected archive size (provisional 20MiB cap using curl --max-filesize and post-download stat). No network on no-op. Do not accept URL supplied by arbitrary caller.

### Ensure algorithm

1. Validate explicit confirmation and call assertPlatformTarget before any cluster mutation. Parent host admission remains mandatory; direct invocation is not a bypass. Resolve paths and validate pin.
2. Take one shared machine-local lock for context/release (not checkout). Recheck target inside lock. Existing locks in dev-worktree-registry.mjs are slot/registry-specific, not appropriate for shared platform. Reuse the established util-linux flock approach, not those domain APIs. Proposed stable path ~/.local/state/offscreen-rpg/platform-locks/<context>-temporal.lock (fixed context from profile, per OS user; trusted single WSL user). Create parent mode 0700, lock file 0600, never unlink it. Acquire exclusive bounded flock around the entire explicit ensure process, with no shell interpolation; one outer flock supervisor invokes internal Node worker, which invokes Helm directly. Lock must remain held until worker and Helm terminate; do not assume spawnSync's default stdio propagates lock fd. Verify inherited descriptor/process-group termination with actual subprocess tests before approval. If that proof fails, resolve it here rather than add a PID lease framework. No stale PID files or distributed leases. Concurrent caller may wait then observe the result; never overlap Helm hooks.
3. Observe Helm release with readiness module. Absence means successful scoped list returned no exact-name match, not an arbitrary nonzero status. Pending/failed/unknown/foreign state refuses normal ensure. For missing release check approved fresh/adoptable persistence and collision-free workload identities; never adopt resources solely by name.
4. Existing deployed release: compare chart version and normalized user-supplied values. Identical and healthy => return no-op, no chart download or Helm upgrade. Identical but unhealthy => report failure and preserve state; Kubernetes reconciles pods. Same-version changed values => permitted explicit ensure only, after checking immutable settings (shards, store identity, service identity). Different chart/server version or unknown ownership => refuse pending explicit migration decision; no downgrade from older worktrees.
5. Verify PG prerequisites and prepared credentials, acquire verified chart, lint/template when needed using upstream chart (not common JSON renderer). Namespace and Secret must exist before hook. No secret bytes in argv, values, output or logs.
6. Fresh release uses `helm install temporal <verified-archive>`; existing changed release uses `helm upgrade temporal <verified-archive> --reset-values`. Both use --kube-context, --namespace, -f common values, -f profile values, --wait, --wait-for-jobs, --timeout 5m. Deliberately separate install/upgrade after observation to prevent a missing release during upgrade becoming an unintended fresh install. No --atomic, --force, --take-ownership or --reuse-values. Exact compatibility with local Helm version is unverified.
7. Check final readiness. If Helm fails or readiness fails, return nonzero and report bounded, sanitized diagnostic category. Do not uninstall or retry. Always release lock after subprocess termination; if termination is ambiguous, re-observe pending release before any further mutation.

For values comparison use Helm user-supplied values (helm get values without --all, JSON). Root package.json pins yaml 2.8.2 and common/manifest-output.mjs already imports it. Use parseDocument with uniqueKeys:true, reject parse errors, aliases/custom tags and non-mapping roots; restrict values to JSON-compatible scalar/array/object data. Deep-merge only mappings, replace scalars/arrays, reject null overrides in our small specimen (Helm null deletion semantics not needed). Compare via node:util isDeepStrictEqual on plain objects, key order independent. Normalize helm get values null to {} only for a successful response. No new YAML dependency or parser. Require rendered equivalence of this limited merge with Helm before approving. Immutable-field comparison includes explicit effective shard count (chart default when omitted), both database names/addresses/users and release identity. Only known-safe mutable overrides can change under normal ensure: replicaCount (global and per role), resource requests/limits, logLevel, schema backoff/deadline/resources, metrics annotations. Reject all other differences initially, including image overrides, password-related keys, store identity, frontend exposure, fullnameOverride and shard count. New mutable options are reviewed when needed; no generic policy engine.

### Time bounds

Read-only calls default 15s (existing common runner); explicit long calls override it. Helm per-operation 5m, schema Job deadline 240s from specimen. Proposed installer total 15m and parent Temporal phase 16m; actual values to be validated against local startup measurements. Current defaultPlatformRunner in platform-plan.mjs terminates at 600000ms, so a Temporal-specific allowance is necessary. Common runner uses spawnSync and does not guarantee full descendant termination; invoke Helm directly (no shell) and do not claim process-group guarantees without proof. If parent kills installer, lock inheritance and pending Helm state must be accounted for; test timeout/refusal before approval. No global timeout expansion.

## readiness.mjs

Export `observeTemporalReady(profileId, {run = runPlatformCommand} = {})` and `observeTemporalRelease(profileId, {run = runPlatformCommand} = {})`. Synchronous, read-only, safe import. Keep temporary compatibility export `observeDevTemporalReady(deps)` only if needed for atomic cutover; do not retain two implementations. No pin download, YAML loading, schema migration, Secret content read, pod creation, namespace registration, wait loops or repair. No default profile.

### Shared release observation

- Scoped `helm list --all --filter '^temporal$' --kube-context <context> --namespace <ns> -o json`; check exit and parse list. An empty successful list means absent; unreadable/malformed is not absence. A matching entry supplies chart version, app version, revision and status. Do not treat pending or failed as deployed. Verify exact identity; ownership beyond Helm name requires target and resource checks.
- Use common readPlatformObject for named deployments and services (present/absent/unreadable already distinguished). For expected objects verify Helm release ownership annotations and instance label; confirm name/namespace, desired replicas positive and observedGeneration >= generation, updated and available replicas meet desired. Do not require pod UID stability or invent container image version from tag text.
- Expected fresh names from tagged helper: temporal-frontend, temporal-history, temporal-matching, temporal-worker, temporal-web, temporal-admintools. These are source-derived predictions, not rendered evidence. Confirm final names in render before implementation.
- Return a minimal local record, proposed JSDoc union: {state: 'absent'|'unreadable'|'pending'|'failed'|'deployed', detail, revision?, chartVersion?, appVersion?}. Preserve refusal reason without raw Helm output.

### Readiness observation

1. assertPlatformTarget using common helper; if failure return not-ready with sanitized detail.
2. Read release; reject non-deployed, unknown/foreign identity.
3. Read four core Deployments and frontend Service. Validate ownership and rollouts. Expected endpoint from fresh design: temporal-frontend.<profile.namespaces.temporal>.svc:7233. Use full DNS across app namespaces; no hard-coded current-context or localhost.
4. Observe web/admin deployments separately. Admin tools required by current CLI-based tenant operations, so for dev startup it is an actual dependency, not a purely optional convenience.
5. Use existing CLI approach but execute in chart-owned ready admintools deployment rather than create an ephemeral pod: `kubectl --context <context> -n <ns> exec deploy/temporal-admintools -- temporal operator cluster health --address temporal-frontend:7233`. The upstream 1.8.0 test hook confirms the command temporal operator cluster health and TEMPORAL_ADDRESS; actual CLI output and exit semantics still require verification. Successful exit plus expected SERVING response is required; no substring matching arbitrary output. If no admin tools, health is unverified, not healthy. No mutating RPC in readiness. Native frontend gRPC probe plus rollout status are supplemental, not substituted for this check.
6. Return {ok, detail, coreReady, adminReady, webReady} (proposal, internal). CoreReady means four roles + actual RPC; adminReady and webReady independent observations; ok for current dev startup requires coreReady and adminReady, not webReady. Diagnostic callers may present separate states. Installer also requires successful Helm wait for enabled workloads. No schema Job existence as a readiness gate: successful hooks are deleted by chart. No direct SQL probes on each slot startup.

### Failure matrix

| Condition | Result | Mutation |
| --- | --- | --- |
| Wrong context / ownership | refuse | none |
| Helm API unavailable / malformed JSON | unreadable | none |
| Release absent | not-ready | none in readiness; explicit ensure only |
| Pending / failed release | not-ready | none |
| Rollout incomplete or stale generation | not-ready | none |
| Admin unavailable / RPC not SERVING | not-ready | none |
| UI unavailable, core and admin ready | core usable, UI degraded | none |
| Healthy unchanged explicit ensure | no-op | none |
| Same-version mutable values changed | explicit Helm upgrade | one invocation |
| Version, immutable settings or unknown ownership conflict | refuse | none |
| Helm timeout / schema failure | failed; preserve state | no retry or rollback |

## Human operations

README in implementation folder should document helm status, helm get values, kubectl get deployments/services, schema hook logs on failure, CLI health, loopback UI port-forward, and explicit ensure. Document that scaling via Helm invokes schema hook and Helm rollback cannot revert database migrations. Raw direct Helm commands are diagnostic/maintenance examples, not an alternate normal installation authority. Stop/park never stops shared platform. Separate maintenance decision for uninstall, upgrade or migration.

## Remaining design blockers

Verified archive/render, chart runtime image identity, exact PG credential provisioning and approved adoption mapping; local CLI health output, process-lock termination proof, exact chart archive and image strategy. YAML availability verified, persistent cache removed, lock scope selected. No implementation commission. See [integration](INTEGRATION.md) and [verification](VERIFICATION.md).

## Utility evidence (original uploaded source baseline 03ea79c469d0; main e501958b contains subsequent design updates)

- package.json:101 pins yaml 2.8.2; infra/platform/common/manifest-output.mjs imports stringify from yaml.
- infra/platform/postgres/install.sh:17–18,54–65 uses curl, private temp directory, cleanup and SHA-256 validation, no shared artifact cache needed.
- tools/dev-environments/src/domain/dev-worktree-registry.mjs:156–242,789–799 establishes flock and ~/.local/state/offscreen-rpg convention; existing lock APIs are scoped to registry/slot, not platform.
- Common runPlatformCommand uses spawnSync with 15s default; do not use default timeout for Helm. No proof of process group termination yet.
