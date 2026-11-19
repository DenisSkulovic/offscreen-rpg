# TURN02 | executable Kubernetes release source map and discovered blockers

**Profile:** `RELEASE`. **Evidence:** inspected lean snapshot `584b5947516a8b99778ad0d5690fe957211c0acb` (2026-11-19), not a cluster run. Read relevant section only. This is the ChatGPT planner's prior investigation, not an instruction for Cursor to rediscover the whole stack. [Execution](EXECUTION.md) holds the chosen release route. [POC audit](../../../designs/open/distributed-turn-poc/POC-READINESS-AUDIT-2026-11-19.md) records cross-cutting gates.

## Real artifacts versus lab stand-ins

| Verified path | What it does now | Implication |
| --- | --- | --- |
| `infra/kubernetes/lab/{up,down,lib,smoke}.sh` and `kind.yaml` | Creates/disposes `offscreen-lab`, fixed context, two nodes, control-plane API loopback `127.0.0.1:6443` and memory/volume/context guards | Reuse scripts and lock. Never change the shared cluster context or touch Compose volumes |
| `infra/kubernetes/lab/gateway/{routes,backends}.yaml` | A `lab-edge` Gateway in `lab-edge` accepts routes **Same namespace** and targets `synthetic-web`/`synthetic-api`. `/api/absent` deliberately targets a missing endpoint; `/events` is synthetic | Real app release needs a separately selected/overlaid route, not just replace images in the old synthetic manifest. Keep original negative smoke tests independently runnable. For simpler same-namespace backend refs, place real Next/Nest Services in `lab-edge`; use an explicit, verified cross-namespace route policy only if needed |
| `infra/kubernetes/lab/skeletons/workloads.yaml` | Python placeholders with `offscreen.rpg/skeleton: placeholder` | Never count as application Pods; do not patch placeholder into an application image with misleading Ready status |
| `infra/kubernetes/lab/content-bootstrap/{importer-job,reader-job}.yaml` | Pinned S3 import/read Job against `object-store.lab-objects.svc.cluster.local:8333`, `lab-objects` bucket; source pinned in a dedicated importer image | Reuse only importer Job to put immutable package content in S3. Neither a campaign nor opening candidate is created by importer |
| `infra/kubernetes/lab/temporal/{worker.yaml,worker/}` | Toy `lab-once` worker, not actual @offscreen workflow or game task queue | A green lab worker is not a Storyteller worker. TURN02 must build real `@offscreen/worker` control/outbox and STORY03 execution worker |
| `apps/{web,api,game-authority,worker}/package.json` | Real workspace packages and build/start scripts; no production-like app Dockerfiles found in baseline snapshot (`find . -maxdepth 4 -iname '*dockerfile*'` only lab content/temporal examples) | New multi-stage workspace-aware images needed. Avoid `pnpm install` separately inside disconnected package folders because monorepo deps are workspace packages |
| `package.json` | `pnpm@11.19.0`, `node >=24.19.0 <25`, turbo workspace build | Pinned Node24/pnpm11 base and lockfile fidelity; select digest-pinned runtime images after local build, record full digests and package inventory |

## Three source-level release blockers with an explicit correction

### R1: Pod loopback listeners

- `apps/web/package.json` `start: "next start --hostname 127.0.0.1"`. Bind the actual Next listener to `0.0.0.0` by changing launch command/packaging for **Kubernetes only** (or make hostname environment-controlled); do not expose public host ports in kind. This is a Pod-interface bind, not authorization to host-bind WSL.
- `apps/api/src/config.ts` defaults `API_HOST='127.0.0.1'`; release sets `API_HOST=0.0.0.0`, `API_PORT=3001` while preserving local defaults.
- `apps/game-authority/src/config.ts` defaults `GAME_AUTHORITY_HOST='127.0.0.1'`; release must set `0.0.0.0`, `GAME_AUTHORITY_PORT=3002` and isolate via ClusterIP, auth and network policy, **not** Gateway.
- `apps/worker/src/bootstrap/config.ts` defaults `TEMPORAL_ADDRESS=127.0.0.1:7233`, `TEMPORAL_NAMESPACE=default`, `TEMPORAL_TASK_QUEUE=offscreen-local`. Release must use the actual lab Temporal Service/namespace and task queues from STORY03 rather than defaults.
- **Negative:** dial the Pod IP via the ClusterIP Service from a separate Pod; a successful inside-container `curl 127.0.0.1` is insufficient. Assert the host remains loopback-only.

### R2: API startup still imports local rules at runtime, contrary to the source-free Pod contract

`apps/api/src/main.ts`:
```ts
const documentStore = createDocumentStoreFromEnv(process.env);
if (documentStore instanceof S3DocumentStore) await documentStore.ensureBucket();
const defaultRulePackage = documentStore
  ? await importRulePackageDirectory(documentStore,
      resolve(process.env['OFFSCREEN_DEFAULT_RULE_SOURCE'] ??
        'content/rules/srd-5.2.1-subset'))
  : undefined;
```

`packages/documents/src/rule-import.ts:importRulePackageDirectory` calls `realpath(sourceDirectory)`, `lstat` and `readFile` for local descriptor/pages. With `OFFSCREEN_DOCUMENT_STORE=s3` and no local `content/rules/...` in a runtime image, **Nest startup fails**, before any story request. Setting the source env to an S3 URL is not supported. Conversely, bundling arbitrary source dirs into live Pods violates BOOT02's distinct import boundary. Source-based fix proposal: load a **pinned default rule manifest reference** by its content-addressed root hash from the already imported S3 store at startup; validate its scheme/id/revision/engine from `DocumentStore.readRulePackageManifest(root)`, then pass existing `defaultRules` into `createApp`. If the default pinned source is missing, corrupt or differs from configured expected identity, fail startup explicitly. Preserve local Compose directory-import behavior when selected. Source owner: API bootstrap + tiny tested default-rule-reference helper, not gameplay `stories/start.ts` logic.

