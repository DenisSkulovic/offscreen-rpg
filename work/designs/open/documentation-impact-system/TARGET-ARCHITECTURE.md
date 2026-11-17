# Target architecture | Change-aware product and technical wiki

**Status:** Proposed, not a current rule. **Problem:** a Change packet must act as a specification for *all intentional differences*, not only code; a wiki must support risk discovery as well as lookup.

## 1. The three-plane planned delta

Every planned executable Change, including test-only, refactor, tooling and migrations, names three explicit planes **before Ready**:

| Plane | Required decision at design time | Authoritative location |
| --- | --- | --- |
| **P. Product intent** | Which selected product claim/heading is introduced, revised, removed, or intentionally unchanged? Why? If no gameplay/player outcome, state the boundary and reason, not “N/A.” | docs/product/** (or the appropriate non-game product authority) |
| **T. Technical contracts** | Which selected contract/heading, algorithm boundary, data model, failure/retry policy, compatibility promise, operational assumption changes or intentionally does not? | docs/technical/**, accepted decisions/engineering authority |
| **C. Executable artifact** | Which source, tests, schema, script, build/config owner implements or verifies the selected delta? Exact scope and negative case. | apps/**, packages/**, tools/**, scripts/**, config/tests |
| **D. Dependency closure** | Which directly linked related claims, dependent pages, source maps, root status/routes and inbound references must be checked, changed or reasoned unchanged? | Existing owning pages and maps; never a second copy of the whole rule |

P/T/C are **mandatory dispositions**, not mandatory file edits. D is mandatory **review** of known dependent claims. Some Changes legitimately edit only C and source/status maps: the plan must still say which P/T obligations remain unchanged and why (for example, “no player-facing behavior changed; this only adds a test enforcing the already ratified no-unaccepted-time rule at ...”). Documentation-only design work remains allowed outside the strict code-bearing Change definition; this design does not quietly change that existing classification.

### Required section in new CHANGE.md: “Planned specification and implementation delta”

A short, exact table, expandable for larger Changes:

| Plane | Current selected owner and heading | Planned disposition and wording/contract consequence | Downstream/inbound review | Proof and owner decision |
| --- | --- | --- | --- | --- |
| Product | docs/product/...#heading | **change:** specific accepted behavior; OR **unchanged because:** test-only enforcement of existing promise | named related heading(s) | product owner ratification / governing citation |
| Technical | docs/technical/...#heading | **change:** exact new invariant/fence; OR **unchanged because:** unchanged wire/retry/permissions | named contract(s) | test/fixture/negative |
| Code | src/test/config paths and symbols | **change:** implement bounded behavior; OR **unchanged because:** documentation-only correction (not a code-bearing Change unless executable tooling is touched) | source README and external contract | negative test/scope |
| Related docs/maps | headings found via typed dependency graph + manual inspect | update/unchanged/needs-authority-review for each *material* claim | inbound link/route and STATUS | review receipt |

**No “docs updated” checkbox.** The planned table is prospective; the existing seven-column **Reconciliation ledger** is retrospective and must stay separate. Execution cannot quietly relabel a design-time unchanged plane as changed without owner re-review. The ledger records exact after-state, provenance, actual diff, tests and negative proof. A planned change to normative P/T words needs owner acceptance *before* implementation permission; execution does not self-ratify.

### Change lifecycle gates

1. **Investigate:** read selected owners; source-current vs target decision; name a failure and competing explanation; identify prospective dependent headings. Missing knowledge = Proposed, never inferred safe.
2. **Design/Ready:** lock P/T/C planned dispositions and D risk set, normalized links/anchors, owner acceptance where canon changes, source baseline SHA, explicit exclusions. If no product/technical revision is planned, its reason must be concrete.
3. **Implement:** executor reads the whole selected packet, required owner sections and impact list; edits documented planes plus code in any safe order *within this Change*. New dependency discovered or changed public semantics => revise packet / seek authority, do not improvise canon.
4. **Independent close:** compare diff to planned delta and semantic risk set; examine touched headings and all known dependents; fill actual ledger including no-op reasons, contradictions and proof tier; block Done on unresolved consequential drift.
5. **Archive:** one canonical owner per claim, repaired references, Status/source maps truthful; retain evidence/history in existing archive. No second long-lived bookkeeping registry.

## 2. Two kinds of links, two different jobs

**Narrative/contextual links** appear *at the sentence or heading where knowledge is borrowed or delegated*: “Clock speed does not reschedule reply deadlines; see [versioned settings#...].” These help a reader and agent know why to follow a relation. They should link to an exact heading where possible, not merely a 200-line page. “See also” links provide exploration but no automatic dependent obligation.

**Impact edges** indicate that a change to another claim may invalidate *this* claim. Add a small heading-local or page-local **Contract dependencies** table only where an actual co-review risk exists:

| This claim (anchor) | Relation | Governing/related claim (anchor) | Why a change triggers review |
| --- | --- | --- | --- |
| Technical execution permission claim | constrained-by | ../../product/gameplay/time-and-autonomy.md#pace | The technical clock must preserve product acceptance and idle-time rules |
| Technical staff investigation claim | constrained-by | ../../product/admin/authority-and-governance.md | Technical access grants must not exceed approved staff capabilities |

These rows are **illustrative relationships**, not a declaration that the example edges have been ratified or registered. Actual relative paths and heading anchors must be verified from the dependent page's location before committing real edges. Seed exact real links after inspecting the actual headings. Author the relationship *in the dependent page* as “A depends on B”; the reverse index knows that changing B should prompt review of A. **Authority is directional:** technical contracts can depend on or be constrained by product rules; product authority does not become subordinate to technical implementation. A product page may link to technical implementation for navigation without declaring the technical text a governing dependency. Do not duplicate B's rule in A.

### Minimal typed vocabulary

- **depends-on:** a selected claim's correctness relies on another selected claim. Mandatory dependent review on controlling claim change.
- **constrained-by:** a dependent behavior has a governing prohibition/permission/limit elsewhere; higher priority, mandatory review.
- **co-change:** a narrow explicitly bidirectional contract between two selected headings. Both sides require review; rationale must name the shared invariant. Use sparingly.
- **related/evidence/example/see-also:** ordinary Markdown links, **not** automatic mandatory impact edges.
- **supersedes:** decision/history reference only; not a live runtime dependency.

Use ordinary Markdown links and a recognizable local table heading, not mandatory YAML frontmatter or a separate graph database. The section URL/anchor plus relation and reason forms a reviewable, versioned graph edge. The source document owns its dependency declarations. Unstructured inline context links remain desirable; a table does not substitute for them.

### Graph behavior

- Parse typed links by existing Markdown AST machinery; validate path and fragment, relationship value, selected-vs-proposed classification and empty/templated rationales. Reject an “impact” edge to proposal/history as if it were binding.
- Build a **reverse relation index at claim/heading granularity**. Changed selected claim B -> direct dependents A -> review candidates. Default to **one hop**; a second hop is surfaced as optional escalation if the first-hop disposition says a shared invariant changed. Cycles are collapsed/deduplicated, and large fanout is reported, not silently discarded.
- Use Git diff/heading mapping to identify changed claims conservatively. A file-only diff with ambiguous heading coverage emits broad **unknown subsection** review, not a made-up precise claim. Cross-doc edits without registered edges get an “unmapped boundary; manually review” warning.
- Include active selected changes and authored doc edits; exclude terminal archived packets as normative graph nodes. Link graph remains a *finding aid*, not a logic proof that there are no omitted relations.
- Output compact tuples: source claim, dependent claim, relation, rationale, path/line, why triggered, disposition (updated / reviewed unchanged with evidence / blocked / unknown), SHA/dirty. Never emit an unconditional “wiki consistent” verdict.

## 3. Separate planning and closing guards; reuse existing tools

Extend the existing wiki:change-guard **plan** mode to require the P/T/C dispositions and D review plan for *new or explicitly migrated packets*; validate headings and meaningful reasons. Do not decide a claim is ratified merely because it is under docs/technical. Warn on missing edge analysis, block Ready for empty/contradictory plane disposition, and allow Proposed to remain an unfinished design. Use a versioned opt-in schema then scoped rollout; avoid making dozens of historical Changes suddenly fail.

Extend **close** mode to join actual diff paths/heading edits against the planned table and discovered dependency candidates. Keep its existing seven-column factual ledger rather than replacing it. Unknown/newly affected paths cannot be swallowed by a general “no docs changes” phrase. A source-only diff that violates a ratified game rule remains a code bug; the tooling must not propose a product rewrite as the automatic fix.

Reuse wiki-core model and markdown parser for graphs; HK06/HK07 inventory and Git freshness for changed sources; HK08 for PR/CI and repo:brief presentation. A single maintainer-facing command/report should link to detailed impact reasons. No independent crawler or second ledger.

## 4. Planning impact search versus independent execution verification

**Design author:** proactively identifies *intended* changes and likely dependent claims by reading the sections that govern the outcome. Records assumed stable invariants and exact reasoned no-ops. The plan is accountable for overlooked scope.

**Executor:** re-inspects HEAD and actual touched files, derives potential impacted claims separately from declared scope, reviews contextual links and typed reverse edges, and checks evidence. An executor may detect missing declarations, but must stop and amend the packet instead of expanding permissions.

**Reviewer/close guard:** compares planned vs actual vs graph-derived impact independently. A plan plus completion ledger written by the same agent may still be wrong. Static gates can check presence and provenance, but high-risk semantic drift requires a second-person or fresh-agent review when authorized. An empty graph is a visibility risk, never affirmative proof of safety.

## 5. Where contextual links matter most

Seed targeted coverage at *actual coupling sites* rather than one link quota per page: accepted time -> committed time/ticks/settings; Storyteller permissible invention -> engine authority/prompt/tool rights; staff support -> identity/privacy/forensics; saved appearance -> publication/client semantic controls; cost entitlements -> provider budgets; observation -> consent/retention. First inspect existing links and avoid duplicating links that already establish meaningful context.

Do **not** force links into standalone story examples, brief pages, or every paragraph. A useful link names the **specific dependency and its failure consequence**. Anchor quality, direction and reasons matter more than density.

## 6. Human ownership and applicability

Product ratification remains a human/owner decision. A technical refactor cannot rewrite an accepted product promise. A technical target approved but not implemented stays normative target with separate status evidence. A code-only maintenance Change may reasonably leave P/T unchanged; the plan still says *why*. A documentation-only correction that changes no executable code uses the existing design/docs procedure, but should use the same P/T/D impact thinking and reconciliation principles. This is not an excuse to invent a fake code Change.

## 7. Design failures that must become observable

- “All code tests pass” while the planned product/technical table is absent => **plan gate fails**.
- Product and technical rows say “N/A” without distinguishing intended behavior from internal tooling => **plan gate fails**.
- Selected authority changed without owner approval => **ratification gate fails**.
- Technical contract B changes while dependent claim A was omitted => **reverse-impact review required**.
- A plain See Also citation incorrectly treated as normative dependency => **test must reject the false positive**.
- Link to archived historical design is mistaken for executable authority => **test must reject**.
- Missing/ambiguous heading, unclean checkout, stale source baseline => **unknown/blocked, not green**.
- An executor changes only code despite a P/T planned edit => **close gate fails**.
- An intentionally unchanged high-stability contract with an explicit negative proof => **allowed, no needless doc churn**.
