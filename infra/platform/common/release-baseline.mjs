#!/usr/bin/env node
import { ensureReleaseOwnershipBaseline } from './commands.mjs';
try { console.log(JSON.stringify(ensureReleaseOwnershipBaseline())); }
catch (error) { console.error(error.message); process.exitCode = 1; }
