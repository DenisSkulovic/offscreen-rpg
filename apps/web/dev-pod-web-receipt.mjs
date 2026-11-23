#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { markDevWatchedCompilation } from '../../infra/kubernetes/lab/dev/dev-watched-compilation-receipt.mjs';
import { writeDevLoadedRuntimeReceipt } from '../../packages/runtime-logging/dist/dev-loaded-runtime-receipt.js';

const entry = 'apps/web/.next/BUILD_ID';
const absolute = resolve('/app', entry);

function publish() {
  if (!existsSync(absolute)) return;
  markDevWatchedCompilation({
    phase: 'success',
    role: 'web',
    compiledEntryPath: entry,
    cwd: '/app',
    environmentId: process.env.OFFSCREEN_DEV_SLOT,
  });
  writeDevLoadedRuntimeReceipt({ role: 'web', compiledModulePath: absolute });
}

publish();
setInterval(publish, 1000);
