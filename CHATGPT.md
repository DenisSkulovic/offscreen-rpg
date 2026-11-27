# ChatGPT | client adapter

Follow [AGENTS.md](AGENTS.md) for roles, severity, investigation depth, safety and lifecycle. Portable planner procedure lives in the [planner investigation standard](.agents/references/planner-investigation-standard.md), including [continuous development flow](.agents/references/planner-investigation-standard.md#continuous-development-flow) and the [artifact handoff](.agents/references/planner-investigation-standard.md#artifact-handoff). This file does not duplicate that procedure.

## Continuous development flow

Normative batch completion is the [planner continuous-development flow](.agents/references/planner-investigation-standard.md#continuous-development-flow). This heading remains so older links resolve.

## Current read-only setup

The owner's ChatGPT session has read-only GitHub access. It may investigate, design and review, and it delivers complete artifacts. It does not attempt remote writes. A write-authorized local custodian persists them and verifies the imported content against the reviewed candidate. Optional frozen source packaging is `pnpm repo:snapshot:chatgpt`; see the [snapshot runbook](docs/runbooks/chatgpt-design-snapshot.md). A snapshot is a frozen revision, not a live worktree.

A new chat does not see this file unless it retrieves it. Load `AGENTS.md` and this adapter from the active branch, then follow the planner standard, before a handoff. If current files are unavailable, say so and request a snapshot or repository access.

Cold-start prompt: “Offscreen RPG planning: load AGENTS.md and CHATGPT.md from the active branch, then follow the planner investigation standard before any implementation handoff.”
