# Working on this project

Read README.md and the relevant file in docs/. We are shaping a raw proof of concept.

For implementation work, read docs/technical/architecture.md and the technical document for the affected behavior. The design is proposed until implemented and verified; preserve explicit product questions rather than treating technical examples as settled requirements.

Read docs/progress.md before selecting the next implementation slice. Build and test the broader application with scripted generation and local/test substitutes; do not connect paid models, media or hosted integrations until the user explicitly chooses to enable them. Do not let an isolated subsystem's polish displace the next missing user flow.

- Keep docs current, concrete and useful. Use enough depth to explain the product; brevity is not the goal. Rewrite or delete obsolete text directly.
- Derive each slice from its product flow and technical contract. Update those descriptions alongside behavior changes, and replace affected statuses in docs/progress.md. Distinguish tested components from connected user flows; progress is a snapshot, never a log.
- Do not create decision ledgers, amendment histories, supersession notes, document IDs, review reports, archives or speculative feature catalogues.
- Brainstorming examples illustrate intent; they are not automatic requirements. Discuss consequential choices without demanding approval of entire documents.
- Keep unresolved choices in docs/questions.md. Remove them when resolved and update the relevant description.
- Prefer generic story progression over dedicated simulations for everyday activities or entire populations.
- Preserve the senior fullstack portfolio purpose: engaging UI, coherent state, reliable time/decisions and measurable AI costs.
- Add documents or infrastructure only when current work needs them. Do not initiate paid calls or deployment merely to flesh out an idea.
- Git is authoritative. Keep private context, credentials and player data out of the repository.

Run `python scripts/check_docs.py` after editing docs. Report actual changes briefly.
