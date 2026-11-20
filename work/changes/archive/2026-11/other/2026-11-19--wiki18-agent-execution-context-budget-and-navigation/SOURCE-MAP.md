# WIKI18 | source investigation of cost mechanics, not speculative savings

**Inspected:** 584b594 source and newer 2026-11-19 Composer policy in GitHub. **No actual Cursor-billed task trace in this audit.**

**Already present at baseline:** `scripts/repo-tools/agent-trace.mjs:summarizeAgentTrace` reads line-delimited JSON events, classifies assistant/tool_call/result, counts distinct/repeated source reads, guard/diagnostic reads, navigation before first edit, latency where timestamps exist and available token fields. Unknown usage remains **null**, not zero; malformed events are reported `unclassified`. `scripts/repo-tools/agent-trace.test.mjs` tests parser routes. It does not calculate actual Cursor monetary charges because model pricing/usage may be absent. The default model guard at the old SHA allowed Grok Low/Medium as well as Composer; newer GitHub commit changed it to **Composer-only default, Grok via local opt-in**, with `node --test .cursor/hooks/model-budget-guard.test.cjs` tests. The hook sees subagentStart but **not** the Cursor parent model picker or internal billing substitutions.

**Why a price-only argument is not enough:** an inexpensive Composer patch that omits a state fence and requires two rework runs may cost more than one correctly prepared patch. The metric is **total cost of a correct accepted outcome** including wrong turns and human correction. Use comparable source scope, number of edited files, normal/negative tests and rework. Don't compare unrelated broad Grok investigation with a one-line Composer typo and announce savings.

**Selected small-task experiment:** one authorized small Composer task from existing Change backlog, one precise benchmark receipt: actual model/variant (unverified if not shown), tokens from Cursor dashboard or null, tool calls/read breadth, direct source checks, passing normal+negative tests, review/rework. Compare to an **already collected** older Grok trace only when type/difficulty comparable and explicitly label confounding variables. Never authorize a fresh billable Grok run just to fill a spreadsheet.

**Stop conditions:** if the hook rejects a valid actual Composer variant because Cursor renamed its model metadata, stop and inspect the exact hook payload; don't disable the guard, use Auto, or silently switch to Grok. If no usage data, store `null` and report measured tool/read burden. This is an operational evidence program, not permission for paid provider calls or broad worker benchmarking. [TASKS](TASKS.md) gives the bounded executor plan.

## Terminal note (2026-11-20)

WIKI18 is Cancelled/partially delivered, not Done. The source-based route cards, trace parser and cost guard remain installed. The missing accepted-task cost association and before/after study were not executed; this remains an empirical unknown, **not** an engineering dependency. See [terminal Change reconciliation](CHANGE.md#terminal-disposition--partial-delivery-no-fabricated-cost-saving).
