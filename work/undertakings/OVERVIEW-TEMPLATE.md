# <Undertaking name> | The big picture

> **Required for every multi-Change Undertaking.** Name this file `OVERVIEW.md` beside `UNDERTAKING.md`. This is the supervisor's human-first, maintained **current picture**, not a technical spec, Change queue or evidence ledger. Create it when the Undertaking starts; update it **as meaningful progress happens** and link it at the top of the dossier and from the Undertakings index.

**Checked:** YYYY-MM-DD · **Integration branch:** `undertaking/<slug>` · **Evidence limit:** say whether this is source inspection, tests executed, or integrated/landed. Never claim a branch result is on `main` before merging.

## 🎯 Why are we doing this?

Two to four ordinary sentences describing the user's desired end-state, not an architecture diagram.

## At a glance

| Big capability or outcome | State | What it means to a human |
| --- | --- | --- |
| 🏗️ Outcome 1 | Built / Active / Not yet / Blocked | Plain-language achieved capability or actual gap |
| 🌱 Outcome 2 | Built / Active / Not yet / Blocked | Plain-language achieved capability or actual gap |
| 🚀 Outcome 3 | Built / Active / Not yet / Blocked | Plain-language achieved capability or actual gap |

## The journey, visually

Use a short Mermaid flow (or a compact Markdown milestone table when Mermaid adds no clarity) showing **built → being built → missing → actual finish line**. Never show fake precision. Optional progress percentages are *subjective estimates*, clearly labeled and justified, not counts of completed Change packets.

## ✅ What we've already achieved

Three to six plain-language accomplishments, each reflecting integrated outcomes rather than document creation or plans. Distinguish tested from source-inspected when it matters.

## 🔨 What remains?

Three to six **outcome-sized** steps the supervisor can understand. Avoid one-function Changes and unresolved technical jargon. Include meaningful product proof, final integration/cleanup and the release/landing gate.

## 🧭 Right now and next decision

**Current focus:** one sentence on what is actually being implemented, or what is queued next, sourced from the current branch and receipts.

**Most important next milestone:** a concrete human-observable demonstration.

**Supervisor decisions required:** only real choices or permissions; write “None” when none. Explicitly identify financial/deploy/destructive authorization separately.

**Risks and uncertainty:** no more than three or four meaningful traps. Do not bury important problems or fabricate reassuring percent-complete numbers.

## ⚑ Maintenance and supervisor cadence

At Undertaking kickoff, every material Change integration or milestone, scope/priority change, planning handoff, next implementation wave, and final acceptance:
- Check **actual reference branch HEAD**, Change receipts and `STATUS.md`; update this page and `UNDERTAKING.md` ledger together if claims changed.
- Present a **short, nontechnical supervisor recap with a link to this file**. Proactively raise changed expectations, critical blockers and the finish line. No need to ping for every tiny task or repeat an unchanged overview for every code commit.
- Preserve a human-first perspective. This is a **navigation and communication contract**, not a new work selector, an executor’s T-ID checklist or the product bible.
- On closure, provide a final before/after view and retire the temporary page with the dossier. Durable product rules go to canonical docs; unique evidence stays in evidence/history.

**Links:** [technical undertaking scope](UNDERTAKING.md) · [demonstrated status](../../../STATUS.md) · [active work](../../QUEUE.md).
