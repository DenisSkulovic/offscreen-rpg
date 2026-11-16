# WIKI03 | Execution checkpoint

**State:** Ready for owner selection; WIKI01 and WIKI02 must be Done first. **WIKI03 permits provider-free fake implementation testing, not real LLM trials.**

1. P0: Recheck current CLI availability/help/version and local sandbox feasibility without launching model. Freeze repo SHA and WIKI02 corpus.
2. P1: Build host runner and protected oracle storage outside agent-visible tree; test sanitized source snapshot and public nonanswer stub.
3. P2: Implement deterministic fake JSONL event adapter and normalization with failures, time, unknown usage and call identities.
4. P3: Add one real CLI adapter **without invoking it**, verify local version and dry-run capability. If reliable sandbox/telemetry cannot be established, report unsupported instead of bluffing.
5. P4: Add correctness/source-tier rubric, redacted artifact schema and dry-run/approval gates.
6. P5: Run provider-free self-tests; document exactly what cannot be validated until owner-approved live pilot.
7. P6: Reconcile and archive WIKI03 packet only after tests. No hidden LLM dispatch or ongoing automation.

**After WIKI03:** Owner may separately authorize a bounded live pilot with chosen provider/model, count, usage cap and isolated Windows/Linux sandbox. It is never auto-started.