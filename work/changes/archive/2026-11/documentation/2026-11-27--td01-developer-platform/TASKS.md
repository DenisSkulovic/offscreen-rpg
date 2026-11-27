# TD01 | task queue

Base SHA: `c7058958ec3f43fd37ec680d05757561d628926b`; latest must recheck. Change state: READY; owner-authorized for named dispatch, no task selected. Shared path lock: group target join only; no shared canonical writes. Contract owners: [accepted Design](../../../../../designs/open/technical-documentation-renewal/README.md), named card anchors. Tasks: T01 → T02 → T03 → T04; selected task: none.

## T01 | Current command versus future profile | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission and verified target/ownership.

May write: `docs/technical/platform/local-developer-platform.md`. Must not write: any other canonical owner, source, config, proof or shared register.

Read: `docs/technical/platform/local-developer-platform.md`, `docs/runbooks/local-development-platform.md`, `tools/dev-environments/src/domain/dev-environment-session.mjs::parseDevCliArgs`, `infra/verification/verify.mjs::NOT_IMPLEMENTED_SUITES`, `infra/environments/release/install.sh`.

Algorithm: Retain headings and target tables. Under `Developer commands (target, not present yet)` keep heading as legacy anchor; explain that only future subcapabilities are target-only. Separate actual source-present infra plan/up/status, dev/new/reserve/attach/status/stop and verify source/diagnostic routes from targets: profile flags, selective app roles, `stack:up --profile ... --values ...`, dev:release, smoke/full suites. Link actual quick reference; do not claim all are live-qualified. At reviewed source parseDevCliArgs rejects unknown options including --profile; release install.sh refuses arguments; verify.mjs NOT_IMPLEMENTED_SUITES includes smoke/full. Keep selected profile dependency and readiness tables; date current all-role graph description, retain source anchors. Distinguish values rendering from release install support. Preserve data custody, measured capacity limits, external staging/read-only production restrictions, Linux/WSL support and no auto cleanup. No change to CLI, charts or runbook commands. Refresh only after verified source drift; if a new owner has implemented a target, return exact source to planner rather than treating old claim as current.

Test: none at child boundary — source/diff semantic gate; parent runs [PROOF](PROOF.md) once. Negative: The page cannot tell an operator to invoke unsupported --profile or --suite full as current, or equate supported CLI parsing with live proof.

Stop: material source or selected-contract drift, unique fact without survivor, conflicting writer, or new policy decision. Receipt: exact edited headings, preserved constraints and evidence routes, semantic counterexample result, actual diff, any NOT RUN or contradiction.

## T02 | Dev lifecycle authority and history | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: T01 source receipt; verified target/ownership.

May write: `docs/technical/platform/developer-environments.md`. Must not write: any other canonical owner, source, config, proof or shared register.

Read: `docs/technical/platform/developer-environments.md`, `tools/dev-environments/src/domain/dev-environment-session.mjs::parseDevCliArgs`, `tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileOwnedDevSlot`, `docs/runbooks/dev-worktree-stacks.md`.

Algorithm: Keep the selected lifecycle/one-writer/rollback contract and all table rows. Reorganize dated source map as explicitly baseline-bound realization, not proof of latest branch. Reserve/attach present in parser; preserve reported focused proof without inventing install/live qualification. In `Capacity admission and failed-start rollback`, separate selected refusal and rollback invariants from dated 2.64 GiB/3.38 GiB observation and 4 GiB floor; no new capacity claim. Keep in-process schema proof, create-only secret behavior, tenant/peer fences, flock ownership, PID start ticks, zero-replica park, no foreign process and no implicit release. In `Temporal watcher compatibility is separate`, label branch-reported RangeError/debugMode behavior as historical report, not current worker-thread result; keep real task/stop/restart proof gap and release parity. `Readiness and evidence ladder` stays binding; no reclassification of DXK09/DXK11 as broad app acceptance. Existing headings unchanged.

Test: none at child boundary — source/diff semantic gate; parent runs [PROOF](PROOF.md) once. Negative: A green Pod is not current process generation, a stopped slot is not disposal permission, and diagnostic debugMode is not release parity.

