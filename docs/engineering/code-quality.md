# Code quality standard

Read this before writing or reviewing implementation code. It defines how this repository should be maintained by a human engineering team. Passing tests and formatting is necessary but does not establish readability, good boundaries or an appropriate design. Existing code is not automatically an example to copy.

## Working agreement for coding agents

- Before editing, identify the behavior, owning module, inputs, output, invariant and caller. Explain a consequential boundary change briefly; do not generate a design essay for a routine fix.
- Read the implementation and relevant tests before extending it. Check whether the apparent reusable helper actually belongs to the same responsibility.
- Write one reviewable slice. Keep structural cleanup separate from behavior changes unless separation would be artificial or leave the new behavior unreadable.
- Read the completed diff as a maintainer, not as its author. Trace the normal path, a rejection and a retry. Check names, dependencies and cleanup as well as assertions.
- Do not treat green tests as approval of a confusing design. Report remaining design limitations separately from successful checks.
- Do not launch repository-wide refactors, delegate refactoring, switch models or spend API credit merely to satisfy these rules. A cleanup needs an explicit task, bounded scope and behavioral safeguards. For substantial work, follow the [feature workflow](../../.agents/skills/feature-workflow/SKILL.md).
- Preserve unrelated working-tree changes. Never run broad autofixes over another person's edits.

## Readability is the default

Use names that explain the domain role. Prefer `remainingRealMs`, `expectedStoryRevision`, `selectedIntention` and `publishedOffer` to `value`, `data`, `next` or `input` when several concepts are in scope. Conventional short names are acceptable in a small local callback. Do not lengthen names with redundant class/module prefixes.

Use braces on control statements. No nested ternaries: use early returns, a switch or a named selection function. A single short ternary for a value is fine. Avoid negated compound predicates and boolean expressions that simultaneously validate, mutate and return. Name a condition when that exposes meaning, not merely to move punctuation elsewhere.

Keep imports together before implementation declarations. Prefer named exports; retain default exports where the framework requires them. Prettier owns whitespace and wrapping. Do not manually pack statements to save output tokens or fight the formatter with alignment conventions.

Comments explain an invariant, non-obvious tradeoff, timing boundary or external constraint. Do not narrate syntax, promise capabilities the code lacks, or repeat names in boilerplate JSDoc. Exported operations need clear ownership/side-effect/error semantics when the signature cannot convey them. Remove stale comments with the behavior they describe.

## Modules and functions

A module should have a coherent responsibility and a clear reason to change. Do not accumulate initialization, history reads, command admission, timing, effects and fixture resolution in one expanding service merely because they all concern stories. Separate responsibilities when introducing another one; retain an obvious application entry point so readers need not follow a maze of wrappers.

An operation should read as a sequence of meaningful steps at one level of detail. Extract policy or a complex query when it has a useful name and boundary; do not extract every expression or create a class per function. Pure policy must be testable without HTTP, PostgreSQL or Temporal. I/O composition belongs at an application boundary.

As review triggers, examine handwritten modules approaching 300 lines and functions approaching 50 executable lines. These are not enforced caps or reasons to split coherent schemas, SQL, fixtures or a transaction into arbitrary files. A transaction may remain contiguous when that makes ordering and atomicity easier to audit. Explain why a large unit remains cohesive instead of gaming line counts.

Do not create `utils`, `helpers`, `manager` or `common` buckets for unrelated behavior. Name modules after the responsibility. Do not add speculative interfaces, plugin registries, generic repositories, base classes or deep folder hierarchies for hypothetical reuse. Generality means stable boundaries and replaceable collaborators, not weakly typed bags of options.

## Layers without mandatory OOP

The aim is a codebase the owner can evolve daily for months: each behavior has an obvious home, and a local change does not require understanding the entire application. Controller/service/repository are useful responsibilities, not required classes or a mandatory chain for every operation. Use functions, modules and existing framework classes where they fit. Do not introduce five forwarding layers to satisfy a diagram.

| Responsibility | Owns | Must not own |
| --- | --- | --- |
| Transport adapter | HTTP parsing, session extraction, status/DTO mapping | Story resolution, SQL, transaction policy |
| Application operation | One use case, authorization decisions, transaction boundary and collaborator coordination | Framework request objects, UI state, embedded fixture stories |
| Domain policy | Pure validation/decisions over explicit inputs, domain failures and supported effects | HTTP, database connections, Temporal APIs, model/provider calls |
| Persistence module | Domain-named queries/writes, mappings, expected cardinality and lock operations | Choosing narrative outcomes, opening hidden nested transactions, public HTTP errors |
| External adapter | Temporal/provider/notification protocol mapping and lifecycle | A second independent implementation of domain decisions |
| Presentation | Rendering, accessibility and explicit client interaction state | Authority over committed time, ownership, spending or consequences |
| Fixture source | Authored scenarios and fake outputs for known tests | Runtime branching spread across unrelated services |

