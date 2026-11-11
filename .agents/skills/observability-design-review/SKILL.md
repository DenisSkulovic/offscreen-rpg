---
name: observability-design-review
description: Design or critique operational evidence, traces, logs, metrics, SLOs, performance diagnostics, correlation, redaction and recovery for a consequential backend or distributed feature. No deployment by default.
---

# Observability and production-diagnostics design

**Trigger:** async/third-party workflow, unexplained latency, repeated operational incident, deploy risk, meaningful failure recovery or proposed instrumentation/alerting. Do not invoke to decorate a tiny function with logs.

1. Start with the business/user outcome and the affected product/technical contract. Name what stage **accepted, settled, published or uncertain** means before choosing telemetry.
2. Consult [Observability and production diagnostics](../../knowledge/observability-and-production-diagnostics.md) at the relevant section. Compare logs, metrics, traces, audit records, profiles and user-visible status by the information they reveal, retention/cost and privacy.
3. Trace the actual route via [code navigation](../../../docs/engineering/code-navigation.md) and source only where necessary. Distinguish transport request, durable intent, outbox/workflow delivery, external attempt and publication identities.
4. Propose concrete diagnostic questions and the least costly signals capable of distinguishing likely explanations. Evaluate tail latency, pool/queue saturation, retry amplification, cardinality and sensitive payload handling.
5. Choose bounded attributes, correlation propagation, metrics/SLOs when justified, alerts with actual operator actions and recovery hooks. Logs/traces are **not** authoritative business ledgers.
6. Return `questions | hypotheses | options and chosen signals | correlation/retention/redaction | operating costs | one controlled failure proof | gaps`. No instrumentation edits, hosted telemetry setup, alert deployment or production actions without authorization.

A successfully instrumented path can still be business-incorrect. Observe actual outcomes and verification boundaries, not merely the presence of spans.
