# Repository instructions

Read [AGENTS.md](../AGENTS.md) for scope, spending and verification rules. Before changing or reviewing implementation, read [Code quality](../docs/engineering/code-quality.md).

Treat correctness and human maintainability as separate review criteria. Keep explicit domain boundaries, use named parameter objects for ambiguous identifiers, avoid nested ternaries and unjustified assertions, and preserve transaction/retry invariants. Do not copy poor existing patterns or launch broad cleanup. Never enable paid model calls from tests. These files are the canonical rules; do not create a competing style guide here.
