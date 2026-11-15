# GM06 | Truthful “since last opened” checkpoint V1

**Status:** purpose-specific product + backend/frontend contract **recommended for owner selection**, 2026-11-15; no code approved. **Dependency already implemented:** [GM05](../../changes/2026-11-13--gm-return-event-projection/CHANGE.md) ships private `story_public_event`, per-story committed `eventSequence`, owner `GET /api/stories/:id/events` and only `coverage='since-enabled'` (no historical backfill). [GM06 execution packet](../../changes/2026-11-13--gm-viewer-read-position/CHANGE.md) remains Proposed.

## 1. Decide what we claim: an opening checkpoint, not mind-reading

**Select "Since you last opened this story", not "since you read every event".** The last *foreground, authenticated, actually rendered* open is a defensible user action; comprehension, reading depth and device scroll are not observable. The recorded frontier marks the most recent public event that already existed **at that last confirmed open**, regardless of which older Journal pages the player examined. This is a **visit checkpoint**, not evidence that every event was individually read. Never use "all caught up" or "everything read".

- **One shared per-viewer, per-story checkpoint across devices**, monotonic. A visit on laptop B intentionally advances what phone A will later consider "since last opened". Do not make device-specific private cursor synchronization a secret dependency.
- On first visit with no trusted prior checkpoint, show **Recent developments** (no claim about past absences) and establish the first verified checkpoint only after foreground render.
- Subsequent visits use events with `sequence > previousAcknowledgedSequence` and `sequence <= capturedVisitFrontier`, where the frontier is a **server-read committed public event maximum**, not fictional time, passage revision, SSE version, event timestamp or browser clock. Never equate `viewVersion` with GM05 `eventSequence`.
- **Coverage is partial before indexing**, but a verified checkpoint created *after GM05 was enabled* is sufficient for truthful future incremental "since last opened". It is **not** evidence of exhaustive lifetime history, and no retroactive event backfill can silently insert under an already acknowledged frontier. If coverage/gap integrity is uncertain, fall back to Recent developments with explicit nonexhaustiveness.
- While the current visit's digest is on screen, snapshot its original baseline and upper frontier and keep them **frozen in that visit**. SSE, route prefetch, background Query or an ACK response must not erase the digest mid-reading.
- The "Now" decision and active commitments are always loaded as **current canonical state**, independent of the new-event count. The digest is *evidence of changes*, not game authority.

## 2. Query/ack protocol and source identity

Introduce a typed read-only **visit-opening view** and a distinct authenticated ACK command. Suggested routes, subject to existing Nest convention:

~~~text
GET /api/stories/:storyId/visit
  owner/viewer auth, no mutation
  -> {
       previous: null | { eventSequence: NonnegativeSafeInt },
       frontier: NonnegativeSafeInt,
       coverage: 'since-enabled' | 'complete',
       window: { items: PublicStoryEventV1[], hasMore: boolean, count?: number },
       visitToken: opaqueSignedOrStoredBoundedToken
     }

PUT /api/stories/:storyId/visit/acks/:ackId
  owner/viewer auth, idempotent mutation
  body: { visitToken, frontier }
  -> { acknowledgedSequence: NonnegativeSafeInt, status: 'applied'|'already-current' }
~~~

**Read transaction:** in a repeatable-read owner-scoped transaction, read the viewer's persistent checkpoint and the **maximum currently committed `story_public_event.event_sequence` for that same story**, plus a bounded source-backed event window **(previous,frontier]**. Never infer frontier from the newest item of a paged 20-event response; that can be empty/truncated or stale. `eventSequence` remains allocated under the story writer lock. Server always validates that source records are *public*, not merely related to the story.

**Window:** return newest-first at most 20 events for the compact digest with `hasMore` and an honest link to an authorized Journal/event page. A first/long absence with 60 events is summarized as "20 recent developments; more recorded" (not "exactly 20 occurred"). A count is optional and only if cheaply exact and permissioned. Do not ack via this GET.

