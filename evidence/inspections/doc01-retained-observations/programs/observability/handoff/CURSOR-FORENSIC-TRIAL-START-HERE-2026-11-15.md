# CURSOR START HERE | Execute a real forensic observability trial, phase by phase

**HISTORICAL ENTRY: EXECUTED AND CLOSED.** Cursor completed S0–S6 on 2026-11-15 and committed the [real final report](../evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md) by main@b88356fe. This original runbook is retained as execution provenance, **not** the next task. For the new source review and next bounded code sequence read [post-trial Cursor handoff](./post-trial-next-cursor-wave-2026-11-15.md). **Do not automatically repeat S0–S6 or reuse their paid-task authorization.** Current change remains none until separately selected.

## 1. Your job, not a speculative research assignment

You, Cursor, are the execution agent. **Bring up the local stack yourself; operate the API/worker/browser yourself; create and play genuine persisted synthetic campaigns; inspect source/SQL/Stage/G/packet records; inject controlled failures; measure; write observations back to GitHub.** Don't ask the owner to manually run Docker, click choices, examine rows, collect screenshots or summarize logs. You have multiple Cursor sessions to do this.

**Output that matters:** a source-linked [FINAL HANDOFF](../evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md) stating what real running code did, what persisted, what Admin could explain, what was missing, how much it cost, and which **one** next Change is justified. No “tests green, looks enterprise-grade” substitute.

**Four guarantees to challenge**:
1. An accepted game action/receipt has actual saved time/effects and truthful provider/stage/publication status.
2. A real G has durable stage records and prompt source metadata whose IDs and hashes can be joined, not SA01 fixture-only synthetic spans.
3. Authorized staff can diagnose a stuck game via a **safe case-scoped Situation → Why**, while an unauthorized staff member cannot read it or raw prompt content.
4. Original scene/response history survives as actual source; full mechanical rewind remains **unproved** until the E0 capture program has a complete prefix.

## 2. Exact reading and session contract

**Read only this file + the single next phase:**

| Cursor session | Next file and active outcome | Default allowed scope |
| --- | --- | --- |
| **S0** | [00-SAFETY-AND-BOOT.md](../evaluations/2026-11-15--connected-forensic-trial/00-SAFETY-AND-BOOT.md) | Source/environment baseline, local infra, focused provider-free tests |
| **S1** | [01-CONNECTED-CAMPAIGN.md](../evaluations/2026-11-15--connected-forensic-trial/01-CONNECTED-CAMPAIGN.md) | Real scripted application/worker/Playwright campaigns, no paid provider |
| **S2** | [02-FORENSIC-CAPTURE.md](../evaluations/2026-11-15--connected-forensic-trial/02-FORENSIC-CAPTURE.md) | Query persisted G/stage/receipt/source; verify what is **recorded vs inferred** |
| **S3** | [03-FAULTS-AND-RETRIES.md](../evaluations/2026-11-15--connected-forensic-trial/03-FAULTS-AND-RETRIES.md) | Disposable SQL/Temporal/CAS failures, same-G rearm and uncertainty |
| **S4** | [04-OBS06-OBS07-ADMIN.md](../evaluations/2026-11-15--connected-forensic-trial/04-OBS06-OBS07-ADMIN.md) | One code Change at a time: case-scoped read, then UI when safe and explicitly authorized |
| **S5** | [05-CONDITIONAL-LIVE-AGENT.md](../evaluations/2026-11-15--connected-forensic-trial/05-CONDITIONAL-LIVE-AGENT.md) | One bounded real-provider experiment **only if all named gates pass** |
| **S6** | [06-FINAL-FORENSIC-HANDOFF.md](../evaluations/2026-11-15--connected-forensic-trial/06-FINAL-FORENSIC-HANDOFF.md) | Final evidence reconciliation, GitHub commits, exact message for ChatGPT |

**Resumption:** read only [CHECKPOINT.md](../evaluations/2026-11-15--connected-forensic-trial/CHECKPOINT.md) plus the next phase. Write a brief checkpoint and commit/push **after every session**. Don't re-read 40 architecture files or redo passed work. A resumed agent must know exact source SHA, completed IDs/fixtures, next command and blocker.

**Evaluation vs code Changes:** S0–S3, S5 conditional and S6 are **evaluation**, not code-bearing Changes. S4 is **OBS06** (read endpoint) followed by **OBS07** (UI), one selected Change at a time. Do not mark a Change Done from an empty diagram or dry-run. OBS04 E0 mechanical ledger, OBS00-B usage-authority policy, and general protected raw archive **are not in this automatic coding sequence**.

## 3. Permissions: what the owner's kickoff permits

The proposed kickoff should explicitly say: *"Execute this runbook, including local disposable provider-free evaluations, Git commits/evidence, and bounded OBS06 then OBS07 implementation only if the stated case/grant security gate is satisfied. Live model spend is separately limited by the caps in S5."*

