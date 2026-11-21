# MA06 | staged target and prerequisites (not delegated for open-ended Cursor design)

**Stage A:** After MA05, create a new story-authority package with exact exports for story/campaign APIs and any required lower-level transaction ports; move one coherent source family at a time. Keep application compatibility exports and package manifest dependency direction explicit. Avoid moving transaction wrappers separately from their locks. Integrate one small migration Change after full negative proof.

**Stage B:** Create Storyteller-runtime package and migrate its durable execution/storage/Writer/publication modules by verified import SCC and transaction cohorts. Pure provider contracts continue to import from `@offscreen/storyteller`. New runtime imports authority ports and state, never authority imports runtime. Separate compatibility shim remains only as a temporary external adapter, never circular.

**Stage C:** Move consumer imports in API/GA/worker/tools and retire obsolete application exports in a **separate** independently testable Change. Once stable, migrate developer-tools into a lab-specific package only if no production runtime imports it; otherwise preserve internal module but enforce source direction. Remove compatibility export once no real consumers remain; use graph and actual build evidence.

**Hard stop / planner gate:** MA01 graph and specific transaction/port map, post-WR05 source/fork and replay fixture matrix, chosen owner for generations/outbox, resolved package exports and migration order. ChatGPT must write A/B/C source maps, exact TS signatures and 2–5-anchor Cursor TASKS.md **before** marking any stage Ready. Do not create a single 1,000-file reformat and hope tests rescue it.
