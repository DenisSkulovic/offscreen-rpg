import { canonicalResolutionRequestJson } from '@offscreen/contracts/stories';

export async function digestResolutionRequest(input: {
  expectedRevision: number;
  submission: unknown;
}): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalResolutionRequestJson(input));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
