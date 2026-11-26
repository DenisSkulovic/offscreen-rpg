# Independent design committee | pass 03

2026-11-26. Fresh ChatGPT reviewer, not independent human certification. Candidate cba104e31e3721781560d06e5c5c337b7006b661; branch design/postgres-platform; source baseline 73b3154025e94ad2f827cdb03eda4b389e19ac35. Scope: narrowed native baseline installation and observation; topology recovery, tenancy, capacity and release credential migration independently gated.

## Verdict: REVISE AND RE-DEFEND

Owner-directed review of a candidate explicitly not yet submitted by the designer. Architectural direction supported; no implementation authorization. Removing universal pending-intent machinery and retaining native CNPG, chart, explicit topology CAS and existing consumer boundaries is a material improvement. Do not reopen the entire architecture merely to address the remaining concrete contracts.

## Findings

- C01 BLOCKING — Process custody. The proposed local lock serializes participating baseline installers only; existing topology, tenant, Temporal and independent kubectl writers do not participate. State exactly what invariant the lock supplies under the owner maintenance window. Settle bounded child execution, inherited descriptor custody, process death and end-to-end deadline including the existing outer platform runner. No custom supervisor solely to rescue an overbroad guarantee. Actual executable custody remains evidence-gated.
- C02 BLOCKING — Operator installation. Deterministic create-only baseline Cluster installation is accepted in principle under unchanged declaration, no external deletion/name reuse, explicit ownership and unknown-outcome observation constraints. Multi-object operator install is different: exact pinned inventory, compatibility and partial/unknown recovery remain unresolved. Distinguish all absent, all compatible and ready, compatible incomplete, conflict, unreadable, unknown creation outcome. Compare create-only plus explicit partial recovery against narrowly bounded native reconciliation; simplicity includes recovery ergonomics. No blind upsert, adoption, deletion or retry. Arbitrary topology CAS recovery is explicitly outside this initial slice and remains open; no claim that existing receipts are fixed.
- C03 BLOCKING — Semantic compatibility. Improvements acknowledged: UID and ownership checks, image/bootstrap/storage identity, semantic quantities, preserved actual instance count, explicit superuser-access policy. Complete pinned defaults, security-sensitive and extra configuration policy, operator inventory/readiness and absence/unreadable distinctions. Avoid generic recursive YAML equality and accidental acceptance of security drift. Verify actual writable primary independently of controller status.
- C04 BLOCKING — Integration and deletion map. GAP-ANALYSIS identifies real duplication but caller/export/test closure is incomplete. Freeze concrete responsibility and source-to-destination map for dev/release plans, observation, execution, operator installation, readiness, topology sharing and retained shell/CLI facades. Preserve root commands, authorization and output/exit protocols, endpoint identities, render parity, Temporal persistence, diagnostics and tenant startup/parking. Retain compatible entrypoints, not duplicate implementations concealed beneath new ones. No retirement without exact closure.
- C05 DIRECTION ACCEPTED — Smaller architecture. Shared baseline observe/validate/create-if-absent/verify behind existing adapters; Kubernetes/CNPG own reconciliation. Universal operation journal and recovery daemon rejected. Scope narrowing accepted; concrete module composition and coherent representative operation specimens remain needed for final structural acceptance.
- C06 SEPARATELY GATED — Tenant migration privileges, login sequencing, protected gate/journal and credential identity. No security acceptance; no weakening existing protections.
- C07 SEPARATELY GATED — Measured capacity, Temporal connection bounds, release credential cutover, backup/restore and hosted HA. Preserve settings and identity for parity; no claim of adequacy.

## Next defense

1. Freeze concrete module ownership and retention/removal map.
2. Inventory exact pinned operator artifact and choose bounded partial-install recovery.
3. Complete semantic compatibility and refusal matrix.
4. Settle custody/deadline contract and discriminating experiment.
5. Close caller/export/test and compatibility mapping.
6. Specify fresh install, healthy no-write reuse, interrupted installation, foreign collision, unreadable state and same-UID readiness proof scenarios.
7. Reconcile superseded structural artifacts, self-defend and submit exact new SHA.

Do not require unrelated tenancy or hosted proof for a genuinely isolated structural slice. Consequential unproven runtime assumptions remain gated; no numeric score overrides blocking findings.

## Evidence and limits

Reviewed branch AGENTS/CHATGPT entry rules, target-driven-renewal, relevant workflow material, README, STRUCTURAL-DESIGN, committee pass 02, DEFENSE-PASS-02, GAP-ANALYSIS and canonical database-infrastructure contract. Did not independently revalidate every underlying source file or upstream artifact, execute local experiments or tests, or inspect live state. Detailed historical source observations are attributed to the dossier. Rejection rests on explicit unresolved design contracts, not alleged runtime failures. Receipt only; no implementation, deployment, queue or design-authority change.
