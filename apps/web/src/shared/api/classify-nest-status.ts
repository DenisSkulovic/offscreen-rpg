export type NestStatusClass =
  | { kind: 'success' }
  | { kind: 'unauthorized' }
  | { kind: 'not_found' }
  | { kind: 'transient'; status: number };

/** Pure status taxonomy for Nest reads. 503 must not become not_found. */
export function classifyNestStatus(status: number): NestStatusClass {
  if (status >= 200 && status < 300) return { kind: 'success' };
  if (status === 401) return { kind: 'unauthorized' };
  if (status === 404) return { kind: 'not_found' };
  return { kind: 'transient', status };
}
