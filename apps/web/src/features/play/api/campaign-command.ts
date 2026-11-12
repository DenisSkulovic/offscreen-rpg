import type { StorySnapshot } from '@offscreen/contracts/stories';

/** Presentation-facing campaign command surface (frozen mutation lives in the hook). */
export type CampaignCommandApi = {
  send: (route?: string, body?: unknown) => void;
  busy: boolean;
  message: string;
  retry: boolean;
};

export type CampaignSnapshotHandler = (story: StorySnapshot) => void;
