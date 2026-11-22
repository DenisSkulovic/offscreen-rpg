import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/** Crockford base32 without I, L, O, U. */
const PAIRING_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function digestAccessToken(token: string): string {
  return sha256Hex(Buffer.from(token, 'utf8'));
}

export function digestPairingCode(code: string): string {
  return sha256Hex(code.toUpperCase());
}

export function hmacSourceIpHash(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip, 'utf8').digest('hex');
}

export function sha256HexEqual(expected: string, actual: string): boolean {
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(actual, 'utf8');
  if (left.length !== right.length) {return false;}
  return timingSafeEqual(left, right);
}

export function mintPairingCode(): string {
  const bytes = randomBytes(10);
  let code = '';
  for (let i = 0; i < 10; i++) {
    const byte = bytes[i];
    const symbol =
      byte === undefined
        ? undefined
        : PAIRING_CODE_ALPHABET[byte % PAIRING_CODE_ALPHABET.length];
    if (symbol === undefined) {
      throw new Error('Pairing code alphabet exhausted');
    }
    code += symbol;
  }
  return code;
}

export function mintAccessToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: digestAccessToken(token) };
}

export function challengeFromVerifierBase64url(
  verifier: string,
): string | null {
  try {
    const bytes = Buffer.from(verifier, 'base64url');
    if (bytes.length !== 32) {return null;}
    return sha256Hex(bytes);
  } catch {
    return null;
  }
}
