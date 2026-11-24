import { writeFileSync } from 'node:fs';

// Keeps the launch-loaded process alive after import for supervisor tests.
writeFileSync(
  new URL('./dev-compiled-entry.imported', import.meta.url),
  `${Date.now()}\n`,
);
setInterval(() => {}, 2_147_483_647);