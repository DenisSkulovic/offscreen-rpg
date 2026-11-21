# Code craftsmanship | reviewable, strongly typed and safe implementation

**Applies whenever executable code, public types, schemas, services, queries or tests are created or materially edited.** This is the canonical code-quality rule for ChatGPT planners, Cursor parents and implementing children. [AGENTS.md](../../AGENTS.md) is the short entry; [working agreement](working-agreement.md) and [verification](verification.md) retain product/safety authority. A prettier diff, passing compiler, or green tests alone are **not** a readability or security review.

> **Standard:** A competent teammate should be able to locate an operation, follow its state transitions, understand its invariants, find the failure/authorization path, and change it without reconstructing the model's private reasoning.

## Design and human readability

1. **One responsibility at a useful granularity.** Keep orchestration, persistence/transactions, model/provider wiring, pure transformations and policy checks distinct when they have separable invariants. Avoid both thousand-line mixed-responsibility loops **and** gratuitous one-line helper/file proliferation. Reuse existing package ownership. Don't split a transaction, lock/fence or error mapping solely to shorten a function.
2. **Names communicate domain meaning.** Prefer `expectedRevision`, `selectedRootHash`, `authorizedTools`, `reserveWriterStep` over `data`, `state`, `tmp`, `doThing`. Short local names are fine when their scope and meaning are obvious. A field called `hash` must say *which* hash when several exist.
3. **Readable control flow.** Prefer early guard clauses, named predicates and finite domain-state switches. Avoid nested ternaries, deeply nested anonymous callbacks, single-line complex branches and repeated structural casts. Split around **semantic phases**, not arbitrary line count. Repeated deep nesting or functions beyond roughly 60–100 substantive lines are a **review trigger**, not an automatic error: identify why the logic belongs together or extract a coherent helper with explicit inputs/outputs.
4. **Comments explain intent/invariants, not syntax.** For a non-obvious operation, describe the authority boundary, ordering requirement, retry/idempotency invariant, security consequence or reason an apparently simpler alternative is wrong. Use short JSDoc for exported complex API contracts and non-obvious side effects. No mandated comment on every function, decorative banners or line-by-line English translations of TypeScript. A meaningful comment must remain true when the implementation changes.
5. **Reviewable diffs.** Do not rewrite unrelated code for style. Format changed files with repository Prettier before handoff; preserve existing 2-space/space-indentation convention and avoid blanket tab-width changes. Favor visual structure via whitespace, headings at *semantic* boundaries, and small named helpers. No formatter suppression just to keep generated layout.

## TypeScript as a correctness boundary, not a costume

- Base config already enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride`. Do not weaken these or add `@ts-ignore`, `any`, `!`, unchecked `as` or `eslint-disable` to silence a design problem. When an exception is demonstrably necessary, scope it to the smallest site and explain/test the invariant.
- **Make public/service/transaction boundaries explicit.** Name shared domain inputs/outputs and typed result/error discriminants. Use `type` for unions/compositions and `interface` when object extension is genuinely useful; there is no rule that every shape must be an interface. Infer obvious local and callback types rather than duplicating them.
- **Treat external values as `unknown` until validated:** LLM/provider JSON, tool requests, storage JSON, HTTP bodies, DB JSON blobs and migrated data. Parse at the trust boundary using the existing runtime validators, then pass narrowed typed values inward. A TypeScript assertion does not perform runtime validation.
- **Model states so invalid combinations are hard to construct.** Use discriminated unions or explicit result types for accepted/refused/held/conflict/uncertain outcomes. Preserve exact identifiers, ownership scope, version/root and operation-id relationships; do not turn meaningful domain distinctions into strings and boolean combinations.
- **Keep authority and failure paths visible.** Reads/writes must preserve caller permissions, tenant/story scope, transaction lock/CAS, idempotency, retry behavior and spend/dispatch limits as applicable. A helper whose name sounds like authorization is not proof of authorization. Trace inputs to actual enforcement and negative tests.
- Never import private server/stateful dependencies into a prohibited package. Existing ESLint architectural restrictions stay in force. Prefer existing shared contract owners over duplicate locally invented interfaces.

## Structural-growth review: make code debt observable

A formatter and green typecheck are **not** an architectural health report. At code-bearing Change closure, inspect the changed source for new large multi-owner functions/files, repeated casts across an unvalidated boundary, and newly flat directories. A module that repeatedly accumulates independent features deserves proactive ownership review **before** it becomes impossible for a human to navigate.

`pnpm repo:code-health` is the read-only structural report (`scripts/repo-tools/code-health.mjs`). Default mode prints a short hotspot list and exits 0 even when legacy files are large. `--base <ref>` is an explicit comparison commit, not assumed to be a merge-base. `--strict-new --base <ref>` exits 1 only for a newly introduced file at or above 1,200 lines, a file or flat directory that newly crosses its severe band (1,200 lines or 35 direct production files), or growth of at least 150 lines and 30 percent that lands at or above 700 lines. Exit 2 means the baseline or Git scan was unavailable, which is not a clean result. `as`, non-null assertions, and `any` are inventory counts, not vulnerability findings. The flat `packages/application/src/storyteller` directory remains a **review signal**, not a mandatory failing build or license to create decorative subfolders. Do not split a transaction or schema identity to satisfy a line count.

**Cadence:** Change parent reviews *its diff* on every closure; the integration custodian samples repo-wide hotspots about **every two weeks during active programs**, plus before major Undertaking integration. Record no more than the top three actionable candidates in the existing remediation program; human/ChatGPT validates cohesion, contracts, callers, evidence and overlap before creating any new implementation Change. No automatic refactors, issue spam, permanent exception registry or scheduled paid-agent swarm.

## Verification and handoff: required for affected code, proportionate to risk

**Every implementation T-ID / Change parent** must inspect the changed diff for the rules above and run **focused checks on changed files**, not a full repository style migration:

```bash
pnpm exec prettier --check <changed.ts> [other-changed-files...]
pnpm exec eslint --config eslint.quality.config.mjs <changed.ts> [other-changed-files...]
```

Run the affected package's typecheck and focused normal/negative tests at a proportionate checkpoint. Existing code debt in untouched files is not a license to introduce new violations, nor a mandate to retrofit an unrelated subsystem. The repo-wide `pnpm lint:quality` is an **audit**, not currently an all-green merge gate; only claim PASS for a command actually executed and passing. Before an approved high-risk join, include source/diff review of permission, money, root/fence, publication and crash/retry behavior.

**Parent code-craft review (short, explicit):** (a) can a human follow the phase/state graph? (b) are domain interfaces and runtime trust boundaries explicit? (c) is each responsibility in its existing owner? (d) do meaningful comments preserve *why*? (e) are important negative cases and failure states tested? (f) did lint/format/typecheck actually run? If not, report `NOT RUN`, and distinguish new debt from pre-existing debt.

**Escalation:** If implementing a planner's prescribed algorithm produces a very large, deeply nested mixed-responsibility module, do not cosmetically split it blind or declare it healthy because it compiles. Stop at the next checkpoint with file/function, approximate size, involved responsibilities and a specific proposed semantic seam. ChatGPT decides whether to improve the remaining Change packet or commission a separate bounded refactor. Security/correctness defects are addressed before acceptance; low-risk readability debt can be recorded for targeted follow-up without blocking unrelated work indefinitely.

**No self-approval by prose.** Documentation and comments explain contracts; compiler/linter checks catch mechanical problems; source review and negative tests establish whether a security/correctness boundary is actually met. Each is necessary in its relevant scope, none substitutes for the others.
