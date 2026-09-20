import { z } from 'zod';

export const campaignReportSourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('activity'),
    activityId: z.uuid(),
    activityRevision: z.number().int().nonnegative(),
  }),
  z.strictObject({
    kind: z.literal('world-obligation'),
    obligationId: z.uuid(),
    obligationRevision: z.number().int().positive(),
  }),
]);
export type CampaignReportSource = z.infer<typeof campaignReportSourceSchema>;

export function campaignReportSourceKey(source: CampaignReportSource) {
  return source.kind === 'activity'
    ? `activity:${source.activityId}:${source.activityRevision}`
    : `world-obligation:${source.obligationId}:${source.obligationRevision}`;
}
