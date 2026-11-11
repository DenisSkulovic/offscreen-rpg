# Release and delivery engineering: move correct artifacts into a running system

**Roles:** release manager, platform/SRE architect, backend/DB migration designer, security reviewer, test strategist and developer shipping a consequential change. **Trigger:** first hosted deploy, persistent schema change, background worker rollout, secrets/config, release compatibility, rollback, CI/CD, feature flags or operational readiness. Not a mandate to install Kubernetes, paid CI or a release committee for local prototype edits.

**Route:** [release semantics](#1-distinguish-code-build-deploy-and-release) · [delivery models](#2-choose-a-delivery-model-that-fits-the-product) · [artifact chain](#3-build-provenance-identity-and-environment) · [rollout](#4-progressive-rollout-and-mixed-version-compatibility) · [data and workers](#5-migrations-background-work-and-external-side-effects) · [rollback and recovery](#6-rollback-is-a-business-and-data-protocol) · [evidence](#7-release-gates-and-operational-proof).

## The governing model

**A successful build does not prove a successful release.** A source revision can compile, a container image can deploy, health probes can go green, and users can still receive a semantically broken result. Shipping is a chain of decisions about artifact identity, environment, compatibility, exposure, observation and recovery.

Correct engineering must answer: **Which exact code is running? Against which schema/configuration? Which features are exposed? Which workflows are still on an older version? How will we know it's correct? How can we reverse an unsafe change without corrupting data?**

The optimal delivery model depends on actual user population, uptime expectations, deployment frequency, persistent state, ops capacity and budget. More automation is not inherently safer if it hides approvals or widens blast radius.

## 1. Distinguish code, build, deploy and release

| Stage | What happened | What has NOT necessarily happened |
| --- | --- | --- |
| Commit | Source was recorded at a revision | It was built, verified or deployed |
| Build | Artifacts were produced | They match deployment environment or passed acceptance |
| Test | Specific checks were executed | Real user journey and operational behavior were proven |
| Publish | An immutable artifact was stored | It was deployed or activated |
| Deploy | Processes/config now run an artifact | Feature is exposed, DB migration succeeded, user got correct result |
| Release | Users have access to a capability or changed behavior | It is universally healthy or accepted |
| Validate | Real status and user/business outcomes checked | Every rare bug is impossible |

A **Git tag, image tag and container digest** are different identifiers. A mutable tag (e.g. `latest`) does not guarantee immutable bytes. A reproducible build is valuable; an artifact digest proves the identity of the output actually promoted. A deployment manifest should capture source SHA, image digest, config version and schema compatibility when relevant.

**Question for coding agents:** Are we discussing “code merged,” “binary deployed,” “feature enabled,” or “user outcome observed”? Those need separate status and proof.

## 2. Choose a delivery model that fits the product

| Strategy | Appropriate conditions | Cost/selection boundary |
| --- | --- | --- |
| Manual local build/run | One developer, pre-POC, low-stakes experimentation | Manual steps and environment differences; cannot establish production safety |
| Simple hosted full deploy | Small service, tolerable short downtime, straightforward rollback | Limited partial rollout and mixed-version control |
| Rolling update | Need availability during app process replacement | Old/new versions overlap; readiness, connection draining and compatibility essential |
| Blue/green | Two environments can run; quick traffic switch and reversible app release valuable | Double capacity, shared DB/state compatibility, switching complexity |
| Canary/progressive exposure | Large enough traffic and risk to measure before all users see change | Routing and observation infrastructure; statistical power and rollback policy |
| Feature flag | Need to separate deployment from exposing functionality | Flag lifecycle, combinatorial states and hidden legacy paths |
| Trunk-based delivery | Frequent small integration, straightforward code coordination | Requires reliable review/verification and temporary compatibility choices |
| Release branch/train | Coordinated versions, external consumers or deliberate schedule | Long-lived divergence, cherry-pick/hotfix complexity |
| GitOps | Desired deployed configuration is reconciled from Git | Drift/incident override rules, permissions, controller complexity |
| Kubernetes/Helm | Numerous services/replicas or platform needs justify orchestration | Substantial cluster/networking/storage/ops costs |

**Do not prescribe Kubernetes as proof of seriousness.** A pre-POC monorepo may be better served by Docker Compose and a small hosted environment. An AI coding agent should be able to explain what reliability or scaling need justifies each extra moving part, and the *smaller valid alternative*.

For a future hosted Offscreen RPG, [delivery and validation](../../docs/technical/delivery-and-validation.md) defines current intended directions. This manual doesn't authorize changing that architecture.

## 3. Build provenance, identity and environment

A deployment is a **chain of custody** from source to runtime:

```text
reviewed commit
  → dependency/toolchain resolution
  → build/test
  → immutable artifact + digest
  → signed/approved promotion where needed
  → environment-specific configuration
  → runtime instance
  → observed user/business result
```

### CI jobs, caches and artifacts

CI is a dependency graph of jobs with isolated execution contexts. A cache saves computation; it is **not** authoritative evidence that a build artifact was produced from the current source. Distinguish dependency caches from publishable immutable release artifacts.

Some code checks should run independently so a formatting failure doesn't conceal TypeScript errors, but parallelism increases runner cost. For a hobby project with limited usage/cash, proportionate local focused checks may be a better default than expensive cloud pipelines. The right answer comes from risk, time, marginal cost and change frequency, not blanket “run everything on every push.”

**Supply-chain considerations:** pinned versions, lockfile, package scripts, third-party build actions, artifact provenance, short-lived CI credentials and least privilege. A green CI job running attacker-controlled scripts with production secrets can be worse than a failed job.

### Configuration and secrets are part of the release

The same binary can behave differently under two feature flags, queue names, database URLs, trust-proxy settings or provider routes. Capture environment **schema and version** while keeping values/private credentials out of Git. Validate required config before accepting traffic; do not log secrets for convenience.

A rollback to old code with *new* config can be incompatible. Treat config updates as their own change with owner, validation and recovery. A workstation's environment working once is not reproducibility.

## 4. Progressive rollout and mixed-version compatibility

A rolling deployment may temporarily run app versions A and B against the same DB/cache/queue. Therefore the design must specify **what each version may read/write** while both exist.

| Boundary | Mixed-version concern | Typical design direction |
| --- | --- | --- |
| HTTP API | New clients send unknown fields, old clients omit fields | Additive-compatible change and explicit capability/version negotiation |
| Database | New writer populates field old reader doesn't understand | Expand-migrate-contract, compatible reads, delayed destructive cleanup |
| Event/queue | Old worker sees new event shape or vice versa | Versioned event/command schema, tolerate unknown optional fields, staged consumers |
| Durable workflow | Existing executions may replay old deterministic code | Workflow-version compatibility and controlled activity behavior |
| Cache | Serialized value format changed | Key/version namespace or backward decoding, safe invalidation |
| Browser | Old tab stays open across backend update | Clear error/refresh contract, stable client compatibility window |
| Feature flag | New behavior enabled before supporting schema/worker available | Explicit dependencies and rollout gate |

**Readiness is not acceptance.** A ready process may connect to DB yet return an incorrect business result. A healthy rollout metric is evidence of server/process operation; user-level correctness needs actual journey/semantic signals.

**Health checks have distinct jobs:** liveness asks whether process should be restarted; readiness asks whether it can safely receive traffic; startup allows a slow initialization period. A dependency outage may justify temporary unready behavior but not always a self-restarting loop. Choose by failure containment and recovery.

**Connection draining:** a process declared unready may still have in-flight HTTP and worker operations; shutdown needs deadlines and ownership handoff. A worker removed during an external provider dispatch cannot assume the external effect was undone.

Primary reference: [Kubernetes rolling update](https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/) and [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/).

## 5. Migrations, background work and external side effects

**Schema migration is a distributed deployment** when old/new processes and data coexist. See [data modeling and online migrations](data-modeling-and-migrations.md) for PostgreSQL locks, concurrent indexes, expand/backfill/validate/contract and rollback limits.

### Workflows require more than container replacement

A Temporal workflow may outlive several application deployments; changing deterministic workflow implementation can break replay. A queue may contain events from old producers; rolling workers must be able to interpret them or route by version. Retry and outbox admission identity protect exactly-once business effects; deployment status doesn't.

### Provider dispatch and release overlap

Suppose a release swaps the code after an expensive model request was dispatched but before its response/publishing step. The new worker must reconcile the **same durable attempt** under correct authority, not call the provider again because old process disappeared. A deploy coordinator can restart workers, but only application operation state and provider evidence decide billability.

**The right layer:** release engineering manages process lifecycle, compatibility and rollout. The [application/Storyteller contracts](../../docs/technical/storyteller-runtime.md) decide business publication, attribution and cost.

## 6. Rollback is a business and data protocol

Reverting an application image is often easy. Reverting **state** is much harder and may be destructive.

| Change | Can simply roll back binary? | What else must be considered? |
| --- | --- | --- |
| Pure presentation patch | Often yes | Browser cache/bundles, user-visible layout and active sessions |
| Additive API field | Usually, if old clients still work | New clients depending on it |
| New DB column | Old app may work with expanded schema | New data writes and backfill semantics |
| Column renamed/dropped | Often no | Old app compatibility lost; forward repair/migration needed |
| New event/workflow version | Depends on queued/in-flight events | Old consumer compatibility and replay |
| Provider operation changed | No guarantee | Already-dispatched external effects, reconciliation, charge |
| New feature flag | Disable can stop new exposure | Already-created durable state may persist |
| Secrets/config rotation | Binary rollback may be irrelevant | Old credentials/revocation and config versions |

**Rollback is not time travel.** Restoring a DB backup can erase legitimate new commands. A safe response may be *roll forward*, isolate one affected capability, keep expanded schema, disable new writes, or migrate data. The selected remedy must preserve the business invariants and user state.

### Release failure taxonomy

- Build artifact wrong or missing.
- Deployment/probe not progressing.
- Runtime crash/config mismatch.
- Connected dependency unavailable.
- Schema/worker/event incompatible during overlap.
- User interaction semantically wrong despite healthy process.
- Data migration partially complete.
- External provider attempts unknown or incorrectly retried.
- Observability absent or misleading.

Each category needs a different investigation owner and corrective action. "Rollback" should not be the only button on the incident playbook.

## 7. Release gates and operational proof

For a consequential release, the responsible role should produce:

| Question | Required evidence |
| --- | --- |
| What exactly changes? | Source, artifact digest, config/schema/feature exposure |
| What remains compatible? | Active browser sessions, old app/worker and persisted data |
| What checks are proportionate? | Focused build/tests, specific integration/business acceptance, security/privacy where relevant |
| How is it deployed? | Capacity, readiness/drain, traffic shift and operator permission |
| How do we detect harm? | Actual user/business metric, tail latency/errors, durable attempt ledger |
| When do we stop or roll back? | Concrete abort criteria and action owner |
| What cannot be rolled back? | DB writes/migration, external side effects, queued work |
| What is recovery? | Artifact rollback vs flag disable vs roll forward vs reconciliation |
| What is the cost? | Hosted build minutes, parallel capacity, human intervention, operational overhead |

**Three discriminating scenarios:**
1. **New app/old worker:** new API enqueues an event with a new mandatory property before all workers understand it. Would the rollout prevent or safely recover the poison message?
2. **Rollback after migration:** new writer stored data in an expanded representation; old app is redeployed. Does it still read/operate correctly, or has an earlier destructive contraction removed its assumptions?
3. **Process shutdown after dispatch:** a provider attempt is uncertain as worker exits. Can new worker reconcile without paying twice or publishing stale output?

**Deep study:** [SE360 CI/CD in real systems](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE360-practical-terraform/SE360-L01-cicd-in-the-real-world.md), [SE215 release and version ownership](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE215-software-engineering-ecosystem/SE215-L11-release-management-versioning-and-change-ownership.md), [SE450 Kubernetes rolling delivery](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE450-kubernetes-and-platform/SE450-L07-releases-gitops-and-platform-observability.md). Primary: [Google SRE Release Engineering](https://sre.google/resources/book-update/release-engineering/), [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), [Drizzle migrations](https://orm.drizzle.team/docs/migrations).

**Safety and scope:** This is an on-demand knowledge manual for coding agents; **not** permission to start GitHub Actions, provision infrastructure, run migrations, alter workflows, pay for providers or deploy code.
