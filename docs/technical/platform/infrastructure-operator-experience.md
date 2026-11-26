# Infrastructure operator experience | presentation and inspection standard

Selected direction 2026-11-25. Source inventory baseline f582bd005af5785df238c11794049bc9eda44798. This is a target standard, not a claim that commands already comply. [Local developer platform](local-developer-platform.md) owns lifecycle and selection; [developer environments](developer-environments.md) owns tenant/slot custody; [workstation observability](workstation-observability.md) owns measurement semantics; [verification programmes](verification-programmes.md) owns proof semantics. [Operator quick reference](../../runbooks/local-development-platform.md) lists currently runnable commands.

## Purpose and scope

A human should discover, plan, operate, inspect and diagnose the local infrastructure without needing an agent to interpret its output. Dev and release share presentation conventions; preserve different authorization, identities and resource defaults. Apply to human-facing infrastructure, dev lifecycle, release stack, topology experiments, image build/distribution, monitoring and verification commands. Internal child protocols and vendor tool output are not public terminal UX. No interactive TUI framework, new controller, new metrics database, replacement of kubectl/Helm/Tilt, mandatory language conversion, or cosmetic rewrite of working scripts.

## Command contract

- Keep current public command names and behavior during incremental migration. Public commands expose useful --help, including purpose, read-only/mutating classification, defaults, allowed values, examples and output modes. Help performs no host/network/cluster access. Reject unknown/repeated/conflicting arguments before mutation. Do not add meaningless flags.
- Human-facing status/plan/result commands target concise readable text, with explicit --json where structured output exists. For already machine-consumed commands, preserve default bytes/shape until consumers and tests are mapped and migrated; internal adapters can stay JSON-first. Presentation mode must not affect operation, authorization, queries or exit semantics. Do not auto-switch machine contract merely because stdout is piped.
- Render commands output valid multi-document YAML, no heading or progress on stdout; explicitly selected JSON is one JSON array of documents. During migration retain an explicit legacy compact JSON-document stream mode for existing callers. Keep internal Helm JSON-per-line parsing/validation and installer manifest serialization unchanged until their consumers are deliberately migrated. YAML generation must use an existing or explicitly selected real serializer, never an ad hoc scalar encoder. Quoted strings remain strings; multiline ConfigMap data and empty objects survive round trips.
- JSON mode stdout contains exactly one final JSON value, with stable existing fields and schema version where applicable. Pretty indentation is permitted when not part of an existing line protocol. No ANSI, banners, progress or raw vendor output in machine stdout. Existing JSONL streams and child event protocols stay distinct. Progress/diagnostics go to stderr; redirection must not corrupt result. No new credential exposure in any mode.
- Prefer --verbose for bounded useful detail, not arbitrary raw output. Existing private report/receipt paths may be printed with explanation. Support NO_COLOR and non-TTY/TERM=dumb/CI plain output; explicit --no-color on public migrated commands where applicable. Unicode symbols optional, ASCII fallback readable; text carries meaning independent of color. No cursor movement/spinners on non-TTY. Ctrl-C and existing signal/cleanup behavior preserved.

## Presentation language

Use shared restrained Offscreen header where useful, target/environment/namespace/slot immediately below, semantic sections, stable row ordering and explicit units. Use terminal width sensibly (narrow mode vertical key/value, avoid truncating important errors or resource names). Use whitespace and aligned columns; no decorative banner for simple one-line output. Color is optional: success green, warning yellow, failure red, active cyan, neutral gray. State vocabulary: HEALTHY/READY, DEGRADED/NOT-READY, ABSENT, INACTIVE, UNKNOWN/UNREADABLE, BLOCKED, REFUSED, FAILED; map only when supported by source semantics. Verification retains PASS/FAIL/BLOCKED/NOT-RUN/TIMEOUT and evidence tiers. Do not conflate installed with ready, requested with observed, inactive with failed, missing with zero.

### Status and inspection

Show scope, observation time where known, resource name/type, state and meaningful numerator/denominator (ready/desired). Summary first; details optional. For PostgreSQL show cluster/primary/standby identity, current versus desired count and service endpoints only when actually observed or clearly declared; storage, requests/limits, actual measured usage separately. For other services use their real readiness semantics. Unknown data stays unknown. No new probes merely to fill a table; missing facts are a separately scoped observation change. Offer precise safe read-only follow-up commands when they are valid for the selected target. Prefer native kubectl, Helm, Tilt, Headlamp and existing monitoring for deep inspection; no second dashboard.

### Plan

Read-only. Show target identity, proposed actions in execution order (create/reuse/resize/skip/refuse), current vs desired configuration, resource delta and budget when known, dependencies, whether persistent data may be affected, and authorization needed. Distinguish estimates from measured facts. No false promise of successful future execution or primary retention during asynchronous reconciliation. Plan output does not authorize mutation.

