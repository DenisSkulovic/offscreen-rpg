# DOC02 | Desired end-state: a knowledge system ChatGPT can trust

**Design-independent stance:** This target is based on what a fresh human or ChatGPT investigator must accomplish, NOT on an attempt to conserve existing files or honor DOC01's temporary scaffolding. The *product-bible → technical-contract → implementation artifact* hierarchy remains absolute. A good destination can require merging, deleting, replacing or completely rewriting today's canonical files.

## 1. The objective is correct retrieval, not minimum file count

A future chat should be able to answer a concrete, potentially unfamiliar Offscreen RPG question without reading historical transcripts or source code first:

1. **What is the product promise?** Find the owner-accepted desired behavior, its exceptions and a normal/negative example.
2. **What is the intended technical guarantee?** Find one owner for invariants, state transitions, failure/retry, data or model context.
3. **What currently works?** Find a dated, accurately scoped implementation status and reproducible evidence, **not** a hopeful plan.
4. **What is unfinished?** Find the specific open product/architecture decision, selected work packet and its constraints.
5. **Where should the agent act?** Find relevant source-adjacent owner maps and one bounded Change, without making a new design decision from code.

A document earns permanent space only when its contents improve at least one of those answers *and* it has a coherent reason to change independently of adjacent documents. Formal language, title, file length and history of discussions provide no special value.

## 2. Authority classes and revision mechanics

| Class | Core question | Correct location | Lifecycle | Explicitly not |
| --- | --- | --- | --- | --- |
| **Product contract** | What must players or staff experience, and which policies govern that? | `docs/product/<domain>/` | Maintained, owner-accepted or explicitly selected target, revised only through product design decision | User-story ideation, unapproved feature wishlist, screenshot review |
| **Technical contract** | What must the system guarantee to realize accepted product behavior? | `docs/technical/<domain>/` | Maintained, selected architecture with compatibility/negative cases | Transcript, previous source audit, implemented-code dump |
| **Decision rationale** | Why did owner accept a consequential trade-off and when revisit? | `docs/decisions/` only where real accepted ADRs exist | Supersedable explanation linked to normative contract | Alternative normative copy |
| **Procedure** | What does an operator/developer actually do repeatedly? | `docs/runbooks/` or relevant `.agents` skill | Maintained against actual commands and tool behavior | One-time Cursor handoff |
| **Open design** | Which behavior is not yet chosen or policy-gated? | `work/designs/open/<topic>/` | Time-bounded; owner choice → promote / reject / retain explicitly | A canonical promise, dormant indefinitely with an empty README |
| **Active Change** | What exact authorized source/docs/tool delta is being executed? | `work/changes/open/` | Selected → implement → reconcile → terminal | Full product design |
| **Terminal Change** | What was proposed, executed, rejected and proven in a bounded work unit? | **`work/changes/archive/`, permanently retained** | Immutable or corrected with dated amendment; index optional | Active code permission |
| **Evidence** | What did an inspection or experiment actually observe at which revision? | `evidence/inspections/`, `evidence/runs/` | Version-bound; reproducibility/privacy retention | Generic copy of old product/tech docs |
| **Research** | What external idea, trade-off or technique informs possible design? | `research/` or `.agents/references/` | Curated, date of verification, link to primary sources | Accepted requirement or historical code-gap audit |
| **Source map** | Where is the actual code path, symbol and test now? | nearest source-adjacent README | Updated when implementation ownership changes | Product/architecture authority |
| **Session continuity** | What was discussed but not yet promoted? | short `work/sessions/` only while active | Promote or expire; Git retains old commits | Second running product bible |
| **Current status** | What is implemented, tested, unproved, priority? | root `STATUS.md` | Dated factual report | Historical program plan or technical norm |
| **Strategic direction** | What outcomes the owner prioritizes? | root `ROADMAP.md` | Owner directions, stable until changed | 130-packet queue |

**Critical:** “Accepted future target” is **normative design** but is not implemented. “Proposed” is **not** normative even if elaborate, written confidently or stored near accepted docs. Every long-lived document must state which it is. There may be staged acceptance within a document; label the boundary at the actual section rather than generalizing.

## 3. Target topology: keep useful domain boundaries, remove the leftovers

The current *domain* partition is directionally workable and can be retained where justified. There is **no demand to move everything yet again into a brand-new taxonomy**. The work is chiefly semantic canonicalization, genuine gaps and deleting dead paths. Desired conceptual tree (leaf examples are subject to content audit, not mandatory placeholders):

