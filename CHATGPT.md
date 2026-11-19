# ChatGPT | architecture planning and Cursor handoffs

**When a fresh ChatGPT session is asked to inspect, design, audit, plan or write Changes for Offscreen RPG, start here after [AGENTS.md](AGENTS.md).** This page is a compact planner entrypoint, not an automatic instruction for every coding executor. It is tool-specific to the **ChatGPT planning role**, not a claim that GitHub or Cursor will automatically preload it into a new chat.

## Owner mandate: investigate on ChatGPT's side first

**Do not dump architectural exploration onto paid Cursor subagents.** Perform as much source-backed investigation and decision-making as possible **during ChatGPT planning**, using the current GitHub repository, uploaded snapshot or other available source material. A good handoff is a solution-shaped implementation contract, not an assignment to rediscover how half the system works.

For the current distributed-turn program, inspect the [current-head POC readiness audit](work/designs/open/distributed-turn-poc/POC-READINESS-AUDIT-2026-11-19.md) before manufacturing new packet IDs. Use [Change packet profiles](.agents/references/change-packet-profiles.md) to choose between one-card PATCH work and source-map/execution/proof companions. **The planner authors the companions; Cursor does not auto-read them.** A saved result in `storyteller_attempt` is not a published scene: inspect the generation success / GA publication bridge explicitly.\n\nRead the authoritative [Planner-first investigation standard](.agents/references/planner-investigation-standard.md) for detailed requirements. For bounded Changes use the [Change workflow](.agents/skills/change-workflow/SKILL.md), [Change template](.agents/skills/change-workflow/assets/CHANGE.md) and [Cursor handoff](.agents/skills/cursor-handoff/SKILL.md). Inspect the particular canonical product/technical owners, current source/tests and active Change queue; **do not blindly read all reference files for a tiny edit**.

### What ChatGPT should settle

- **Real baseline:** inspected SHA/source/test symbols, runtime vs proposed state, completed and in-flight overlapping Changes. Cite accurate paths and commit assumptions. Unavailable source is explicitly unknown.
- **Architecture and implementation decisions:** which function/service owns a write, exact state/ID/root transformation and persistence fence, provider/retry/security failure behavior, compatibility and side effects, entrypoint→consumer integration and docs impacts. Decide within ratified authority instead of presenting a menu for Cursor to choose from.
- **Ready Change:** exact code/doc edits, deliberate exclusions, prerequisites, shared file owners, tests and discriminating negatives. Use a richer `PLAN.md`/source map for a complex Change (e.g. historical fork), keeping the child's route card short.
- **Exception workflow:** if a crucial implementation question remains, solve it in ChatGPT where possible. Otherwise label `PLANNER BLOCKER`, ask for specific missing evidence or create a tightly bounded investigation task **instead of claiming Ready**.

### What Cursor should receive

One **small, actionable route card**: `DEPTH=VERIFY|PATCH|INVESTIGATE`, accepted goal, exact technical authority heading, 2–5 initial source/test anchors and relevant symbols, normal/negative proof, command/cwd, safe side effects, forbidden edits, stop condition and short receipt. **Do not force Cursor to read the entire planner's research**; the rich investigation is linked as a reference for genuine contradictions. Cursor remains responsible for checking the live worktree, implementing safely and reporting mistakes in planner assumptions.

**Quality matters:** this is about reducing paid repeated discovery, not imposing an arbitrary file-count quota or encouraging blind edits. A substantial architecture change may require many ChatGPT-side source reads; a simple path fix may require almost none. Compare actual correct-Change cost and rework via WIKI18, without inventing token-savings statistics.

**Platform distinction:** model pricing and Cursor-only `DEPTH`/subagent controls live under [Cursor model-budget policy](.agents/references/cursor-model-budget-policy.md) and `.cursor/`. This ChatGPT entry describes upstream research, not Cursor model enforcement, and does not replace shared repository truth in [AGENTS.md](AGENTS.md).

**Practical prompt for a new chat:** “Read `AGENTS.md` and `CHATGPT.md`, inspect current GitHub source, settle the design and write implementation-ready Changes for Cursor. Do the broad research yourself, and give Cursor narrow verified route cards.” This works even when the ChatGPT session has no memories from earlier discussions.
