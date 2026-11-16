import { tokenize } from './search.mjs';

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function choiceScore(questionTokens, choice) {
  const label = new Set(tokenize(choice.label));
  const heading = new Set(tokenize(choice.headingText ?? ''));
  const slug = new Set(tokenize(choice.to.replaceAll('/', ' ').replaceAll('-', ' ')));
  let labelHits = 0;
  let headingHits = 0;
  let slugHits = 0;
  for (const token of questionTokens) {
    if (label.has(token)) labelHits += 1;
    if (heading.has(token)) headingHits += 1;
    if (slug.has(token)) slugHits += 1;
  }
  return labelHits * 3 + headingHits * 2 + slugHits;
}

function visibleChoices(page, edges, headingText) {
  return edges
    .filter((edge) => edge.from === page && edge.kind !== 'image' && edge.kind !== 'observed-in')
    .map((edge) => ({
      to: edge.to,
      label: edge.label,
      headingText: headingText.get(`${edge.from}#${edge.fromHeading ?? ''}`) ?? '',
      kind: edge.kind,
    }))
    .sort((a, b) => a.to.localeCompare(b.to) || a.label.localeCompare(b.label));
}

/**
 * One walk. Gold is not an argument. Returns the page path and diagnostics.
 */
export function walkHopper({ start, edges, headingText, question, policy, random, hopCap = 6, target = null }) {
  const questionTokens = tokenize(question);
  const trail = [start];
  let hops = 0;
  let backtracks = 0;
  let loops = 0;
  let wrongAuthority = false;
  const blocked = new Set();
  while (hops < hopCap) {
    const page = trail.at(-1);
    const choices = visibleChoices(page, edges, headingText).filter(
      (choice) => !blocked.has(`${page}->${choice.to}`) && !trail.includes(choice.to),
    );
    if (choices.length === 0) {
      if (trail.length === 1) break;
      const abandoned = trail.pop();
      blocked.add(`${trail.at(-1)}->${abandoned}`);
      backtracks += 1;
      continue;
    }
    const ranked = choices
      .map((choice) => ({ ...choice, score: choiceScore(questionTokens, choice) }))
      .sort((a, b) => b.score - a.score || a.to.localeCompare(b.to) || a.label.localeCompare(b.label));
    const useful = ranked.filter((choice) => choice.score > 0);
    const pool = policy === 'random' ? choices : useful;
    if (pool.length === 0) {
      if (trail.length === 1) break;
      const abandoned = trail.pop();
      blocked.add(`${trail.at(-1)}->${abandoned}`);
      backtracks += 1;
      continue;
    }
    let next;
    if (policy === 'greedy') next = pool[0];
    else if (policy === 'random') next = pool[Math.floor(random() * pool.length)];
    else {
      const top = pool.slice(0, 3);
      const weight = top.reduce((sum, choice) => sum + choice.score, 0);
      let draw = random() * weight;
      next = top[top.length - 1];
      for (const choice of top) {
        draw -= choice.score;
        if (draw <= 0) {
          next = choice;
          break;
        }
      }
    }
    if (trail.includes(next.to)) loops += 1;
    if (next.kind === 'historic-citation' || next.kind === 'evidence-citation') wrongAuthority = true;
    trail.push(next.to);
    hops += 1;
    if (target && next.to === target) break;
  }
  return { trail, hops, backtracks, loops, wrongAuthority };
}

