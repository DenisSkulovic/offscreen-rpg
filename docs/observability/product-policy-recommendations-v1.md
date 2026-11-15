# Forensic observability | Proposed product and privacy policy decisions V1

**Status:** advisor recommendations for product-owner acceptance, 2026-11-15. This records a concrete recommended policy so engineering can converge; it is **not** legal advice, owner acceptance, a production configuration or code authorization. Parent [product vision](product-vision.md), [security reads](technical/forensic-access-and-read-contract-v1.md), [retention source inventory](evidence/private-content-retention-inventory-2026-11-15.md), [replay](technical/replay-retention-and-privacy.md). The 2026-11-14 **Admin direction** is already accepted, but its broad authorization does **not** approve these new private-evidence rights or indefinite raw content storage.

## 1. The guiding product decision

**Choose a durable evidence spine and a finite protected payload archive, not infinite logs or a developer experience that depends on locally reproducing old bugs.**

A developer needs access to actual production context **when a legitimate ticket/incident requires it**. A player deserves long-lived replay of the published story they chose to keep. Support needs accurate causal explanations quickly, without unnecessarily inspecting intimacy or secret world plans. Neither needs thousands of operational log lines.

**Highest-value non-negotiables:** original accepted command/receipt, exact earned effects/clock, historical published scene, source pointers, G/attempt/publication truth, effective config revision, bounded selector/omission metadata and factual recorded model status **never disappear merely because Grafana span retention ended**. Privacy and storage policies may legitimately limit full raw prompt bodies.

## 2. Proposed initial retention tiers (recommendation, not accepted policy)

| Content class | Recommended production default | Extension/exception | Why |
| --- | --- | --- | --- |
| **Published player story and recorded gameplay state/receipts** | For the lifetime of an active or user-archived story, subject to deletion rights | User-controlled export/retention/closure policy | Story replay is core product value, not debug telemetry |
| **Compact committed transition sequence, typed deltas and verified checkpoints** | Same retained-story lifecycle when full replay is promised | Gap/tombstone for uninstrumented old scenes, lawful partial deletion | Reconstruct actual historical game state, not future guesses |
| **Restricted raw Storyteller requests, responses and visible tool outputs** | **90 days candidate** for real users, conditional on measured cost, lawful basis, access and full deletion path | Named incident hold up to **180 days candidate** with approval/expiry; development-owned synthetic campaigns can keep longer | Enough time for real bug reports without indefinite private prompt stockpile |
| **Effective config, source-selection, component hashes/metadata, G/attempt IDs** | **12 months candidate** or minimum sufficient while retained story evidence requires it | Narrow lawful audit/incident retention | Debug prompt drift after the raw body expires without storing the whole transcript |
| **Sampled operational traces** | 7–14 days | Incident-driven bounded operational sampling/hold | Performance diagnosis and service topology |
| **Structured application logs** | 14–30 days, error-focused | Security incident retention separately | Normal process troubleshooting, no raw game prose |
| **Aggregated metrics** | 90 days detailed + longer downsampled trend as justified | Standard SLO history | Service/cost trends without per-player raw content |
| **Staff security/access audit** | Separate approved security/legal schedule with minimal payload | Lawful hold and review | Protect users and accountability, not limitless narrative retention |
| **Diagnostic exports/Chamber bundles** | Expiring, isolated, sanitized and named to a case | Explicit approved QA retention on synthetic datasets | Avoid shadow copies of real user data |
| **Rejected custom-intent drafts and uncommitted proposals** | Short operational/abuse retention, not automatically a full-story lifetime | Only if explicitly incorporated into actual accepted story history | Player free text that never became game truth is not permanent canon |

**Why change the earlier 30/90 suggestion?** The original [retention draft](technical/replay-retention-and-privacy.md) used 30 days raw / 90 days incident as a **candidate**. For a long-lived narrative product, ordinary inconsistencies may only be reported months later. A **90/180-day candidate** is a better *forensic utility* starting proposal, if legal/storage review supports it. The choice is not final, and the old draft must be treated as superseded **for recommendation**, not as a deployed configuration. The source copy inventory still blocks enforcing **any** raw TTL today.

**Development/synthetic data exception:** test/author-created campaigns containing no real customer data may keep deep raw evidence much longer with quotas, local isolation and no production credentials. Never classify a real user's campaign “synthetic” merely because engineers use it as a testcase.

## 3. Access that is serious but not ridiculous

We should not demand two engineers and a six-stage approval chain merely to inspect one recent model packet in a small team's own test environment. Equally, a broad Staff role should not provide unrestricted access to every player's private game.

**Recommended access experience:**
- **Support L1:** automatically authorized **S1 safe status and source-linked timeline** only for assigned/otherwise authorized case scope. No raw prompt, hidden world, free-text private memory or player credentials. Most stuck-game tickets end here.
- **Support specialist:** player-visible story content **S2** only for a legitimate verified support purpose, scope-checked and attributable; raw private AI packets remain unavailable by default.
- **Engineering / AI owner:** S1 operational metadata and source hashes under normal engineering grants. For one real incident's **S3 private raw payload**, require existing active technical grant, named case/incident+campaign/G, recent staff re-authentication/step-up and automatic time-limited **15-minute investigation lease candidate**; log every actual body disclosure. A single properly granted engineer can perform this ordinary diagnosis without requesting unrelated financial/live-world powers.
- **High-risk access:** bulk export across campaigns, hidden multi-participant content, exceptional retention beyond policy, Trust evidence, player-account impersonation or productive game modification require **additional independent authorization/approval**; do not bootstrap that power from the same S3 read lease.
- **Developer local staging/synthetic fixtures:** allow a narrower, explicitly marked testing policy with minimal friction, no route to cross-environment production data. Environment scope is real, not just a UI badge.
- **Revocation:** time-limited token/purpose grant ends with staff session access-epoch revoke, case closure/expiry or evidence retention change; each new protected content read rechecks; no unbounded browser cache/SSR payload.

