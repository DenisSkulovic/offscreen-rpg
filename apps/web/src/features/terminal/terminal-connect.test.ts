import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

function readAppSource(relative: string): string {
  return readFileSync(path.join(webRoot, relative), 'utf8');
}

describe('terminal connect consent page', () => {
  it('gates the route behind requireViewer and loads consent metadata', () => {
    const page = readAppSource('app/(authenticated)/terminal/connect/page.tsx');
    expect(page).toContain('requireViewer');
    expect(page).toContain('/consent');
    expect(page).toContain('TerminalConnectForm');
    expect(page).not.toContain('userCode=');
  });

  it('shows story-only scope, client label, and seven-day access', () => {
    const form = readAppSource(
      'src/features/terminal/terminal-connect-form.tsx',
    );
    expect(form).toContain('story-only');
    expect(form).toContain('consent.clientLabel');
    expect(form).toContain('accessDurationDays');
    expect(form).toContain('userCode');
    expect(form).toContain('/approve');
  });
});