### Operation progress

Emit named semantic phases with actual start/completion/failure events, elapsed monotonic durations, and meaningful counters when available. Reuse existing operation timing/child event machinery. Indeterminate phase shows elapsed time, not invented percent. Report complete only on actual readiness/acceptance predicate. On error stop at existing safety boundary; show phase, scoped target, stable reason, concise cause, known mutation/partial/unknown state, and safe next action. Do not recommend destructive cleanup by default. Preserve unknown commit/write outcome, ownership and rollback semantics.

### Reports and resource observations

Summary first, detail by service/phase/scenario, elapsed time, result and evidence tier, meaningful units and observation window. Distinguish measured usage, requests, limits, capacity, and estimates. Missing/stale coverage explicit. Preserve report schema/receipt retention, redaction and raw-data access rules of observability and verification owners. No secret values, DSNs, tokens, arbitrary env dumps, raw SQL or private payloads. Never replace source/live evidence with a visual success indicator.

## Implementation boundary

Keep orchestration and observation independent from presentation. Use a small pure Node formatting module in infra/platform/common only if it serves multiple existing public callers; no workspace package, no imports from application domains. Reuse current dev startup rendering idioms and operation events, not its lifecycle internals. Python monitoring remains Python stdlib, follows same semantic conventions without shelling into Node. Shell scripts remain thin where useful; no blanket conversion to TypeScript or bash. A formatter receives already validated/redacted structured facts and returns strings; no Kubernetes calls, state mutations or new readiness policy inside it. Avoid both oversized controllers and helper proliferation; apply existing code craftsmanship standard.

## Migration map (planning inventory; not implementation commissions)

| Order | Surface | Observed baseline / work |
| --- | --- | --- |
| 1 | Manifest inspection | **INF55 source Done (human acceptance NOT-RUN).** Shared `formatManifestDocuments` plus `--format yaml\|json\|legacy` on platform/workload render CLIs; root aliases `pnpm infra:render` / `pnpm infra:render:workloads` default YAML. Direct CLI default remains compact legacy JSON. Internal Helm JSON-line parse and installer serialization unchanged. |
| 2 | Platform and PostgreSQL commands | **INF56 source Done for plan/up/status (human acceptance NOT-RUN).** `infra/environments/infra-cli.mjs` keeps default JSON; `--human` / `--json` / `--help` / `--no-color` (human-only); pure `infra-presentation.mjs`; human-only `up` phase progress on stderr. **Topology CLI:** `pnpm infra:postgres` / `topology-cli.mjs` now defaults to human presentation with `--json` for receipts, useful `--help`, and pure `topology-presentation.mjs` (instances, budgets, readiness, refusals); behavior/exit codes unchanged. |
| 3 | Dev and release stack | tools/dev-environments/src/cli/dev-tilt.mjs, application/dev-status.mjs, dev-startup-timing.mjs; scripts/repo-tools/stack.mjs. Preserve good startup display and receipts, improve status/help/failure consistency; coordinate with INF38. |
| 4 | Images and service installers | infra/images and infra/platform/*/install.{sh,mjs} (observability uses native `install.mjs`), environment assembly and Kind manager. Review human vs internal callers first; reduce noisy logs, keep explicit targets and useful failures. No lifecycle rewrite. |
| 5 | Monitoring and verification | infra/monitoring/report.py already supports tables/JSON; infra/verification/verify.mjs already has human/JSON modes. Harmonize only genuine gaps, coordinate with VER01/INF52, retain evidence schema and independent runner ownership. |
| 6 | Human acceptance | Operator walkthrough: inspect rendered dev/release manifests, help, status, read-only plans, controlled owned operations and failure fixture; compare before/after readability and report actual gaps. No live permission implied. |

Do not commission all rows at once. ChatGPT audits exact source/callers and tests before each bounded Change; user may prioritize or revise the sequence. Source health and readability are reviewed alongside operational UX, but functional refactors need separate ownership/proof if they change semantics.

## Acceptance criteria per migrated command

- Human can identify scope, result, next step and whether data changed without reading implementation.
- Plain terminal output and narrow-width fixtures readable; no ANSI in JSON or non-TTY output; no accidental progress bytes in manifest or JSON streams.
- Existing machine consumer tests pass; parse rendered YAML/JSON and compare complete semantic documents including scalar types and multiline values. Preserve known refusals, exit codes, target/permission guards and data identity.
- Help and malformed flags make zero host mutations; source tests use fake runner/clock, no Kubernetes startup. Successful, refused, partial, absent, unknown and timeout examples where applicable; no fabricated metrics.
- Capture concise before/after samples in the Change receipt, link current runbook, distinguish source proof from real local use. Human acceptance is explicitly separate from source tests.
