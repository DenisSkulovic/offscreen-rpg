# Phase 3 | External UI and animation libraries: keep the dependency subordinate

**Status:** research comparison, no package selected. Current web: React 19, Next 16, Storybook 10; browser-safe scoped CSS and native controls are the baseline.

| Tool | Fits what | Why not automatically adopt |
| --- | --- | --- |
| **Native HTML/CSS** | Buttons, links, prose, lists, basic disclosure, basic eased transitions | More care required for complex menus/dialogs; no physical page curl |
| **Radix Primitives** | Unstyled, accessible complex dialog/menu/popover focus behavior | Adds dependency and wrapping complexity; use only for one real reader-menu need after focus test |
| **React Aria Components** | Unstyled control patterns and keyboard/screen-reader behavior | Broad library and API; do not mix multiple primitive systems without an explicit selection |
| **Motion for React** | Complex layout/gesture sequences and orchestration, with reduced-motion controls | Adds bundle/SSR/animation state surface; source/choice state must remain independent; CSS handles POC transitions |
| **OpenPageFlip / Gul Labs / StPageFlip** | Physical page-curl illusion | They do not solve source-aware pagination; can clone/manipulate DOM. Not in UI01–UI08. See [book engine boundary](../phase-2/09-BOOK-ENGINE-DEPENDENCY-BOUNDARY.md) |

**Sources checked 2026-11-17:** [Radix unstyled primitives](https://www.radix-ui.com/primitives/docs/overview/introduction), [Radix dropdown menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu), [React Aria Components](https://react-spectrum.adobe.com/react-aria/), [Motion for React](https://motion.dev/docs/react), [Motion reduced-motion config](https://motion.dev/docs/react-motion-config). These document API capabilities, not proven integration with this repo.

### Specific decision experiments

1. Native small in-book contents navigation: keyboard open/close, Tab, Shift+Tab, Escape, focus return, click outside, mobile touch, Back/Forward, story switch and no auto-command.
2. One Radix or React Aria menu implementation **only if native fails**, measured against the same test matrix. Pick **one** only, no general framework adoption.
3. CSS transition for published passage: do not animate on initial hydration, same-source refetch, Journal navigation, or pending generation. Reduced motion cancels. Only if UX needs exceed CSS should Motion be evaluated in a disposable Storybook fixture.
4. Removal drill: delete the dependency and replace it with a simpler implementation without rewriting story source, Query, choice-authority, or reader-navigation contracts.

### Motion vocabulary

Three distinct purposes: **orientation** (menu open/close, return to Now), **feedback** (acknowledged and pending statuses, without inventing completion), and **atmosphere** (rare slow drift/shimmer behind the book). Avoid gratuitous glow/pulse, shaking decisions, nonfunctional animated counters, fake clocks or an always-spinning world. Default is still; accessibility overrides at every layer.

**Current recommendation:** native/CSS first, selective unstyled accessible primitive if proven, Motion only conditionally, no flipbook package. Actual package adoption needs a small Change with tested removal/quality benefit. A pleasant-looking library demo is not enough.