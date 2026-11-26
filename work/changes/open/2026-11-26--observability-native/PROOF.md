# Proof partition — draft

# Frozen acceptance matrix | proposed selected slice
All source work follows committee and owner authorization. Cursor/implementer owns cheap deterministic tests; planner/owner owns heavy acceptance. Existing experiments feasibility evidence only, not installed source acceptance.

| Gate | Normal and discriminating negative | Tier / executor | Required |
|---|---|---|---|
| A1 artifacts | five archives/hash locks, both-profile render exact expected inventory and digest-pinned image refs; corrupt archive, mismatched digest, unexpected resource, tag-only result refuse | source + offline Helm / implementer | essential |
| A2 profile routing | explicit optional dev/release, unchanged defaults and unrelated plans; no legacy shell fallback, wrong context refuses | source / implementer | essential |
| A3 read-only classifier | absent, complete, stale generation, unready, wrong image, wrong claim, foreign/partial namespace, malformed/timeout/forbidden, legacy occupied release; no writes | deterministic fixture tests / implementer | essential |
| A4 custody | concurrent independent worktrees serialized, stale pending and symlink refused, child timeout/parent termination retains fence, wrong identity before write refuses; no cross-service lock collision | deterministic local process tests / implementer | essential |
| A5 install sequencing | five preflight before writes, namespace/secret create once, exact native Helm install order, no upgrade or uninstall; fail at each phase, no later mutations, preserve data and bounded receipt; stale identity stops | injected command tests / implementer | essential |
| A6 public fresh dev | owner-authorized disposable or freshly admitted dev target, real public CLI, all five ready/digests and three bound PVCs, Grafana auth and datasource health; repeat ensure no writes/UID changes | actual local runtime / owner | essential |
| A7 query & privacy | exact selected HTTP positive correlation and synthetic negative canaries, Collector diagnostics check; no app data. Include fresh invalid allowed-value case, metric metadata/exemplar query where exposed; report visibility limits | actual runtime / owner | essential bounded synthetic scope |
| A8 persistence & fault | retained exact trace/log/metric after graceful backend replacements, same claims; Tempo unavailable, healthy paths continue and fresh trace recovery, same Collector UID; restoration on interruption where possible | isolated owner-authorized runtime / owner | essential |
| A9 partial installation | injected real failed Helm install in isolated target, subsequent public ensure refusal and retained identities; explicit cleanup only by owner after receipt | isolated runtime / owner | essential |
| A10 observation | bounded resource sampling, Collector scrape/queue/failure metrics; missing families not zero; no capacity claim | actual runtime / owner | essential |
| A11 occupied release refusal | fixture tests plus read-only public preview against authorized occupied legacy release if available; no actual mutation | source and bounded read-only / owner | essential source; live evidence conditional on available target, no occupied admission |
| A12 preservation | focused existing planner/status/diagnostic tests, host monitoring and game evidence unchanged, no unrelated service change | source / implementer | essential |

Fresh release runtime, hostile tenant isolation, prolonged saturation, crash persistence, gRPC ingress functional proof, actual dashboards and app telemetry admission are separately scoped future decisions; NOT RUN. No blanket extended assurance waiver. Runtime proof must use accepted source SHA, real profile and exact public CLI; disposable test binding must preserve admission semantics, never disable guards. If no legitimate isolated public entrypoint can be established, A6/A9 remain blocked rather than substitute raw kubectl. Owner records target/UIDs/SHA/receipts, cleanup explicit and scoped. Reuse existing signal/persistence/outage/privacy harnesses after adapting their hard-coded E03 guard to explicitly authorized proof target without weakening production guards.

## R34 essential amendments to A2/A3/A12
[R34](https://github.com/DenisSkulovic/offscreen-rpg/blob/7bbdb6d9a4a0cbe2ad22d74c4a335a57eb7191e3/work/designs/open/observability-platform/R34.md) defines the exact selection/result/aggregate/report matrix, typed receipt checks, preflight/inventory/cleanup deadlines and deterministic timing/process tests. Implementer owns focused source and short local subprocess proof; no live experiment required to settle OBS-05. All remain NOT RUN. Preserve A1–A12 and existing owner-operated acceptance prerequisites. A3 explicitly admits expected headless Services and includes bounded PV claimRef reads.


Cursor: A1–A5 and A12 focused tests, A11 source fixture, short subprocess tests; build tools for owner. ChatGPT/owner: A6–A10 actual runtime and conditional A11 read-only preview. A9 requires isolated host/VM and explicit authorization; no availability claim. Exact commands and cleanup preconditions remain to be finalized by planner. All implementation acceptance NOT RUN.

Focused source commands and owned test files are now selected in TASKS.md; actual heavy proof commands and target availability still need final planner review. No proof executed.

Detailed selected proof tooling and owner command sequence: [OWNER-ACCEPTANCE.md](OWNER-ACCEPTANCE.md). T07 implements it; no experiment scripts copied as public proof. Public plan/ensure/status CLI syntax and isolated target availability remain to be verified before final commission.

Public lifecycle commands, actual receipt checks and corrected proof budget: [PUBLIC-CLI.md](PUBLIC-CLI.md). Source and runtime NOT RUN. Isolated normal-profile target availability remains unverified.
