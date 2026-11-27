# Code craftsmanship | reviewable, strongly typed and safe implementation

**Applies whenever executable code, public types, schemas, services, queries or tests are created or materially edited.** This is the canonical code-quality rule for ChatGPT planners, Cursor parents and implementing children. [AGENTS.md](../../AGENTS.md) is the short entry; [working agreement](working-agreement.md) and [verification](verification.md) retain product/safety authority. A prettier diff, passing compiler, or green tests alone are **not** a readability or security review.

> **Standard:** A competent teammate should be able to locate an operation, follow its state transitions, understand its invariants, find the failure/authorization path, and change it without reconstructing the model's private reasoning.

## Design and human readability

1. **One responsibility at a useful granularity.** Keep **orchestration** (I/O ordering, authorization, transaction boundaries, retries) separate from **computation** (pure validation, mapping, sizing, AST metrics) when their invariants differ. Keep persistence/transactions, model/provider wiring and policy checks in their existing owners. Avoid both thousand-line mixed-responsibility loops **and** gratuitous one-line helper/file proliferation. Reuse existing package ownership. Don't split a transaction, lock/fence or error mapping solely to shorten a function.
2. **Names communicate domain meaning.** Prefer `expectedRevision`, `selectedRootHash`, `authorizedTools`, `reserveWriterStep` over `data`, `state`, `tmp`, `doThing`. Short local names are fine when their scope and meaning are obvious. A field called `hash` must say _which_ hash when several exist.
3. **Readable control flow.** Prefer early guard clauses, named predicates and finite domain-state switches. Avoid nested ternaries, deeply nested anonymous callbacks, single-line complex branches and repeated structural casts. Split around **semantic phases**, not arbitrary line count. Repeated deep nesting or functions beyond roughly 60–100 substantive lines are a **review trigger**, not an automatic error: identify why the logic belongs together or extract a coherent helper with explicit inputs/outputs.
4. **Comments explain intent/invariants, not syntax.** For a non-obvious operation, describe the authority boundary, ordering requirement, retry/idempotency invariant, security consequence or reason an apparently simpler alternative is wrong. Use short JSDoc for exported complex API contracts and non-obvious side effects. No mandated comment on every function, decorative banners or line-by-line English translations of TypeScript. A meaningful comment must remain true when the implementation changes.
5. **Reviewable diffs.** Do not rewrite unrelated code for style. Format changed files with repository Prettier before handoff; preserve existing 2-space/space-indentation convention and avoid blanket tab-width changes. Favor visual structure via whitespace, headings at _semantic_ boundaries, and small named helpers. No formatter suppression just to keep generated layout.

## Scan-first narration for AI-authored algorithms

**Selected human-reader preference (2026-11-23):** A developer arriving cold at an AI-authored orchestration function should be able to **skim its conceptual steps without decoding every expression**. Short, accurate phase narration is welcome even when names are good. This supplements the intent/invariant comment rule above; it does not require comments on every statement.

- At meaningful phase transitions in a nontrivial function, add **one short comment in ordinary language**, optionally numbered when order matters: `// 1. Load the owned story and its current revision.`, `// 2. Reject stale submissions before any write.`, `// 3. Publish the event and preserve the original receipt.`. Prefer domain actions over mechanical narration like `// get data`, `// call API` or `// return result`.
- Separate major algorithm phases with **one blank line**. Group 2–8 related statements under a comment when that makes the function faster to scan. If a phase spans 50+ lines or several independent responsibilities, reconsider a named helper; comments are not an excuse for a monolith.
- **Narrate branching decisions and failure paths:** what happens when a dependency is absent, a lock cannot be acquired, the source root is stale or an attempt times out. Explain why an ordering constraint or irreversible boundary matters. Comments must not promise a result that the code does not ensure.
- **Do not over-comment:** skip obvious expressions, getters, one-liner helpers, mechanical assignments and repetitive boilerplate. Existing short functions need no decorative numbered list. Do not add narration solely to make a file longer; the goal is a navigable algorithm outline.
- **Update the narration in the same diff** when changing control flow, retries, permissions or transaction ordering. A stale algorithm comment is worse than none. Avoid pseudo-code duplicating full contracts or detailed documentation already owned by package READMEs.
- During a bounded implementation task, apply this to **the meaningful functions actually touched**, not a repo-wide comment-only sweep. For future explicit readability work, human scanability is an acceptance criterion alongside tests, typecheck and security.

