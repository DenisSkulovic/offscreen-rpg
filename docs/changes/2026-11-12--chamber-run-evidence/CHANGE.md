# Change CH09 | Immutable reproducible run evidence and safe export

> **Cursor start:** [current QA persistence](../../../packages/application/src/developer-tools/README.md) → `qa-journeys.ts`, `packages/contracts/src/qa.ts`; [current inspector](../../../apps/web/src/features/developer-tools/chamber/README.md). **Target:** [C06/C09/C10/C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol 6](../../technical/chamber-lab-protocol.md#6-observations-assertions-and-reports), [audit H08/H09](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** an operator-selected QA “passed” is evidence of a recorded judgment, not a machine-verified invariant.

**State:** Specified/Proposed; no code execution. **Depends on:** CH06 and CH07 (CH08 fault trace can be added later). **Inspected source:** `470a5df`.

## One bounded code outcome

Persist/export a **LabRun** evidence capsule with immutable scenario@version, fixture/command/fault hashes, seed, git SHA/dirty, lane/clock/provider mode, step outcomes, authoritative before/after deltas, structural assertion results, rejected/blocked reasons and bounded artifact references. Export compact **redacted JSON + Markdown summary** and one copyable replay command. Keep human `qa_run` journal as a separate, linkable kind of evidence; no schema rewrite that changes past run meaning.

## Binding decisions

- Machine run and human QA are **different evidence authorities**. Where persistent store is useful, add narrow `lab_run` metadata/index; large trace/private blobs remain in guarded local artifact store keyed by digest, not megabytes of raw DB JSON.
- The existing QA export includes freeform notes and evidence strings; don't call it sanitized merely because it is valid JSON. Implement explicit default redactor for secrets, private prose, raw provider packets and untrusted operator text; opt-in private artifact export is separately gated.
- A run finalizes immutably; replay/fork creates another ID. Missing fixture/version after code upgrade yields `blocked`, not silent use of latest recipe. Never record a mock as a live paid result.

## Proof

**Normal:** run outcome survives restart, exports small useful diff/assertion, and copied scenario+seed/steps reproduces the same deterministic structural result.  
**Negative:** secrets/private provider payload in observation/notes do not appear in default export; changed fixture version refuses as same run; manual passed cannot be displayed as auto-proven.  
**Verification:** pure contract/redaction tests + explicitly authorized local DB/artifact test when needed. Preserve existing QA journal/exports without mutating historical records.

**Handoff:** focus on one run record and one export path; no general observability service or UI rewrite.
