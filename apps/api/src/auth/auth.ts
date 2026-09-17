import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { Database } from '@offscreen/db';
import * as schema from '@offscreen/db/schema';
import type { AuthConfig } from './config.js';

export function authOptions(database: Database, config: AuthConfig) {
  return {
    appName: 'Offscreen RPG',
    baseURL: config.origin,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: [config.origin],
    database: drizzleAdapter(database.db, { provider: 'pg', schema }),
    socialProviders: {
      github: {
        clientId: config.githubClientId,
        clientSecret: config.githubClientSecret,
        scope: ['user:email'],
      },
    },
    account: { accountLinking: { enabled: false }, encryptOAuthTokens: true },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: config.origin.startsWith('https://'),
      ipAddress: { ipAddressHeaders: ['x-offscreen-client-ip'] },
    },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60 },
    logger: { disabled: true },
  } satisfies BetterAuthOptions;
}

export function createAuth(database: Database, config: AuthConfig) {
  return betterAuth(authOptions(database, config));
}

export type Auth = Pick<ReturnType<typeof createAuth>, 'handler' | 'api'>;
