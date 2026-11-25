/**
 * @typedef {'START' | 'OK' | 'FAIL'} InfraProgressKind
 * @typedef {{ phaseId: string, kind: InfraProgressKind, elapsedMs: number }} InfraProgressEvent
 * @typedef {(event: InfraProgressEvent) => void} InfraProgressCallback
 */

/** @returns {InfraProgressCallback} */
export function noopInfraProgress() {
  return () => {};
}

/**
 * @param {InfraProgressEvent} event
 * @returns {string}
 */
export function formatInfraProgressLine(event) {
  return `${event.phaseId} ${event.kind} ${event.elapsedMs}ms\n`;
}

/**
 * @param {{
 *   onProgress?: InfraProgressCallback,
 *   now?: () => number,
 * }} [deps]
 */
export function createInfraProgressReporter(deps = {}) {
  const now = deps.now ?? (() => performance.now());
  const onProgress = deps.onProgress ?? noopInfraProgress();
  const origin = now();
  let halted = false;

  /**
   * @param {string} phaseId
   * @param {InfraProgressKind} kind
   */
  const emit = (phaseId, kind) => {
    if (halted && kind === 'START') {
      return;
    }
    if (kind === 'FAIL') {
      halted = true;
    }
    const event = {
      phaseId,
      kind,
      elapsedMs: Math.max(0, Math.round(now() - origin)),
    };
    try {
      onProgress(event);
    } catch {
      // Callback exceptions must not change operational result.
    }
  };

  return {
    emit,
    phaseStart: (phaseId) => emit(phaseId, 'START'),
    phaseOk: (phaseId) => emit(phaseId, 'OK'),
    phaseFail: (phaseId) => emit(phaseId, 'FAIL'),
  };
}