- **Automatically allowed after kickoff:** local dependency startup/recovery, provider-free tests and Chamber/Connected trials, read-only SQL inspection of **new synthetic test data**, local private fixture data, bounded non-destructive fault injections, evidence/report edits and Git commits/pushes. Use only loopback and guard rails.
- **OBS06/07 implementation allowed only if the kickoff names them and accepts the exact [case-scoped S1 policy](../../../../../../docs/technical/observability/investigation-and-reconstruction.md).** Do not infer production privilege approval from this MD alone. If trusted case/campaign grant issuance is missing, stop the unsafe branch, mark OBS06 Blocked and continue other evaluations; don't ask owner to create a case by hand.
- **Paid live trial allowed only if kickoff explicitly includes a nonzero max budget** and S5 gates pass. The default budget in S5 is **strictly at most USD $0.25 total**, **at most 4 actual outbound provider requests**, **at most USD $0.10 per operation**, with a stricter project/account cap winning. If exact preflight/settlement accounting can't enforce this, **no paid send**. Never silently spend the repository's broader $1 local run cap. Existing credentials need to be configured privately already; no secret requests or commits.
- **Never:** bypass OBS00-B current authority by echoing captured task policy; fake a provider HTTP response; deploy; modify a remote/non-disposable DB; reset `offscreen` or `offscreen_story_local`/`offscreen_chamber` automatically; add credentials to Git; expose private raw prompts in reports; let a retry cause another charged attempt under uncertainty; enable a new staff grant in production; fork into OBS04 or generic OTel work.
- **If a gate blocks:** write the exact failing source/command/result under the phase evidence, classify `blocked`, and **continue all independent safe phases**. No manual user action requested just to start Docker, choose a synthetic scenario or inspect SQL.

**The user's kickoff can authorize S0–S6 in one message, but cannot make missing runtime entitlement/retention legal approvals magically exist.** Treat security/paid gates as real.

## 4. How to run work across weak/short-context sessions

At the start of every Cursor session:
1. `git status --short`, `git rev-parse HEAD`, `pnpm repo:brief`. Preserve existing owner changes, never force reset; rebase only when explicitly safe.
2. Read [CHECKPOINT.md](../evaluations/2026-11-15--connected-forensic-trial/CHECKPOINT.md) for `current phase` and `next exact action`.
3. Read **one** phase file, 2–5 named source files/tests. Avoid “scan entire repo then redesign everything.”
4. Perform listed actions yourself, including starting required local services. **Do not merely propose commands**.
5. Create a short [EVIDENCE contract](../evaluations/2026-11-15--connected-forensic-trial/EVIDENCE-CONTRACT.md) conforming phase result: actual command, outcome, source G/receipt, counts/timings, negative assertions, any sanitized screenshot/JSON evidence.
6. Update checkpoint: `DONE/BLOCKED/FAILED/PARTIAL` for the phase, exact next phase and command, new commit SHA; **commit and push** phase docs/evidence and permitted code if selected.
7. Start a fresh Cursor session for the next phase; **do not wait for human replay of steps or manually ask for a screenshot**. Continue until S6 when all safe work is completed or explicitly blocked.

**No background execution claim:** each Cursor turn must actually execute, save and push its completed slice. Use additional turns as needed; `CHECKPOINT.md` makes this resumable. At context/session boundary, output just **`Resume: read CHECKPOINT.md and perform the next exact phase; no manual commands needed`** with the pushed commit link, so the owner can send a one-line Continue without becoming the human test driver. When all phases finish, send **one** concise handoff message with the GitHub path and final commit SHA for ChatGPT to inspect.

## 5. What to submit at the end

Read [06-FINAL-FORENSIC-HANDOFF.md](../evaluations/2026-11-15--connected-forensic-trial/06-FINAL-FORENSIC-HANDOFF.md). The final report must include:
- observed baseline environment/commands, actual stack availability and source SHA;
- **at least two genuine persisted synthetic campaigns** exercised through ordinary application operations, if infra permits; one should cross the Nest/DB/worker/browser boundary;
- at least one real G joined to source-stage rows and one legitimate source/prompt sidecar, or a precise explanation why the actual scenario didn't produce them;
- normal + failed/held + interrupted/stale/uncertain coverage with **recorded observation vs hypothesis** explicit;
- one Support `Situation→Why` human task and foreign-case/role denial, if OBS06/07 safely implemented;
- elapsed time, game-second/revision changes, provider calls/charge **actual vs possible**, DB and prompt artifact metadata (sanitized);
- performance/row count and any correctness/security breakages;
- whether a real provider call happened **under authorized budget**, or exact gate blocking it;
- source-based judgment: first 3–5 concrete next actions, ranked, without authorizing a new code rewrite.

**Do not fabricate success, backfill missing old history, copy private player prose into Git, or claim that successful fixtures certify production scale.**
