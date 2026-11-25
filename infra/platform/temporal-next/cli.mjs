import { compactConfig } from './config.mjs';
import { compactResources } from './deployment.mjs';
import { ensureTemporal, status } from './lifecycle.mjs';

const [profile, operation, ...extra] = process.argv.slice(2);
try {
  if (extra.length || !['plan', 'status', 'ensure'].includes(operation)) {
    throw new Error('usage: node infra/platform/temporal-next/cli.mjs <dev|release> <plan|status|ensure>');
  }
  const config = compactConfig(profile);
  const result = operation === 'plan' ? { config, resources: compactResources(config) }
    : operation === 'status' ? status(config) : await ensureTemporal(config);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
