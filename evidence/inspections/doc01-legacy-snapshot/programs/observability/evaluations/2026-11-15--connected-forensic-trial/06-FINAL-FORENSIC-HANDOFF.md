# S6 | Reconcile genuine observations and hand them back to ChatGPT

**Do this yourself after S0–S5** (completed, partial or explicitly blocked), not the user. Read [CHECKPOINT.md](CHECKPOINT.md), [RUN-LOG.md](RUN-LOG.md) and [EVIDENCE-CONTRACT.md](EVIDENCE-CONTRACT.md). **Never infer outcomes from a prior assistant's design docs.**

## 1. Reconcile source truth, not just test exits

For every completed experiment and any code Change:
- identify **real source commit SHA**, code/DB migrations, active tool versions, environment/DB name and state of worktree;
- distinguish `command executed` vs `planned/skipped`, actual exits, elapsed times, source IDs/rows, test counts, and saved screenshot/trace IDs;
- reconcile **actual game effects** with accepted source operation/receipt, game time and published passage; no duplicate effects on retries;
- distinguish `provider prepared/held` vs `possibly dispatched` vs `HTTP response observed` vs `validated` vs `published`; compare settled vs possible charges;
- distinguish real OBS02 stage receipts and OBS03 task sidecar from SA01/SA05 *fixture or inferred* stages. After OBS05, no `model-ignored` diagnosis is acceptable from mere uncited inclusion;
- separate process logs/OTel samples (if any) from durable native evidence;
- prove whether raw context/source metadata really permits historical reconstruction at moment T, or explicitly where information is lost/expired/unauthorized;
- if OBS06/OBS07 implemented, independently verify **Support success and unauthorized case denial**, plus source DTO/real browser/permission tests.

## 2. Complete [FINAL-HANDOFF.md](FINAL-HANDOFF.md), not a chat-only summary

Replace the placeholder with a **durable Markdown report** containing, in this order:

1. **Executive verdict (max 250 words):** what is actually viable, what isn't, and the strongest diagnostic fact uncovered. No generic "enterprise-ready" or "fully observable".
2. **Implementation status at HEAD:** OBS00-A/B, OBS01/02/02-H/03/04/05/06/07, Admin S1/S3, E0 replay and OTel, each Done/Blocked/Proposed with actual evidence.
3. **Run matrix:** S0–S5 DONE/PARTIAL/BLOCKED/FAIL with exact command, source SHA, test counts/behavior and local DB. Do not claim an unrun scenario passed.
4. **Actual campaigns:** at least two real persisted synthetic story IDs **if possible**, scene/passage revisions, operation/receipt/G IDs, gameSecond/due vs actual time, what the player/browser saw, held/interrupt/returned story evidence.
5. **Forensic graph examples:** one source-linked command→receipt→G→stage→publication and one failure trace, or exact missing link/gap; include why source/type/version are trustworthy.
6. **Prompt & agent evidence:** exact task schema/profile/source rev, compiler/request hashes, observed vs derived source selection, model rounds, final packet equality **verified/not**, provider spend status; not a transcript dump.
7. **Security:** normal assigned Support vs foreign case, role/grant/campaign binding, private-sentinel absence, actual raw access limitations and any policy blocker.
8. **Costs/latency:** local setup/test timing, DB query/row sizes (where measured), lock wait/hold if measured, raw artifact bytes, provider attempts/count, settled USD, uncertain amount, and caps. Unknown fields explicitly unknown.
9. **Human usability:** can a Support operator answer held/interrupted/stale case from the **actual UI** without logs? What could a developer locate in source evidence? Use 3–5 specific task observations, not adjectives.
10. **Diagnosed gaps (ranked):** each exact symptom, source path/stage owner, why existing records are insufficient, reproducible negative, severity and one proposed bounded next code Change. **Only recommend code changes actually supported by observations.**
11. **Recommended next phase:** choose **one** next code Change or one narrow design decision with reason/alternatives; identify blockers needing owner policy vs automatic local source work.
12. **Appendix evidence index:** exact Git commits, report/screenshot/sanitized JSON paths, tests, ephemeral local raw-data location (no token/body), how to reproduce with safe commands and correct DB.

**Do not paste 3,000 log lines or full prompt bodies**. A serious report can be concise but must be specific and falsifiable.

## 3. Run a small review on the report itself

- Do **all source paths/IDs in this report exist** in the committed runtime/fixture? Check. Are any old prompts now identified only by current version? Mark missing.
- Are there any implied conclusions from **no attempt row, no citation, no OTel span, no packet or unknown output charge**? Replace with correctly scoped unknowns.
- Do metrics like `"0 calls"` apply to **entire evaluation including previous phases**? Confirm provider-free children. A real provider attempt after timeout may still be billable.
- Can the report distinguish **source truth** vs **test fixture** vs **operator inference**?
- Is every successful command actually executed rather than merely present in docs? Test count not guessed?
- Does a published story remain playable/read-only without depending on the raw provider packet?
- If OBS06 security binding isn't implemented, does the report clearly say **no real Support Situation endpoint** instead of pretending OBS01 operation list substitutes for it?

## 4. Cleanup + Git handoff

1. Stop only child local API/worker/browser processes **you started**. Don't tear down unrelated owner's Docker services, delete volumes or reset permanent local story databases.
2. Run `git status --short`, review diff and remove generated secrets/credentials/raw prompt JSONL/snapshots from any tracked path. Private raw evidence stays ignored under `data/` or disposable test environment, never in Git.
3. Update `CHECKPOINT.md` to `S6 COMPLETE` or `S6 PARTIAL` with every missing phase/blocker, final HEAD SHA and next recommended Change.
4. Commit/push `FINAL-HANDOFF.md`, `RUN-LOG.md`, checkpoint and legitimate source/evidence; all actual source changes only within explicitly authorized OBS06/OBS07 scoped packets, with one-Change lifecycle and Done evidence.
5. If a code change remained Verifying/Blocked, leave it honestly so, not Done. `Current change` must reflect the real active state and **must never** be silently cleared for incomplete work.
6. **One final Cursor message to owner / ChatGPT** containing:
   - final Git SHA and link to this report;
   - which phases ran vs blocked;
   - any actual provider attempts/settled cost and uncertainty;
   - first 1–3 root-cause discoveries;
   - a direct request: “ChatGPT, review the committed forensic run report and design the next narrow step.”

**Do not ask the owner to operate the stack or collect missing data**. If a critical gate cannot be satisfied, deliver a partial **source-rich** report with why the agent could not do the experiment safely. That's more useful than pretending to have successfully tested paid inference.

## 5. Success condition

The experiment succeeds if it makes the actual limits of current Offscreen RPG **measurably clearer** and gives ChatGPT a complete, honest source-backed feedback loop. A blocking defect discovered by running the real system is a **successful investigation outcome**, even when the original gameplay scenario fails. Do not massage the fixtures to green.