Organize by feature first, with a small number of internal modules separating these responsibilities. Avoid global `controllers/`, `services/` and `repositories/` trees that scatter one feature across the repo. Keep package exports as the supported boundary; consumers must not import internal file paths. Do not create a new workspace package for each layer.

Queries can take a direct read path from an application operation into persistence; they need no artificial domain object. Mutations have an application-owned transaction passed into participating persistence operations. A repository may be a set of named functions such as loading an owned story or appending a passage. It must not become a generic CRUD abstraction that hides authorization scope, locking or transaction participation.

Pure policy returns decisions or supported effect proposals; application code coordinates persistence. Domain failure types live where both callers and policies can use them without circular dependencies. HTTP and Temporal map those failures at their adapters. Do not move domain logic into a repository merely to shorten a service.

Extraction is successful only if the operation reads more clearly and future changes have a better home. Splitting a large file into several tightly coupled files with shared mutable closure state is not an architectural improvement. Preserve cohesive transaction ordering rather than scattering its steps across callbacks with hidden effects.

## TypeScript contracts and API shape

- Use named parameter objects for operations with multiple similar identifiers, revisions or optional controls. A call should reveal which ID is the owner, story, interaction or attempt. Positional parameters remain appropriate for simple unambiguous operations.
- Give exported application operations intentional input/result types. Infer schema types from their runtime schemas; do not maintain a second handwritten copy. Internal inference is useful and should not be replaced with annotation noise. Avoid return types that accidentally expose a database row or framework object as the API.
- Treat external JSON as `unknown` and validate at the boundary. Do not cast it into trust. Narrow optional values with guards or an invariant helper that throws a meaningful error; do not use non-null assertions as proof. `as const` and well-explained library adaptation differ from `as any` or double assertions.
- Represent distinct outcomes with discriminated unions when callers must branch on them. Prefer `{ kind: 'paused' }`, `{ kind: 'waiting', remainingMs }`, `{ kind: 'completed' }` over negative numbers, nulls and booleans whose combination encodes undocumented states.
- Use names that include units for durations, prices and quantities. Distinguish game time, real time, narrative revision and view version. Do not use floats for authoritative money.
- Prefer immutable captured inputs and readonly public contracts where appropriate. Do not hide mutation inside a function named as a query or validator. Runtime deep freezing is a deliberate choice, not a substitute for sound ownership or a mandatory generic helper.
- Define semantic concepts independently. Do not reach into another feature's artifact schema to borrow one field if that couples otherwise unrelated lifecycles. Extract a genuinely shared schema only when its meaning is shared.

## Application and persistence boundaries

Controllers authenticate, validate transport and delegate. They do not choose story outcomes. Domain policy does not import Nest or React. Workers adapt orchestration to application operations; workflow code stays deterministic. Browser code presents admitted state and submits intentions rather than asserting authority over time or effects.

Make transaction scope visible. Authorization, expected-state checks, receipt deduplication and effects that must be atomic remain in one transaction. Helpers participating in it receive the transaction explicitly; they must not quietly use the global database connection. Never put network I/O, model calls or sleeping inside a database transaction.

A query should reveal ownership scope, cardinality and ordering. Isolate substantial raw SQL behind a domain-named read operation when it obscures orchestration. Parameterize values. Use constraints for persisted invariants as well as runtime checks. Review migration SQL; do not edit an applied migration to make a test pass.

Retries are part of the operation contract, not a generic decorator to add everywhere. State exactly which identity is deduplicated, what matching payload means, and whether the result is an original receipt or current state. Do not make effect correctness depend on a queue delivering exactly once.

Fixture content and resolution stay separate from reusable runtime policy. Do not grow repeated version switches in several callers; keep supported fixture selection in one explicit boundary. Do not create a generic dispatcher that accepts executable names from clients just to eliminate a switch.

## Errors, asynchronous work and lifecycle

Use a small deliberate set of domain failure codes that callers can handle. Distinguish invalid input, conflict, missing authority/resource, unavailable infrastructure and an invariant failure. Keep sensitive SQL, credentials and player content out of public errors and logs; preserve useful sanitized diagnostics at the boundary rather than catch everything as success.

