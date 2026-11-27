# P0/P1: three native Temporal agent specimens

R6, 2026-11-27. Owner requested three real POCs against local infrastructure. These are provisional isolated specimens, not production code or selected dependencies. Source authored against upstream integration commit 165fe93b5b4908a443076058b903d0f1b6aa3413 and R4 version register. Executed successfully in owner WSL on 2026-11-27; see the result receipt below. Original planner registry access failed (EAI_AGAIN). Installed releases were verified by the owner; published-artifact API equivalence beyond exercised paths remains open.

## Minimal scope
Three independent Workflow implementations; common deterministic fake model semantics and Activity-backed document read. P0: one model response. P1: tool request -> real Temporal Activity -> model observes tool output -> final response. No external model traffic, credentials, application data, Redis or SQL mutations. This deliberately isolates native runtime behavior; fake SDK-level providers do NOT exercise actual HTTP adapter, billing or model intelligence. A successful P1 is not production acceptance.

Host WSL Worker processes sequentially, connected by loopback forwarding to existing dev Temporal. Do not start full application stack. Use one freshly admitted, named experiment Temporal namespace (prefix offscreen-agent-poc-, unique run label, owner-specific, retention 1 day) and unique task queue/workflow IDs. Namespace creation uses existing infra/platform/temporal/namespaces.mjs helper only after read-only health and absence checks and explicit owner command. Namespace is routing isolation, not hostile-tenant security. Do not use default, release, or any existing game slot. Retain history until owner reviews, no automatic namespace deletion. No cluster creation/upgrade or resource replacement. If shared dev service missing/unready or resources insufficient, stop rather than improvise.

## First action: read-only preflight
From exact main checkout or equivalent current repository source, run preflight.sh via separate archive of this design directory. It checks local Node, memory, dev Temporal/Postgres/Redis status and npm metadata only; no install or mutation. Paste receipt. Planner selects exact compatible release set, checks pinned source/API differences, emits isolated install/launch command and namespace creation receipt. Do not install latest blindly. Use local temporary directory outside workspace, package lock per candidate, same exact Temporal 1.24.0 packages (or separately reviewed upgrade), no monorepo manifest edits. No credentials in stdout. npm metadata queries do not prove package integrity or dependencies resolved. Each specimen imports only selected SDK; use separate isolated installs to avoid peer collisions. Environment strip all API credentials and external trace keys; prohibit provider/network adapters; P0/P1 use model doubles exclusively. No network egress proof claimed.

## Run contract
Once pinned artifacts are prepared, copy common.mjs, run.mjs and only matching candidate files into its isolated install directory. Worker launcher requires POC_TEMPORAL_ADDRESS (127.0.0.1:port), POC_NAMESPACE (fresh experiment), POC_CANDIDATE (vercel/openai/strands); run under sanitized env and bounded outer timeout. Do not invoke before owner namespace and endpoint receipt. Worker.runUntil executes P0 once, P1 three times sequentially; workflow execution timeout 30s. Candidate script exits nonzero on wrong result/call counts. No code here creates or deletes infrastructure. Stop only own Worker/port-forward, report failure without retries across candidates. Local logs may contain synthetic prompts, no real data. No telemetry export. Inspect receipt JSON and history summaries.

## Measurements
For each run: startup/bundle wall ms, mission wall ms, model Activity-side call count, tool effect invocation count, scheduled Activity names, history event count and approximate JSON representation bytes (not serialized server history bytes), process RSS sample peak and process CPU time. Report cold vs three warm runs, no percentile claim from n=3; compare in same host load window. Mock calls have no provider latency; no claim about real model quality or throughput. Source readability, required adaptation and execution semantics are equally important.

## Owner-operated result receipt (2026-11-27)

Source checkout `32bab60387d4aadc728158e0b4fe94f864d8f77d`, clean main. WSL Node 24.19.0, npm 11.17.0, pnpm 11.19.0, 11 GiB available memory at preflight. Existing dev Temporal SERVING; dev PostgreSQL healthy and Redis service present but not used for missions. Namespace `offscreen-agent-poc-dskul-1127163716`, ID `87997988-0f2b-438b-a93b-7d1bbdb3c752`, one-day retention. Sequential, independent npm installations under `/tmp/offscreen-agent-poc-yc8I7ktw`; loopback port forwards, sanitized environment, 180s outer timeout, no provider requests by design. All three original specimens completed without source edits, forced peer resolution or lifecycle-script approvals. All workers stopped cleanly.

