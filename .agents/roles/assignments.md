# Role assignments, handoffs and receipts

**Purpose:** make a role's responsibility explicit enough that a generalist model cannot reasonably confuse "research" with "implement," or treat a review as a new product decision. These are **compact message shapes** for active roles; do not fill every field in a new file for every tiny task. The current accepted FEATURE/PLAN and permanent specs already hold durable decisions.

## Role activation packet

Use only what the receiving role **does not already know**:

```text
ROLE / STAGE: [e.g. Test strategist; before implementation]
TASK: [one question and measurable output]
AUTHORITY: [product doc heading] + [technical heading] + [approved feature checkpoint if needed]
BASELINE: [known source revision, real observed behavior or "not inspected"]
READ FIRST: [2-5 likely documents/symbols; follow only needed edges]
KNOWLEDGE: [selected .agents/knowledge/<manual>.md#section when a consequential design/review needs it; otherwise none]
PERMISSION: [read-only | documentation-only | scoped-code-edit | authorized specific checks]
OWNED DECISIONS: [what this role can decide; what stays with human/product architect]
DELIVER: [specific artifact and acceptance conditions]
NOT YOUR JOB: [boundaries; no unrelated cleanup/provider spend]
ESCALATE IF: [missing owner, contradiction, necessary paid action, unsafe command]
NEXT CONSUMER: [next role + what the next stage needs]
```

A role can be run in the **same chat** when its context is small and independence unnecessary. For an independent critic, give a **fresh session** or a bounded read-only subagent with the approved specs and evidence; avoid priming it with the author's enthusiastic conclusion.

## Output receipt

```text
ROLE COMPLETED: [name]   STATUS: [ready | blocked | needs decision]
CLAIM / DECISION: [only what this role was authorized to settle]
EVIDENCE: [exact doc headings + source paths, revision, check/screenshot IDs]
ENGINEERING RATIONALE: [options seriously considered; decisive constraints; what could reverse the choice, if this role owns design]
ARTIFACT: [file(s), diff, test matrix, or inline decision]
NEGATIVE CASE: [most important disproof or unhappy path]
UNRESOLVED: [factual unknowns and who must decide]
NEXT: [single next role/task, permission, expected output]
USAGE: [actual client usage if shown | not measured]; paid game provider calls: [none | authorized+reconciled | unknown]
```

A "PASS" means **this role's acceptance**, not universal system correctness or owner approval.

## Routing change / bounce-back

If implementation uncovers a product contradiction, it returns a _decision request_ to the product owner/architect without silently changing the behavior. If a reviewer finds a bug, the smallest correction returns to the **owning implementer** with a concrete testable counterexample. If test execution reveals environmental failure, it returns the evidence to the **test runner/environment owner**, not automatically to the product designer.

One review and one correction are the default economical loop. A recurring dispute is summarized for the human: two competing models of the situation, their discriminating evidence, and one recommended resolution. Do not pay for a fresh agent simply to referee two poorly specified opinions.

## Choosing a different chat, subagent or same chat

Use **same chat** when steps depend sequentially on accumulated context and a cleanly announced role switch is sufficient. Use **subagent** for bounded, noisy investigation or skeptical review when only the short result should return. Use **independent chat** when independent judgment, separate permissions, a different tool, or durable parallel thought is useful. Use **parallel writes** only with file ownership separation and isolated worktrees/branches.

A new role does **not** automatically grant Git write, test execution, browser actions, external network access or live Storyteller spend. The initial role packet must provide that authorization explicitly. Do not assume a Claude/Cursor agent obeys a prose rule deterministically: use tool permissions and read-only modes when possible.