No empty catch without an explicit recovery policy. No floating promise unless ownership, rejection handling and cancellation are visible. Background work needs a lifecycle owner. Acquired resources must be released on partial startup failures as well as normal shutdown; cleanup failure must not prevent releasing the remaining resources.

Give polling and retries bounds or a deliberate long-lived lifecycle. Distinguish cancellation of waiting from cancellation of an already admitted effect. A timeout does not prove an external action did not happen. Model billing uncertainty must stop further paid attempts under the spending rules in AGENTS.md.

## React and user-facing state

Separate scene presentation from request orchestration and domain policy. A component should not grow into the transport client, retry ledger, timer manager and full renderer. Extract a cohesive hook or component when it has a distinct lifecycle or presentation responsibility, not by arbitrary line count.

Represent pending, failed and successful states explicitly. Avoid independent booleans that permit contradictory UI states. Handle late responses, unmount/cancellation and snapshot ordering. Effect dependencies must reflect actual inputs; do not suppress dependency warnings to hide a lifecycle problem. Do not use refs as invisible application state that the UI needs to explain.

Keep accessible labels, keyboard behavior and visible recovery actions. Distinguish confirmed state from projected countdowns or pending work. Developer IDs and diagnostic details belong in an inspection area. Do not turn errors into silent indefinite spinners.

## Tests that earn confidence

Test observable behavior and invariants at the narrowest useful boundary. Keep pure-policy tests small, database tests about atomicity/constraints, and browser tests about connected user flows. Avoid giant tests where unrelated features share mutable setup and a failure prevents exercising the rest.

Use named fixture builders and scenario helpers when repeated setup hides the behavior. Keep important inputs and expected outcomes visible in the test. Do not introduce a test framework within the tests. Name the condition and expected result, not the implementation function alone.

Assert meaningful outputs, rejection semantics and unchanged state where appropriate. Do not mirror an implementation into expected values or rely only on broad snapshots. For timing/concurrency code, cover a relevant race and recovery path; do not infer that one happy-path timeout proves all scheduling semantics. Paid calls never belong in ordinary tests.

## Review gate and enforcement

Before calling an implementation slice complete, answer:

1. Can a new maintainer explain its main path from the entry point without decoding positional IDs, sentinel values or nested dispatch?
2. Is each invariant enforced by the responsible layer, with side effects and transaction boundaries visible?
3. Did this change add another unrelated responsibility, a speculative abstraction or duplicate domain knowledge?
4. Are error/retry/cancellation paths understandable, and are the important behavior changes actually tested?
5. Are public contracts, docs and the reported implementation boundary accurate?

`pnpm lint`, type checking, formatting and relevant tests remain required. `pnpm lint:quality` adds braces, nested-ternary and non-null-assertion checks. It is an opt-in full-repository audit and can fail on untouched existing code; it is not a CI gate. Refactor-touched handwritten files are expected to pass it. Do not disable rules or bulk-autofix the baseline to claim adoption. Check changed implementation files against the quality config and report existing violations separately. Most design rules still require reading the diff; no tool certifies maintainability.

Existing code may still violate these standards. Review each touched boundary; do not interpret extraction into files as proof of separation. Substantial redesign follows the feature workflow, with explicit intentional behavior changes.

Choose verification using [the laptop-aware verification rule](../../.agents/rules/verification.md). Required relevant checks are batched at phase boundaries; the commands above are not a demand to run every repository-wide command after every edit.

## Sources and adaptation

These are repository-specific decisions informed by published guidance, not a verbatim imported style guide. Existing framework/export requirements and our formatter take precedence over incompatible external conventions.

- [Google TypeScript style guide](https://google.github.io/styleguide/tsguide.html): reference for naming, module surface, type safety and readable control flow; do not import Google's internal environment assumptions.
- [Google engineering review guide](https://google.github.io/eng-practices/review/reviewer/looking-for.html): assess design, complexity, names, tests and comments in addition to functional correctness.
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices): keep agent instructions focused, give verification criteria and separate investigation from implementation.
- [VS Code custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions): tool-recognized repository entry points and focused instructions rather than a duplicated rulebook per tool.
- [GitHub Awesome Copilot instructions](https://github.com/github/awesome-copilot/blob/main/docs/README.instructions.md): examples of reusable instruction files; this project does not adopt their dependency, framework or testing choices automatically.
