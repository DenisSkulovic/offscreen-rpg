---
name: change-workflow
description: Plan and carry out one bounded code-bearing implementation Change from approved product/technical intent to scoped execution, verification and retirement. Legacy skill path retained for existing repo routing; do not use for design-only or evaluation tasks.
---

# Code-bearing Change workflow

**Start with the [independent work-unit standard](../../references/change-work-unit-standard.md).** In this harness a **Change** is an independently reviewable outcome whose execution modifies source code, tests, scripts, migrations or executable configuration. Product initiatives, architectural research, story-quality evaluations and docs-only maintenance are different work types. They must not generate fake coding tickets.

**Current route:** [`docs/changes/`](../../../docs/changes/README.md) owns significant implementation packets and explicitly allows **no active Change**. New packets use [`CHANGE.md`](assets/CHANGE.md), plus [`PLAN.md`](assets/PLAN.md) only for meaningful multi-step execution. Old `docs/features/FEATURE.md` dossiers are initiative/proposal/history context, never automatic implementation orders.

**Target-first portfolio modernization:** Before auditing, author an explicit end-state target independently of the existing code, then compare actual source to it. Read [target-driven renewal](../../rules/target-driven-renewal.md). A portfolio/refactor Change is not Ready without a target criterion → audited gap → bounded diff → falsifiable proof. Do not optimize for whatever code smells happened to be noticed first.

## 1. Select a measurable code outcome

First establish the real product/developer objective. Distinguish what is **already implemented**, what needs human design/acceptance, and what still requires code. One Change should be small enough to implement, verify, review and close without reopening an entire initiative.

- **Code delta required:** name the actual executable/test/configuration boundary expected to change. A design review or test *run* without code modification is not a Change.
- **Scope:** one cohesive outcome and the dependencies genuinely needed to prove it. Split unrelated deliverables, risky permission domains or design-dependent outcomes.
- **No arbitrary size cap:** cost depends on conceptual scope, source fanout, dependencies, evidence and potential harm, not lines or prompts alone.

Do not make a new folder for a trivial correction already clear from its contract; a direct bounded task is fine. Do not create duplicate folders for the same unfinished outcome.

## 2. Resolve intent and authority before implementation

Consult the relevant product/technical specification headings; these are authoritative, not the temporary Change packet. Trace actual source and tests narrowly, and compare with the proposed scope. **Stale file paths or old implementation approvals are not evidence.**

For a significant architecture/design decision, use [role orchestration](../../roles/README.md), appropriate professional knowledge and an independent critical lens when warranted. The purpose is to settle *alternatives and constraints* before Cursor implements, not to spawn a meeting factory.

A proposal remains Proposed until scope, current owner, relevant safeguards, proof and user permission are clear. Provider calls, DB migrations, hosted actions and broad checks require their separate permissions.

## 3. Write a self-contained executor handoff

`CHANGE.md` records the one outcome, authorities, current source/unknowns, intended code/test delta, exclusions, success and discriminating negative acceptance. For portfolio changes it must also link a **pre-existing area target criterion** and a **source-grounded audit finding**, not merely say "this file could be cleaner." Its purpose is a cheap transfer between ChatGPT design, source-connected Claude investigation and Cursor implementation.

Use `PLAN.md` **only** for meaningful multi-step implementation. Describe dependency-ordered *code* outcomes and exactly one current checkpoint. Keep later slices coarse and rewrite the checkpoint rather than appending a diary.

Use [cursor-handoff](../cursor-handoff/SKILL.md) for an executable prompt; it must not send entire initiative histories or let Cursor redefine product intent.

## 4. Implement only when authorized

One owner applies the approved delta, inspects diff, runs safe proportionate checks and evaluates expected *and negative* behavior. No automatic unrelated refactors, new provider spend, staging DB reset, agent swarms or new feature invention.

If code reveals that the approved contract is wrong/incomplete, **return that decision to the owning design role**, reconcile permanent specs, then resume implementation under a revised Change. A green fixture is not proof of connected gameplay.

## 5. Converge, record evidence and retire

Record what landed, tests/inspection actually run, affected revision, remaining risk and exact next action. Update permanent product/technical/evidence owners only when relevant. A completed Change is removed from the **active** route; Git keeps historical snapshots. Don't preserve a duplicate living implementation history when its decisions have a durable owner.

Owner-retained and dormant legacy dossiers require explicit preservation. Before deleting/moving any old folder, inspect its unique decisions, inbound links and approval boundaries. See the [dated legacy audit](../../../docs/features/AUDIT-2026-11-11.md).
