# Temporal platform

One upstream Helm release per local Kind cluster. The chart is pinned by archive SHA-256 in `chart.pin`; container index digests and shared settings live in `values.yaml`. The two profiles select existing CloudNativePG writable services. No local chart, embedded database, or Temporal PVC.

| File | Responsibility |
| --- | --- |
| `install.mjs` | Verified chart acquisition, fresh-only install, exact-match no-op, host/context admission and shared lock |
| `readiness.mjs` | Read-only release, deployment, image, frontend and RPC checks |
| `namespaces.mjs` | Bounded namespace observation and registration |
| `../postgres/temporal-persistence/` | CNPG-owned role, two databases and credential preparation |

Public entrypoints remain `pnpm infra:plan`, `pnpm infra:up`, `pnpm infra:status` and `pnpm infra:render`; use their help for selection syntax. See [technical contract](../../../docs/technical/platform/temporal-infrastructure.md) and [operator runbook](../../../docs/runbooks/kubernetes-temporal.md).

Installation is fresh-only. An existing release must match the pinned values and pass readiness; partial or foreign state is refused without deletion, adoption, automatic upgrade, rollback or credential rotation. Development namespaces retain one day; release uses `default` (three days when newly created). Release database isolation must be resolved before installation.

Development native Helm installation and CNPG schema initialization observed; server SERVING and browser UI working on pinned 2.58.1, repeat ensure successful. Workflow smoke, release and fresh-clone cold-cluster proof remain NOT-RUN. See [live findings](../../../evidence/runs/2026-11-26-temporal-platform.md). Historical embedded-database proofs do not certify this architecture.

## Strict qualification namespace admission (selected)

Durable Execution E1 owner-ratified 2026-11-28; source and live proof outstanding. H01 is closed at architecture resolution only. Add a separate strict entrypoint in `namespaces.mjs` under the existing Temporal owner; retain ordinary `createTemporalNamespace()` and describe behavior, including intentional same-name already-exists tolerance. No new Kubernetes permissions, direct SQL or runtime package namespace API.

Explicitly authorized dev target, existing verified cluster owner/identity, fresh reserved `offscreen-agent-poc-*` name and 86400-second retention only. Exclude concurrent same-name maintenance or cluster replacement during admission. Verify identity before use. Observe exact namespace-specific, transport-valid absence (a bare `NamespaceNotFound` or ordinary parser `absent` projection alone is insufficient). Execute exactly one create, requiring `ok`, zero exit and no timeout/missing/transport failure. Already-exists, uncertain or malformed results refuse; no retry/adoption/repair/deletion. Only acknowledged create permits exact-name describe verification of nonempty namespace ID, name, retention and unchanged cluster identity. Record identity and owned attempt receipt; both qualification consumers require successful admission and fresh dedicated queues. Any failed verification refuses execution and records potentially created residuals. No automatic cleanup of uncertain state. Injected command tests cover ordered success, all refusal rows, no extra mutating actions and unchanged ordinary registration. Actual qualification exercises only strict successful admission, not a live race. [Operator procedure](../../../docs/runbooks/kubernetes-temporal.md#durable-execution-qualification-selected).
