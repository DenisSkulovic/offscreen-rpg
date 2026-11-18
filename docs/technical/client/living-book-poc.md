# Living Book POC | Client implementation target and source boundaries

**State:** SELECTED **POC technical target** (2026-11-17), **not implemented by this document**. Final visual design, adaptive rich-text publication, source-level page pagination and page-curl driver remain separate design work. **Product authority:** [Living Book POC](../../product/experience/living-book-poc.md). **Core client authority retained:** [architecture](architecture.md), [state/server boundary](state-and-server-boundary.md), [interaction](interaction-contracts.md), [accessibility/performance](accessibility-and-performance.md), and [presentation V1](presentation-runtime.md).

**Owns:** the bounded Next/React reader shell, view/navigation states, source-to-visual-leaf safety and integration policy for the *first* POC only. It does not authorize changing engine mechanics, Storyteller generation, history read APIs, transport, saved passage schema or developer tooling.

## Source-based starting point (verified GitHub main `7c2fd93a08b718e956a66cdf963ed6ad238a4723`)

- `apps/web/src/features/play/view.tsx`: `PlayScene` holds TanStack Query snapshot, reconciles SSE/GET, renders `StoryFrame` with current V1 title/paragraphs, legitimate legacy options and campaign `CampaignPlay`, waiting/recovery and settings. Its `journalHref='#story-journal'` currently targets history inside the `details` prop.
- `apps/web/src/features/play/ui/story-frame.tsx` + `story-frame.css`: present UX01/UX02 stage and top chrome, appearance resolver consumer, narrative, option region and secondary Details. **Presentation-only, not owner of Query or commands**.
- `apps/web/src/features/play/ui/narrative-passage.tsx`, `intention-choice.tsx`, `scene-media.tsx`: original V1 source presentation, protected option behavior and optional validated inline image.
- `apps/web/src/features/play/history.tsx`: `StoryHistoryView` loads authenticated latest-first history on demand through a viewer/story-keyed `useInfiniteQuery`, rendering original source paragraphs, numeric `before` cursor.
- `apps/web/src/features/play/ui/campaign-offer.tsx`: campaign offers include **explore/back vs commit**, using `useOfferPath` keyed by offer identity and the existing campaign-command owner.
- `packages/contracts/src/stories.ts`: V1 passage content `{version:1,title,paragraphs}` (1–10, each 1–6000 chars); history record `{id,sequence,content}` capped at 20/page; current snapshot optional validated `appearance`. No rich block AST, historic choice or original artistic look in history.
- `apps/web/src/shared/api/story-history-query.ts`: `storyHistoryInfiniteOptions` owns the existing reader source; do not create another cache or guess random history seek.

**Reinspection gate:** Cursor must fetch the latest HEAD/source/dirty state before the first code edit; it may differ from this dated source basis.

**BOOK01 shell, source after the selected Change:** `StoryFrame` no longer renders `story-frame__chrome`. The player-facing surface is `.story-frame__book`: a stable paper leaf on the existing dark stage, with an in-book contents nav (`← Stories`, `Now`, `Journal`). `#story-frame-now` and `#story-journal` are hash leaves. Journal is `StoryHistoryView`, not a collapsed Details section. Settings and technical details stay in that quiet disclosure. One flowing leaf is the POC geometry; there is no page-curl and no word-level paginator. Appearance may still tint the viewport atmosphere. The book page keeps its own ink. This paragraph records the landed shell. It does not accept final art direction.

## Proposed package/component boundary, implement only what proves useful

~~~text
PlayScene  (unchanged remote truth + mutations + SSE)
  └─ StoryFrame / BookReaderShell (presentation only)
      ├─ Atmosphere (existing validated appearance or neutral, decorative)
      ├─ Book identity + small discoverable Contents control
      ├─ Now (current exact V1 prose + existing status/wait/recovery)
      │   └─ Current verified interaction: legacy choices OR campaign offer
      ├─ Journal (existing authenticated read-only history query)
      └─ Optional out-of-fiction Settings/technical disclosure
~~~

**Avoid a premature component library.** A `BookReaderShell`, small `BookContents`, `BookLeaf` or `BookReaderView` is justified only if it carries a testable responsibility. Reuse existing `NarrativePassage`, `IntentionChoice`, `CampaignPlay` and status/recovery components; do not fork their command logic. Names above are logical seams, not mandated filenames or class names.

Keep one current validated Query snapshot, one command owner and one history infinite query. UI state may include `mode: 'now' | 'journal'` and a local historical selection; it must not be a second story cache. Entity/story change clears old reader content and control targets. A historical passage component **never accepts live command callbacks**.

## Physical geometry: minimum POC promise

- Recognizable stable **book** surrounds the reading content, with restrained stage atmosphere behind it. The default page must look intentional even without an image or Storyteller direction.
- **Do not require a fully automatic paginator in POC01/02.** The semantic original article is rendered completely, in DOM order. On desktop use facing/paired visual leaves **only** where source text/options fit without clipping or unannounced omitted content. A focused continuous leaf is acceptable for long text or complex status. On narrow/mobile and user-enlarged text, a single naturally flowing leaf is mandatory.
- **No inner-scroll prison** for choices. The question and the full eligible option set form one coherent block (may extend with document scroll). Preserve current disabled/blocked/uncertain semantics and use native controls.
- No fixed page-number bookmark; if retaining reader location initially, use `storyId + passageId` plus local scroll/paragraph anchor. Treat physical page indices as ephemeral and *never* durable in backend, Query keys or story models.
- A POC may use instant leaf switching or a very modest CSS transition. **No page-flip dependency or animation-backed source layout.** Reduced motion/continuous reading must remain functional without transition code.
- Backdrop is decorative `aria-hidden` and `pointer-events:none`. V1 directive may influence approved atmosphere but not book source, system focus/contrast, command eligibility or DOM semantics.

