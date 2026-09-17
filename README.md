# Offscreen RPG

**An AI storytelling RPG where your character’s life continues while you’re away.**

Create a character in a world of your choosing. Follow their ordinary life, step into an unfolding story, make a decision between meetings, or leave them to their own judgment. Pause whenever you want.

An LLM storyteller creates scenes, remembers connections and introduces developments. The browser presents the current scene and story; a messaging integration could bring occasional updates and choices to your phone.

**The application includes PostgreSQL, GitHub sign-in, private story drafts and saved scripted opening previews. A scripted chamber supports a short branching conversation with saved choices, conclusions and history; a timed cafe visit continues while the browser is closed. The timed journey supports saved pause/resume. A separate timed reply offers a 15-second deadline and a saved automatic default. A letter-delivery fixture commits an item transfer with its narrative consequence. Pace controls and a general inventory system remain unimplemented.** Running sign-in requires your own OAuth credentials. See [local development](docs/development.md) for setup, checks and the exact implementation boundary.

A scripted browser prototype is available at `/demo` when the web app is running. Explore scenes, choices and chronology without signing in. Its time controls are manual and its state resets on refresh; it is not the persistent game.

See the [implementation overview](docs/progress.md) for component coverage, missing user flows and the current focus. We are building the broader application with scripted generation before connecting paid services.

- [Vision](docs/vision.md): the experience and why we're making it.
- [Gameplay](docs/gameplay.md): how the story could progress with little simulation.
- [Player experience](docs/player-experience.md): entry, interaction and returning to a story.
- [Storytelling](docs/storytelling.md): the storyteller's role and creative controls.
- [Time and autonomy](docs/time-and-autonomy.md): waiting, response windows and absence.
- [Story creation](docs/story-creation.md): from premise to a playable beginning.
- [Continuity and consequences](docs/continuity-and-consequences.md): what the story must remember and respect.
- [Playthroughs](docs/playthroughs.md): a concrete wizard-and-goblin walkthrough, including shared play.
- [Open questions](docs/questions.md): the few choices to settle before building.

This is a senior fullstack portfolio project. Its depth should come from compelling interaction, coherent persistent stories, reliable background execution and efficient AI.

Start the technical reading with [Architecture](docs/technical/architecture.md). The design uses a TypeScript monorepo, Next.js, NestJS, PostgreSQL and Temporal, with links to execution, data, AI, notifications and delivery details. Most application behavior remains to be implemented. The [build sequence](docs/technical/delivery-and-validation.md) explains how to prove it in playable slices.

Run `python scripts/check_docs.py` to check documentation links; it also runs in GitHub Actions. No project license has been selected yet.
