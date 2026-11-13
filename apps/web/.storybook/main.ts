import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/nextjs-vite';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(storybookDir, '..');

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  staticDirs: [
    '../public',
    { from: '../src/stories/presentation-fixtures', to: '/presentation-fixtures' },
  ],
  async viteFinal(viteConfig) {
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      '@': webRoot,
      // Storybook is provider-free: never hit Better Auth session redirect.
      '@/src/features/session/session-refresh': path.resolve(
        webRoot,
        'src/stories/stubs/session-refresh.tsx',
      ),
      'server-only': path.resolve(webRoot, 'src/test/server-only-stub.ts'),
    };
    // Workspace contracts ship CJS; Vite production build needs explicit interop.
    viteConfig.optimizeDeps ??= {};
    viteConfig.optimizeDeps.include = [
      ...(viteConfig.optimizeDeps.include ?? []),
      '@offscreen/contracts/drafts',
      '@offscreen/contracts/stories',
      '@offscreen/contracts/campaign',
      '@offscreen/contracts/storytellers',
      '@offscreen/game/offers',
      '@offscreen/game/calendar',
    ];
    viteConfig.build ??= {};
    viteConfig.build.commonjsOptions = {
      ...viteConfig.build.commonjsOptions,
      include: [/node_modules/, /packages[\\/](contracts|game|documents)/],
      transformMixedEsModules: true,
    };
    return viteConfig;
  },
};

export default config;
