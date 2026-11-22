import { z } from 'zod';

const originField = z.string().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    value === url.origin &&
    (url.protocol === 'https:' ||
      (url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)))
  );
});

// One DNS label: lowercase, no dots, so two loopback ports cannot share a cookie name.
const cookiePrefixField = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
  .optional();

const authEnvSchema = z.object({
  APP_ORIGIN: originField,
  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  BETTER_AUTH_COOKIE_PREFIX: cookiePrefixField,
});

export function readAuthConfig(env: Record<string, string | undefined>) {
  const result = authEnvSchema.safeParse(env);
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
    ...(result.data.BETTER_AUTH_COOKIE_PREFIX
      ? { cookiePrefix: result.data.BETTER_AUTH_COOKIE_PREFIX }
      : {}),
  };
}

export type AuthConfig = ReturnType<typeof readAuthConfig>;
