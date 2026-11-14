import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** >=256-bit opaque Admin token; DB stores only SHA-256 digest. */
export function mintAdminToken(): { token: string; digest: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, digest: digestAdminToken(token) };
}

export function digestAdminToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function adminTokensEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
