# Interface design craft: a professional decision manual

**Audience:** UX/visual designers, design-system stewards, UI critics, frontend architects and implementers. **Use for:** an important screen, new design direction, major visual revision, or a review of generic-looking UI. **Not for:** tiny CSS corrections or changes where the visual contract is already settled. This is development-agent expertise, not a new Offscreen RPG product requirement.

**Read selectively:** [Design brief](#1-form-a-visual-thesis) · [Information architecture](#2-select-the-right-interface-pattern) · [Hierarchy](#3-compose-attention-and-content) · [Design language](#4-type-color-spacing-and-surface) · [Interaction](#5-behavior-feedback-and-accessibility) · [Systems](#6-design-system-economics) · [Critique](#7-critique-before-implementation) · [Role evidence](#8-professional-handoff-and-proof).

## The governing model

Strong interface design is **deliberate allocation of attention, interaction effort, visual personality and complexity**. Components don't make a design good merely by being attractive. A capable model knows typography and layout, yet its first draft often defaults to familiar dashboards, pastel cards and gradients because nothing forced it to make a differentiated choice.

There is no universal best style. Editorial, cinematic, conversational, dense utilitarian and spatial interfaces serve different users, media and workflows. The designer's job is to find the *conditions under which a particular approach wins*, choose coherently, and identify what to leave out.

## 1. Form a visual thesis

Before choosing components, identify:

| Decision dimension | Why it affects the design | Evidence to seek |
| --- | --- | --- |
| Primary user task | Reading, choosing, monitoring and editing need different density | Actual task and frequency |
| Content shape | Long narrative, tables, tiny status, choices and empty states behave differently | Realistic representative content |
| Tone and personality | Technical, literary, playful, uncanny or calm visual languages send different signals | Product vision and approved experience |
| Attention priority | What must be noticed first, next and only on demand? | One-sentence hierarchy |
| Device/environment | Narrow phone, desktop reading, keyboard, touch and reduced motion | Viewport and interaction scenarios |
| Frequency and expertise | Daily repetitive operation differs from occasional immersive return | Usage model |
| Existing system | New typography/tokens may fragment the product | Components and style inventory |
| Budget and maintainability | Custom illustrations, complex motion and bespoke widgets cost engineering effort | Implementation and asset constraints |

Produce **one sentence of visual direction with consequences**, not “make it sleek and premium.” Example: *a quiet journal where the current scene reads like a chapter, decisions are unmistakable, and mechanics are disclosed when asked*. This suggests reading measure, spacing, hierarchy, component emphasis and deliberate omissions. It does not decide whether that direction is approved for the game.

## 2. Select the right interface pattern

| Pattern | Good fit | Trade-offs or conditions that reverse the choice |
| --- | --- | --- |
| Focused reading column | Narrative, reflection, sequential decisions | Harder to compare many simultaneous tasks |
| Primary canvas + inspector | One central scene with optional structured details | Sidebar can steal space or collapse poorly on mobile |
| Timeline/journal | History, provenance and continuity over time | Can bury the present decision under past events |
| Conversational interface | Frequent short exchanges and direct dialogue | Long-term state, chronology and settings may become invisible |
| Tabs/workspaces | Several separable jobs with recognizable categories | Hidden cross-tab relationships and route-state loss |
| Dashboard | Monitoring many changing measures | Often wrong for experiential/immersive work |
| Spatial/cinematic interface | Strong environmental immersion and navigational geography | Asset loading, abstraction, accessibility and unusual worlds |
| Progressive disclosure | Keeps first view approachable | Can conceal necessary status or create excessive navigation |

Ask which pattern best supports **the next meaningful user action**, and which information must remain accessible without dominating the screen. A hybrid may be appropriate; “mix them all” isn't a design rationale.

For Offscreen RPG, don't assume every world uses a human body, inventory, combat, a map or medieval atmosphere. Product authority: [player experience](../../docs/player-experience.md), [storytelling](../../docs/storytelling.md). This manual supplies options, not game rules.

## 3. Compose attention and content

A useful general hierarchy is **orientation → primary content → primary action → supporting state → optional history/settings**. A pending, blocked or dangerous state may legitimately interrupt that order. Hierarchy is expressed through position, reading measure, scale, contrast, grouping, typography and whitespace rather than color alone.

- Build **alignment and spatial rhythm** at screen level before polishing local cards.
- Ensure one main action reads as primary. Five equal-weight “primary” buttons make none primary.
- Give related content proximity. Don't scatter one decision across three panels merely to fill columns.
- Use whitespace intentionally. Too little is noise; too much separates related controls.
- Test composition with **long genuine text**, missing values, error states, a small viewport and a very wide one.
- A responsive layout isn't a desktop design compressed into 375 pixels. Reprioritize what is visible and where navigation lives.
- Do not automatically fill every empty area. Silence can support focus.

### Design pattern selection is a trade-off

An inspector beside a narrative may improve discoverability of time and possessions, but reduce reading comfort. A drawer can restore narrative focus, but make state harder to notice. Choose based on whether the user consults that state every decision, occasionally, or only when uncertainty arises. Both can be valid under different usage patterns.

## 4. Type, color, spacing and surface

**Typography:** distinguish display identity, long-form body, control labels, supporting metadata and numerical values. Consider line length, line-height, contrast, language coverage, performance and licensing. A dramatic display font may be excellent for a title and terrible for extended paragraphs. Monospace may suit precise receipts, not every narrative sentence.

**Color:** create *semantic* roles: primary and secondary surfaces, foreground, muted information, actionable accent, selection, warning, error, success and pending. Mood and semantics can coexist. Contrast is about readability, not making every component equally loud. Check both light/dark renderings when relevant; don't simply invert a palette.

**Spacing:** use a small coherent rhythm and meaningful layout constraints. A component system becomes easier to maintain when repeated gaps and radii have clear purposes. Don't enforce identical card treatment for fundamentally different information roles.

**Visual metaphor:** texture, depth, illustration, glass, gradients and motion may strengthen a direction. They may also introduce rendering cost, noise or generic visual clichés. These are **tools, not forbidden styles**. Ask: *what does this treatment communicate that a simpler alternative would not?*

**Deliberate anti-default check:** if the design could be rebranded unchanged for a bank, recipe app and narrative RPG, the design probably lacks a subject-specific point of view.

## 5. Behavior, feedback and accessibility

A beautiful static screen can still be an incoherent interaction. Distinguish:

| Moment | Design responsibility | Typical mistake |
| --- | --- | --- |
| Before submission | Clear affordance, eligibility and consequences | Action looks available but cannot be used |
| Request in flight | Honest progress and no duplicate confusion | Spinner replaces all useful content |
| Command accepted | Acknowledge acceptance, preserve context | Announce finished business effect prematurely |
| Result settled | Show the committed new situation | Optimistic fiction shown as fact |
| Error / conflict | Explain the condition and available recovery | Generic toast or destructive automatic retry |
| Uncertain external outcome | Avoid fabricated certainty | “Try again” could repeat a paid side effect |
| Return after absence | Orientation, recap and present decision | Dense chronology replaces the story |

Motion should express causality or tone; it has latency, comfort and accessibility costs. Respect reduced-motion preferences. Keyboard focus, target size, semantic controls, labels and announcements are part of design quality, not optional backend chores.

Check [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) and [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/) for applicable details. React state, concurrency and server authority belong to [frontend state knowledge](frontend-state-and-async.md), not to a visual critique alone.

## 6. Design-system economics

A design system is a **repeatable vocabulary of decisions**: type scale, spacing, surfaces, color roles, component states and interaction conventions. It is not a requirement to abstract every screen element into a universal React component.

| Choice | Benefits | Costs |
| --- | --- | --- |
| Reuse a proven component | Consistency and lower maintenance | May weaken the signature experience |
| Introduce a component variant | Encodes repeated meaningful difference | Too many flags and variants become a maze |
| Bespoke high-value region | Strong subject-specific expression | Accessibility, maintenance, test and responsive burden |
| Central token update | Improves coherence across the app | Can silently change unrelated screens |
| New design library | Fast known building blocks | Styling, bundle, migration and customization trade-offs |

Use a custom design exception where **experience value justifies ownership cost**. Prefer accessible semantic primitives to clever widgets without keyboard behavior. Refactor a shared component after repeated need, not because a model enjoys creating abstractions.

## 7. Critique before implementation

The first plausible visual idea is a candidate, not an accepted outcome.

1. Derive the task, content, tone and constraints from product authority.
2. Produce **two actually different visual directions**. Two accent colors for the same layout don't count.
3. Compare their hierarchy, reading behavior, density, maintenance and responsive implications.
4. Choose a direction conditionally, stating what would reverse that choice.
5. Specify what is **deliberately omitted**, secondary or progressively disclosed.
6. Challenge the design with unusual actual content, narrow screen, keyboard flow, loading/blocked/uncertain state.
7. Hand the approved direction to the frontend implementer, keeping actual data/permission semantics explicit.

**Example:** A designer proposes sidebar + central scene card + right statistics column + floating progress indicator. It may be excellent for a simulation manager, but wrong if the player visits occasionally to inhabit one scene and choose one action. Compare a reading-first layout with collapsible state. Reverse the preference if the product becomes a multi-character planning console. A professional critique explains *why*.

## 8. Professional handoff and proof

| Role | Evidence required to progress |
| --- | --- |
| Product/interaction designer | Actual task, journey, hierarchy, approved state semantics |
| Visual designer | Chosen visual thesis, distinct alternative, composition/type/color approach |
| Independent critic | One credible competing hierarchy, a content/state stress case and recommendation |
| Design-system steward | Reuse/exception choice with maintenance implications |
| Frontend implementer | Specific components and accepted visual contract, not “make it pretty” |
| A11y reviewer | Keyboard, focus, semantics, contrast and recovery evidence |
| Visual acceptance reviewer | **Rendered** desktop/mobile content, actual long/error/pending states, human judgment |

A screenshot cannot prove backend correctness; a TypeScript build cannot prove taste or usability. The reviewer should report the evidence it actually observed.

### Further study

- [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): good illustration of deliberate art direction rather than template aesthetics.
- [Study: frontend architecture beyond components](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE240-frontend-engineering/SE240-L02-frontend-architecture-beyond-components.md): boundaries and design-system economics.
- [Study: React production design](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE250-react-engineering/SE250-L05-react-in-production-spas-nextjs-and-server-rendering.md): how interface decisions affect implementation.

**Status:** professional reference, not an approved new visual direction or a claim that current UI meets these standards. Load the needed section only for meaningful design/critique work.