**Specific caution:** `OFFSCREEN_DEFAULT_RULE_SOURCE` is *a path*, not a root hash. Introduce a distinct `OFFSCREEN_DEFAULT_RULE_ROOT_HASH` (name proposed; verify existing config conventions) or a versioned config payload, never overload the existing path variable or hide a default hash in code. `BOOT02` importer pins rule root `d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab` for its Seyda Neen sample, while the prior default local source is SRD. The selected campaign must use one **source-consistent** defaultRules reference, not silently combine those worlds. Verify `start.ts` equality guard with both pin sets.

### R3: public/private origin and same-origin auth

- `apps/web/next.config.ts` rewrites browser `/api/:path*` using Node-only `API_PROXY_ORIGIN` default loopback; `apps/web/src/server/api-origin.ts` uses separate `API_INTERNAL_ORIGIN` for SSR. Both must resolve `http://api.<namespace>.svc.cluster.local:3001` or a verified same-namespace Service DNS. **Test the production build/runtime env boundary**: Next config/rewrite may be captured during `next build`; do not assume a runtime env update affects an already built rewrite.
- `apps/web/src/server/nest-reader.ts:nestFetch` forwards a real browser session cookie to trusted internal Nest with `cache:'no-store'` and a 5000ms default. Do not send privileged cookies to arbitrary public origin or put private contents into a cacheable Next response.
- `apps/api/src/modules/auth/config.ts:readAuthConfig` accepts `APP_ORIGIN` only as https or http localhost/127.0.0.1; `BETTER_AUTH_SECRET` min32, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` required. For disposable loopback lab use one stable forwarded **browser origin** `http://127.0.0.1:<local-port>` with Github OAuth callback configured for it, or provide a separately approved **test-only auth seed** that is not reachable from regular app traffic. Do not invent a fake signed session via curl.
- `apps/api/src/modules/auth/auth.ts` sets Better Auth `baseURL=config.origin`, `basePath='/api/auth'`, `trustedOrigins:[config.origin]`, `useSecureCookies` for https. The authenticated browser path must verify cookie origin/CSRF and wrong-owner failure, not just render a static page.
- `apps/api/src/modules/stories/game-authority-client.ts`: distributed mode requires `GAME_AUTHORITY_MODE=distributed`, `GAME_AUTHORITY_ORIGIN`, `GAME_AUTHORITY_SERVICE_TOKEN` (16–256 chars); no silent direct SQL fallback. Mode `compose` is default, dangerous if accidentally omitted in distributed release.
- `apps/game-authority/src/config.ts` requires matching `GAME_AUTHORITY_SERVICE_TOKEN`; eventual STORY02/03 executor must receive a distinct reduced role token, not the Nest token.

### R4: cold release must prevent opportunistic database writers

Current `apps/api/src/main.ts` always constructs its writable database and local application collaborators, even in distributed mode. Software routing of selected story writes to GA is a **transition**, not proof of SQL database privilege segregation. TURN02 must at minimum demonstrate no direct Nest *POC story mutation* in distributed mode per DIST03/BOOT03, and report the remaining DB privilege limitation. Do not claim an enforceable database one-writer boundary unless checked via actual SQL grants and a refused write. Production IAM/DB role hardening is not required to cheat the POC, but the label “enforced” is prohibited before such proof.

## Release dependencies and resource access matrix

| Workload | PG | S3 | Temporal | Private GA HTTP | Public Gateway |
| --- | --- | --- | --- | --- | --- |
| Web Next | no | no | no | no | yes, `/` |
| API Nest | auth/read plus existing required writes; distributed story commands via GA | selected read/write for non-story API until narrowed | generally no in request path | authorized selected story routes | yes, `/api/**` via one origin |
| GA | primary story writer | read+stage immutable checkpoint | no direct workflow ownership necessary | server | no |
| Outbox+Temporal control | durable notices | no bulk scene publication | client+control worker | publish control-only | no |
| Storyteller executor | **no broad story DB** | pinned read-only source | Activity task queue | task/claim/save only | no |
| Content importer Job | no story DB | import/verify immutable blobs | no | no | no |
| Migration Job | migration-only PG role | no | no | no | no |

If cluster storage credentials cannot be separated due to source store implementation, record the exact limitation; do not manufacture “least privilege”.

## Exact preflight evidence (before any release claim)

1. Source baseline SHA, package scripts and actual generated artifact entrypoints (especially `@offscreen/web` and worker split).
2. Single selected rule/world/start reference triple, S3 bucket/endpoint/prefix, imported root hashes, default-rule bootstrap read and hash.
3. One network namespace and Gateway `HTTPRoute` that targets real Services, while synthetic tests can still run independently.
4. Pod-ip HTTP, consistent `APP_ORIGIN`/`API_INTERNAL_ORIGIN`/`API_PROXY_ORIGIN` semantics, authenticated browser session, same-origin /api rewrite actually hitting Nest.
5. Pinned build and runtime images, `kind load` strategy grounded in actual pins (existing lab smoke uses pulled digests instead of multi-platform `kind load` for synthetic images), one migration Job, locked single-cluster operator.
6. Explicit separate actual-service probes: *app boots*; *private route rejects public*; *S3 read after importer Pod gone*; *Temporal workflow activity picked by real worker*; *committed passage GET from browser*. A successful fake smoke must not satisfy a later gate automatically.

**No workload manifests or actual service deployment were generated by this audit.** TURN02 remains Proposed, and completion depends on prerequisites rather than this document.