Example for a long orchestration function:

```ts
// 1. Load the authoritative record and reject a stale revision.
const current = await readOwnedStory(ownerId, storyId);
assertExpectedRevision(current, expectedRevision);

// 2. Prepare the command without touching persistent state.
const command = validateAndPlanAction(current, input);

// 3. Commit exactly once; a retry must preserve the operation ID.
const receipt = await commitCommand(command, operationId);
if (receipt.state === 'held') {
  // Keep the reason visible and do not attempt a second dispatch.
  return receipt;
}

// 4. Return the durable receipt, not a guessed completed scene.
return receipt;
```

**Indentation decision boundary:** the current repository deliberately uses two-space indentation (`.editorconfig`, `.prettierrc.json` default, this rule's existing changed-file format checks). A request for **literal tabs** cannot be correctly implemented by changing Cursor's Tab key alone while Prettier still writes spaces. Until a formatter/EditorConfig migration is explicitly selected and its impact validated, preserve existing source indentation and avoid whole-repository whitespace churn. Editor visual preferences can be local; do not pretend visual tab width converts stored spaces to tabs.

## Human-ownership refactors: controlled mechanical freedom

A package/module readability Change can prescribe **the destination ownership map, stable public contracts, route/table/command invariants, and evidence**, then allow Composer to perform the routine move/rename/import cleanup and choose small local helpers. A planner does **not** need to dictate every line of mechanical code motion. That freedom does **not** include deciding new package boundaries, SQL transaction behavior, credential/auth semantics, Zod acceptance policy, public API shape, migration contents or budget/retry behavior.

**Readable without becoming a file maze:**

- A human should find the entrypoint from one package README and reach its handler, domain owner and durable effects in roughly two navigation steps. Keep related files together. Prefer **3–6 coherent modules** over 15 disconnected one-function files, but do not obey numerical caps over cohesion.
- Co-locate controllers with their route families, hooks with their feature, and schema tables by lifecycle. No generic `utils.ts`, `service.ts`, `repository.ts` or `types.ts` dumping grounds without a precise domain responsibility.
- A Nest handler should read as **authorize → parse → delegate → map result**; a Next feature as **server boundary → query/command hook → presentational UI**; a SQL operation should expose **who owns the transaction, which rows lock, and its retry/lease/idempotency invariant**. These are role descriptions, not new layers that must be created for every endpoint or query.
- Do not move SQL out of a transaction to satisfy folder aesthetics. Drizzle query builders and explicit SQL are acceptable; repository patterns are useful only if they make real transaction ownership and query scope clearer rather than hiding them.
- Comments explain nonobvious reasons, constraints and ordering, not every line. Update one local README or navigation map with _real file paths_ after reshaping rather than maintaining a second complete code index.

**Refactoring verification policy:** retain existing behavioral, SQL, authorization and replay tests and run the focused affected subset. Do **not** generate new unit tests for every moved private helper or every renamed folder. Prefer 1–3 meaningful high-value contract/route/schema smoke checks when a refactor crosses a boundary, or zero new tests if existing coverage proves the stable behavior. Tests that solely assert obsolete internal file locations may be updated/replaced while preserving their actual behavioral claims. Never discard important tests just because they are inconvenient to maintain. No opportunistic new migrations, public export changes, runtime provider calls or major dependency upgrades in a readability-only Change.

**Composer task economics:** within a planner-fixed package/subdirectory ownership and write set, the executor may inspect the necessary callers and choose the simplest mechanical move. Preserve exact code behavior and run selected checks; stop for a newly discovered cross-package contract, authority boundary, transaction change, broken test assumption or conflicting concurrent Change. Parent does one coherent package refactor and one final navigation/quality pass rather than launching a helper-per-file swarm.

## TypeScript as a correctness boundary, not a costume

- Base config already enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride`. Do not weaken these or add `@ts-ignore`, `any`, `!`, unchecked `as` or `eslint-disable` to silence a design problem. When an exception is demonstrably necessary, scope it to the smallest site and explain/test the invariant.
- **Make public/service/transaction boundaries explicit.** Name shared domain inputs/outputs and typed result/error discriminants. Use `type` for unions/compositions and `interface` when object extension is genuinely useful; there is no rule that every shape must be an interface. Infer obvious local and callback types rather than duplicating them.
- **Treat external values as `unknown` until validated:** LLM/provider JSON, tool requests, storage JSON, HTTP bodies, DB JSON blobs and migrated data. Parse at the trust boundary using the existing runtime validators, then pass narrowed typed values inward. A TypeScript assertion does not perform runtime validation.
- **Model states so invalid combinations are hard to construct.** Use discriminated unions or explicit result types for accepted/refused/held/conflict/uncertain outcomes. Preserve exact identifiers, ownership scope, version/root and operation-id relationships; do not turn meaningful domain distinctions into strings and boolean combinations.
- **Keep authority and failure paths visible.** Reads/writes must preserve caller permissions, tenant/story scope, transaction lock/CAS, idempotency, retry behavior and spend/dispatch limits as applicable. A helper whose name sounds like authorization is not proof of authorization. Trace inputs to actual enforcement and negative tests.
- Never import private server/stateful dependencies into a prohibited package. Existing ESLint architectural restrictions stay in force. Prefer existing shared contract owners over duplicate locally invented interfaces.

## Structural-growth review: make code debt observable

A formatter and green typecheck are **not** an architectural health report. At code-bearing Change closure, inspect the changed source for new large multi-owner functions/files, repeated casts across an unvalidated boundary, and newly flat directories. A module that repeatedly accumulates independent features deserves proactive ownership review **before** it becomes impossible for a human to navigate.

`pnpm repo:code-health` is the read-only structural report (`scripts/repo-tools/code-health.mjs`). Default mode prints a short hotspot list and exits 0 even when legacy files are large. `--base <ref>` compares against an explicit ref, scopes **changed/new diagnostics** to paths in the working-tree diff, and reports **existing debt on unchanged files** as a separate count (full repo-wide findings remain in JSON). It does not invent changed-line precision for legacy advisories on untouched files. `--strict-new --base <ref>` exits 1 only for a newly introduced file at or above 1,200 lines, a file or flat directory that newly crosses its severe band (1,200 lines or 35 direct production files), or growth of at least 150 lines and 30 percent that lands at or above 700 lines. Exit 2 means the baseline or Git scan was unavailable, which is not a clean result. `as`, non-null assertions, and `any` are inventory counts, not vulnerability findings. The flat `packages/application/src/storyteller` directory remains a **review signal**, not a mandatory failing build or license to create decorative subfolders. Do not split a transaction or schema identity to satisfy a line count, add helpers only to game thresholds, or treat advisory counts as mandatory extraction quotas.

**Cadence:** Change parent reviews _its diff_ on every closure; the integration custodian samples repo-wide hotspots about **every two weeks during active programs**, plus before major Undertaking integration. Record no more than the top three actionable candidates in the existing remediation program; human/ChatGPT validates cohesion, contracts, callers, evidence and overlap before creating any new implementation Change. No automatic refactors, issue spam, permanent exception registry or scheduled paid-agent swarm.

## Tests, barrels, and production/test boundaries

- **Name tests for behavior under review**, not packet ids or wave prefixes in the basename (e.g. `redis-connection.test.ts`, not `cache03-strategies.test.ts`). Existing legacy names are debt; new or renamed tests should read like the scenario they prove.
- **`index.ts` barrels are navigation**, not places to host implementations. Re-export stable surfaces; keep logic in named modules beside the barrel.
- **Review production imports of test helpers.** Static imports or re-exports from `test-stores`, `fixtures`, `test`, `tests`, or `__tests__` paths in production code are a coupling smell; type-only imports may remain when policy allows. `pnpm repo:code-health --base <ref>` lists **changed/new** naming and boundary diagnostics scoped to the diff; it does not claim line-level precision for legacy advisories on unchanged files.

## Verification and handoff: required for affected code, proportionate to risk

**Every implementation T-ID / Change parent** must inspect the changed diff for the rules above and run **focused checks on changed files**, not a full repository style migration:

```bash
pnpm exec prettier --check <changed.ts> [other-changed-files...]
pnpm exec eslint --config eslint.quality.config.mjs <changed.ts> [other-changed-files...]
```

Run the affected package's typecheck and focused normal/negative tests at a proportionate checkpoint. Existing code debt in untouched files is not a license to introduce new violations, nor a mandate to retrofit an unrelated subsystem. The repo-wide `pnpm lint:quality` is an **audit**, not currently an all-green merge gate; only claim PASS for a command actually executed and passing. Before an approved high-risk join, include source/diff review of permission, money, root/fence, publication and crash/retry behavior.

**Parent code-craft review (short, explicit):** (a) can a human follow the phase/state graph? (b) are domain interfaces and runtime trust boundaries explicit? (c) is each responsibility in its existing owner? (d) do meaningful comments preserve _why_? (e) are important negative cases and failure states tested? (f) did lint/format/typecheck actually run? If not, report `NOT RUN`, and distinguish new debt from pre-existing debt. When closing a Change with `--base`, name any **reviewed new hotspots** from `diagnosticsScope.changedFindings` (or the human "Changed/new diagnostics" section) and state whether each warrants extraction, intentional colocation, or follow-up—without threshold gaming or a mandatory helper count.

**Escalation:** If implementing a planner's prescribed algorithm produces a very large, deeply nested mixed-responsibility module, do not cosmetically split it blind or declare it healthy because it compiles. Stop at the next checkpoint with file/function, approximate size, involved responsibilities and a specific proposed semantic seam. ChatGPT decides whether to improve the remaining Change packet or commission a separate bounded refactor. Security/correctness defects are addressed before acceptance; low-risk readability debt can be recorded for targeted follow-up without blocking unrelated work indefinitely.

**No self-approval by prose.** Documentation and comments explain contracts; compiler/linter checks catch mechanical problems; source review and negative tests establish whether a security/correctness boundary is actually met. Each is necessary in its relevant scope, none substitutes for the others.

## Recurring architecture-health review

During heavy development review hotspots roughly every two weeks and before Undertaking integration; at code-bearing Change closure compare against the actual integration baseline. Use `pnpm repo:code-health` and `pnpm repo:module-graph` with the documented semantics in [repository structure](../../REPOSITORY-STRUCTURE.md). Inspect runtime and type-only imports, actual reverse consumers, public exports, composition roots, validators and transaction boundaries; green manifest graphs do not establish internal modularity. Investigate semantic responsibility rather than moving files to satisfy thresholds. Keep developer fixtures out of production authority; explicit outer composition gates default deny. Preserve authorization, expected-root/revision, transaction/outbox, idempotency, provider uncertain-delivery, funding and settlement fences when moving code. Remove compatibility exports only after actual consumers and focused build/negative proof are reconciled. Record confirmed findings with source SHA, owner, proof and disposition in an individually scoped Design or Change; no automatic refactor queue. Historical research: [architecture-health findings](../../research/agent-practice/CODE-ARCHITECTURE-HEALTH-2026-11.md).
