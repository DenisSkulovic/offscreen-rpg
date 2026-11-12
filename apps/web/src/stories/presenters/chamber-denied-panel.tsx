'use client';

/**
 * Ordinary Nest boot does not register Chamber/QA controllers.
 * This panel is the developer-denied engineering state for Storybook review.
 */
export function ChamberDeniedPanel() {
  return (
    <main className="editor" aria-labelledby="chamber-denied-title">
      <p className="eyebrow">Storybook · Chamber isolation</p>
      <h1 id="chamber-denied-title">Chamber tools unavailable</h1>
      <p role="alert">
        Inspector is unavailable. Use the local Chamber launcher for developer
        tools. Ordinary API startup does not mount chamber-tools routes; this is
        not a hosted RBAC allowlist miss.
      </p>
      <p>
        No story content, session cookies or private QA evidence is shown here.
      </p>
    </main>
  );
}