**Visit token:** server-issued, short-lived (recommended 10 min) **viewer/story/frontier/session bound** challenge, either MAC-authenticated with rotating server secret or persisted in the minimal visit table. Its purpose is to stop speculative replay of arbitrary future `frontier` values through a stale/forged client. A token does **not** prove visibility by itself. Keep the token private and out of URLs/logs. If existing authenticated session mechanism provides a safe server-issued read operation ID, reuse it. A missing/expired token must cause a safe re-GET, not background admission.

**ACK validation:** require current viewer is authorized to this story, `ackId` UUID, token valid for current session/viewer/story and original frontier, `0 <= frontier <= currentCommittedPublicFrontier`, and no incompatible story/visibility change. The acknowledged sequence is exactly the read frontier from this visit, never an arbitrary client "last seen" value. Apply atomic `MAX(storedSequence, requestedSequence)`; a lower ACK from another tab is a no-op, not an error that loses higher progress. Do **not** treat two legitimate differing ACKs as a second game command; they update only a private viewing checkpoint. The first valid ACK succeeds and can be repeated safely with the same `ackId` and payload. Same `ackId` with different story/user/token/frontier conflicts. An expired session or user switch must be denied, not fall back to the previously authenticated viewer.

**A subtle but important design choice:** `visitToken` is *not* a paid-operation receipt or a substitute for access control. It provides request/frontier binding; client visibility remains a UX invariant whose normal and malicious bypass cases must be tested. Browser and app must not issue ACK automatically during SSR, RSC prefetch, SSE or a hidden background tab.

## 3. Exact client trigger and digest preservation

1. Server SSR and Query prefetch may load the read model but **never acknowledge** it.
2. Client Play route only starts an opening checkpoint when `document.visibilityState==='visible'`, route is the active authenticated foreground story and the **current story situation** has committed to a visible DOM. Query read and its event window are validated and belonged to the same viewer and story.
3. Freeze `previous`, `frontier`, sorted items and `coverage` in a local **visit presentation snapshot**. This is transient UI display state, **not a duplicate owner of the canonical story Query cache**. Query remains the sole remote source owner.
4. When a new-events digest exists: render that compact digest with accurate `hasMore` and source links before submitting ACK. ACK only after the digest is visible to the user (or an explicit "Continue" / dismiss); prefer an explicit acknowledgment click in the first slice if the viewport/visibility gate is difficult to prove. If the user leaves instantly, no ACK and the next visit may conservatively repeat the digest. Never ACK because the URL route was prefetched.
5. When no new events and the current situation is foreground, ACK the captured frontier after committed render, without inventing a digest.
6. If the ACK fails or the browser closes, retain the previous persisted baseline. If ACK succeeds, do **not** clear the currently displayed digest until explicit dismissal/route exit. Subsequent opens reflect the updated shared checkpoint.
7. On background→foreground within the same continuously mounted visit, **do not** create a new "last opened" baseline that hides just-arrived events; show a "New developments available" badge and refresh current Now. A true route exit → later re-enter starts a fresh visit. Avoid treating every focus event as a new visit.
8. On viewer switch/log out, drop visit-local snapshot and Query keys immediately; no A data displayed under B, no cross-device localStorage checkpoint. Prefer React Query `useMutation` for ACK with `retry:0`; the ACK is idempotent and may be explicitly retried using the **same ackId**, not an arbitrary new request.

**Copy matrix**:

| State | Permitted visible copy |
| --- | --- |
| No prior verified checkpoint or partial unknown coverage | "Recent developments" |
| Trusted baseline, new events fit window | "Since you last opened this story" + source-backed facts |
| Trusted baseline, more than 20 new events | "Since you last opened this story" + "Showing the 20 most recent recorded developments; see more in Journal" |
| Trusted baseline, zero indexed new events, fresh read | "No new recorded developments since your last opening" (not "Nothing happened" or "Nothing progressed") |
| No successful fresh read | "Latest developments could not be checked. Showing your last verified story." |
| Story has new committed event during mounted visit | "New development available"; not an automatic read receipt |
| Different viewer | Own checkpoint only, never the prior viewer's list |

