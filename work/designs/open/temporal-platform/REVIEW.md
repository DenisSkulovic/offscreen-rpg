# Review and acceptance ledger

Proposed design only. No implementation commission.

This document deliberately stops before implementation. Proposed choices need owner review, not a Cursor instruction to investigate.

| Gate | Decision / evidence required |
| --- | --- |
| A architecture | owner accepts upstream native Helm, topology and responsibility boundaries |
| B artifact specimen | planner selects verified chart artifact + explicit image version strategy, obtains archive, renders both profiles and reviews exact hooks, services and config; verify available Helm version |
| C persistence | planner traces existing PG role/database authority and credential flow; settle narrow connectivity and Secret ownership contract; PG tuning deferred |
| D identity/adoption | separately authorized inspection of old folder and live resources; map chart ownership, versions, schema, shards, endpoints, namespaces, credentials and in-flight workflows; choose adoption or explicit clean reset/migration; no destructive default |
| E operational contract | confirm existing namespace policy, upstream shard default, security assumptions and ordinary Helm operation |
| F approval | reconcile accepted design to existing technical/runbook owners, then decide implementation method and only then prepare bounded Changes |

Retirement: once accepted and canon reconciled, record disposition and links in design ledger after review/cooling-off; if deferred, date the next review. No implementation or Change opened, no live proof claimed.

## Earlier review dispositions

First design over-specified custom lifecycle, invented a conditional database DSL, proposed two operational languages, and selected arbitrary retention and shard/pool sizing. These are corrected above. The main architecture survives: upstream chart, existing PG, separate server roles, one shared instance per cluster. Concrete candidate chart now source-reviewed. Keep the main design readable; do not turn each operational safeguard into a new module or framework.

Unresolved before implementation: downloaded archive byte verification against published checksum and actual Helm rendering; existing shared image pin/distribution compatibility; narrow PG database and Secret authority; existing deployment adoption and client identity (deliberately not inspected); exact current caller/coordination mapping. These require planner evidence, not Cursor research assignments. No live operations, no code Changes, no inspection of the excluded Temporal directory. Next review with owner remains architecture and configuration specimen, not migration authorization.

Reviewed current main 72e07201, original uploaded baseline (unchanged source outside design), common pin/profile/command/render utilities and platform plan. Concrete corrections: native Helm bypass of local JSON renderer; explicit dev Helm availability; separate parent and Helm time budgets; existing namespace authority; no duplicate pin parser; dedicated read-only module justified by real callers; do not require pod UID immutability; fix malformed Markdown. No PG tuning. No old Temporal directory contents inspected. No render or live proof. The full design-only values specimen exists; remaining priority is pinned archive rendering, then precise caller migration mapping. Do not commission implementation yet.

## Fourth revision

Split dossier by file responsibility; original full design remains in Git at c39cab3189251cba33a76120597bf2788ebf7346. No change to accepted architecture (none yet accepted). Explicitly identify readiness.test.mjs as a proposed test owner. Concrete configuration specimen and released archive render remain outstanding. Next owner review 2026-11-26 or earlier.

## Artifact review (2026-11-25)

Revised candidate to chart 1.8.0 after inspecting upstream gh-pages index, 1.7.0-to-1.8.0 comparison and tagged templates. Published SHA-256 and archive URL recorded; actual bytes and Helm render NOT RUN (sandbox lacks Helm and DNS for upstream repository). See [specimen](specimen/README.md). No live migration decision or implementation authorization.

## Architecture defense and next evidence

One mandatory replacement Change, pin relocation inside it, separate persistence predecessor only if independently substantive. Removed automatic upgrades, generic values merge and custom release-description hash; compare Helm recorded user values against exact two-address overlay. Download/checksum before database preparation. No additional configuration system or verification Change. Manual terminal experiments are next, beginning with local Helm rendering; no live mutation or old-folder inspection implied. See [EXPERIMENTS.md](EXPERIMENTS.md). No implementation commission.

## Owner terminal evidence (2026-11-25)

Baseline archive integrity, both profile renders, release lint, registry image indexes and read-only CNPG discovery/status schema/service inventory observed. See [FINDINGS.md](FINDINGS.md) for exact observations and limitations. Final pinned render, catalog/ACL/credential sequence, legacy inventory and runtime proof pending. No implementation commission.
