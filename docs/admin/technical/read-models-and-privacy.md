# Admin read projections, search, provenance and privacy boundaries

**Status:** Selected technical target, 2026-11-14. Product owners: [Player 360](../player-360-service-blueprint.md), [Gameplay](../gameplay-worlds-product.md), [AI Operations](../ai-engineering-operations-product.md), [Trust & Privacy](../trust-and-privacy-product.md). Source reality: [baseline audit](source-baseline-2026-11-14.md). No exposed Admin DTO is implemented by this document.

## 1. The problem to solve

Staff must find and understand customers without creating a universal "return database rows" endpoint. A unified record is a **policy-scoped projection over authoritative sources** rather than a replicated writable dossier. It must be truthful about who the subject is, who funded an operation, what was published, and which records could not be shown.

**Rule:** source-derived authorized information is not equivalent to raw source access. The projection's shape and field-level release policy are explicit contracts; an accidental `SELECT *` or `JSON.stringify(generation.input)` is a security bug.

## 2. Required projection families

| Projection | Expected minimum information | Deliberately excluded by default |
| --- | --- | --- |
| `AdminSelfV1` | Staff principal reference, status, effective permitted workspace families and session assurance/expiry | Secrets, internal policy internals, unrelated staff details |
| `PlayerSearchPageV1` | Stable player reference, safe account status, creation, narrowly permitted matching fields | Full email/profile, campaign title/prose, Trust records, unauthorized existence counts |
| `PlayerSummaryV1` | Identity reference, account state, permitted relationship counts, access status and verified timestamps | Raw OAuth identities, payment instruments, personal passages and hidden AI prompts |
| `PlayerCampaignPageV1` | Campaign reference, current **legacy-owner** relation or supported actual membership, metadata status/age, safe health label | Content titles/excerpts, other participants' private attributes |
| `CampaignOpsSummaryV1` | Committed revision, game clock/hold summary as authorized, publication status, source coverage, related operation IDs | Hidden mechanical rolls, private strategy, raw events/prose by default |
| `StorytellerOperationV1` | Task/generation IDs, kind, verified state, attempt/publication status, bounded error class, dates and coverage | Raw model inputs/output, source document bytes, secret directions |
| `UsageStatusV1` | Technical funded window/reserved/settled/uncertain counts and policy version when source-backed | Fictional currency, invented plan/pricing, a customer invoice |
| `CaseSummaryV1` | Case reference, state, assigned employee/team and *permitted* related subjects | Trust allegations, protected attachments or general private narratives |
| `AuditSummaryV1` | Actor, action class, target reference, decision/effect status and source | Unrestricted raw payloads/credentials; different audience for sensitive details |
| `ServiceStatusV1` | Source-backed provider/operation health, freshness, active incident and explicit unknown coverage | Fabricated 'healthy' when monitoring unavailable |

**Not supported currently:** real paid subscription summary, refund status, multiplayer membership, unrestricted case history. A missing source means `unsupported` or `unknown` per field, **not** fabricated `Free`, `not paying`, `no cases` or `none`.

### Envelope conventions

Recommended strict V1 contract concept (illustrative, not literal TS yet):

```text
AdminReadEnvelope<T> {
  subject: { kind, id, environment };
  version: 1;
  data: T; // only fields authorized for this endpoint
  observedAt: ISO timestamp;
  sources: [{ kind, sourceRef?, observedAt?, coverage, authorityLevel }];
  consistency: verified | delayed | partial | unavailable;
  limitations?: safe reason codes[];
}
```

A field exposed at all must have an explicit authorization/sensitivity policy. For data the employee is allowed to know exists but cannot see, use an appropriately safe `restricted` marker. For resources whose existence itself is protected, return an indistinguishable not-found/forbidden pattern **without confirming the record**. Do not leak presence through list totals, ordering, autocomplete, error details, titles, saved filters or SSE payloads.

## 3. Relationship semantics and current single-owner source

The player profile is not identical to the payer or campaign owner. The target records account identity, participation/controlled character, campaign, payer, sponsor and allowance beneficiary as separate relationships.

**Current audited DB:** `story.ownerId` exists and normal story reads are owner-scoped. There is no observed generalized membership table in the audited composition. The V1 Admin campaign list may say `relationship: legacy-owner` and display verified metadata, but must not expose invented invites/characters or infer that `story.ownerId` pays the AI bill.

**Upgrade rule:** future multiplayer membership is a separately authorized source with visibility per viewer; adding it cannot retroactively treat every existing story as public to any staff who can see a related player.

## 4. Read model ownership, assembly and missing data

