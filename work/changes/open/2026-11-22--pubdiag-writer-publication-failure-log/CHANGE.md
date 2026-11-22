# PUBDIAG | writer publication failure log

**State:** Ready. **Kind:** implementation. **Target:** `undertaking/storyteller-workshop`.

Keep the public `publication_failed` result. Log a sanitized cause at the `finalizeSettledWriterRound` catch: mission, generation, story, publication stage, error class, and token-shaped code/reason. Do not log story text, credentials, or provider payloads.

**Positive:** a `StoryError` with a stage is visible in the internal log and the returned status stays `held` / `publication_failed`.
**Negative:** prose in an error message or reason is absent from that log.
