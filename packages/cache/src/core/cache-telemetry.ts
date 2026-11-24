export type CacheTelemetry = (
  event: Readonly<{
    namespace: string;
    tier: 'l1' | 'l2' | 'origin' | 'runtime';
    operation:
      'get' | 'set' | 'load' | 'coalesce' | 'evict' | 'connection' | 'breaker';
    outcome: string;
    durationMs?: number;
    bytes?: number;
  }>,
) => void;

export function emitCacheTelemetry(
  sink: CacheTelemetry,
  event: Parameters<CacheTelemetry>[0],
): void {
  try {
    sink(event);
  } catch {
    // Telemetry must never disturb cache control flow.
  }
}
