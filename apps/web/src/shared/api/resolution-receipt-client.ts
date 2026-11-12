import {
  resolutionOperationReceiptSchema,
  type ResolutionOperationReceipt,
} from '@offscreen/contracts/stories';

const requestTimeoutMs = 10000;

export type ResolutionReceiptRead =
  | { kind: 'ok'; receipt: ResolutionOperationReceipt }
  | { kind: 'not_found' }
  | { kind: 'unauthorized' }
  | { kind: 'transient'; status: number };

export async function readResolutionReceipt(
  storyId: string,
  operationId: string,
  signal?: AbortSignal,
): Promise<ResolutionReceiptRead> {
  const response = await fetch(
    `/api/stories/${storyId}/resolutions/${operationId}/receipt`,
    {
      cache: 'no-store',
      signal:
        signal === undefined
          ? AbortSignal.timeout(requestTimeoutMs)
          : AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
    },
  );
  if (response.status === 404) {
    return { kind: 'not_found' };
  }
  if (response.status === 401) {
    return { kind: 'unauthorized' };
  }
  if (!response.ok) {
    return { kind: 'transient', status: response.status };
  }
  return {
    kind: 'ok',
    receipt: resolutionOperationReceiptSchema.parse(await response.json()),
  };
}
