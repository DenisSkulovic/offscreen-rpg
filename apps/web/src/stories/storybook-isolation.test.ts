import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { allocateIsolatedQueryClients } from './decorators/query-isolation';

const storiesRoot = path.resolve(__dirname);

function listWorkbenchSources(): string[] {
  return readdirSync(storiesRoot, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        return readdirSync(path.join(storiesRoot, entry.name), {
          withFileTypes: true,
        }).map((child) => path.join(storiesRoot, entry.name, child.name));
      }
      return [path.join(storiesRoot, entry.name)];
    })
    .filter(
      (file) =>
        (file.endsWith('.stories.tsx') ||
          file.includes(`${path.sep}presenters${path.sep}`) ||
          file.includes(`${path.sep}msw${path.sep}`) ||
          file.includes(`${path.sep}decorators${path.sep}`) ||
          file.includes(`${path.sep}stubs${path.sep}`)) &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.test.tsx'),
    );
}

describe('Storybook isolation (W18)', () => {
  it('allocates distinct QueryClients per story (negative: no shared cache)', () => {
    const [a, b, c] = allocateIsolatedQueryClients(3);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a.getDefaultOptions()).toEqual(b.getDefaultOptions());
  });

  it('keeps story modules free of live Nest/proxy hosts and provider spend seams', () => {
    // Patterns as strings so this test file is not a self-hit.
    const banned = [
      'API_PROXY_ORIGIN',
      '127.0.0.1:3001',
      'openai.com',
      'anthropic.com',
      'api.openai',
      'createStoryteller',
    ];
    const sources = listWorkbenchSources();
    expect(sources.some((file) => file.endsWith('.stories.tsx'))).toBe(true);

    for (const file of sources) {
      const text = readFileSync(file, 'utf8');
      for (const needle of banned) {
        expect(
          text.includes(needle),
          `${path.relative(storiesRoot, file)} contained ${needle}`,
        ).toBe(false);
      }
      expect(text, path.relative(storiesRoot, file)).not.toMatch(/sk-[a-zA-Z0-9]{8,}/);
    }
  });
});