```text
README.md
STATUS.md
ROADMAP.md
AGENTS.md
NOTICE.md

docs/
  README.md                    # 1-screen route from question to owner; no history list
  product/
    README.md                  # product subject router
    foundations/               # vision and shared vocabulary
    gameplay/                  # actions, time, rules, worlds, continuity, benchmark acceptance
    experience/                # first contact, play, wait, return, presentation, replay
    storyteller/                # player-visible DM intelligence and creative constitution
    admin/                      # genuinely detailed staff workspaces, authority, journeys
  technical/
    README.md                  # one owner map, topics and exact headings
    platform/                  # common deployment/identity/consistency/spend infrastructure
    engine/                    # game truth, transitions, lifecycle, extensible rules, concurrency
    storyteller/               # model task loop, context memory, prompts, tools, publication
    client/                    # Next/React target, data/state, presentation & a11y
    admin/                     # privileged staff access, control-plane APIs and audit
    observability/             # causal evidence, provenance, reconstruction, retention
    lab/                       # Chamber fixture validity and experimental control
  decisions/                   # only if accepted ADRs are actually curated
  runbooks/                    # actual reproducible procedures

work/
  changes/open/
  changes/archive/             # **KEEP** all terminal Change packets
  changes/ledger/              # optional index; must never be sole history
  designs/open/                # real unresolved product/architecture decisions only
  sessions/                    # optional active, short-lived continuity

evidence/
  inspections/                 # *actual* inspections and bounded claims, not program snapshots
  runs/                        # unique run manifests, checksums, representative assets

research/                      # durable curated research, not “legacy engineering” landfill
.agents/                       # coding-agent operating rules and skills only
apps/**/README.md
packages/**/README.md
```

### Explicitly forbidden in the finished knowledge system

- `docs/product/journeys/` and `docs/product/storytelling/` if their subjects now have canonical owners; **do not leave any compatibility files**.
- Flat `docs/technical/*.md` except `README.md` once subject owners exist. If a flat doc is uniquely cross-domain, either place it in `technical/platform/` or justify a single named cross-domain owner, not an alias.
- `docs/technical/playthroughs/` as a mixed example/technical-contract folder.
- `docs/progress.md`, `docs/questions.md`, root `TODO.md`, and any additional “see the new owner” placeholder after consumers are switched.
- Short `docs/technical/*` “skeleton” files that cannot answer their advertised question. **Fill, merge with real owner or delete**, rather than protecting the target list.
- First-hop routers to `evidence/inspections/doc01-legacy-snapshot/`, `research/legacy-*` or old `programs` READMEs.
- Copying a retired design into `evidence` as an excuse not to evaluate its approval/unique content.
- Whole-doc duplicate Markdown bodies at two active paths.
- `work/designs/open/doc01-migration` migration scripts after completion unless deliberately converted into tested reusable tooling.
- Run screenshots/traces duplicated across evidence collections without a single asset owner and hash-based references.

## 4. Document identity and contents, independent of formatting

Every canonical **substantive** document must pass six questions:

1. **Owner question:** What one recurring user/investigator question does this document answer? If it answers five unrelated questions, split by independent revision reason. If it answers none beyond “see somewhere else,” delete it.
2. **Authority:** Is it accepted, selected target, conditional/proposed, or a dated observation? Which human approval supports it? Never infer approval from old Markdown presence.
3. **Behavior:** Can a fresh reader describe a normal path *and a discriminating failure path* without consulting old plans? If not, it is incomplete for implementation decisions.
4. **Boundary:** Which adjacent topic is explicitly outside this document, and where is that owned?
5. **Evolution:** What future product/technical decision would justify changing this document? Does it change independently enough to be its own file?
6. **Evidence:** How can a claim of current implementation be independently checked? Where is source/test/run proof? No changing a contract to rationalize observed defects.

Prefer a concise opening: **owns; accepted vs proposed; essential truth; exact related technical/product owner; exception/negative**. Avoid mandatory repetitive templates and always-on H1 status banners. Long coherent documents can stay long. No arbitrary maximum length. But large multi-topic documents should be reorganized if “one question” cannot lead to the relevant subsection.

### No new authoritative shadow copies

For *each claim*, only one source is normative. A product rule may be summarized in a technical document **only** to explain a technical constraint and link to the product heading. A technical owner must never maintain another full version of a related contract as “context.” ADRs explain the chosen trade-off and link normative wording; evidence states observed results and never includes new policy as if approved.

## 5. Domain-specific completeness before deletion

### Product: gameplay and world

The product bible must settle/mark explicitly pending: ordinary life and D&D outcomes; no-action/no-time semantics; accepted commitments and interruptions; arbitrary world/character bodies; independent character knowledge vs world truth; memory/earned consequences; nonhuman scenarios; persistent multiplayer aspirations and bounded initial supported subset. Split approved behavior from GM03/GM07 and other conditional promises; do not bury unfinished design in a tiny “collaboration” skeleton.

### Product: experience and Storyteller

Canonical experience must answer concrete journeys (first preview → account → creation → Now → action → wait → return → Journal, with failure cases). Selected presentation outcomes and contrast/motion/accessibility rules must be distinct from runtime rendering design. Storyteller product contract must carry owner-accepted creative philosophy, ordinary-life neutrality, agency, canon, initiative, continuity and quality evaluation. Detailed proposed future behavior is either accepted through owner gate or explicitly under `work/designs`.

