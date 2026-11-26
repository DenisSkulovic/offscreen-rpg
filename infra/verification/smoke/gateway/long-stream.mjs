/** Schedule for /api/events/long (seconds from stream start). Kept in sync with backend.py. */
export const LONG_SSE_EVENT_DELAYS_S = Object.freeze([0, 15, 30, 45]);

export const LONG_SSE_EVENT_COUNT = LONG_SSE_EVENT_DELAYS_S.length;

/** Overall long-stream proof deadline (seconds). */
export const LONG_STREAM_DEADLINE_S = 60;

/** Per-event upper-bound slack after the next scheduled slot (seconds). */
export const LONG_STREAM_TOLERANCE_S = 5;

/**
 * @param {string} chunk
 * @returns {string[]}
 */
export function parseSseDataLines(chunk) {
  const events = [];
  for (const block of chunk.split('\n\n')) {
    const text = block.trim();
    if (!text) continue;
    for (const line of text.split('\n')) {
      if (line.startsWith('data:')) {
        events.push(line.trim());
      }
    }
  }
  return events;
}

/**
 * Validate monotonic arrival times against the long-stream schedule.
 *
 * @param {number[]} arrivalOffsetsS seconds from stream start
 * @param {number[]} [scheduleS]
 * @param {number} [toleranceS]
 * @param {number} [deadlineS]
 */
export function validateLongStreamTiming(
  arrivalOffsetsS,
  scheduleS = LONG_SSE_EVENT_DELAYS_S,
  toleranceS = LONG_STREAM_TOLERANCE_S,
  deadlineS = LONG_STREAM_DEADLINE_S,
) {
  if (arrivalOffsetsS.length !== scheduleS.length) {
    return {
      ok: false,
      reason: `expected ${scheduleS.length} events, got ${arrivalOffsetsS.length}`,
    };
  }
  for (let index = 0; index < scheduleS.length; index += 1) {
    const arrival = arrivalOffsetsS[index];
    const scheduled = scheduleS[index];
    if (arrival < scheduled) {
      return {
        ok: false,
        reason: `event ${index + 1} arrived at ${arrival}s before scheduled ${scheduled}s`,
      };
    }
    const nextScheduled =
      index + 1 < scheduleS.length ? scheduleS[index + 1] : deadlineS;
    const latest = nextScheduled + toleranceS;
    if (arrival > latest) {
      return {
        ok: false,
        reason: `event ${index + 1} arrived at ${arrival}s after bound ${latest}s`,
      };
    }
  }
  const lastArrival = arrivalOffsetsS[arrivalOffsetsS.length - 1];
  if (lastArrival > deadlineS) {
    return {
      ok: false,
      reason: `last event at ${lastArrival}s exceeded overall deadline ${deadlineS}s`,
    };
  }
  return { ok: true };
}

/**
 * @param {string} prefix e.g. api
 * @param {number} [count]
 */
export function expectedLongEventNames(prefix, count = LONG_SSE_EVENT_COUNT) {
  return Array.from(
    { length: count },
    (_, index) => `data: ${prefix}-event-${index + 1}`,
  );
}
