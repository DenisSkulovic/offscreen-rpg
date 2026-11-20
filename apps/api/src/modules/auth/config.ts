import { z } from 'zod';

export const POC_LOCAL_PLAYER_ID = 'poc-local-player';

export const POC_LOCAL_PLAYER = {
  id: POC_LOCAL_PLAYER_ID,
  name: 'Local Player',
  email: 'player@localhost',
} as const;

function isLoopbackHttpOrigin(origin: string) {
  const url = new URL(origin);
  return (
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(url.hostname)
  );
}

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

const nonDemoSchema = z.object({
  APP_ORIGIN: originField,
  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  POC_OPEN_ACCESS: z.string().optional(),
});

const demoSchema = z.object({
  APP_ORIGIN: originField,
  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  POC_OPEN_ACCESS: z.string().optional(),
});

function assertLocalDemoAllowed(env: Record<string, string | undefined>) {
  const origin = env.APP_ORIGIN;
  if (
    !origin ||
    !URL.canParse(origin) ||
    !isLoopbackHttpOrigin(origin) ||
    env.NODE_ENV === 'production'
  ) {
    throw new Error('Invalid authentication configuration: LOCAL_DEMO_AUTH');
  }
}

export function readAuthConfig(env: Record<string, string | undefined>) {
  const localDemoAuth = env.LOCAL_DEMO_AUTH === '1';
  if (localDemoAuth) {
    assertLocalDemoAllowed(env);
  }

  const result = (localDemoAuth ? demoSchema : nonDemoSchema).safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid authentication configuration: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  const pocOpenAccess = env.POC_OPEN_ACCESS === '1';
  if (pocOpenAccess && !isLoopbackHttpOrigin(result.data.APP_ORIGIN)) {
    throw new Error('Invalid authentication configuration: POC_OPEN_ACCESS');
  }
  return {
    origin: result.data.APP_ORIGIN,
    secret: result.data.BETTER_AUTH_SECRET,
    githubClientId: result.data.GITHUB_CLIENT_ID ?? '',
    githubClientSecret: result.data.GITHUB_CLIENT_SECRET ?? '',
    pocOpenAccess,
    localDemoAuth,
  };
}

export type AuthConfig = ReturnType<typeof readAuthConfig>;