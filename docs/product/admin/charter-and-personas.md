# Charter and personas

**Owns:** why Offscreen Control exists, the jobs it must make possible, and the workspace map staff use to find those jobs.

**Status:** accepted long-term direction, 2026-11-14. Every powerful action is still conditional. Production Support, refund, raw-prompt and emergency-edit powers remain absent until a named grant exists, and nothing here asserts a shipped console workspace ([illustrative examples](README.md#what-this-section-establishes-and-what-it-does-not)).

Staff do jobs; jobs are not permissions. Only a named grant for one subject, one reason and stated limits confers a capability ([authority and governance](authority-and-governance.md)).

## What the console is for

Offscreen Control is how the organization understands, supports, governs, improves and protects the live player experience and the business that provides it. One company has one set of accounts, campaigns, executions, subscriptions, cases and incidents. Employees should not need a shadow database to answer a basic question.

One platform does not mean one giant screen, one security role, or a homemade replacement for payments, email, monitoring or analytics. Those services may stay specialized. Admin owns the operator experience and the business consequence of the integration, including stale and failed states.

| Job | The operator must be able to |
| --- | --- |
| Locate a subject | Find a player, campaign, transaction, execution, case, incident or release and follow grounded links |
| Explain an outcome | Separate an account restriction, exhausted allowance, delayed operation, model failure, game-rule decision and display bug |
| Help without corrupting | Preview the player's effective experience, open an investigation, and execute only a bounded permitted remedy |
| Operate the live game | See which rules and Storyteller configuration affect which campaigns, and detect a regression |
| Control commercial exposure | Understand feature access, subscriptions, usage grants, provider cost and refund state |
| Steward trust | Bound private-data access, abuse reports and privacy requests, and recover from a staff mistake |
| Learn | Connect activation, retention, quality, reliability and economics without treating every metric as real-time or causal |

## Product job owners

Five terms stay distinct from each other and from the owner map below:

| Term | Means |
| --- | --- |
| Persona | A responsibility pattern |
| Role | Who is on a shift |
| Capability package | An illustrative bundle on [authority and governance](authority-and-governance.md) |
| Case purpose | The reason a subject is opened |
| Actual grant | A named permission for one subject, one reason, and stated limits |

This map names the page that owns each product job.

| Product job | Owner page |
| --- | --- |
| Support | [Player 360 and support](player-360-and-support.md) |
| Live ops | [Gameplay worlds and live operations](gameplay-and-liveops.md) |
| Commercial trust | [Commercial operations and trust](commercial-and-trust.md) |
| AI investigation | [AI engineering and investigation](ai-engineering-and-investigation.md) |
| Command center | [Command center and insights](command-center-and-insights.md) |
| Operator workflow | [Operator workflows](operator-workflows.md) |

**Negative:** A Support persona example does not grant raw provider prompt access or cross-tenant impersonation.

## Principles that survive a mixed role

- Capability, not job title. One person may hold Support, Engineering and Commercial packages and still lack an unrelated power.
- Staff identity is not player identity. View as Player, Assist as Player and Investigate in Sandbox are explicit modes. The operator does not become a stronger player.
- Inspect before modifying. Most diagnoses do not need a production write or unfiltered story text.
- One action, one understandable effect: subject, planned effect, cost or risk, prerequisites, outcome, and the reversal or remedy if one exists.
- Purpose-bound access. Seeing an account does not include a bulk export or a raw prompt.
- Honest states. A request is not success. A queued intervention is not a completed repair. An estimate is not an invoice.
- Fictional time, commercial allowance and provider spend are different counters even when they are all numbers.

**Outside Admin:** the player's ordinary play UI, ad-hoc SQL against live data, acting as the payment processor, unbounded infrastructure root, and inventing gameplay truth the engine has not committed.

## Personas and workspaces

A persona is the job a person does on a shift, described by the question they bring to the console. It is intended product: it says what the console must make possible, not what anyone is assigned or allowed. Authority is a separate capability package, and compound roles are not invented in advance. The last column lists what the job name alone must not deliver.

| Persona | Job and everyday question | Must not receive by the job name alone |
| --- | --- | --- |
| Customer Support | Resolve an account problem. What is wrong for this account, and what low-risk remedy is allowed? | Private narrative, raw prompts, major refunds |
| Customer Success | Keep a relationship moving. Where is it stuck? | Enforcement files |
| Engineering | Explain what an operation did. What did it actually do? | Trust sanctions, ledger rewrites |
| Game Design / LiveOps | Own behavior in the live game. Which behavior is live, for whom? | Unreviewed production prompt edits |
| Product | Understand arrival and departure. How do people arrive and leave? | Private story text |
| Finance / Revenue | Account for money. What is owed, charged and exposed? | Game-state edits |
| Marketing / Growth | Decide offers. Who may be offered what? | Individual narratives as a targeting list |
| Trust & Safety | Judge restrictions. Is this a fair, evidenced restriction? | Commercial refunds, universal story browsing |
| Security / Staff admin | Govern access. Who can do what, and who did it? | Self-erasure of the audit |
| Leadership | Watch health. Is the service and the business healthy? | An implicit superuser |

A workspace is where a job's questions are answered. Each names what it must not become.

| Workspace | Question it answers | It must not become |
| --- | --- | --- |
| Command Center | What needs *my* attention? | Every department's chart wall |
| Players & Accounts | Who is this, and what is effective now? | The billing or story owner |
| Support & Cases | Who owns the response, and is it resolved? | Notes with no evidence |
| Gameplay & Worlds | What happened in this story, and why? | An unbounded world editor |
| AI & Engineering | What did the model work do, and where did it fail? | An infrastructure root console |
| Live Operations | Which behavior is active, and what can change safely? | An unreviewed prompt editor |
| Commercial | What is owed, granted, consumed and charged? | A payment processor |
| Growth & Insights | How do players arrive, activate and stay? | A private-story browser |
| Trust & Privacy | Is a report or data request handled fairly? | Universal secret access |
| Access & Governance | Who can do what, and who did it? | A standing superadmin |

Workspaces share subjects, identifiers and status words. A deep link does not grant permission. Global search must not leak a record the operator cannot open, including by suggestion or count.

## Normal case and negative

**Normal.** A founding engineer holds diagnostics, a small support toolkit and aggregate business metrics. The Command Center shows those three sections. A failed turn opens for Support as player impact and for Engineering as operation evidence. Private story text stays behind its own grant.

**Negative.** Two capability packages do not silently widen to every account. A pending high-value adjustment does not execute because the requester left. A diagnostic experiment does not alter the live story while the player resumes. An urgent incident does not unlock an all-powerful shortcut. Success targets (faster explanation, fewer unsafe writes, bounded access) are not frozen SLA percentages.