- **PostgreSQL** owns account identity references, story/campaign metadata, committed state/receipts, generation status and technical usage allocations presently recorded.
- **Document store** owns canonical passage/source bytes where moved there; the basic Admin must not fetch these for a search result. Read sensitive source only through separately authorized, purpose-bound endpoint and capture its source version.
- **Commercial/payment provider (future)** owns payment settlement; Admin local effective access comes from verified entitlement/allowance decisions and provider reconciliation, never generic tier label.
- **Support/helpdesk (future)** owns inbound contact where integrated; native case links/actions stay coherent under an explicit source authority.
- **Telemetry/incidents** may be aggregated/delayed; an unavailable observer cannot assert absence of spend or defects.

If authoritative source A and derived source B disagree, show conflict or prefer A with an explicit explanation and observed time; do not silently overwrite B into a new fake business fact.

Metadata query and projection must use bounded reads and indexes suitable for thousands of accounts. Never load every passage, participant or generation to compute one player summary. Page by stable cursor with validated filters, bounded sizes and consistent source version semantics.

## 5. Safe search and cross-entity navigation

Start with explicit stable account/campaign/operation IDs and narrowly permitted filters. Exact email/contact search is **sensitive identity lookup**, not part of the base Reader package. Fuzzy global text search on private narratives is out of initial scope.

Every list:
- enforces actor, capability, environment, resource/assignment scope **before returning** results or counts;
- has a bounded page size and stable pagination, including stale/deleted subjects;
- renders only authorized snippets, linked counts and subject types;
- rechecks access on a detail fetch even if an earlier result/deep link was visible;
- exposes export as a separate capability, never "download current search";
- does not reveal another player's campaign through a shared-character or payer relationship.

The global Command Center and specialist workspace search use the **same Admin application projection policy**, not two different ad hoc query utilities.

## 6. Sensitive evidence hierarchy

| Class | Example | Default handling |
| --- | --- | --- |
| Operational noncontent | Current request status, timing/error code, cost estimate and source reference | Scoped staff read |
| Protected identity | Name/contact/recovery information | Additional identity read permission and purpose |
| Narrative text / source evidence | Player dialogue, exact passage, participant-private scene | Separate purpose-bound sensitive access, audited before release |
| AI context / model output | Raw prompts, retrieved passages, model raw completions | Separately gated from ordinary AI-operation metadata |
| Confidential Trust/Privacy | Reports, witnesses, data-rights verification and policy reasoning | Restricted specialist case audiences |
| Financial records | Payer identity, transactions, refunds and settlement data | Commercial/finance authority; no payment instruments to general Admin |
| Credential/security secrets | Session cookies, OAuth tokens, API keys, raw verification tokens | **Never** included in general Admin projections or logs |

Even `story_public_event` means published to an authorized game audience, **not publicly readable by staff**. Titles/summaries can be private narrative content and require the relevant sensitivity check.

A grant to inspect a specific narrative cannot become general export access or permanent access to the source-document store. Selected evidence must retain audience/sensitivity labels if linked into a case, alert, transcript, generated summary or sandbox.

## 7. Freshness, deletion and historical coverage

Use explicit statuses: `current`, `observed_at`, `stale`, `estimated`, `partial`, `unknown`, `unsupported`, `restricted`. Do not conflate these with domain lifecycle states like pending/running/failed.

- Missing current telemetry `unknown` rather than zero.
- Owner-scoped public events may have `coverage: since-enabled`; do not promise an exhaustive historical event feed.
- Provider cost estimate may differ from billed amount.
- A completed pending technical operation is not the same as a released player passage or consumed commercial credit.
- Legitimate erasure/retention may make old evidence unavailable; records say why, as permitted.
- Summary/projection caches must be scoped to **operator principal, session authorization epoch, resource and permitted fields**, with short lifetimes and complete revocation invalidation. Server SSR and proxy use no-store.

## 8. Negative proof matrix

1. Staff with player-summary access reads `PlayerSummaryV1`: no raw email/token, private passages, hidden role, or raw generation JSON.
2. Same staff guesses a restricted account ID: no existence, count, title or status leak through error or timing-dependent response.
3. Engineer can view an operation but not `ai.context.read`: redacted timeline shows statuses yet refuses raw inputs/outputs even via source hyperlink.
4. Campaign owned by Alice includes Bob private content in future multiplayer: Alice's support-case scope does not unlock Bob's separate account.
5. `story_public_event` title contains secret story prose: search/summary cannot use it as a harmless metadata label.
6. Source lacks subscriptions: response signals not supported, not `free` or `no payments`.
7. Revoked staff refreshes old tab: all new Admin reads fail and Query cache is purged; stale SSR RSC never crosses identities.
8. Pagination across restricted resources does not leak hidden counts or allow different permissions between page and detail.
9. Cross-processor erasure is partially complete: the operator sees source-dependent pending, not "all copies deleted."
10. No trustworthy cost observations: dashboard says unknown even if last cached number was zero.

These conditions precede richer account/CRM functionality.