## Now ↔ Journal navigation (POC)

The current `#story-journal` sitting **inside collapsed Details** is not adequate as the primary Journal destination. Move Journal visibility into an in-book, keyboard-operable *primary* view, while keeping technical/administrative details in a quiet secondary disclosure. The contents affordance must make Now and Journal discoverable; it must not be a giant developer control bar.

**Chosen POC identity:** story remains `/play/:id`; Now/Journal may be represented with native fragments `#story-frame-now` and `#story-journal`, with client view-state synchronized to fragment changes and Back/Forward. The implementation must correctly handle initial direct load, menu dismissal, focus, and history navigation. Do not introduce new Nest APIs or a second authenticated route simply to draw a book. A later real passage deep link is **not** falsely promised by this mechanism.

The initial POC may render a straightforward source list before the more focused original reader in the second Change, but Journal is never locked behind a generic Details accordion. In Journal, past source choices are inert. An explicit "Return to Now" should re-read the latest authorized snapshot in the existing Query flow when necessary; the old historic cursor cannot become gameplay state.

**Accessibility caveat:** if hash-state complexity makes initial SSR/keyboard behavior unreliable, a small semantically equivalent in-book mode navigation with a *tested* URL state may be chosen, but it must not invent a new backend command or depend on stored physical page numbers. Record the deviation in the implementation Change review before proceeding.

## Data and command invariants

- `PlayScene` remains the sole remote-story owner; no local duplicate copy of `StorySnapshot`. Hydration and a stale SSE hint stay in [Commands and hints](state-and-server-boundary.md#commands-and-hints). Scene style stays in [Tokens](semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette).
- `useResolutionCommand`, `useControlCommand`, `CampaignPlay` frozen intents and `writeStorySnapshot` reconciliation stay unchanged except for presentation-safe wiring. New book navigation never calls mutation.
- An offer changing while a reader is in Journal or mid-navigation invalidates stale handlers. Current campaign offer path already resets by offer identity and **must not** reset/duplicate a frozen command recovery.
- A new published passage updates the latest Now without changing the text inside a historical reader. Presentation may announce a genuine new publication without claiming current choice is now on the old page.
- A cached foreign story/viewer projection never flashes under the new story's book. Clearing on resource identity and Query privacy remains as selected architecture.
- A validated current appearance document is optional; corrupt/missing direction falls back to safe neutral book. Late image, pending narration and failed provider cannot block or rewrite original text.
- Historical items come from `storyHistoryInfiniteOptions` only, with real nextBefore and 20-item page limit. No synthetic seek/search, fabricated summarization, other user's private history, historical choice reroll or "since you left" invented claim.

## Two bounded implementation outcomes, not one giant frontend rewrite

### BOOK01: Book shell and current Now composition

Replace existing `StoryFrame` top-chrome/status-dominant layout with a recognizable low-chrome book presentation; preserve `PlayScene`, all valid source, choices, waiting/recovery and optional current V1 presentation. Make in-book primary Journal/Now navigation reachable, and relocate the *existing* history view out of generic collapsed Details without rebuilding history query or a richer history reader. Maintain neutral/continuous accessibility fallback. See separately proposed [BOOK01 Change](../../../work/changes/open/2026-11-17--book01-reader-shell-poc/CHANGE.md).

### BOOK02: Read-only original-passage Journal

`StoryHistoryView` is that reader: compact overview rows, one exact saved passage, and previous/next only inside the loaded authorized set. Load older uses the existing numeric `before` cursor. There is no new history API, arbitrary jump, search, or derived summary. See [BOOK02 Change](../../../work/changes/open/2026-11-17--book02-original-journal-reader/CHANGE.md).

Both are **independent code-review outcomes**, sequenced BOOK01 → BOOK02. What has landed, and that the queue currently has no selected Change, is recorded in [STATUS](../../../STATUS.md) and the [change queue](../../../work/changes/README.md). This page does not select a Change.

## POC test and human acceptance bar

- Pure/component RTL + user-event for book mode/contents/Journal/return, legacy choice ID, campaign explore/back/commit and stale-offer reset; test all statuses.
- At 320/375/768/1440px and 100/200% text preferences (plus actual browser zoom on targeted cases), no horizontal overflow, prose loss, clipped option group or focus trap. One 6000-char paragraph, ten paragraphs, no artwork, six choices, abstract fictional setting.
- SSR meaningful original passage before hydration, initial Now and direct Journal URL behavior tested; no duplicate query/store, no auto-POST from mount/resize/turn/refresh.
- Read-only history: open newest 20, fetch next page once, inspect original, return to Now. No extra/changed record, no reading-side mutation.
- Negative traces: 202 accepted but not published, ambiguous provider use, 409/reconciliation, A→B story switch, new passage while historical reader open, removed permission and missing appearance.
- Axe + keyboard focus pass, reduced motion, large text, touch vs text selection. Record any missed human acceptance explicitly; no claim of WCAG conformance from smoke tests.

**Allowed implementation verification:** existing `pnpm test:fast`, targeted Vitest/RTL tests, `pnpm exec turbo run test --filter=@offscreen/web` as supported, actual Next build and Playwright smoke on a safe provider-free fixture. No production provider spending, DB reset or default-worker modification. Source-specific commands must be checked before execution.

## What this spec does not select

No final design system, font files, third-party flipbook, physics page turning, browser-canvas generated imagery, semantic narrative score V2, archive random seek, bookmarks synced across devices, user Replay/forks, modifications to engine/provider schemas, or aesthetic approval of developer prototypes.

This POC is a **reversible presentation evolution**. If book geometry ever competes with the integrity of text and interaction, keep the story usable as continuous reading and postpone page physics.