### Product: Admin

Rebuild the actual accepted **future Admin product** from long-form domain designs, rather than eight summaries. Preserve meaningful policy qualifications: staff capability package composition; three delegated-access modes; Player 360 payer/participant/character separation; Support cases and interventions; commercial limitations; LiveOps rollout/compatibility/kill-switch semantics; model/AI investigation boundaries; Trust privacy workflow; Command Center/metrics; cross-workspace operator journeys and negative cases. Keep unratified high-impact policies separate with exact links. A staff product at 1,000+ users cannot be defined adequately by a list of eight slogans.

### Technical: engine and Storyteller

Reconcile old code-era contracts against **selected future architecture**. Engine should have a coherent domain model, explicit authority graph, extensible capability kernel, time/activity policies, versioning, locks/CAS/recovery and compatibility. Storyteller must carry desired bounded agent loop/controller, exact task recipes, context/read tools, retrieval, prompt construction, publication and spending. Protect detailed ENG03-specific invariants and distinguish partial landed sub-slices from unfinished full ENG03. If an entire design is still unapproved, give it a real draft home and a clear decision; do not call it implemented.

### Technical: Admin, OBS, client, Chamber

Promote precise selected internal contracts from old program essays after approval status review; especially OBS Turn Capsule, provenance edges, versioned artifacts, forensic access, retention, reconstruction and source lineage. Avoid dumbing technical designs into five broad 15 KB overview documents when the detail is essential. For client, separate target state/SSR/hydration/caching/command UX from player-facing copy. For Chamber, preserve reproducibility and real fixture/contracts without treating authored demo flows as runtime proof.

## 6. ChatGPT-first retrieval contract

A successful **fresh ChatGPT chat** should start with `AGENTS.md` or the small `docs/README.md` and route to a specific authoritative *heading*, not a folder of 30 readmes.

- `docs/README.md`: a compact table of **the 8–12 most common question families**, pointing directly to product owners and technical companions; a short instruction for evidence/status and proposed work. It must not link to an archive or legacy snapshot in its **primary route table**.
- `docs/product/README.md` and `docs/technical/README.md`: thin subject maps with one or two discriminating questions per owner. No duplicate Done/status chronology, old paths or “until cutover” notes.
- Canonical pages: stable headings, a first-screen ownership/contract summary, links to narrow peer headings, examples and negative cases placed near the associated claim.
- The `STATUS.md` dashboard tells the truth about implementation **separately**; `ROADMAP.md` replaces TODO as owner strategy; `work/changes/README.md` is the sole code selection.
- Open designs are discoverable by *topic*: a canonical page may say “future policy unresolved, draft at work/designs/...”, but must not paraphrase the proposal as accepted.
- Archive/history remains reachable by explicit “why was this decided/what did this Change do?” follow-ups, **not** on first-pass product/tech retrieval.

**Success criterion:** Given a scoped question, the reader gets to the correct accepted product/technical heading within **two navigational decisions** (entry router → topic owner/heading) and can state the core rule, one negative, status class and what remains uncertain. Count actual consulted documents and errors. Faster wrong answers are a failure.

## 7. Gardening that cannot be passed by cosmetic renames

A content governance check should do more than ban folder names:

1. **Path uniqueness:** disallow retired aliases, obsolete root TODO/progress/questions, dangling links and in-tree duplicate blob documents unless explicit exception.
2. **Lifecycle consistency:** finished migration directories cannot remain under `work/designs/open/`; `evidence/inspections` cannot contain source-era normative essays as an owner; `work/changes/archive/` is explicitly exempt and permanently retained.
3. **Declared ownership:** canonical specs have a question/owner/accepted or proposed boundary, peer links and negative cases; no “skeleton/until cutover” placeholders in normative catalog.
4. **Status freshness:** `STATUS.md` is one factual dashboard and correctly describes actual authority/doc migrations; no remaining self-reference “replaces STATUS.md.”
5. **Meaningful independent test:** frozen 18-question human/ChatGPT benchmark *before and after* from an unprimed context, with correct headings and exact limitations; check real responses, not self-authored route maps.

The checker's scripts are supplementary. **No automated rubric can prove semantic correctness**. Domain review must inspect the actual accepted constraints and negative cases; this is why full preservation of historical text until promotion is important but is **not** equivalent to promotion.

## 8. Anti-goals

DOC02 should not rebrand `programs` as `areas`, re-archive everything under another dated folder, create 50 ADRs to look serious, compress a nuanced contract into marketing bullets, delete all examples indiscriminately, or optimize only for fewer files. Nor should it rewrite gameplay source to match today's docs. The ideal destination is **a small number of authoritative paths with enough substance to drive correct work for years**.
