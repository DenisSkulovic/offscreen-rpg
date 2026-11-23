import type { CampaignView } from '@offscreen/story-interface/campaign';
import {
  storyHistorySchema,
  storyListSchema,
  storySnapshotSchema,
  type StoryHistory,
  type StoryList,
  type StorySnapshot,
} from '@offscreen/story-interface/stories';
import {
  storyLaunchStatusSchema,
  type StoryLaunchStatus,
} from '@offscreen/story-interface/story-launch';
import { offerChildren, offerNodes, pathKey } from './campaign-projections.js';

/** Strip ANSI and other C0/C1 terminal control sequences from server text. */
export function sanitizeTerminalText(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0x1b && i + 1 < text.length && text[i + 1] === '[') {
      i += 2;
      while (i < text.length && !/[A-Za-z]/.test(text.charAt(i))) {
        i++;
      }
      continue;
    }
    if (code === 0x9b) {
      i += 1;
      while (i < text.length && !/[A-Za-z]/.test(text.charAt(i))) {
        i++;
      }
      continue;
    }
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
      continue;
    }
    if (code >= 0x7f && code <= 0x9f) {
      continue;
    }
    out += text.charAt(i);
  }
  return out;
}

export function toPublicStorySnapshot(snapshot: unknown): StorySnapshot {
  return storySnapshotSchema.parse(snapshot);
}

export function toPublicStoryList(list: unknown): StoryList {
  return storyListSchema.parse(list);
}

export function toPublicStoryHistory(history: unknown): StoryHistory {
  return storyHistorySchema.parse(history);
}

export function toPublicLaunchStatus(status: unknown): StoryLaunchStatus {
  return storyLaunchStatusSchema.parse(status);
}

export function formatResolutionState(snapshot: StorySnapshot): string | null {
  const resolution = snapshot.resolution;
  if (!resolution) {
    return null;
  }
  const parts = [`Resolution: ${resolution.state}`];
  if (resolution.reason) {
    parts.push(resolution.reason);
  }
  if (resolution.blocker) {
    parts.push(`${resolution.blocker.kind} (${resolution.blocker.recovery})`);
  }
  return parts.join(' · ');
}

export function formatWaitingState(snapshot: StorySnapshot): string | null {
  if (!snapshot.waiting) {
    return null;
  }
  if (!snapshot.waiting.canControl) {
    return 'Waiting — controls locked until the interval is due.';
  }
  return `Waiting — control revision ${snapshot.waiting.controlRevision}`;
}

export function formatCampaignHolds(campaign: CampaignView): string | null {
  if (campaign.holds.length === 0) {
    return null;
  }
  return `Campaign held (${campaign.holds.map((h) => h.kind).join(', ')})`;
}

export type OfferRenderOptions = {
  path: string[];
  successorPaths: string[][];
};

export function renderSnapshotHuman(
  snapshot: StorySnapshot,
  offerPath?: OfferRenderOptions,
): string {
  const lines: string[] = [];
  const title = sanitizeTerminalText(snapshot.current.content.title);
  lines.push(title);
  lines.push('');
  for (const paragraph of snapshot.current.content.paragraphs) {
    lines.push(sanitizeTerminalText(paragraph));
    lines.push('');
  }
  const resolutionLine = formatResolutionState(snapshot);
  if (resolutionLine) {
    lines.push(resolutionLine);
    lines.push('');
  }
  const waitingLine = formatWaitingState(snapshot);
  if (waitingLine) {
    lines.push(waitingLine);
    lines.push('');
  }
  if (snapshot.campaign) {
    const holdLine = formatCampaignHolds(snapshot.campaign);
    if (holdLine) {
      lines.push(holdLine);
      lines.push('');
    }
    const nodes = offerNodes(snapshot, snapshot.campaign);
    if (nodes.length > 0 && snapshot.campaign.offer && offerPath) {
      const children = offerChildren(nodes, offerPath.path);
      lines.push('What will you do?');
      if (offerPath.path.length > 0) {
        lines.push(`(browsing: ${offerPath.path.join(' → ')})`);
      }
      for (const node of children) {
        const isCommit = Boolean(node.action);
        const browse = isCommit ? '' : ' · browse only, no time spent';
        lines.push(
          `  [${node.id}] ${sanitizeTerminalText(node.label)}${browse}`,
        );
      }
      lines.push('');
    }
  }
  const interaction = snapshot.current.interaction;
  if (interaction?.specification.kind === 'choice.v1') {
    lines.push(sanitizeTerminalText(interaction.specification.prompt));
    for (const option of interaction.specification.options) {
      lines.push(`  [${option.id}] ${sanitizeTerminalText(option.label)}`);
    }
    lines.push('');
  }
  if (
    !snapshot.resolution &&
    !interaction &&
    (!snapshot.campaign || offerNodes(snapshot, snapshot.campaign).length === 0)
  ) {
    lines.push('No choices are available right now.');
  }
  return lines.join('\n').trimEnd();
}

export function renderOfferPathKey(path: string[]): string {
  return pathKey(path);
}

export function outputContainsSecret(output: string, secret: string): boolean {
  return secret.length > 0 && output.includes(secret);
}
