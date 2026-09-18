import { z } from 'zod';

const schema = z.object({
  APP_ORIGIN: z.string().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      value === url.origin &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(url.hostname)))
    );
  }),
  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
});

export function readAuthConfig(env: Record<string, string | undefined>) {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid authentication configuration: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  return {
    origin: result.data.APP_ORIGIN,
    secret: result.data.BETTER_AUTH_SECRET,
    githubClientId: result.data.GITHUB_CLIENT_ID,
    githubClientSecret: result.data.GITHUB_CLIENT_SECRET,
  };
}

export type AuthConfig = ReturnType<typeof readAuthConfig>;