**No fake “thought stream”.** The developer can view model-visible request, submitted output, tool calls/results, effective source/selector decisions, application-side validation and actual published consequence. Internal hidden model reasoning not exposed by provider is not available. A post-hoc LLM interpretation is a separate heuristic, never factual historic model intent.

## 4. Retention controls and user trust

Recommend a **transparent story-data policy**:
- A user may retain and replay their **published** story until they delete/close it under the product's documented policy.
- A technically necessary restricted AI diagnostic archive may be operated for a finite transparent period under appropriate lawful basis; access is rare and attributed, with purpose limitation. Any optional **enhanced diagnostic retention** should be truly optional/transparent with an independent policy, not an obscure game setting or default-on “surveillance mode.”
- Players should not see a misleading “the system remembers everything forever” promise. Explain the difference between story memory and private operational diagnostics in simple terms.
- Real customers' raw prompts must not be sent to a third-party tracing service merely to enable Grafana. The native store stays the content owner.
- The user controls ordinary story deletion/export within applicable rights; authorized exceptions (finance/security/legal) are scoped, documented and genuinely minimal.
- A backup can retain deleted bytes during a documented rotation period; don't claim immediate total physical erasure from every medium. A restored backup must apply deletion tombstones before any user/staff access.

**Critical engineering caveat:** current `generation.input`/`output`, `storyteller_dispatch_review.packet`, `storyteller_memory_exploration` and derivative copies are real physical stores. The new retention window cannot be stated as enforced until **all** required consumers and copies support expiry/erasure safely.

## 5. Player replay policy to approve independently

**Recommend two product milestones:**
1. **Published Scene Playback V1**: read-only user-controlled browsing/stepping through original published scenes, recorded choices and player-visible outcomes. Already possible to design from `story_passage`+existing receipts without full transition ledger. Must label historical state gaps honestly.
2. **Full State Time Travel V2**: exact actor, items, activity and world state at a chosen committed frontier, only after strict transitions/checkpoints and integrity proved. The player-facing UI can expose appropriate subset; developer sees private details only with grant.

Do **not** promise “click any prior scene and choose a different option” inside replay. That is **forking**, a separate model/authority problem; current `stories/forks.ts::forkCurrent` is deliberately limited to the initial safe revision. A later replay fork needs its own source, actor/offer/hold remapping and security design. Similarly, exact pixel reproduction requires archived renderer/media, not just original narrative data.

## 6. Explicit production policy vs portfolio phase

Currently Offscreen RPG is a serious engineering laboratory/portfolio, not yet a proven thousand-player service. It is reasonable to implement **provider-disabled, synthetic forensic fidelity tests first**, then choose production retention from measured workload and a privacy review. Do not build legal-hold UIs, Kafka/S3 lifecycle automation and staff approval bureaucracy before a single real captured turn can be inspected.

**Staged policy acceptance recommended:**

| Decision | What can be accepted now | What must remain conditional |
| --- | --- | --- |
| Typed durable game evidence and replay source identity | **Architecture direction** | Exact DB schema/performance under contention |
| No sampling of authoritative event/receipt provenance | **Architecture direction** | Source coverage of every current writer |
| Raw AI content protected from default logs and Support | **Security design direction** | Exact S3/KMS/SQL data migration and deletion |
| Small-team developer S3 inspection with a 15-min lease | **Recommended policy shape** | Existing Admin grants, assurance and auditing implementation |
| Published playback before full state reconstruction | **Product staging** | Human UI validation and historical source coverage |
| Raw packet 90/180-day windows | **Candidate only** | Legal basis, actual storage cost/backup deletion and user notice |
| Optional Grafana tracing stack | **Operational design** | Resource budget, precise SDK/collector versions and SLO testing |

## 7. Adversarial situations

- A user reports a five-month-old problem. Published story/mechanics and metadata still reconstruct as permitted. Raw packet may have expired, and Admin says so clearly; investigator does **not** pretend current prompt body is historic.
- A ticket is misassigned to a Support employee. Their case link cannot grant S3 access or reveal private story prose unless independently scoped.
- A developer opens raw G for investigation, then the 15-minute lease expires. New reads deny; already delivered bytes cannot magically be recalled, so Audit records which artifact was disclosed.
- A player requests full story deletion while a model attempt remains possibly dispatched. Prevent new work, resolve/cancel pending task, restrict source access and follow lawful erasure workflow; do not accidentally re-trigger the model after deletion.
- A player performs 100 quiet turns with no model calls. Metrics show zero model rounds; no fake agent trace; committed game-time/activities still have source history.
- Storage budget alarm sounds. Do not switch off E0 state/receipt capture to save costs. Reduce optional telemetry, pause new paid AI dispatch if E1 custody at risk, and adjust raw retention only under approved product policy.
- A Storyteller instruction is code-backed; no fake admin author/editor history. Git/build/content hashes are the true source.
- An S3 error occurs during protected staging; mechanics already settled remain valid, but new paid narration remains held, with operator-safe problem status.

## 8. Owner acceptance gate

This is a **concrete policy proposal**, not an implicit yes. The first code-bearing OBS01/OBS02/OBS03 packets can remain Proposed while product policy is reviewed. No raw body access, retention setting, user-facing replay promise, external telemetry or provider spending is authorized by publishing this document.

**Recommended owner-level direction:** approve the *separation of product history vs protected AI diagnostics* and the *tiered Support/Engineering access model* before implementing raw payload storage. Exact 90/180 days and 15-minute access window may be refined after one measured synthetic full-campaign dataset and current legal requirements.
