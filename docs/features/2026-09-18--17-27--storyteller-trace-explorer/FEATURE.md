# Storyteller trace explorer

Status: Proposed for owner review. Design only.

## Intended outcome

Make one storyteller operation understandable from admission through model/tool execution, validation, accounting, publication and resulting game state. The Chamber should answer “what happened?” without reconstructing the event from console text and unrelated tables.

Authoritative game state remains in its owning tables. A trace links immutable inputs, execution artifacts and state transitions; it does not become a second source of truth.

## Trace identity and correlation

Every relevant diagnostic record carries available correlation identities:

- QA run and case/stage;
- draft, story and narrative revision;
- generation or planning operation;
- model round and provider attempt;
- tool step;
- publication and resulting passage/offer;
- command/transition/activity identity where applicable.

Structured application logs use the same identities and stable event names. Human prose belongs in diagnostic messages/artifacts, not in the event-name field.

## Captured artifacts

For each operation, retain safe inspectable forms of:

- admitted task type, version and source revision;
- profile/settings/rules/execution-policy revisions;
- context manifest, included evidence handles and omission counts;
- exact captured provider request after secret removal;
- model route, bounds and pricing identity;
- per-round lifecycle and latency;
- tool name, validated arguments, result or structured failure;
- raw provider text/body needed to diagnose parsing, subject to size/privacy limits;
- parsed candidate result;
- schema and policy validation diagnostics;
- reservations, reported usage, verified charge and accounting certainty;
- publication decision: published, stale, failed or held;
- resulting passage/offer IDs;
- focused before/after state changes for supported facts, quantities, roll receipts and current offer.

Store large text once and reference it. Apply explicit byte bounds and truncation metadata; never silently truncate while claiming the artifact is complete.

## Structured event vocabulary

Initial events include:

- operation admitted;
- generation/round claimed;
- budget reserved;
- provider dispatch attempted;
- provider response received or uncertain;
- tool requested, completed or rejected;
- output parsed;
- validation accepted or rejected;
- result persisted;
- publication committed, stale or failed;
- recovery requested/resumed;
- QA stage linked.

Events are append-only diagnostic facts. State such as “current publication status” is derived from authoritative records, not maintained independently in a mutable log document.

## Chamber UI

The inspector gains a trace workspace with:

- operation list ordered by admitted time;
- compact timeline of rounds, tools, validation, accounting and publication;
- artifact tabs for context, request, raw response, parsed result and diagnostics;
- public/private distinction for options and action plans;
- before/after state panel for the committed revision;
- cost/usage panel with certainty clearly labelled;
- links between story passage, offer, generation, attempt and QA stage;
- side-by-side comparison of two selected operations or evaluation runs.

Default views summarize. Raw JSON is available behind deliberate expansion so ordinary exploration remains readable.

## Logs and storage

Use structured local logs for process/runtime incidents and persisted trace artifacts for durable inspection. Do not depend on terminal scrollback. The first implementation stays local and database-backed, with optional OpenTelemetry-compatible emission later. Langfuse or another hosted platform is not required for the POC and must not receive data without a separate privacy/cost decision.

Trace writes participate in the correct lifecycle boundary:

- task admission artifacts commit with admission;
- provider/tool work records commit before advancing to the next step;
- publication references commit with publication;
- logging failure must not corrupt game state, but missing required durable agent steps must stop execution rather than become invisible.

## Privacy and security

- Never capture API keys, OAuth/session secrets, authorization headers or arbitrary environment variables.
- Mark artifacts as public gameplay, private game plan, developer diagnostic or provider/accounting metadata.
- Chamber access remains local/developer-only.
- Export performs a second redaction pass and lists omitted fields.
- Avoid unrelated account/player data in story-scoped queries.

## Acceptance

- One operation can be followed from admission to resulting passage/offer without consulting terminal output.
- Every model round and tool call has ordered persisted evidence and a clear outcome.
- Invalid output shows schema/policy diagnostics alongside the retained raw response.
- Stale publication and retry are distinguishable from generation failure.
- Cost display distinguishes reserved, settled and uncertain amounts.
- Before/after views show only supported authoritative changes and do not infer changes from prose.
- The same trace links into a QA run and sanitized evidence export.
- Offline scripted operations are clearly labelled and never presented as live-model evidence.

## Boundaries

This feature does not add production user analytics, a universal event-sourcing architecture, distributed tracing infrastructure, prompt management SaaS or semantic scoring. It observes existing and planned durable boundaries.
