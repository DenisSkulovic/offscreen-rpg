# Connected forensic trial | Cursor-led evaluation and evidence return

**Status: prepared, NOT EXECUTED.** The user requested that Cursor itself launch local services, play real synthetic campaigns, inspect persisted observations, run fault trials and write a source-linked handoff back to ChatGPT. This is an **evaluation program**, not a new game feature or generic logging rewrite. Code-bearing changes remain separately bounded under the [Change queue](../../../changes/README.md).

**One entrypoint:** [CURSOR START HERE](../../handoff/CURSOR-FORENSIC-TRIAL-START-HERE-2026-11-15.md). Don't read all phases at once.

| Cursor session | Exact file | Goal |
| --- | --- | --- |
| S0 | [00 Safety and boot](00-SAFETY-AND-BOOT.md) | Own local infra, baseline builds and focused tests |
| S1 | [01 Connected campaigns](01-CONNECTED-CAMPAIGN.md) | Actually play two persisted synthetic stories with Nest/Temporal/Next |
| S2 | [02 Forensic capture](02-FORENSIC-CAPTURE.md) | Join original game source, G, stage, prompt manifest and publication |
| S3 | [03 Faults and retries](03-FAULTS-AND-RETRIES.md) | Real disposable failures: CAS, rearm, duplicate delivery, stale publication, uncertainty |
| S4 | [04 OBS06/OBS07 Admin](04-OBS06-OBS07-ADMIN.md) | Implement only when specifically authorized; prove permission and human usability |
| S5 | [05 Conditional live model](05-CONDITIONAL-LIVE-AGENT.md) | Preflight protected paid path; if safe and authorized, <$0.25 total; else precise blocker |
| S6 | [06 Final handoff](06-FINAL-FORENSIC-HANDOFF.md) | Reconcile source vs hypothesis, commit evidence and notify ChatGPT |

**State:** [CHECKPOINT.md](CHECKPOINT.md) is the **single resumable session cursor**. [RUN-LOG.md](RUN-LOG.md) contains actual observations only. [EVIDENCE-CONTRACT.md](EVIDENCE-CONTRACT.md) specifies what to collect/redact. [FINAL-HANDOFF.md](FINAL-HANDOFF.md) is a placeholder until the agent really executes.

**Local safety:** no production/remote DB or credentials in Git, no `offscreen_story_local`/`offscreen_chamber` reset without deliberate owner authorization, no paid provider until OBS00-B and packet integrity + explicit budget approval, no automatic rewrite beyond named OBS06/OBS07 Changes. Provider-free experiments may run independently and must not be blocked by paid-path incompleteness.

**Final user-visible deliverable:** one GitHub report with source hashes, actual commands, recorded G/receipt/held/interrupt/Scene evidence, role denial/Support result, costs and concrete next Change recommendation. It is the *Cursor → ChatGPT* half of the collaborative loop.