Stop: material source or selected-contract drift, unique fact without survivor, conflicting writer, or new policy decision. Receipt: exact edited headings, preserved constraints and evidence routes, semantic counterexample result, actual diff, any NOT RUN or contradiction.

## T03 | Operator presentation and workstation evidence | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: T02 source receipt; verified target/ownership.

May write: `docs/technical/platform/infrastructure-operator-experience.md`, `docs/technical/platform/workstation-observability.md`. Must not write: any other canonical owner, source, config, proof or shared register.

Read: `docs/technical/platform/infrastructure-operator-experience.md`, `docs/technical/platform/workstation-observability.md`, `infra/environments/infra-cli.mjs::parseInfraCliArgs`, `infra/monitoring/report.py`, `docs/runbooks/local-development-platform.md`.

Algorithm: In operator experience retain command contract, presentation semantics and acceptance criteria. Convert `Migration map (planning inventory; not implementation commissions)` to dated status and remaining proposals, retain INF55/56 source proof and human NOT-RUN, current default JSON and topology CLI distinction, future dev/release/monitor UX items as uncommissioned. Remove role-specific historical instructions to ChatGPT from normative prose; preserve bounded planning/approval meaning in the existing work standard, not a new procedure. In workstation observability split the giant opening into concise purpose, selected architecture and explicit 2026-11-25 realization/proof paragraphs, retaining all record kinds and scopes, native Netdata live gaps and historic INF47/49 evidence. Keep `Architecture and authorities`, `Clock, schema and measurement semantics (v1)`, `Persistence and limits`, `Historical interfaces and acceptance` unchanged in substance. Clarify no extra Grafana/Prometheus/OTel stack means workstation collector ownership, not a prohibition on separate native cluster observability. Preserve sensitive argv, explicit context, scope IDs, missing-to-unknown, no double-count and local-only restrictions. No monitoring install or cluster mutation.

Test: none at child boundary — source/diff semantic gate; parent runs [PROOF](PROOF.md) once. Negative: Human stdout must not replace JSON protocol, fixture proof is not installed Netdata, and missing metrics cannot become zeros.

Stop: material source or selected-contract drift, unique fact without survivor, conflicting writer, or new policy decision. Receipt: exact edited headings, preserved constraints and evidence routes, semantic counterexample result, actual diff, any NOT RUN or contradiction.

## T04 | Verification programme owner | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: T03 source receipt; verified target/ownership.

May write: `docs/technical/platform/verification-programmes.md`. Must not write: any other canonical owner, source, config, proof or shared register.

Read: `docs/technical/platform/verification-programmes.md`, `package.json`, `tools/verification/runner/cli.mjs`, `infra/verification/verify.mjs`, `infra/verification/CAPABILITIES.md`.

Algorithm: Keep exact CLI grammar, refusal/exit codes, manifest schema, subject ownership, resource/fault rules, report redaction, cleanup, every guarantee matrix and catalog. In `One entrypoint and one execution model`, collect the five VER01/02/03/06 and INF52 realization paragraphs into a compact dated evidence table (component, exact reported proof, explicit remaining live gate). Preserve all recorded counts, pins, paths, source profile semantics, resource identity, and NOT-RUN distinctions; do not rerun or promote fixture tests. Separate `pnpm verify` source-present from future app suites; explain `infra:verify` source/diagnostic compatibility and smoke/full unsupported at reviewed SHA. Keep INF52 selective profile block tied to actual --profile support. Retain permanent tool ownership and dependency constraints; move no proof into a competing registry. Retain exact headings and current links unless known wrong; send stale historical routes to TD10 for current-router repair. No code or test execution beyond assigned docs checks.

Test: none at child boundary — source/diff semantic gate; parent runs [PROOF](PROOF.md) once. Negative: A missing subject, cleanup failure, fixture PASS, or NOT-RUN live resource must not become a successful programme or authorize live operations.

Stop: material source or selected-contract drift, unique fact without survivor, conflicting writer, or new policy decision. Receipt: exact edited headings, preserved constraints and evidence routes, semantic counterexample result, actual diff, any NOT RUN or contradiction.
