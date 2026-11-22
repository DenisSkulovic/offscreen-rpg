# DXK09 | Falsifiable acceptance plan for elastic worktree isolation

**Planning-only baseline:** `undertaking/storyteller-workshop@752ed422`; no live cluster, Docker, OAuth or host capacity run performed here. Distinguish static/pure proofs from real deployment acceptance. **Four concurrent full-stack worktrees are the current baseline, never a hardcoded slot maximum.**

| Claim | Positive proof | Discriminating negative |
| --- | --- | --- |
| Elastic identity | allocate 1, 2, 4, 5, 10, 100 synthetic distinct worktree IDs without edits; same owner restarts to same slot | arbitrary numeric slot cap, name collision, invalid DNS length, second live owner must refuse |
| Dynamic ports | allocate changing number of disjoint loopback bundles with stable restart where feasible | occupied port, allocation race, exhausted range refuses without hijack |
| Context fence | every dev mutation scoped to `kind-offscreen-dev` | `kind-offscreen-lab` and foreign context produce no app/dependency mutations |
| Namespace and image | independently rendered app workloads and images for N slots using one graph | same resource/tag sourced by different worktrees rejected; cross-slot cleanup refused |
| SQL | database/owner per slot with independent migrations and story/session state | A DB login cannot read/write B database; failure doesn't alter B |
| Object store | unique bucket+scoped principal per slot, valid own content | A credential cannot write/read/delete B bucket, even with guessed object key |
| Temporal | unique namespace/worker wiring and task queues per slot; independent workflow IDs | A worker never executes B workflow; miswired namespace fails readiness |
| Auth | correct real browser sign-in per configured slot app origin | missing OAuth callback/trusted origin, cross-origin cookie, or wrong secret rejects |
| Build | fresh pnpm image build handles symlinks, dependency closure and package updates | local node_modules path contamination and invalid Docker file request must not recur |
| Runtime correctness | changed TS compiles, affected process reloads, receipt matches source/build; unchanged B unaffected | compile failure/stale process reports NOT READY for new source; source sync alone not PASS |
| Service profiles | selected service subset runs in own namespace; full mode available for any admitted slot | missing dependency cannot fallback to another slot |
| Four concurrent full stacks | four distinct worktrees simultaneously run authenticated provider-free story commands, SQL/S3/Temporal effects, and Tilt updates | failures in A (restart/build) must not change B/C/D processes/data |
| Elastic extension | fifth/tenth tenant identity and config can be generated without any source edits; live fifth/tenth only if capacity passes | no `s01..s04` switch, hardcoded port list, or static YAML per slot |
| Capacity | measured RAM/CPU/disk and reservation-aware admission; four full-stack workload proven on target machine | capacity exhaustion produces clear refusal and leaves earlier slots healthy |
| Stop/restart | stop A preserves SQL/S3/Temporal and running B; restart A reuses identity/data | wrong owner/foreign process and destructive default stop must refuse |
| Release separation | release-lab UIDs/images/secrets/data unchanged through dev workload operations | dev command pointed at release context or copied release credentials refuses |
| Latency/regression | baseline and new edit-to-ready/build timings compared with identical representative source changes | no acceptance from mere build success if normal iteration is severely slower |

**Evidence required:** actual worktree paths/HEADs and dirty fingerprints, cluster/namespace/Pod UIDs, per-slot database/bucket/Temporal identity (never secret bytes), source and runtime build receipts, tests and negative results, measured peak utilization, Docker build logs, restart/stop behavior, no provider spend, and release pre/post diff. A pure allocator simulation cannot substitute for live four-stack proof; live four-stack proof cannot substitute for fifth/tenth allocation and capacity behavior.

**Acceptance policy:** If four full stacks cannot be supported on the actual machine, do not silently lower the requirement; document measured bottleneck, propose a justified footprint optimization or resource extension, and keep DXK09 open. Arbitrary numbers of identities are supported by design, but actual running slots are constrained by finite host resources. All claims beyond executed evidence remain NOT RUN/BLOCKED.