export function summarizeHopper({ start, edges, headingText, question, target, seed, trials = 100 }) {
  const greedy = walkHopper({
    start,
    edges,
    headingText,
    question,
    policy: 'greedy',
    random: () => 0,
    target,
  });
  const stochastic = [];
  const randomWalks = [];
  for (let trial = 0; trial < trials; trial += 1) {
    stochastic.push(
      walkHopper({
        start,
        edges,
        headingText,
        question,
        policy: 'stochastic',
        random: mulberry32(seedFrom(`${seed}:stochastic:${question}:${trial}`)),
        target,
      }),
    );
    randomWalks.push(
      walkHopper({
        start,
        edges,
        headingText,
        question,
        policy: 'random',
        random: mulberry32(seedFrom(`${seed}:random:${question}:${trial}`)),
        target,
      }),
    );
  }
  function hits(walks) {
    const reached = walks.map((walk) => walk.trail.indexOf(target)).map((index) => (index === -1 ? null : index));
    const within = (cap) => reached.filter((index) => index !== null && index <= cap).length / walks.length;
    const successful = reached.filter((index) => index !== null);
    return {
      hitAt3: within(3),
      hitAt6: within(6),
      medianHopsWhenHit: median(successful),
      loops: walks.filter((walk) => walk.loops > 0).length / walks.length,
      backtracks: walks.reduce((sum, walk) => sum + walk.backtracks, 0) / walks.length,
      wrongAuthority: walks.filter((walk) => walk.wrongAuthority).length / walks.length,
    };
  }
  return {
    greedy: {
      hit: greedy.trail.includes(target),
      hops: greedy.trail.includes(target) ? greedy.trail.indexOf(target) : null,
      trail: greedy.trail,
      loops: greedy.loops,
      backtracks: greedy.backtracks,
      wrongAuthority: greedy.wrongAuthority,
    },
    stochastic: hits(stochastic),
    random: hits(randomWalks),
  };
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Visible-link score. `body` is ignored on purpose: the destination text is not known before the click.
 * @param {'label'|'row'} contextMode
 */
export function scoreVisibleChoice(questionTokens, choice, contextMode) {
  const label = new Set(tokenize(choice.label));
  const heading = new Set(tokenize(choice.headingText ?? ''));
  const row = new Set(tokenize(contextMode === 'row' ? (choice.rowContext ?? '') : ''));
  const slug = new Set(tokenize(String(choice.to).replaceAll('/', ' ').replaceAll('-', ' ')));
  let labelHits = 0;
  let headingHits = 0;
  let rowHits = 0;
  let slugHits = 0;
  for (const token of questionTokens) {
    if (label.has(token)) labelHits += 1;
    if (heading.has(token)) headingHits += 1;
    if (row.has(token)) rowHits += 1;
    if (slug.has(token)) slugHits += 1;
  }
  return labelHits * 3 + headingHits * 2 + rowHits * 2 + slugHits;
}

function choicesFrom(page, edges, headingText) {
  return edges
    .filter((edge) => edge.from === page && edge.kind !== 'image' && edge.kind !== 'observed-in')
    .map((edge) => ({
      to: edge.to,
      label: edge.label,
      headingText: headingText.get(`${edge.from}#${edge.fromHeading ?? ''}`) ?? edge.headingText ?? '',
      rowContext: edge.context ?? '',
      kind: edge.kind,
    }))
    .sort((a, b) => a.to.localeCompare(b.to) || a.label.localeCompare(b.label));
}

/**
 * Chronological walk. hitForwardOpens counts every click, including branches that are later abandoned.
 * A short final stack is not a short browse. Revisits already on the stack are prevented and counted.
 */
export function walkHopperV2({
  start,
  edges,
  headingText,
  question,
  policy,
  random,
  hopCap = 8,
  target = null,
  contextMode = 'row',
}) {
  const questionTokens = tokenize(question);
  const stack = [start];
  const events = [{ type: 'open', page: start, forwardOpen: 0 }];
  let forwardOpens = 0;
  let backtracks = 0;
  let preventedRevisits = 0;
  let wrongAuthority = false;
  let stopped = null;
  let hitForwardOpens = null;
  const blocked = new Set();

  while (forwardOpens < hopCap && stopped === null) {
    const page = stack.at(-1);
    const visible = choicesFrom(page, edges, headingText);
    const revisits = visible.filter(
      (choice) => stack.includes(choice.to) && !blocked.has(`${page}->${choice.to}`),
    );
    if (revisits.length > 0) {
      preventedRevisits += revisits.length;
      events.push({ type: 'loop-prevention', page, count: revisits.length });
    }
    const choices = visible.filter(
      (choice) => !blocked.has(`${page}->${choice.to}`) && !stack.includes(choice.to),
    );
    const ranked = choices
      .map((choice) => ({ ...choice, score: scoreVisibleChoice(questionTokens, choice, contextMode) }))
      .sort((a, b) => b.score - a.score || a.to.localeCompare(b.to) || a.label.localeCompare(b.label));
    const useful = ranked.filter((choice) => choice.score > 0);
    const pool = policy === 'random' ? ranked : useful;
    if (pool.length === 0) {
      if (stack.length === 1) {
        stopped = 'no-candidate';
        events.push({ type: 'stop', page, reason: stopped });
        break;
      }
      const abandoned = stack.pop();
      blocked.add(`${stack.at(-1)}->${abandoned}`);
      backtracks += 1;
      events.push({ type: 'backtrack', from: abandoned, to: stack.at(-1) });
      continue;
    }
    let next;
    if (policy === 'greedy') next = pool[0];
    else if (policy === 'random') next = pool[Math.floor(random() * pool.length)];
    else {
      const top = pool.slice(0, 3);
      const weight = top.reduce((sum, choice) => sum + choice.score, 0);
      let draw = random() * weight;
      next = top[top.length - 1];
      for (const choice of top) {
        draw -= choice.score;
        if (draw <= 0) {
          next = choice;
          break;
        }
      }
    }
    if (next.kind === 'historic-citation' || next.kind === 'evidence-citation') wrongAuthority = true;
    stack.push(next.to);
    forwardOpens += 1;
    events.push({ type: 'click', page: next.to, forwardOpen: forwardOpens });
    if (target && next.to === target) {
      hitForwardOpens = forwardOpens;
      stopped = 'found';
      events.push({ type: 'stop', page: next.to, reason: 'found' });
    }
  }
  if (stopped === null) {
    stopped = 'cap';
    events.push({ type: 'stop', page: stack.at(-1), reason: 'cap' });
  }
  return {
    route: stack,
    events,
    forwardOpens,
    hitForwardOpens,
    hit: hitForwardOpens !== null,
    backtracks,
    preventedRevisits,
    wrongAuthority,
    stopped,
    routeEdges: Math.max(0, stack.length - 1),
  };
}

function rate(walks, predicate) {
  if (walks.length === 0) return null;
  return walks.filter(predicate).length / walks.length;
}

export function summarizeHopperV2({
  start,
  edges,
  headingText,
  question,
  target,
  seed,
  trials = 100,
  contextMode = 'row',
}) {
  function many(policy, tag) {
    const walks = [];
    for (let trial = 0; trial < trials; trial += 1) {
      walks.push(
        walkHopperV2({
          start,
          edges,
          headingText,
          question,
          policy,
          random: mulberry32(seedFrom(`${seed}:${contextMode}:${tag}:${question}:${trial}`)),
          target,
          contextMode,
        }),
      );
    }
    return walks;
  }
  const greedy = walkHopperV2({
    start,
    edges,
    headingText,
    question,
    policy: 'greedy',
    random: () => 0,
    target,
    contextMode,
  });
  const stochastic = many('stochastic', 'stochastic');
  const randomWalks = many('random', 'random');
  function pack(walks) {
    return {
      hitAt3: rate(walks, (walk) => walk.hit && walk.hitForwardOpens <= 3),
      hitAt6: rate(walks, (walk) => walk.hit && walk.hitForwardOpens <= 6),
      medianForwardOpensWhenHit: median(
        walks.filter((walk) => walk.hit).map((walk) => walk.hitForwardOpens),
      ),
      backtracks: walks.reduce((sum, walk) => sum + walk.backtracks, 0) / walks.length,
      preventedRevisits: walks.reduce((sum, walk) => sum + walk.preventedRevisits, 0) / walks.length,
      noCandidate: rate(walks, (walk) => walk.stopped === 'no-candidate'),
      wrongAuthority: rate(walks, (walk) => walk.wrongAuthority),
    };
  }
  return {
    contextMode,
    loopAccounting: 'prevented-revisits',
    greedy: {
      hit: greedy.hit,
      hitAt3: greedy.hit && greedy.hitForwardOpens <= 3,
      forwardOpens: greedy.hitForwardOpens,
      routeEdges: greedy.routeEdges,
      route: greedy.route,
      events: greedy.events,
      backtracks: greedy.backtracks,
      preventedRevisits: greedy.preventedRevisits,
      stopped: greedy.stopped,
      wrongAuthority: greedy.wrongAuthority,
    },
    stochastic: pack(stochastic),
    random: pack(randomWalks),
  };
}
