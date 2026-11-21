# <Undertaking name> | The big picture

> **Required for every multi-Change Undertaking.** Name this file `OVERVIEW.md` beside `UNDERTAKING.md`. This is the supervisor's human-first, maintained **current picture**, not a technical spec, Change queue or evidence ledger. Create it when the Undertaking starts; update it **as meaningful progress happens** and link it at the top of the dossier and from the Undertakings index.

**Checked:** YYYY-MM-DD · **Integration branch:** `undertaking/<slug>` · **Evidence limit:** say whether this is source inspection, tests executed, or integrated/landed. Never claim a branch result is on `main` before merging.

## 🎯 Why are we doing this?

Two to four ordinary sentences describing the user's desired end-state, not an architecture diagram.

## 📊 Required numeric progress estimates

**Every active Undertaking MUST include a defensible rough numerical status.** Always show at least the **overall estimated % complete and % remaining**, plus separate numbers for the important product/architecture tracks where applicable. State what the percentages measure: **remaining engineering effort and integration risk toward the accepted finish line**, not packet count or source/test coverage.

| Track | Estimated complete | Estimated remaining | Why |
| --- | ---: | ---: | --- |
| 🎭 Primary product outcome | ~XX% | ~YY% | Plain-language achieved vs remaining work |
| 🏗️ Architecture/other major track, if applicable | ~XX% | ~YY% | Plain-language status |
| 🧭 **Overall undertaking** | **~XX%** | **~YY%** | Explain chosen rough weights across tracks |

Use a simple visual progress bar (Markdown, text blocks, or Mermaid) for each track. Round to **5 percentage-point increments**; add a plausible uncertainty range (typically ±10–15 points when early), **last-checked date and evidence baseline**. Make a real estimate even with incomplete information when reasonably possible. If the evidence is genuinely too thin for one number, label that dimension **not reliably estimable yet**, explain why, and specify what proof will unlock estimation. Do not silently omit the numeric section.

Explain the **change since the previous estimate** when material: which capability landed, what integration risk moved, and whether scope expanded. Estimates may decrease after new defects or scope discoveries. Never mechanically increment based on a completed Change or pretend the number is objectively measured.

## At a glance

| Big capability or outcome | State | What it means to a human |
| --- | --- | --- |
| 🏗️ Outcome 1 | Built / Active / Not yet / Blocked | Plain-language achieved capability or actual gap |
| 🌱 Outcome 2 | Built / Active / Not yet / Blocked | Plain-language achieved capability or actual gap |
| 🚀 Outcome 3 | Built / Active / Not yet / Blocked | Plain-language achieved capability or actual gap |

## The journey, visually

Use a short Mermaid flow (or compact milestone table) showing **built → being built → missing → actual finish line**. The quantified rough progress section above is **mandatory**; use it alongside this visual journey, not instead of it. Avoid false precision and Change-packet counting.

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
- Check **actual reference branch HEAD**, Change receipts and `STATUS.md`; update this page and `UNDERTAKING.md` ledger together if claims changed. **Reestimate the completion/remaining percentages** and explicitly note a meaningful change (or justify leaving them unchanged).
- Present a **short, nontechnical supervisor recap including the numeric progress estimates and a link to this file**. Proactively raise changed expectations, critical blockers and the finish line. No need to ping for every tiny task or repeat an unchanged overview for every code commit.
- Preserve a human-first perspective. This is a **navigation and communication contract**, not a new work selector, an executor’s T-ID checklist or the product bible.
- On closure, provide a final before/after view and retire the temporary page with the dossier. Durable product rules go to canonical docs; unique evidence stays in evidence/history.

**Links:** [technical undertaking scope](UNDERTAKING.md) · [demonstrated status](../../../STATUS.md) · [active work](../../QUEUE.md).
