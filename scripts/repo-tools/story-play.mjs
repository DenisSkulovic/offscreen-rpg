import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const command = args.shift();
const origin =
  option('--origin') ??
  process.env['OFFSCREEN_STORY_ORIGIN'] ??
  'http://127.0.0.1:3001';
const appOrigin =
  process.env['OFFSCREEN_STORY_APP_ORIGIN'] ?? 'http://127.0.0.1:3100';
const evidenceRoot = join(process.cwd(), 'data', 'story-agent');
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const live = args.includes('--confirm-live');
const usage =
  'Usage: pnpm story:play <server|list|profiles|starts|show ID|history ID|new [options] --confirm-live|choose ID OPTION --confirm-live|wait ID|retry ID --confirm-live>';

function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--'))
    throw new Error(`${name} requires a value`);
  args.splice(index, 2);
  return value;
}

function requireLive(action) {
  if (!live) {
    throw new Error(
      `${action} may dispatch paid Storyteller work; repeat with --confirm-live after reviewing status and choices`,
    );
  }
}

async function request(path, init = {}) {
  const method = init.method ?? 'GET';
  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(method === 'GET' ? {} : { origin: new URL(appOrigin).origin }),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { text };
    }
  }
  if (!response.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${path} failed (${response.status}): ${JSON.stringify(body)}`,
    );
  }
  return body;
}

function summarize(snapshot) {
  const narrative = snapshot.current?.interaction?.specification;
  const offer = snapshot.campaign?.offer;
  return {
    storyId: snapshot.id,
    revision: snapshot.revision,
    viewVersion: snapshot.viewVersion,
    title: snapshot.current?.content?.title ?? null,
    paragraphs: snapshot.current?.content?.paragraphs ?? [],
    tick: snapshot.campaign?.tick ?? null,
    worldTime: snapshot.campaign?.worldTime?.label ?? null,
    resolution: snapshot.resolution,
    waiting: snapshot.waiting,
    holds: snapshot.campaign?.holds ?? [],
    actionExecution: snapshot.campaign?.actionExecution ?? null,
    activity: snapshot.campaign?.activity ?? null,
    narrativeChoices:
      narrative?.kind === 'choice.v1'
        ? narrative.options.map(({ id, label, description, risk }) => ({
            id,
            label,
            description,
            risk,
          }))
        : [],
    campaignChoices: offer
      ? offer.nodes.map(({ id, parent, label, description, risk, action }) => ({
          path: pathFor(offer.nodes, id).join('/'),
          id,
          parent,
          label,
          description,
          risk,
          timing: action?.timing ?? null,
          selectable: Boolean(action),
        }))
      : [],
    usage: snapshot.usage ?? null,
  };
}

function pathFor(nodes, id) {
  const path = [];
  let current = nodes.find((node) => node.id === id);
  while (current) {
    path.unshift(current.id);
    current =
      current.parent === null
        ? undefined
        : nodes.find((node) => node.id === current.parent);
  }
  return path;
}

async function record(kind, value, storyId = 'catalogue') {
  const path = join(evidenceRoot, `${storyId}.jsonl`);
  await mkdir(dirname(path), { recursive: true });
  await appendFile(
    path,
    `${JSON.stringify({ at: new Date().toISOString(), kind, value })}\n`,
    { encoding: 'utf8' },
  );
  return path;
}

async function readStory(storyId) {
  if (!uuid.test(storyId)) throw new Error('story id must be a UUID');
  return request(`/api/stories/${storyId}`);
}

async function waitForStory(
  storyId,
  before,
  timeoutMs = 120_000,
  requireChange = true,
) {
  const deadline = Date.now() + timeoutMs;
  let latest = await readStory(storyId);
  while (Date.now() < deadline) {
    const changed =
      latest.viewVersion !== before.viewVersion ||
      latest.revision !== before.revision;
    const active =
      latest.resolution &&
      ['pending', 'running'].includes(latest.resolution.state);
    const execution = latest.campaign?.actionExecution;
    const interval = latest.waiting;
    if ((!requireChange || changed) && !active && !execution && !interval)
      return latest;
    if (
      latest.resolution &&
      ['failed', 'uncertain', 'blocked'].includes(latest.resolution.state)
    )
      return latest;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    latest = await readStory(storyId);
  }
  return latest;
}

async function createStory() {
  requireLive('new');
  const startId = option('--start') ?? 'seyda-neen-arrival.v1';
  const profileId = option('--profile') ?? 'driven-adventure';
  const characterName = option('--character') ?? 'Player';
  const direction = option('--direction') ?? '';
  const paceName = option('--pace') ?? 'steady';
  const pace = {
    slow: { kind: 'rate', fictionalSeconds: 1, realSeconds: 60 },
    steady: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
    fast: { kind: 'rate', fictionalSeconds: 10, realSeconds: 1 },
    instant: { kind: 'instant' },
  }[paceName];
  if (!pace) throw new Error('--pace must be slow, steady, fast, or instant');
  const [catalogue, profiles] = await Promise.all([
    request(
      '/api/drafts/00000000-0000-4000-8000-000000000000/openings/catalogue',
    ),
    request('/api/storytellers'),
  ]);
  const start = catalogue.entries.find((entry) => entry.id === startId);
  const profile = profiles.items.find((entry) => entry.id === profileId);
  if (!start) throw new Error(`unknown prepared start ${startId}`);
  if (!profile) throw new Error(`unknown storyteller ${profileId}`);
  const draftId = randomUUID();
  const draft = await request(`/api/drafts/${draftId}`, {
    method: 'PUT',
    body: JSON.stringify({
      expectedRevision: 0,
      storyteller: { id: profile.id, revision: profile.revision },
      openingContentId: start.id,
      characterName,
      title: start.draft?.title ?? '',
      premise: start.draft?.premise ?? '',
      storytellingDirection:
        direction || start.draft?.storytellingDirection || '',
    }),
  });
  const openingId = randomUUID();
  await request(`/api/drafts/${draftId}/openings/${openingId}`, {
    method: 'PUT',
    body: JSON.stringify({
      expectedRevision: draft.revision,
      contentId: start.id,
    }),
  });
  let preview;
  for (let read = 0; read < 120; read++) {
    const latest = await request(`/api/drafts/${draftId}/openings/latest`);
    preview = latest.preview;
    if (preview && !['pending', 'running'].includes(preview.state)) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!preview || preview.state !== 'succeeded' || !preview.candidate) {
    const path = await record('opening-terminal', {
      draftId,
      openingId,
      preview,
    });
    throw new Error(`opening did not succeed; evidence: ${path}`);
  }
  const storyId = randomUUID();
  const snapshot = await request(`/api/stories/${storyId}/start`, {
    method: 'PUT',
    body: JSON.stringify({
      candidateId: preview.id,
      expectedDraftRevision: draft.revision,
      campaign: {
        mechanics: true,
        locked: false,
        pace,
        ...(preview.startPackage ? { startPackage: preview.startPackage } : {}),
      },
    }),
  });
  const summary = summarize(snapshot);
  const path = await record(
    'created',
    { draftId, openingId, profile, startId, summary },
    storyId,
  );
  return { ...summary, evidencePath: path };
}

async function choose(storyId, selection) {
  requireLive('choose');
  const before = await readStory(storyId);
  const narrative = before.current?.interaction?.specification;
  const path = selection.split('/').filter(Boolean);
  const offer = before.campaign?.offer;
  const leaf = offer?.nodes.find((node) => node.id === path.at(-1));
  const campaignSelection =
    offer &&
    leaf?.action &&
    pathFor(offer.nodes, leaf.id).join('/') === path.join('/');
  let admitted;
  if (campaignSelection) {
    admitted = await request(
      `/api/stories/${storyId}/actions/${randomUUID()}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          expectedRevision: before.revision,
          offerId: offer.id,
          path,
        }),
      },
    );
  } else if (
    narrative?.kind === 'choice.v1' &&
    narrative.options.some((option) => option.id === selection)
  ) {
    admitted = await request(
      `/api/stories/${storyId}/resolutions/${randomUUID()}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          expectedRevision: before.revision,
          submission: {
            interactionId: before.current.interaction.id,
            answer: { kind: 'choice.v1', optionId: selection },
          },
        }),
      },
    );
  } else {
    throw new Error(
      `selection is not a current narrative option or selectable campaign path: ${selection}`,
    );
  }
  const final = await waitForStory(storyId, before);
  const summary = summarize(final);
  const evidencePath = await record(
    'choice',
    { selection, admitted: summarize(admitted), final: summary },
    storyId,
  );
  return { ...summary, evidencePath };
}

async function retry(storyId) {
  requireLive('retry');
  const before = await readStory(storyId);
  if (!before.resolution?.canRetry || before.campaign?.actionExecution) {
    throw new Error('current snapshot does not authorize retry');
  }
  const admitted = await request(
    `/api/stories/${storyId}/retries/${randomUUID()}`,
    {
      method: 'PUT',
      body: '{}',
    },
  );
  const final = await waitForStory(storyId, before);
  const summary = summarize(final);
  const path = await record(
    'retry',
    { admitted: summarize(admitted), final: summary },
    storyId,
  );
  return { ...summary, evidencePath: path };
}

async function main() {
  let result;
  if (
    !command ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    console.log(usage);
    return;
  } else if (command === 'server') {
    const status = JSON.parse(
      await readFile(join(evidenceRoot, 'server.json'), 'utf8'),
    );
    const identity = await request('/api/me');
    result = {
      ...status,
      reachable: true,
      identity: { id: identity.id, email: identity.email },
    };
  } else if (command === 'list') result = await request('/api/stories');
  else if (command === 'profiles') result = await request('/api/storytellers');
  else if (command === 'starts')
    result = await request(
      '/api/drafts/00000000-0000-4000-8000-000000000000/openings/catalogue',
    );
  else if (command === 'show') {
    const storyId = args.shift();
    result = summarize(await readStory(storyId));
    result.evidencePath = await record('observed', result, storyId);
  } else if (command === 'history') {
    const storyId = args.shift();
    result = await request(`/api/stories/${storyId}/history`);
    result.evidencePath = await record('history', result, storyId);
  } else if (command === 'new') result = await createStory();
  else if (command === 'choose')
    result = await choose(args.shift(), args.shift());
  else if (command === 'wait') {
    const storyId = args.shift();
    const before = await readStory(storyId);
    result = summarize(await waitForStory(storyId, before, 120_000, false));
    result.evidencePath = await record('waited', result, storyId);
  } else if (command === 'retry') result = await retry(args.shift());
  else {
    throw new Error(usage);
  }
  console.log(JSON.stringify(result, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
