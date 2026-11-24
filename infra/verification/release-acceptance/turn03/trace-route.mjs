/**
 * Injected public HTTP trace for TURN03 R1.
 * Paths match Nest controllers. Responses stay local/mocked; no gate is PASS.
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function pickString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export class TraceAbort extends Error {
  /**
   * @param {'FAIL' | 'BLOCKED'} status
   * @param {string} summary
   * @param {string} [gateId]
   */
  constructor(status, summary, gateId = 'candidate-start') {
    super(summary);
    this.name = 'TraceAbort';
    this.status = status;
    this.summary = summary;
    this.gateId = gateId;
  }
}

/**
 * @param {unknown} raw
 * @returns {{ status: number, body: unknown }}
 */
export function normalizeHttpResult(raw) {
  if (isRecord(raw) && typeof raw.status === 'number') {
    return { status: raw.status, body: raw.body ?? null };
  }
  throw new TraceAbort(
    'FAIL',
    'Injected HTTP result omitted a numeric status; the public contract was not observed',
  );
}

/**
 * @param {number} status
 * @param {string} step
 */
export function assertNotAuthFailure(status, step) {
  if (status === 401 || status === 403) {
    throw new TraceAbort(
      'FAIL',
      `${step} rejected the actor (${status}); remaining commands were not sent`,
    );
  }
}

/**
 * @param {{
 *   draftId?: unknown,
 *   generationId?: unknown,
 *   storyId?: unknown,
 *   operationId?: unknown,
 *   forkId?: unknown,
 *   sourcePins?: unknown,
 *   campaign?: unknown,
 *   draft?: unknown,
 * }} [identity]
 */
export function assertFrozenIdentity(identity) {
  if (!isRecord(identity)) {
    throw new TraceAbort(
      'BLOCKED',
      'Frozen draft, generation, story, operation, fork, pins and campaign are required before any write',
    );
  }
  const required = [
    'draftId',
    'generationId',
    'storyId',
    'operationId',
    'forkId',
  ];
  for (const key of required) {
    if (pickString(identity[key]) == null) {
      throw new TraceAbort('BLOCKED', `Frozen identity is missing ${key}`);
    }
  }
  if (!isRecord(identity.sourcePins) || !isRecord(identity.draft)) {
    throw new TraceAbort(
      'BLOCKED',
      'Frozen identity is missing sourcePins or the authored draft body',
    );
  }
  if (!isRecord(identity.campaign)) {
    throw new TraceAbort('BLOCKED', 'Frozen identity is missing campaign');
  }
  return {
    draftId: /** @type {string} */ (identity.draftId),
    generationId: /** @type {string} */ (identity.generationId),
    storyId: /** @type {string} */ (identity.storyId),
    operationId: /** @type {string} */ (identity.operationId),
    forkId: /** @type {string} */ (identity.forkId),
    sourcePins: identity.sourcePins,
    campaign: identity.campaign,
    draft: identity.draft,
  };
}

/**
 * @param {unknown} body
 */
export function readOpeningPreview(body) {
  if (!isRecord(body)) {
    return null;
  }
  const preview = isRecord(body.preview) ? body.preview : body;
  const id = pickString(preview.id);
  const state = pickString(preview.state);
  if (id == null || state == null) {
    return null;
  }
  return { id, state };
}

/**
 * @param {unknown} body
 */
export function readStorySnapshot(body) {
  if (!isRecord(body) || !isRecord(body.current)) {
    return null;
  }
  const passageId = pickString(body.current.id);
  const revision = typeof body.revision === 'number' ? body.revision : null;
  const interaction = isRecord(body.current.interaction)
    ? body.current.interaction
    : null;
  const interactionId = interaction == null ? null : pickString(interaction.id);
  const specification = interaction && isRecord(interaction.specification)
    ? interaction.specification
    : null;
  const options = specification && Array.isArray(specification.options)
    ? specification.options
    : [];
  const first = options.find((option) => isRecord(option) && pickString(option.id));
  const optionId = first && isRecord(first) ? pickString(first.id) : null;
  const lineage = isRecord(body.lineage) ? body.lineage : null;
  return {
    id: pickString(body.id),
    revision,
    passageId,
    interactionId,
    optionId,
    sourceStoryId: lineage ? pickString(lineage.sourceStoryId) : null,
    sourcePassageId: lineage ? pickString(lineage.sourcePassageId) : null,
  };
}

