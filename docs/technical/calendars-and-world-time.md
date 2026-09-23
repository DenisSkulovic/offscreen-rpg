# Calendars and consequential world time

Status: implemented and exercised provider-free. K1 projects bounded calendars from the canonical fictional-second coordinate; K2 handles controlling scenes and optional historical reports that do not hold play, including revisions, equal-boundary coalescing and a connected mixed-report/custom-calendar deadline rehearsal. The owner requested careful treatment of custom calendars, eras, seasonal consequences and time-limited plots on 2026-09-19 and reaffirmed optional calendars, seasons and celestial cycles on 2026-09-23. [Time and autonomy](../time-and-autonomy.md#calendars-seasons-and-story-deadlines) owns the product behavior, [fictional-time arithmetic](ticks-and-tags.md) owns the simulation coordinate, and [committed time](committed-time.md) owns permission to advance it.

K1 stores the immutable definition in versioned campaign settings, projects a public current label from the authoritative game second, formats durations, and supplies Storyteller tasks with only the compact projected value. The default is honest elapsed fictional time; setup may instead admit ordinal days or one fixed unequal-month repeating year. Pace revisions preserve the definition. This does not create scheduled effects, season mechanics, or another clock.

Current K1/K2 code uses explicit fictional seconds. The scheduler still wakes on fixed real-second steps, but changing the pace only changes how many fictional seconds eligible execution advances. Calendar definitions remain independent of playback speed.

## One chronology, optional ways of naming it

Persist simulation positions on the existing monotonically increasing campaign clock. A calendar is a deterministic, versioned interpretation of that coordinate. An era change or another planet's date label must not reset the clock, reorder receipts or rewrite elapsed activity time. Real scheduling timestamps stay separate.

| Responsibility | Example | Authority |
| --- | --- | --- |
| Simulation position/duration | Game second 81,240; action costs 120 fictional seconds | Clock and supported execution rules |
| Calendar projection | Day 47; 12 Frostfall, year 8 of the Lantern Era | Admitted calendar definition and epoch |
| World schedule | Winter conditions begin at game second K | Validated event/condition rule and due boundary |
| Knowledge of time | Player knows “before winter,” or an exact due date | Published evidence and visibility policy |

Changing pace alters none of the last three meanings; it changes eligible real waiting needed to reach a position. Calendar projection alone causes no effects, checks, narration or tasks. A scheduled world transition can matter even when the story displays only a day count.

## Small explicit calendar modes

The POC needs bounded data, not a calendar programming language:

- **Elapsed units:** use fictional seconds or a content-defined duration unit/cycle. No invented day, month, year or era. Suitable for abstract worlds and short stories.
- **Ordinal days:** positive integer `gameSecondsPerDay`, captured starting day and position within it. Show Day N with optional content-defined subdivisions. No months or leap rules required.
- **Named repeating year:** `gameSecondsPerDay`, ordered stable month IDs/labels with positive integer day counts, and an epoch stating which date and intra-day offset correspond to game second zero. The first implementation uses one fixed year pattern; month lengths may differ. Optional era label and initial year number provide the starting date without implementing historical period simulation.

Names are content; rules are structured validated data. Admit exactly one selected calendar and epoch per campaign initially. Set reasonable collection/length/numeric bounds in the owning schema. Check that supported boundaries are representable in whole fictional seconds and within arithmetic limits; introduce an explicit finer base unit only if a demonstrated world needs subsecond authority. A 30-hour fictional day is just a different defined duration, provided that world's hour is defined. No need to model its sun. A “day” can be a cultural cycle rather than a planetary rotation.

Do not calculate fictional dates with the host's Gregorian calendar, timezone, daylight-saving or Unix epoch. Database real timestamps remain useful for scheduling and audit. Pure game functions project game seconds to fictional dates and compile admitted fictional dates to game seconds using integer arithmetic. Reject invalid dates, unknown units and unsupported calendar semantics; never silently apply Earth defaults. Date projection must be deterministic across machines, restarts and provider models.

The calendar definition is immutable during an accepted campaign in the first cut. Store its ID/revision, epoch and exact parameters in the campaign's captured time definition; historical references retain that provenance. A future cosmetic relabel does not recompute due game seconds. Calendar reforms and history rewriting require their own explicit model, not a normal speed/settings save.

Canonical world packages may present a human-editable calendar document, descriptions of seasons and celestial lore, but executable projection comes from a bounded validated data object in that package or start manifest. Do not extract formulas from Markdown and do not load user-authored TypeScript or JavaScript. Import admits a supported definition and captures it into campaign settings; runtime projection then needs neither the source file nor a model. The Storyteller receives the projected current value plus only relevant descriptive sections. A start can therefore declare that game second zero is a particular day, month, year and era without making the model calculate later dates.

## Variable months, leap rules and eras

“Two months” is calendar arithmetic, not a fixed duration. Capture the reference date, calendar revision and operation (for example, preserve day-of-month while adding two month indices), validate the target, and convert the target date to a due game second once. Captured terms never slide forward whenever the story reloads or the Storyteller mentions them again. Preserve time of day unless the admitted contract explicitly specifies another boundary.

For the first named-year mode, adding months to a nonexistent day rejects. Content can choose an exact valid date or explicitly define end-of-month behavior in a later supported rule. Do not silently clamp day 31 into day 28 or approximate every month as thirty days. Recurring annual dates follow their declared recurrence rule and calendar version; they do not repeatedly add an average year length.

If leap days or variable year patterns become necessary, add one bounded deterministic rule family at a time (for example, a finite repeating sequence of year templates). An average year length is not an exact civil calendar rule. Leap cycles, intercalary days outside months and arbitrary calendar scripts are outside the first implementation, explicitly rejected when needed for computation. They can remain lore only when they do not make the offered durations/dates false. Such a world may instead select an honest ordinal view for the POC.

An era is a named date-numbering interval, not another clock or a required gameplay event. Starting in “Lantern Era, year 8” needs an epoch label/year offset. A later supported era transition would record a monotonic effective game second, new label and numbering origin; earlier receipts keep their original meaning. A catastrophe may cause an era change through an admitted rule, but the label itself cannot destroy a city or move time backwards. Multiple simultaneous civil calendars, calendar reforms, cross-planet conversion, time travel and relativistic clocks are deferred. All can map to a common ordering later without making today's stories depend on those systems.

Seasons, moon phases, tides, watches and other named cycles are optional projections, not mandatory fields on every calendar. Add a small declarative cycle family only when gameplay needs an exact phase: a stable identity, epoch offset, positive period in fictional seconds and ordered phase labels/boundaries. Two moons would be two independent admitted cycles projected at the same game second. Descriptive appearance belongs in canonical world content; phase calculation belongs in deterministic code. Orbital simulation, arbitrary formulas and a universal astronomy engine remain out of scope.

## Scheduled consequences, seasons and uncertainty

Time-sensitive gameplay needs an admitted world obligation independent of the character's current activity. A winter boundary, hard story deadline or festival has a stable identity, source/version, due game second, scope, supported consequence/condition change, follow-up classification and lifecycle. Player-visible descriptions/countdowns respect visibility. The exact execution ledger owns whether it fired; prose describing a date is insufficient.

A calendar can supply an annual season boundary, but seasonal effects are separate content rules. At the boundary, a supported rule may set a condition, block a prepared route or change an applicable modifier. No universal weather, agriculture, hunger or region simulator is implied. A long unpredictable winter can instead be a named current phase with an explicitly scheduled or condition-triggered transition; it need not follow month arithmetic. The first runtime covers exact finite due boundaries and supported effects; stochastic weather, adaptive long-range planning and general conditional-event graphs remain outside it.

Distinguish exact world authority from knowledge: a hidden scheduled arrival can have an exact private due game second; “the sage expects an arrival in roughly two months” may be only a claim. An estimate should retain its uncertainty/provenance and expose no fabricated exact countdown. A firm timed premise must be admitted as a structured deadline before its countdown is advertised. Deferral/postponement requires an explicit supported cause, recorded schedule revision and invalidation of stale wakes/preparations. Re-narration alone cannot reset a timer.

Creating or editing a schedule is an authorized world-state change proposed through existing bounded Storyteller/setup admission, not something a read or a prose parser does. For the first offline slice use authored structured schedules through the same validator. Reject a newly created deadline in the past; a rule firing now uses an explicit current-boundary operation. A genuinely existing overdue obligation after worker failure is recovery work, not a rejected new schedule.

The implemented K2a slice admits finite authored obligations at campaign start and compiles a game second or exact admitted calendar date once. One supported consequence sets a typed world condition and requests a controlling scene. Pending obligations are ordered by due game second and stable identity. Accepted finite actions and activities clamp their next wake to the nearest due game second; the obligation owns equality, so productive effects at the hard cutoff are not applied first. Firing changes the condition, appends a unique durable event and creates an independently owned campaign hold in the same transaction. Hidden schedules expose neither their identity nor due game second before firing; described schedules expose prose without a false countdown. K2b now transfers that exact hold to an existing consequence generation and then to the published decision; it does not add another narration workflow or let the model calculate time.

## Shared settlement and deadline collisions

World obligations join the existing campaign scheduler and lock. They never advance time independently. While accepted execution is eligible, the next meaningful boundary is the earliest of its rule boundary, a due world obligation, the accepted horizon and applicable controls. Reads cannot project beyond an unresolved controlling boundary. Re-anchor/clamp under the committed-time contract; the scheduler's next wall-time wake is derived and rescheduled when pace changes.

At each boundary, settle due world conditions/hard cutoffs first, then still-valid productive/action effects, activity occurrences and completion under the existing declared ordering. Use stable IDs/order for multiple obligations at one game second and explicit conflict rejection where effects cannot compose. The first hard deadline is exclusive: an objective due at game second K must be completed before K. An action reaching its own completion at K cannot receive a last-moment reward before the hard cutoff. Inclusive deadlines need an explicitly supported different rule, not queue delivery luck. Harmless seasonal changes may permit continuing execution after revalidation; a controlling arrival stops incompatible work at the boundary and requests one scene.

Do not complete three months of training and then notice that a two-month invasion was missed. Settle training only through the due game second, retain valid earned progress, commit the admitted world development once, and hold for its required presentation/decision. A finite action that overlaps a relevant world boundary is ineligible for precomputed narration unless its supported rule actually accounts for that boundary. Being non-cancellable by the player does not grant immunity to world interruptions.

The due event commits only established effects. A schedule requesting the Storyteller to stage a confrontation can commit the due trigger and hold; it cannot conjure unsupported enemies/combat merely because its label says “boss fight.” Required generation failure retains the controlling hold and the same event identity. An obligation classified as `report` records a source-frozen historical report task after committing its condition; generation and publication never create a hold, decision or current passage. Failure leaves the factual fallback visible without undoing the condition or blocking unrelated execution. Repeated worker delivery, save/reload and publication retry never fire the event twice. Coalesce a controlling turn when several controlling obligations share its boundary while preserving each independent mechanical receipt; report obligations retain independent hooks and budget accounting.

Long offline accepted plans process only meaningful boundaries in bounded batches; do not create a job per fictional day or month. Exhausted plan, manual pause, open choice or absent execution prevents progression toward future due game seconds. A deadline already reached by accepted execution must still settle through recovery. Real decision-response timeouts and provider quota reset times use their existing wall-clock owners and are unaffected by custom calendars.

## Worked example: two months to prepare

Illustrative calendar: Ember has 20 days, Rain has 35, Frost has 25; the year repeats those months. Day length is captured by the campaign. At Ember 10, adding two calendar months with a day-preserving rule produces Frost 10. The distance is 55 days: 20 days to Rain 10, then 35 to Frost 10. An exactly sixty-day deadline is different and must be authored as such.

Compile the deadline relative to the admitted source date/time, retain the calendar version and target date, and store the resulting due game second. The UI can show “55 days remaining” or the named date. Known estimated real waiting assumes uninterrupted execution at current pace; it cannot predict when the player will next select work.

An accepted 40-day preparation followed by a 20-day journey meets the deadline fifteen days into the journey, before arrival. A changed pace changes how long the player waits but not where the deadline interrupts. A player spending a real week reading the current menu spends none of those 55 fictional days. This is the intended time-budget pressure of the solo game; real-world urgency would require a separately agreed policy.

## Storyteller context and cost

Include the current authorized date/day/phase, the actual elapsed interval for the selected action, relevant admitted seasonal conditions and the nearest relevant known deadlines in a bounded temporal context packet. Keep private schedule truth in the proper authority scope. Do not transmit every era, calendar table, future event or historical date on every turn. Deterministic date conversion supplies normalized answers; a model is not asked to count month lengths or wake every dawn. Existing task resource limits bound context and any tools.

Historical passages retain source game seconds and time-definition provenance. Formatting is derived; changing UI labels cannot alter chronology. A Storyteller must not claim winter arrived, a deadline elapsed or two extra days passed unless the admitted state supports it. When a story only needs Day N, no month/era material enters its packet.

## QA evidence map

Core projection, deadline, revision and connected Frost Road cases are implemented and selected through the versioned QA catalogue. This table remains a living coverage map: cases without an available driver are targets, not claims of completed support.

| Case | Expected result |
| --- | --- |
| Ordinal-only abstract world | Progress and deadlines work with no months, sun, human hour or currency |
| Unequal month lengths | Ember 10 + two months = Frost 10, exactly 55 defined days |
| Invalid target date | Reject nonexistent date; no implicit clamping or silent Earth fallback |
| Midnight/year/starting-era display | Correct deterministic rollover without a clock reset or receipt reorder |
| Speed, pause and idle | Same due game second/date; real estimate changes with speed; held/idle time adds none |
| Winter boundary | A supported condition/route change occurs once at its due game second; labels alone cause no change |
| Long action crosses deadline | Stop/revalidate at the world boundary before terminal reward or prepared scene |
| Equal-boundary hard cutoff | Deadline settles before action completion under the exclusive policy |
| Offline chain/restart | Same ordered boundaries and receipts; no per-day jobs or duplicate event |
| Required turn unavailable | Due trigger and hold persist; recovery cannot postpone or refire it |
| Hidden/uncertain prophecy | Public context/countdown reveals only admitted knowledge; no invented precision |

Record execution/schedule/receipt IDs, source/calendar revision, target date and compiled game second, before/after clock and conditions, hold/generation state and provider usage class. These are mechanical evidence, not proof of compelling prose or rich seasonal world simulation.
