# INF49 | Runnable workstation monitoring composition

**State: Ready for source-only correction after owner resumes. Kind: implementation. Profile: STATE.** Target main; baseline 45251aa99ffe9ff4dc8d749637a2a662b979ef94. INF44–46 source archives are not reopened or relabeled. INF47 depends on INF49. No host install/activation. [Tasks](TASKS.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Source map](SOURCE-MAP.md).

Goal: actual installed entrypoint and config run a private recorder with real or explicitly injected fixture sources, independent fast sampling, bounded slow workers, coherent durable records and truthful health. No new monitoring stack, storage engine or redesign. Dedicated Change branch/worktree, one bounded task at a time, join main.