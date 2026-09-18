import { SignInButton } from '@/src/features/session/sign-in-button';

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main>
      <p className="eyebrow">Offscreen RPG</p>
      <h1>
        A life beyond
        <br />
        the screen.
      </h1>
      <p>Sign in to make room for your stories.</p>
      {error && (
        <p role="alert">Sign-in was not completed. You can try again.</p>
      )}
      <SignInButton />
    </main>
  );
}