Pinned direct dependencies: shared Temporal SDK 1.24.0 (aligned overrides), long 5.3.2, protobufjs 8.7.1, zod 4.5.4. Each native Temporal integration 2.0.0. Vercel: ai 7.0.183, @ai-sdk/provider 4.0.39, @ai-sdk/mcp 2.0.66. Strands: @strands-agents/sdk 1.26.0. OpenAI: @openai/agents-core and @openai/agents-openai 0.22.0, openai 7.45.1, @opentelemetry/sdk-trace-base 2.6.1. Strict peer resolution succeeded for all. npm warned about pending lifecycle-script approvals for protobufjs 7.6.6 and @swc/core 1.16.22; OpenAI also emitted a trace-base deprecation warning. No runtime failure from these warnings. Preserve lockfiles and logs locally; no transitive security/license clearance asserted.

| Metric | Vercel | Strands | OpenAI |
| --- | ---: | ---: | ---: |
| P0 and P1 successes | 4/4 | 4/4 | 4/4 |
| npm added packages / lock entries | 177 / 188 | 198 / 209 | 183 / 194 |
| node_modules (du -sh) | 291M | 305M | 345M |
| install wall seconds | 27 | 26.811 | 7.961 |
| bundle MiB (webpack rounded) | 8.61 | 10.9 | 10.6 |
| compile ms | 1107 | 1913 | 1578 |
| startup ms | 1927.06 | 2746.46 | 2502.94 |
| peak sampled RSS bytes | 619991040 | 785178624 | 801677312 |
| user/system CPU microseconds | 2256087 / 775886 | 3793831 / 806622 | 3376954 / 684357 |
| P0 wall ms | 174.78 | 278.95 | 210.57 |
| P1 wall ms (three runs) | 149.57, 138.56, 132.37 | 214.70, 217.19, 209.26 | 144.41, 126.63, 142.44 |
| P0 events / history JSON bytes | 11 / 6168 | 17 / 9087 | 11 / 6874 |
| P1 events / history JSON bytes | 23 / 13626 | 29 / 16624–16632 | 23 / 14559 |
| P1 model request JSON bytes (round 1 / 2) | 512 / 876 | 417 / 847 | 521 / 872 |

Run IDs: Vercel `8e7c8f23-d566-4abb-b08a-9754df0867e0`; Strands `7e346343-2139-4e29-8271-f322c8b60c3b`; OpenAI `97735e03-c685-4659-a2ba-8099a69691ed`. Each task queue `agent-poc-<candidate>-<runId>`, workflow IDs append `-0` through `-3`. All P0 outputs `POC_SINGLE_OK`, one model and zero tool calls. All P1 outputs `The promise was to meet at the old bridge at dawn.`, two model and one tool call. Vercel scheduled `invokeModel`, `readDocument`, `invokeModel`; OpenAI uses `invokeModelActivity` instead; Strands adds `strandsGetModelConfig` before the same Vercel-named sequence. Results transcribed from owner terminal output, not independently rerun by designer. Full raw logs/lockfiles not yet imported. History JSON size is an approximation; RSS includes worker/bundling; installs use shared npm cache; one worker startup and three warm missions per candidate are not capacity or percentile evidence.

Recommendation: Vercel for E1, pending owner decision and targeted replay/limit/failure evidence. OpenAI is a viable reserve with comparable warm latency and higher observed startup/footprint; Strands is viable but adds a configuration Activity and observed overhead. No candidate cleared all adoption gates. No need to repeat full cohort experiments absent new discriminating evidence.

## Next tiers (separately selected after P0/P1)
P2: shared synthetic documents in dedicated run-owned PostgreSQL database/role, preferably existing owned CNPG or approved isolated tenant path; no write to Temporal databases, game schemas or shared app tenants. One read, one staged write with unique effect key. Common fixture, independent receipt per candidate. P3: crash own Worker after recorded model Activity, and after durable tool effect before completion; recover from SQL and history, compare. P4: explicit admitted child Workflow, permission denied/revoked, budget and unknown result. P5: fixed context sizes and repeated missions, optionally cache immutable reads using existing Redis only in owned isolated scope, TTL/run prefix; no FLUSH, no authoritative state/cache of private grants, no shared-service failure injection. Optional existing observability if healthy: telemetry correlated by candidate/run ID and local process metrics. Compare cold/warm separately; actual HTTP simulator, network faults and provider retry custody need dedicated next tier. No expensive broad acceptance or paid model calls.
