import Link from 'next/link';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import './public-portal.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--public-display',
  display: 'swap',
});

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--public-sans',
  display: 'swap',
});

const SOURCE_URL = 'https://github.com/DenisSkulovic/offscreen-rpg';

/**
 * Public editorial entrance. Server-rendered, no session or Nest dependency.
 * Greywake/demo lore stays out of shared UI primitives; only this page owns
 * the marketing excerpt text.
 */
export function PublicPortal() {
  return (
    <div className={`public-portal ${display.variable} ${sans.variable}`}>
      <a className="public-portal__skip" href="#public-portal-main">
        Skip to content
      </a>
      <header className="public-portal__header">
        <Link className="public-portal__brand" href="/">
          Offscreen RPG
        </Link>
        <nav className="public-portal__nav" aria-label="Public">
          <a href="#how-it-works">How it works</a>
          <Link href="/demo">Try preview</Link>
          <a href={SOURCE_URL} rel="noreferrer">
            GitHub
          </a>
          <Link href="/stories">Your stories</Link>
        </nav>
      </header>

      <main id="public-portal-main" className="public-portal__main">
        <section className="public-portal__hero" aria-labelledby="public-hero-title">
          <p className="public-portal__kicker">A game about consequence</p>
          <h1 id="public-hero-title" className="public-portal__title">
            Offscreen RPG
          </h1>
          <p className="public-portal__promise">
            A story that remembers what you chose.
          </p>
          <p className="public-portal__lede">
            Choose what your character attempts. Commit to work that takes
            time. Leave, then return to consequences that were actually earned.
          </p>
          <div className="public-portal__cta-row">
            <Link className="public-portal__cta-primary" href="/demo">
              Try an interactive preview
            </Link>
            <Link className="public-portal__cta-secondary" href="/stories/new">
              Start a real story
            </Link>
            <a className="public-portal__cta-quiet" href={SOURCE_URL} rel="noreferrer">
              View source &amp; proof
            </a>
          </div>
          <p className="public-portal__cta-note">
            Preview needs no account · scripted · no AI calls · resets on refresh
          </p>

          <aside
            className="public-portal__glimpse"
            aria-label="Editorial scene glimpse"
          >
            <p className="public-portal__glimpse-label">
              Preview · scripted excerpt · not live play
            </p>
            <p className="public-portal__glimpse-place">Wet quay boards</p>
            <p className="public-portal__glimpse-prose">
              A folded notice waits under the rail. Someone has already started
              a repair that will take time to finish—whether you stay or leave.
            </p>
            <ul className="public-portal__glimpse-options">
              <li>Read the notice</li>
              <li>Begin the repair</li>
            </ul>
            <Link className="public-portal__glimpse-link" href="/demo">
              Continue in the full preview →
            </Link>
          </aside>
        </section>

        <section
          id="how-it-works"
          className="public-portal__journey"
          aria-labelledby="how-it-works-title"
        >
          <h2 id="how-it-works-title">One connected journey</h2>
          <p className="public-portal__journey-lede">
            Not three equal feature cards—one path from intention to return.
          </p>
          <ol className="public-portal__steps">
            <li>
              <span className="public-portal__step-index">01</span>
              <h3>Make an intention</h3>
              <p>
                Pick what your character tries. The game admits that choice
                under real rules—not a chat that invents outcomes.
              </p>
            </li>
            <li>
              <span className="public-portal__step-index">02</span>
              <h3>Time actually matters</h3>
              <p>
                Accepted work can take fictional time. You can leave while it
                runs; the clock is owned by the server, not the browser tab.
              </p>
            </li>
            <li>
              <span className="public-portal__step-index">03</span>
              <h3>Return to the result</h3>
              <p>
                Come back to settled receipts and remembered facts. Interruption
                and unfinished work stay distinct from a finished consequence.
              </p>
            </li>
          </ol>
        </section>

        <section
          className="public-portal__modes"
          aria-labelledby="modes-title"
        >
          <h2 id="modes-title">Two honest modes</h2>
          <div className="public-portal__mode-grid">
            <div>
              <h3>Scripted preview</h3>
              <p>
                No account, no AI calls, resets when you refresh. A short taste
                of intention, simulated waiting and return—built for a first
                visit and for when the private backend is down.
              </p>
              <Link href="/demo">Open the preview</Link>
            </div>
            <div>
              <h3>Persistent play</h3>
              <p>
                Sign in and create a real story under authorized usage. Choices
                and time become server-owned campaign state—not a disposable
                script. Availability depends on account and service policy.
              </p>
              <Link href="/stories/new">Start a real story</Link>
            </div>
          </div>
        </section>

        <section className="public-portal__proof" aria-labelledby="proof-title">
          <h2 id="proof-title">For engineers</h2>
          <p>
            Rules, time and receipts live in the application—not in model
            prose. The repository is the source of truth for what is actually
            proven.
          </p>
          <a href={SOURCE_URL} rel="noreferrer">
            Browse the GitHub repository
          </a>
        </section>
      </main>

      <footer className="public-portal__footer">
        <p>Offscreen RPG · engineering portfolio · in active development</p>
        <p>
          <Link href="/sign-in">Sign in</Link>
          {' · '}
          <Link href="/stories">Your stories</Link>
          {' · '}
          <a href={SOURCE_URL} rel="noreferrer">
            Source
          </a>
        </p>
      </footer>
    </div>
  );
}
