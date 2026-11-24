import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  createTerminalPairingSchema,
  type TerminalAccessTokenIssued,
  type TerminalPairingCreated,
} from '@offscreen/identity-interface/terminal-auth';
import { defaultAuthFilePath } from './config.js';
import { writeStoredAuth, type StoredTerminalAuth } from './auth-store.js';
import type { TerminalHttpClient } from './http.js';
import { TerminalHttpError } from './http.js';

const execFileAsync = promisify(execFile);

export type PairingVerifier = {
  verifierBase64url: string;
  challengeSha256: string;
};

export function createPairingVerifier(): PairingVerifier {
  const bytes = randomBytes(32);
  const verifierBase64url = bytes.toString('base64url');
  const challengeSha256 = createHash('sha256').update(bytes).digest('hex');
  return { verifierBase64url, challengeSha256 };
}

export type LoginOptions = {
  client: TerminalHttpClient;
  label: string;
  authFilePath?: string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  openVerificationUri?: (uri: string) => Promise<void>;
  onAwaitingApproval?: (
    pairing: TerminalPairingCreated,
  ) => void | Promise<void>;
};

export type LoginResult = {
  pairing: TerminalPairingCreated;
  issued: TerminalAccessTokenIssued;
  authFilePath: string;
};

export async function defaultOpenVerificationUri(uri: string): Promise<void> {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      await execFileAsync('open', [uri]);
      return;
    }
    if (platform === 'win32') {
      await execFileAsync('cmd', ['/c', 'start', '', uri]);
      return;
    }
    await execFileAsync('xdg-open', [uri]);
  } catch {
    // Browser open is best-effort; URI is always printed for manual use.
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLogin(options: LoginOptions): Promise<LoginResult> {
  const verifier = createPairingVerifier();
  const pairingRequest = createTerminalPairingSchema.parse({
    challengeSha256: verifier.challengeSha256,
    label: options.label,
  });
  const pairing = await options.client.createPairing(pairingRequest);
  if (options.onAwaitingApproval) {
    await options.onAwaitingApproval(pairing);
  }
  const openUri = options.openVerificationUri ?? defaultOpenVerificationUri;
  await openUri(pairing.verificationUri);

  const sleep = options.sleep ?? defaultSleep;
  const pollMs = pairing.pollAfterSeconds * 1000;
  const deadline = (options.now?.() ?? Date.now()) + 5 * 60 * 1000;

  let issued: TerminalAccessTokenIssued | null = null;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const exchange = await options.client.exchangePairing(
      pairing.pairingId,
      verifier.verifierBase64url,
    );
    if (exchange === 'pending') {
      continue;
    }
    issued = exchange;
    break;
  }
  if (!issued) {
    throw new TerminalHttpError(410, 'pairing_expired');
  }

  const authFilePath =
    options.authFilePath ?? defaultAuthFilePath(options.client.apiOrigin);
  const stored: StoredTerminalAuth = {
    apiOrigin: options.client.apiOrigin,
    token: issued.token,
    expiresAt: issued.expiresAt,
    scope: issued.scope,
  };
  await writeStoredAuth(authFilePath, stored);

  return { pairing, issued, authFilePath };
}

/** Redacted login status for CLI output (never includes tokens). */
export function formatLoginSuccess(args: {
  pairing: TerminalPairingCreated;
  displayCode: string;
}): string {
  return [
    `Pairing code: ${args.displayCode}`,
    `Approve in the browser, then complete sign-in at:`,
    args.pairing.verificationUri,
    'Terminal credentials saved.',
  ].join('\n');
}
