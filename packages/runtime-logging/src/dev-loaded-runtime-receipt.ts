import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export const DEV_LOADED_RUNTIME_RECEIPT_SCHEMA =
  'offscreen.dev-loaded-runtime.v1' as const;

export type DevLoadedRuntimeReceipt = {
  schema: typeof DEV_LOADED_RUNTIME_RECEIPT_SCHEMA;
  role: string;
  pid: number;
  startedAt: string;
  compiledModulePath: string;
  compiledModuleIdentity: string;
};

/**
 * Identity of the compiled entry artifact the running Node process actually
 * loaded, not a source-tree fingerprint.
 */
export function fingerprintCompiledModuleFile(compiledModulePath: string) {
  const bytes = readFileSync(compiledModulePath);
  return {
    compiledModulePath,
    compiledModuleIdentity: createHash('sha256').update(bytes).digest('hex'),
  };
}

export function devLoadedRuntimeReceiptRoot() {
  const configured = process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR?.trim();
  if (configured) {
    return configured;
  }
  return join(process.cwd(), '.offscreen-dev-runtime');
}

export function writeDevLoadedRuntimeReceipt(input: {
  role: string;
  compiledModulePath: string;
}) {
  const { compiledModulePath, compiledModuleIdentity } =
    fingerprintCompiledModuleFile(input.compiledModulePath);
  const receiptRoot = devLoadedRuntimeReceiptRoot();
  const receipt: DevLoadedRuntimeReceipt = {
    schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
    role: input.role,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    compiledModulePath,
    compiledModuleIdentity,
  };
  mkdirSync(receiptRoot, { recursive: true });
  writeFileSync(
    join(receiptRoot, `${input.role}.loaded.json`),
    `${JSON.stringify(receipt)}\n`,
    'utf8',
  );
  return receipt;
}