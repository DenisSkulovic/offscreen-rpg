#!/usr/bin/env node
process.stderr.write(
  'refusing retired object-store bootstrap CLI: native installer is the sole writer (providers/seaweedfs/install.mjs). This command does not plan, ensure, prove, or restart.\n',
);
process.exit(2);
