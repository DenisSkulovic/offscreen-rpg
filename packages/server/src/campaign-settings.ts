import { and, eq, desc } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import type { Database } from '@offscreen/db';
import { campaign, campaignSettings, campaignCommand, storytellerPreset } from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import { campaignSettingsSchema, creativeSettingsSchema, settingsCommandSchema, type CreativeSettings, type CampaignStart } from '@offscreen/contracts/campaign';
import { storytellerCatalogue, storytellerProfileSchema, type StorytellerProfile } from '@offscreen/ai/storytellers';
import { z } from 'zod';
import { type Transaction } from './outbox';
import { lockOwnedStory, incrementStoryViewVersion, type StoryRecord } from './story-persistence';
import { StoryError, parseStoryIdentifier } from './story-errors';
import { characterSchema } from '@offscreen/contracts/campaign';
import { actionContentSchema, validateContentState } from './rules/action-content';
import { composeOpportunities } from './rules/opportunities';

export function initialCreative(profile: StorytellerProfile): CreativeSettings {
  return { profile: { id: profile.id, revision: profile.revision }, tone: profile.tone, emphasis: 'balanced', surprises: 'occasional', tags: [], guidance: [] };
}

export async function initializeCampaign(tx: Transaction, storyId: string, profile: StorytellerProfile, options: CampaignStart, seed?: { character: unknown; content: unknown }) {
  const settings = campaignSettingsSchema.parse({ revision: 1, creative: initialCreative(profile), pace: options.pace, locked: options.locked, rules: 'srd-5.2.1-subset.v1', risk: 'nonlethal' });
  if (options.mechanics && !seed) {
    throw new StoryError('invalid');
  }
  const character = seed ? characterSchema.parse(seed.character) : null;
  const content = seed ? actionContentSchema.parse(seed.content) : null;
  if (character && content) {
    validateContentState(content, character);
  }
  await tx.insert(campaign).values({ storyId, settingsRevision: 1, locked: Number(options.locked), character, content, location: null, tick: 0, offer: character && content ? composeOpportunities(content, character, false) : null });
  await tx.insert(campaignSettings).values({ storyId, revision: 1, settings, profile });
}

export async function loadCampaignSettings(tx: Transaction, storyId: string, revision: number) {
  const [row] = await tx.select().from(campaignSettings).where(and(eq(campaignSettings.storyId, storyId), eq(campaignSettings.revision, revision)));
  if (!row) throw new StoryError('conflict');
  return { settings: campaignSettingsSchema.parse(row.settings), profile: storytellerProfileSchema.parse(row.profile) };
}

export function compileCreative(profile: StorytellerProfile, creative: CreativeSettings): StorytellerProfile {
  // Keep editable data separate from the bounded catalogue profile. The additional
  // guidance goes in task context; this projection never changes capabilities.
  return storytellerProfileSchema.parse({ ...profile, tone: creative.tone, dramaticRhythm: `${profile.dramaticRhythm}\nEmphasis: ${creative.emphasis}.`.slice(0, 1200), surprisePolicy: `${profile.surprisePolicy}\nFrequency: ${creative.surprises}.`.slice(0, 1200) });
}

export async function commandReceipt(tx: Transaction, storyId: string, operationId: string, request: unknown) {
  parseStoryIdentifier(operationId);
  const [prior] = await tx.select().from(campaignCommand).where(and(eq(campaignCommand.storyId, storyId), eq(campaignCommand.operationId, operationId)));
  if (prior && !isDeepStrictEqual(prior.request, request)) throw new StoryError('conflict');
  return Boolean(prior);
}
export async function saveCommand(tx: Transaction, storyId: string, operationId: string, request: unknown) {
  await tx.insert(campaignCommand).values({ storyId, operationId, request });
}

export async function ensureCampaign(tx: Transaction, current: StoryRecord) {
  const [existing] = await tx.select().from(campaign).where(eq(campaign.storyId, current.id));
  if (existing) return existing;
  if (!current.storyteller) throw new StoryError('conflict');
  await initializeCampaign(tx, current.id, storytellerProfileSchema.parse(current.storyteller), { mechanics: false, locked: false, pace: { kind: 'rate', ticks: 1, realMs: 1000 } });
  const [created] = await tx.select().from(campaign).where(eq(campaign.storyId, current.id));
  if (!created) throw new Error('Campaign missing');
  return created;
}

