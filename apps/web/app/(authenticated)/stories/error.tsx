'use client';

export default function AccountError({ reset }: { reset: () => void }) {
  return (
    <main>
      <h1>We couldn’t load your account.</h1>
      <p>Please try again in a moment.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
