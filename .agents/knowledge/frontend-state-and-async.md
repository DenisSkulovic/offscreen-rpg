# Frontend state and asynchronous correctness: field manual

**Audience:** React/Next.js architects, implementers, independent reviewers, test strategists and UX-state designers. **Trigger:** changing identity-scoped UI state, fetches, subscriptions, forms, mutations, loading/recovery or client/server boundaries. **Not:** routine static styling. This is engineering knowledge, **not** new game product requirements.

**Navigate:** [ownership](#1-state-inventory-before-library-choice) · [Effects](#2-effects-are-lifetimes-not-generic-event-handlers) · [two race defects](#3-races-can-break-update-authority-and-display-consistency) · [cache](#4-server-state-is-a-cache-with-identity) · [optimistic updates](#5-mutations-and-optimism-are-temporary-claims) · [SSR and security](#6-rendering-and-identity-boundaries) · [testing](#7-adversarial-proof-matrix).

## Central engineering model

A React render reflects **one snapshot** of component state. The server may change independently. An asynchronous response can arrive after its initiating render is obsolete. Query caches, UI drafts and URL state have different authorities and lifetimes.

A polished component can still present the wrong story, accept two incompatible operations, roll back a valid mutation, expose a previous user's data, or declare something complete that the server only scheduled. These defects are invisible to a happy-path screenshot and often to a unit test that only checks rendering.

## 1. State inventory before library choice

Classify every nontrivial value before deciding on Context, `useState`, a query library, an Effect or an API route.

| Ask                        | Why it is diagnostic                                                | Common wrong shortcut                                    |
| -------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| **Who is authoritative?**  | Browser draft, URL, application DB, provider and worker differ      | “It is in React state, so React owns it”                 |
| **What is its identity?**  | User, tenant, story, operation ID, route and version can all matter | A cache key containing only `"story"`                    |
| **How long does it live?** | Render vs mount vs navigation vs authenticated session              | A single global state store for everything               |
| **Who may update it?**     | Local edit, backend mutation, another browser tab or worker         | Any fetch callback calls `setState`                      |
| **What invalidates it?**   | Logout, story change, later revision, failed command, time          | “It was just fetched, so it's still true”                |
| **Who consumes it?**       | One component vs multiple screens vs server                         | Duplicate local mirrors with no synchronization contract |

An example inventory for this repo:

| Value                      | Authority                  | Identity/lifetime                    | UI responsibility                       |
| -------------------------- | -------------------------- | ------------------------------------ | --------------------------------------- |
| Selected screen/tab        | Local UI                   | Component/route                      | Render selection                        |
| Story chosen by route      | URL + server authorization | Authenticated story ID               | Load the correct projection             |
| Published story snapshot   | Application/database       | Story ID and view/resolution version | Display truthful current state          |
| Prepared action            | Application admission      | Exact operation and story revision   | Show accepted/pending, not settled      |
| Draft form                 | User editing               | Draft ID, unsaved revision           | Preserve local edits, explicitly commit |
| Notification/worker status | Server state               | Operation ID and version             | Don't infer success from a spinner      |

**Architecture alternative:** Local state is good for short-lived interaction; query cache/framework loader is good for repeated server-state reads; URL is good for navigable filters; server remains authority for committed results. None of these automatically replaces the others.

### A design smell

An agent says “we'll use global context to share server data” without defining its invalidation and user identity. That solves prop drilling while creating a new stale-data synchronization problem. The first review should demand a state inventory, not another library recommendation.

## 2. Effects are lifetimes, not generic event handlers

An Effect manages synchronization with an **external relationship** after render: subscriptions, DOM widgets and sometimes fetching. Its dependencies say which values affect the agreement; cleanup closes the previous agreement.

| Operation                             | Usually belongs in                          | What goes wrong otherwise                                     |
| ------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| Derive visible total or filtered list | Render/memoized calculation                 | Effect creates redundant stale state and extra passes         |
| Submit player-selected command        | Explicit event handler and server operation | Effect may rerun on remount and repeat an irreversible action |
| Subscribe to story/status updates     | Effect with cleanup and correct identity    | Old event source survives a route or login change             |
| Reset a new entity's form             | Deliberate identity/key or state transition | Old entity's values remain in the new form                    |
| Fetch reusable server-state           | Framework/query lifecycle or scoped Effect  | DIY fetch duplicates request races, caching and retry policy  |

**Stale closure:** A timer callback that captured `count = 0` does not magically see later state. A functional updater is appropriate for increments based on prior state. For callbacks that need changing external values, reconsider the subscription's lifetime or a deliberate current-value mechanism.

**Unstable dependencies:** A new options object on every render can restart a WebSocket Effect repeatedly. The fix is to stabilize/construct inputs at the correct boundary, not silence the dependency linter.

**Strict Mode:** Development `setup → cleanup → setup` often reveals a missing cleanup. A `useRef` “only connect once” guard can hide the leak by skipping the re-setup after cleanup. The required property is a correctly synchronized external relationship after _any_ mount sequence, not “console printed connect only once.”

**Irreversible operations:** An Effect should not directly charge money or commit a player command merely because the component mounted. Use an intentional event/command and durable server idempotency. Even a perfectly cleaned-up Effect cannot undo an external payment.

Deep study: [SE250-L02 Effects, closures and component lifecycles](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE250-react-engineering/SE250-L02-effects-closures-and-component-lifecycles.md). Primary: [React Effects](https://react.dev/learn/synchronizing-with-effects) and [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).

## 3. Races can break update authority AND display consistency

**Case:** Story A is open, the user switches to B, and both route requests complete in the wrong order.

```text
T0  selected=A ; fetch(A) starts
T1  selected=B ; fetch(B) starts
T2  fetch(B) returns and displays B
T3  fetch(A) returns and overwrites B
```

The obvious fix is to abort A. That is useful, but **does not solve every problem**.

**Failure A, obsolete callback:** A is no longer authorized to update the current entity. Use ignore/abort, generation identity, cache-key ownership or guarded update. A transport abort is not a guarantee that a server-side effect didn't happen.

**Failure B, misattributed old display:** Between T1 and T2, the UI may already show B's title but retain A's earlier state. Even if A never completes late, the UI is lying. **Pair data with its identity** and render only if the identity matches the selection; otherwise show pending or clearly labeled previous data.

**Failure C, same-entity version regression:** Both replies belong to A, but a delayed version 12 arrives after version 13. Story ID alone cannot prevent regression. Compare authoritative version/revision before replacing the snapshot. In this repository, [`preferNewerSnapshot`](../../apps/web/src/lib/story-transport.ts) is an existing implementation owner; do not invent a second policy in an unrelated component.

**Failure D, cross-user contamination:** User 1 logs out, user 2 logs in, and the first user's response/cache remains visible. Cache ownership, auth-context partitioning and logout invalidation matter in addition to server authorization. **Client filtering is not an authorization control.**

**Review question:** For every async result, _which entity/session/version made it legitimate and at what event does it become stale?_ A correct dependency array is not an answer.

### A negative test that catches both A and B

1. Start fetching A.
2. Select B while A is still pending; assert A's old content is **not shown under B's identity**.
3. Resolve B; assert B becomes authoritative.
4. Resolve A; assert B remains authoritative.
5. Resolve two B revisions out of order; assert the higher authoritative version survives.

A test that only checks final B after both promises are settled can miss the transient display lie.

## 4. Server state is a cache with identity

Server-owned data can change while the component is doing nothing. A cached result therefore needs a **key**, freshness rule, version/invalidity policy and response to writes.

- **Query identity:** all variables that change the data need to be represented appropriately (story ID, filters, auth/tenant context, source revision). The correct key depends on cache isolation guarantees; don't blindly append secrets to keys.
- **Freshness is not authority:** a response fetched milliseconds ago may be stale immediately after a concurrent server update. Versioned mutations and server ownership remain necessary.
- **Invalidation:** A successful mutation may change list, detail and history views. Updating one query doesn't magically update every denormalized projection.
- **Cross-tab operations:** UI disablement in one tab cannot prevent duplicate commands in a second tab. The backend owns the operation fence.
- **Waterfalls:** fetching data inside several nested component Effects can serialize queries unnecessarily. Check framework/server loaders and shared caches before writing manual orchestration.
- **Privacy:** logout and user changes must invalidate/partition private client caches. The API must independently enforce access at every request.

A locally managed Effect can be sufficient for one isolated read. A shared query cache becomes useful when readers, invalidations and navigation lifetimes grow. Choose by _correctness and observable cost_, not fashion.

Deep study: [SE250-L03 State, data fetching and architecture](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE250-react-engineering/SE250-L03-state-data-fetching-and-real-application-architecture.md).

## 5. Mutations and optimism are temporary claims

A mutation can be **submitted, accepted, pending, rejected, completed or uncertain**. A UI that reduces this to `loading/success/error` may claim a complete business outcome when the server merely enqueued work.

```text
User intent → submitting → accepted/queued → settlement pending → published result
                             ↘ known failure / conflict / uncertain external effect
```

“Optimistic update” means displaying an assumption, **not changing authority**.

### The overlapping rollback trap

```text
T0 cache = quantity 1
T1 optimistic M1 displays 2
T2 optimistic M2 displays 3
T3 M2 succeeds with confirmed quantity 3
T4 M1 fails; naive rollback restores snapshot 1
```

The rollback erased M2's legitimate result. The usual fix “snapshot before mutation and restore on error” is not enough for **concurrent** optimistic operations.

Options: avoid shared optimistic state and show pending locally; serialize conflicting mutations; revalidate from the server; or use operation/version-aware optimistic reconciliation. The right choice depends on desired UX and concurrency expectations. For most expensive/irreversible effects, an honest pending view is cheaper and safer than sophisticated temporary fiction.

### Form lifecycle traps

- Draft edits and server-confirmed values are different states.
- Replacing form state on every refetch can erase unsaved user input.
- Resetting for a different entity must not leak old hidden fields into its submission.
- A stale-version conflict needs a legitimate refresh/resolve story; not every error is a “try again” toast.
- “Disable the submit button” is UX protection, not server deduplication.
- A retry must carry the original intent identity when the API expects idempotent replay, or must explicitly establish a new intent where allowed.

## 6. Rendering and identity boundaries

**Next.js Server/Client:** `'use client'` changes the module import boundary. Check what data becomes serializable browser props, what stays server-only, and how session/owner authorization is enforced. A private plan isn't safe to disclose merely because its field has a Zod type.

**Hydration:** Rendering a date, currency or random/default value differently server-side and client-side can produce mismatch. Fix by choosing stable serialization and deliberate locale/time handling, not suppressing warnings without understanding the semantics.

**Subscriptions:** Focus, SSE, listeners, timers and event subscriptions must be released on unmount and identity changes. A listener can continue to mutate state after the component that installed it has become irrelevant.

**Accessibility and actual UX:** Keyboard focus, busy states, disabled actions, live updates, long text, mobile sizes and errors need actual rendered review. A good TypeScript build does not show whether the user can understand the pending/uncertain state.

Project sources: [Web workspace map](../../apps/web/README.md), [player experience](../../docs/player-experience.md), [technical client/identity](../../docs/technical/client-and-identity.md).

## 7. Adversarial proof matrix

| Scenario                             | Deliberate order or condition                       | What must not happen                                   | Evidence level                    |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| Different entity, reversed responses | A pending → B selected → B resolves → A resolves    | A overwrites B                                         | Deterministic frontend test       |
| Transient identity mismatch          | A is shown → switch to B before B loads             | A data labeled as B                                    | Render-state assertion            |
| Same entity, older version           | v13 then late v12                                   | v12 replaces v13                                       | Snapshot merge test               |
| Session switch                       | user 1 pending → logout/login user 2 → old response | Cross-user data appears                                | Auth/cache integration            |
| Concurrent optimistic mutations      | M1, M2 overlap; M2 succeeds; M1 fails               | Failed M1 rollback erases M2                           | Controlled mutation-order test    |
| Duplicate click/tabs                 | Two submissions for same intent                     | Double business effect                                 | Server idempotency integration    |
| Strict Mode remount                  | Connect → cleanup → connect                         | Leaked subscription or permanently disconnected widget | Effect lifecycle test             |
| Accepted but not settled             | Enqueue acknowledged, worker still pending          | UI announces earned reward/final completion            | UI state + server transition test |
| Long prose and focus                 | Open error/blocked state on narrow viewport         | Invisible recovery, lost keyboard focus                | Browser/human acceptance          |

**Role proof obligations:**

- Product/UX designer: precisely distinguish accepted, pending, blocked, failed, uncertain and settled in player-visible language.
- React architect: provide state authority/identity/lifetime inventory and at least one credible concurrency timeline.
- Implementer: preserve approved semantics, do not invent a second version policy, run narrowly relevant checks.
- Frontend reviewer: find an _independent_ stale/identity/rollback counterexample, not “hooks look good.”
- Test strategist: select 2–4 scenarios that would fail under a plausible wrong implementation.
- Visual reviewer: actual browser evidence; do not certify usability from source.

**This manual should not be loaded for every JSX file.** The relevant skill loads it when a consequential state/lifecycle decision or review warrants it. Its deep links are optional, not the next mandatory reading step.