export function createCampaignSettings(database: Database) {
  return {
    catalogue() {
      return storytellerCatalogue.list().map((item) => ({ ...item, creative: initialCreative(storytellerCatalogue.resolve({ id: item.id, revision: item.revision })) }));
    },
    async update(args: { ownerId: string; storyId: string; operationId: string; body: unknown }) {
      const parsed = settingsCommandSchema.safeParse(args.body);
      if (!parsed.success) throw new StoryError('invalid');
      await database.db.transaction(async (tx) => {
        const current = await lockOwnedStory(tx, args);
        const request = { kind: 'settings', ...parsed.data };
        if (await commandReceipt(tx, current.id, args.operationId, request)) return;
        const state = await ensureCampaign(tx, current);
        if (state.locked || state.settingsRevision !== parsed.data.expectedRevision) throw new StoryError('conflict');
        const previous = await loadCampaignSettings(tx, current.id, state.settingsRevision);
        let profile: StorytellerProfile;
        if (parsed.data.presetId) {
          const [preset] = await tx.select().from(storytellerPreset).where(and(eq(storytellerPreset.id, parsed.data.presetId), eq(storytellerPreset.ownerId, args.ownerId)));
          if (!preset) throw new StoryError('not_found');
          profile = storytellerProfileSchema.parse(preset.profile);
          if (profile.id !== parsed.data.creative.profile.id || profile.revision !== parsed.data.creative.profile.revision) throw new StoryError('invalid');
        } else if (previous.profile.id === parsed.data.creative.profile.id && previous.profile.revision === parsed.data.creative.profile.revision) {
          profile = previous.profile;
        } else {
          try { profile = storytellerCatalogue.resolve(parsed.data.creative.profile); } catch { throw new StoryError('invalid'); }
        }
        const revision = state.settingsRevision + 1;
        const settings = campaignSettingsSchema.parse({ ...previous.settings, revision, creative: parsed.data.creative });
        await tx.insert(campaignSettings).values({ storyId: current.id, revision, settings, profile });
        await tx.update(campaign).set({ settingsRevision: revision }).where(eq(campaign.storyId, current.id));
        await tx.update(story).set({ storyteller: compileCreative(profile, settings.creative) }).where(eq(story.id, current.id));
        await saveCommand(tx, current.id, args.operationId, request);
        await incrementStoryViewVersion(tx, { storyId: current.id, viewVersion: current.viewVersion + 1 });
      });
    },
    async history(args: { ownerId: string; storyId: string }) {
      return database.db.transaction(async (tx) => {
        const current = await lockOwnedStory(tx, args);
        const rows = await tx.select().from(campaignSettings).where(eq(campaignSettings.storyId, current.id)).orderBy(desc(campaignSettings.revision)).limit(20);
        return rows.map((row) => ({ settings: campaignSettingsSchema.parse(row.settings), createdAt: row.createdAt.toISOString() }));
      });
    },
    async presets(ownerId: string) {
      const rows = await database.db.select().from(storytellerPreset).where(eq(storytellerPreset.ownerId, ownerId)).limit(50);
      return rows.map((row) => ({ id: row.id, name: row.name, creative: creativeSettingsSchema.parse(row.creative) }));
    },
    async savePreset(args: { ownerId: string; id: string; body: unknown }) {
      const parsed = z.strictObject({ name: z.string().trim().min(1).max(100), creative: creativeSettingsSchema }).safeParse(args.body);
      if (!parsed.success) throw new StoryError('invalid');
      const id = parseStoryIdentifier(args.id);
      let profile;
      try { profile = storytellerCatalogue.resolve(parsed.data.creative.profile); } catch { throw new StoryError('invalid'); }
      await database.db.transaction(async (tx) => {
        const [prior] = await tx.select().from(storytellerPreset).where(eq(storytellerPreset.id, id));
        if (prior) {
          if (prior.ownerId !== args.ownerId) throw new StoryError('not_found');
          if (prior.name !== parsed.data.name || !isDeepStrictEqual(prior.creative, parsed.data.creative)) throw new StoryError('conflict');
          return;
        }
        await tx.insert(storytellerPreset).values({ id, ownerId: args.ownerId, ...parsed.data, profile });
      });
      return { id, ...parsed.data };
    },
  };
}
