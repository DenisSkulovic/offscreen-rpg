import { dockerExecutable, fail, run } from './process.mjs';

try {
  const args = process.argv.slice(2);
  if (args[0] === '--') args.shift();
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: pnpm infra <compose arguments>');
    console.log('Example: pnpm infra ps');
    process.exit(0);
  }
  run(dockerExecutable(), ['compose', ...args]);
} catch (error) {
  fail(error);
}