/**
 * @param {unknown} body
 */
export function readHistoricalScene(body) {
  const snapshot = readStorySnapshot(body);
  if (snapshot == null || !isRecord(body)) {
    return null;
  }
  const checkpointHash = pickString(body.checkpointHash);
  const canon = isRecord(body.canon) ? body.canon : null;
  return {
    ...snapshot,
    checkpointHash,
    rootHash: canon ? pickString(canon.rootHash) : null,
  };
}

/**
 * @param {unknown} body
 * @param {string} operationId
 */
export function readReceipt(body, operationId) {
  if (!isRecord(body)) {
    return null;
  }
  const state = pickString(body.state);
  const id = pickString(body.operationId);
  if (state == null || id !== operationId) {
    return null;
  }
  return { state };
}

/**
 * @param {{
 *   identity: ReturnType<typeof assertFrozenIdentity>,
 *   request: (method: string, path: string, body?: unknown) => Promise<{ status: number, body: unknown }>,
 *   maxAttempts: number,
 *   sleep: (attempt: number) => Promise<void>,
 * }} args
 */
export async function runPublicRouteTrace(args) {
  const { identity, request, maxAttempts, sleep } = args;
  const calls = [];
  const resolutionPath = `/api/stories/${identity.storyId}/resolutions/${identity.operationId}`;

  /**
   * @param {string} method
   * @param {string} path
   * @param {unknown} [body]
   */
  async function send(method, path, body) {
    if (method === 'PUT' && path === resolutionPath) {
      const prior = calls.filter(
        (call) => call.method === 'PUT' && call.path === resolutionPath,
      );
      if (prior.length > 0) {
        throw new TraceAbort(
          'FAIL',
          'Refusing to send a second logical resolution after the frozen operation was already submitted',
        );
      }
    }
    const result = await request(method, path, body);
    calls.push({ method, path, body, status: result.status });
    assertNotAuthFailure(result.status, `${method} ${path}`);
    return result;
  }

  const draft = await send('PUT', `/api/drafts/${identity.draftId}`, {
    ...identity.draft,
    expectedRevision: 0,
  });
  if (draft.status !== 200) {
    throw new TraceAbort('FAIL', `Draft save returned ${draft.status}`);
  }

  const opening = await send(
    'PUT',
    `/api/drafts/${identity.draftId}/openings/${identity.generationId}`,
    {
      expectedRevision: 1,
      startPackage: identity.sourcePins.start ?? identity.sourcePins,
    },
  );
  if (opening.status !== 202) {
    throw new TraceAbort('FAIL', `Opening admission returned ${opening.status}`);
  }

  let openingReady = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const latest = await send(
      'GET',
      `/api/drafts/${identity.draftId}/openings/latest`,
    );
    const preview = readOpeningPreview(latest.body);
    if (
      latest.status === 200 &&
      preview?.id === identity.generationId &&
      preview.state === 'succeeded'
    ) {
      openingReady = true;
      break;
    }
    if (preview?.state === 'failed' || preview?.state === 'uncertain') {
      throw new TraceAbort(
        'FAIL',
        `Opening ${identity.generationId} ended ${preview.state}; it was not resubmitted`,
      );
    }
    if (attempt < maxAttempts) {
      await sleep(attempt);
    }
  }
  if (!openingReady) {
    throw new TraceAbort(
      'BLOCKED',
      'Opening stayed pending within the attempt bound; the same generation was not resent',
    );
  }

  const started = await send('PUT', `/api/stories/${identity.storyId}/start`, {
    candidateId: identity.generationId,
    expectedDraftRevision: 1,
    campaign: identity.campaign,
  });
  if (started.status !== 200) {
    throw new TraceAbort('FAIL', `Story start returned ${started.status}`);
  }
  const scene1Live = readStorySnapshot(started.body);
  if (
    scene1Live == null ||
    scene1Live.revision !== 1 ||
    scene1Live.passageId == null ||
    scene1Live.interactionId == null ||
    scene1Live.optionId == null
  ) {
    throw new TraceAbort(
      'FAIL',
      'Scene 1 start response did not include revision 1, a passage, an interaction and a visible option',
    );
  }

  const scene1History = await send(
    'GET',
    `/api/stories/${identity.storyId}/scenes/1`,
  );
  const scene1 = readHistoricalScene(scene1History.body);
  if (
    scene1History.status !== 200 ||
    scene1 == null ||
    scene1.checkpointHash == null ||
    scene1.passageId !== scene1Live.passageId
  ) {
    throw new TraceAbort(
      'FAIL',
      'Scene 1 checkpoint is missing, so the historical fork was not submitted',
      'historical-fork-independent-continuation',
    );
  }

  const admitted = await send('PUT', resolutionPath, {
    expectedRevision: 1,
    submission: {
      interactionId: scene1Live.interactionId,
      answer: { kind: 'choice.v1', optionId: scene1Live.optionId },
    },
  });
  if (admitted.status !== 202) {
    throw new TraceAbort('FAIL', `Resolution admission returned ${admitted.status}`);
  }

  let scene2 = null;
  let receiptState = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const receipt = await send(
      'GET',
      `/api/stories/${identity.storyId}/resolutions/${identity.operationId}/receipt`,
    );
    const parsedReceipt = readReceipt(receipt.body, identity.operationId);
    receiptState = parsedReceipt?.state ?? null;
    const current = await send('GET', `/api/stories/${identity.storyId}`);
    const snapshot = readStorySnapshot(current.body);
    if (
      receipt.status === 200 &&
      current.status === 200 &&
      snapshot != null &&
      snapshot.revision === 2 &&
      receiptState === 'settled'
    ) {
      scene2 = snapshot;
      break;
    }
    if (receiptState === 'failed' || receiptState === 'uncertain') {
      throw new TraceAbort(
        'FAIL',
        `Resolution ${identity.operationId} is ${receiptState}; a different operation was not sent`,
      );
    }
    if (attempt < maxAttempts) {
      await sleep(attempt);
    }
  }
  if (scene2 == null || scene2.passageId == null) {
    throw new TraceAbort(
      'BLOCKED',
      'Scene 2 stayed pending within the attempt bound; the frozen operation was not resent',
    );
  }

  const scene2History = await send(
    'GET',
    `/api/stories/${identity.storyId}/scenes/2`,
  );
  const scene2Checkpoint = readHistoricalScene(scene2History.body);

  const forked = await send(
    'PUT',
    `/api/stories/${identity.storyId}/forks/${identity.forkId}`,
    {
      expectedRevision: scene2.revision,
      sourcePassageId: scene1.passageId,
      sourceCheckpointHash: scene1.checkpointHash,
    },
  );
  if (forked.status !== 200) {
    throw new TraceAbort('FAIL', `Historical fork returned ${forked.status}`);
  }

  const child = await send('GET', `/api/stories/${identity.forkId}`);
  const childSnapshot = readStorySnapshot(child.body);
  const parentAfter = await send('GET', `/api/stories/${identity.storyId}`);
  const parentSnapshot = readStorySnapshot(parentAfter.body);
  const forkProved =
    child.status === 200 &&
    parentAfter.status === 200 &&
    childSnapshot?.id === identity.forkId &&
    childSnapshot.sourceStoryId === identity.storyId &&
    childSnapshot.sourcePassageId === scene1.passageId &&
    parentSnapshot?.revision === 2 &&
    parentSnapshot.passageId === scene2.passageId;

  return {
    calls,
    scene1,
    scene1Live,
    scene2,
    scene2Checkpoint,
    forkProved,
    receiptState,
  };
}
