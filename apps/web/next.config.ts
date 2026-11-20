import type { NextConfig } from 'next';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '../..');

/** Browser `/api` rewrite target (Node-only). Do not use NEXT_PUBLIC_*. */
const apiProxyOrigin = process.env.API_PROXY_ORIGIN ?? 'http://127.0.0.1:3001';

const config: NextConfig = {
  agentRules: false, // Repository instructions are maintained in the root AGENTS.md.
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyOrigin}/api/:path*`,
      },
    ];
  },
};

export default config;
