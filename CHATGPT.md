# ChatGPT | client adapter

Follow [AGENTS.md](AGENTS.md) for roles, severity, investigation depth, safety and lifecycle. This adapter does not make ChatGPT the exclusive designer, planner or reviewer. Another capable client may hold those roles. Portable planner procedure lives in the [planner investigation standard](.agents/references/planner-investigation-standard.md), including [continuous development flow](.agents/references/planner-investigation-standard.md#continuous-development-flow) and the [artifact handoff](.agents/references/planner-investigation-standard.md#artifact-handoff). Implementation launches use [implementation handoff](.agents/skills/implementation-handoff/SKILL.md). This file does not duplicate that procedure.

## Continuous development flow

Normative batch completion is the [planner continuous-development flow](.agents/references/planner-investigation-standard.md#continuous-development-flow). This heading remains so older links resolve.

## Current read-only setup

The owner's ChatGPT session has read-only GitHub access. It may investigate, design and review, and it delivers complete artifacts. It does not attempt remote writes. A write-authorized local custodian persists them and verifies the imported content against the reviewed candidate. Optional frozen source packaging is `pnpm repo:snapshot:chatgpt`; see the [snapshot runbook](docs/runbooks/chatgpt-design-snapshot.md). A snapshot is a frozen revision, not a live worktree.

### Local Git patch delivery

**Mandatory for every downloadable patch handoff to this owner:** Windows browser downloads are applied from WSL, where `powershell.exe` and `cmd.exe` cannot be assumed to work. Read and use the exact Linux-native Bash command template in [artifact handoff](.agents/references/planner-investigation-standard.md#artifact-handoff), with the delivered filename substituted. Do not improvise Windows executable discovery, `wslpath`, usernames or a first-match search. This applies in every fresh chat, even to a one-line documentation patch.

Prefer a downloadable, repository-relative Git patch for coordinated design, planning, review or instruction edits when this session is read-only and the owner has a local checkout. Follow the existing [artifact handoff](.agents/references/planner-investigation-standard.md#artifact-handoff): identify the actual base branch/full SHA, affected paths, intended changes, validation performed and limitations. Use the latest accessible source or reconcile affected-file drift; include the complete scoped diff, including authorized additions, moves and removals. Validate patch applicability against the inspected base when possible and state what was actually checked.

The owner or authorized local custodian downloads the patch, checks the current branch, HEAD and dirty paths, previews and checks applicability, applies it, inspects the resulting diff, runs proportionate checks and commits under repository policy. See the [local patch round trip](docs/runbooks/chatgpt-design-snapshot.md#local-patch-round-trip). A local helper is optional. Do not force a conflicting patch, overwrite unrelated work, stage or commit unrelated edits, or claim that a generated patch has been applied or accepted. Reconcile changed affected files before generating the next patch; the committed snapshot and remote HEAD do not include uncommitted local edits.

Do not delegate routine translation of an already-decided document diff to a paid implementation agent merely because ChatGPT cannot write remotely. Use a local custodian or implementation agent when actual execution, integration or local investigation is required. This delivery mechanism does not change design review, approval, commission or proof boundaries.

A new chat does not see this file unless it retrieves it. Load `AGENTS.md` and this adapter from the active branch, then follow the planner standard, before a handoff. If current files are unavailable, say so and request a snapshot or repository access.

Cold-start prompt: “Offscreen RPG planning: load AGENTS.md and CHATGPT.md from the active branch, then follow the planner investigation standard before any implementation handoff.”
