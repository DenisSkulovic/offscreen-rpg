# Offscreen RPG

**An AI storytelling RPG where your character’s life continues while you’re away.**

Create a character in a world of your choosing. Follow their ordinary life, step into an unfolding story, make a decision between meetings, or leave them to their own judgment. Pause whenever you want.

An LLM storyteller creates scenes, remembers connections and introduces developments. The browser presents the current scene and story; a messaging integration could bring occasional updates and choices to your phone.

**Current POC:** persistent drafts, reviewed authored openings, saved choices and waits, and an authored mechanical slice with d20 checks, consequences and editable storyteller/speed settings. Arbitrary-world generation and the tool-using DM planner remain unimplemented. Standard GitHub sign-in requires your own OAuth credentials; `pnpm chamber` opens the local application with a development session and no model keys. See [local development](docs/development.md) for setup and [progress](docs/progress.md) for the current implementation boundary.

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

To work on the code, start with [Code navigation](docs/engineering/code-navigation.md): package owners, flow entry points and common terminology. [Architecture](docs/technical/architecture.md) describes the broader design using Next.js, NestJS, PostgreSQL and Temporal, including capabilities still to be built. The [build sequence](docs/technical/delivery-and-validation.md) explains delivery in playable slices.

Run `python scripts/check_docs.py` to check documentation links; it also runs in GitHub Actions. No project license has been selected yet.
