# Calendars and consequential world deadlines

Status: K1 and the controlling K2 journey are implemented and exercised offline; optional non-controlling obligation reports remain before feature closeout.
Direction: on 2026-09-19 the owner requested careful support for optional custom calendars, eras, approaching seasons and time-limited stories. The bounded scope below is the recommended POC implementation; the named worlds are examples, not requirements to reproduce their lore.

## Intended outcome

A story can say Day 47, use an admitted custom date or omit calendars entirely. When winter or an approaching catastrophe matters, its admitted boundary actually affects gameplay. Calendar complexity is optional; reliable elapsed time and meaningful deadlines are not contingent on implementing astronomy.

## Representative flow

A campaign defines three unequal months and starts on Ember 10. A firm deadline two months later means Frost 10, fifty-five days away under that calendar. The player prepares and travels using offered actions. Time spent reading options is free; accepted actions consume the budget. A journey that would finish after the deadline stops at the admitted boundary and retains its earned progress. The event commits once and the Storyteller stages the next situation. If narration fails, recovery preserves the deadline and hold.

Another story shows only elapsed days and a known winter threshold. A microbe uses content-defined cycles without any calendar. All share the same chronological tick authority.

## Scope and boundaries

K1 supports elapsed/ordinal display and a bounded fixed repeating year with named unequal months, captured day length, starting date and optional starting-era label/year. K2 introduces exact finite world obligations and consequential seasonal/deadline boundaries in the existing scheduler. The [technical contract](../../technical/calendars-and-world-time.md) defines arithmetic, information visibility, collisions and recovery.

No leap/intercalation language, arbitrary executable calendar scripts, historical era engine, astronomical/climate simulator, multiple planet clocks or automatic daily model calls. These restrictions are explicit validation boundaries, not permission to misrepresent unsupported calendars. Future advanced rules can extend calendar projection without replacing the campaign clock.

Calendar projection does not grant simulation permission. Scheduled events do not create actions or consume idle time. Supported effects, current authored options, bounded generation and uncertainty accounting remain authoritative. No provider calls are authorized by this feature; its deterministic fixtures and rehearsals remain local and provider-free.

## Acceptance

- Calendar-free and ordinal stories do not require fabricated months or human time units.
- Defined unequal months and year/starting-era labels convert deterministically to/from simulation positions.
- Invalid or ambiguous computational dates cannot silently fall back to Earth arithmetic or average month lengths.
- Date-bound deadlines stay fixed across speed changes, idle time, reading, reload and model latency.
- A supported winter transition has recorded effects at its boundary; labels by themselves have none.
- Accepted work cannot skip a deadline; same-tick precedence and retry identity are deterministic.
- A failed controlling turn preserves the event, committed progress and hold.
- Public countdowns distinguish firm knowledge from estimates/hidden events, and context remains bounded.

## Decisions still needed

World-specific day lengths, month names/counts and starting eras are content choices. They do not block implementing the bounded rule families. General era changes, leap calendars, stochastic seasons and simultaneous civil calendars need later scoped extensions if a concrete story requires them. Do not implement them speculatively to complete this feature.

## Owning specifications

- [Calendars and world time](../../technical/calendars-and-world-time.md)
- [Time and autonomy](../../time-and-autonomy.md#calendars-seasons-and-story-deadlines)
- [Deliberate execution](../../technical/committed-time.md)
- [Tick arithmetic](../../technical/ticks-and-tags.md)
