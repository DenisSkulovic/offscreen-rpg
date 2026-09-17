import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <p className="eyebrow">Offscreen RPG</p>
      <h1>
        Your story.
        <br />
        Even while you’re away.
      </h1>
      <p>
        Create a character. Step into another world. Return to find out what
        happened.
      </p>
      <Link className="button" href="/stories">
        Enter Offscreen RPG
      </Link>
      <p>
        <Link href="/demo">Try a short scripted story →</Link>
      </p>
      <p className="status">
        In development. The first adventure is still taking shape.
      </p>
    </main>
  );
}