Change [return/Journal copy owner](../system/interaction-copy.md#return-digest-labels) and [return flow](../flows/return-and-memory.md#reliable-since-last-visit) only as far as real GM06 source can support. No status claim of implementation from this doc.

## 4. Persistence and concurrency

A minimal additive table is appropriate for the present **single-owner story model**:

~~~text
story_viewer_visit(
  story_id UUID not null FK story,
  viewer_id TEXT not null FK user,
  acknowledged_event_sequence BIGINT not null default 0,
  acknowledged_at TIMESTAMPTZ not null,
  updated_at TIMESTAMPTZ not null,
  primary key (story_id, viewer_id),
  check(sequence >= 0)
)
~~~

The ACK idempotency evidence can be a separate compact `story_viewer_visit_ack` record keyed by `(viewerId,storyId,ackId)`, or a bounded existing authenticated operation ledger if it can prove digest collisions/replays. Do not mutate `story.revision`, `story.viewVersion`, `story_public_event`, `story_resolution`, activity state, spending counters or world clock for a viewed checkpoint. Multi-player access remains *future authority*; a new membership model must recheck whether viewer can see all indexed events before reusing GM06.

**Ordering:** story public events are appended under the story writer lock in the same transaction as source; ACK is separate and may race. Database `max(stored,requested)` prevents decreasing the cursor. A new event that commits **after** read frontier but **before** ACK is **not** swallowed: its sequence is greater than ACK target and must appear on next opening. A late historical report gets a new public sequence when published, not a backdated sequence.

**Security/privacy:** private view metadata, no cross-user read receipts. Return only current viewer's value. No Admin observability or analytics correlation through this feature; no external provider calls. A malicious own-user ACK may move their own marker but cannot forge canonical events, another user's marker or billing.

## 5. Proof matrix / stop conditions

| Test | Required truth |
| --- | --- |
| New viewer, story with events 1..10 | GET shows Recent developments, no prior; on deliberate rendered ACK, server stores 10; no GET mutation |
| Later committed 11..13 | new GET returns frozen previous=10 and 11..13; ACK 13 never hides already rendered digest |
| Event 14 commits between GET/frontier 13 and ACK | ACK stays 13; event 14 remains new on next visit |
| Cross-device A at 10, B at 13, A late ACK 11 | persistent cursor stays 13; no false "read everything" claim |
| Hidden tab, SSR hydration, SSE, background Query, route prefetch | zero ACK calls, no marker advancement |
| Open 60 events | bounded 20 displayed with "more" and accurate source link; ACK is visit checkpoint not "read all" |
| Unauthenticated/foreign viewer, forged/stale token, mismatched UUID/source, future frontier | denial or safe no-op, no cursor changes |
| Duplicate ACK ID same payload / changed payload | idempotent replay vs conflict; no duplicate code-side game effects |
| Missing/partial GM05 coverage or old story | no false lifetime claims; incremental after recorded first open only |
| DB read outage / ACK timeout | clear error vs empty feed; repeat safe or re-GET; never invent absence |
| Two stories or account switch in same browser | no cross-viewer/client cache bleed |
| Provider disabled / current game progressing | no LLM invocation, no world clock/receipt mutation |

**Stop before Ready** if it is impossible to obtain a single consistent authorized `previous+frontier` read without corrupting event privacy, or if the existing React visibility model cannot safely distinguish a viewed route from prefetch. In that case ship **Recent developments** and postpone ACK, rather than turning a background GET into an automatic "read" flag.

**One bounded Change:** [GM06](../../changes/2026-11-13--gm-viewer-read-position/CHANGE.md). Implementation requires explicit owner permission for the additive migration, API, browser effect and disposable-DB tests. No paid calls or migrations authorized by this Markdown.
