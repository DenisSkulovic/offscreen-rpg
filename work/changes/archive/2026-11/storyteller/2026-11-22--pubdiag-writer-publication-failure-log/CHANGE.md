# PUBDIAG | writer publication failure log

**State:** Done (source scope; explicit owner closure 2026-11-26). **Kind:** implementation. Current main source inspected at `fcaeb4f293e2b59227c612f97b18c2b5216daee9`. No new test PASS or live acceptance claimed.

Keep the public `publication_failed` result. Log a sanitized cause at the `finalizeSettledWriterRound` catch: mission, generation, story, publication stage, error class, and token-shaped code/reason. Do not log story text, credentials, or provider payloads.

**Positive:** a `StoryError` with a stage is visible in the internal log and the returned status stays `held` / `publication_failed`.
**Negative:** prose in an error message or reason is absent from that log.

## Closure receipt

- [Diagnostic implementation](../../../../../../packages/story-engine/src/storyteller/writer-publication-diagnostic.ts) filters stage/code/reason tokens, records mission/generation/story IDs and a limited source-frame token, and returns `held / publication_failed`.
- [Publication finalizer](../../../../../../packages/story-engine/src/storyteller/writer-round-settled-finalization.ts) invokes `recordWriterPublicationFailure` after checking for already-committed publication.
- [Regression tests](../../../../../../packages/story-engine/test/writer-publication-diagnostic.test.mjs) cover structured safe cause and omission of prose/unsafe reasons. Tests present, not rerun.
- Residual telemetry hardening: regex token filtering is not semantic allowlisting; arbitrary token-shaped secrets can pass, and `error.name` is not allowlisted. Future hardening should use closed sets for stage/code/reason/error category, validate source-frame provenance and ensure diagnostic sink failure cannot change the public outcome. No raw story text, credential or provider payload is authorized in telemetry. See permanent capability catalog. No replacement implementation commissioned.

Original record: `fcaeb4f293e2b59227c612f97b18c2b5216daee9:work/changes/open/2026-11-22--pubdiag-writer-publication-failure-log/CHANGE.md`.
