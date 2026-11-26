#!/usr/bin/env node
process.stderr.write(
  'refusing retired dev S3 tenant trial: this script no longer signs, restarts, or copies admin credentials. Native provisioning is the sole writer.\n',
);
process.exit(2);
