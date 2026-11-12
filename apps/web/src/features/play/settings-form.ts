import { z } from 'zod';
import {
  creativeSettingsSchema,
  type CreativeSettings,
} from '@offscreen/contracts/campaign';

/** Lenient editor schema; submit still validates with creativeSettingsSchema. */
export const settingsEditorFormSchema = z.strictObject({
  tone: z.string().max(1200),
  emphasis: creativeSettingsSchema.shape.emphasis,
  surprises: creativeSettingsSchema.shape.surprises,
  tags: z
    .array(
      z.strictObject({
        id: z.string().max(60),
        description: z.string().max(400),
      }),
    )
    .max(16),
  guidance: z.array(z.string().max(1200)).max(4),
  presetName: z.string().max(100),
});

export type SettingsEditorFormValues = z.infer<typeof settingsEditorFormSchema>;

export function creativeToFormValues(
  creative: CreativeSettings,
  presetName = 'My storyteller',
): SettingsEditorFormValues {
  return {
    tone: creative.tone,
    emphasis: creative.emphasis,
    surprises: creative.surprises,
    tags: creative.tags.map((tag) => ({ ...tag })),
    guidance: [...creative.guidance],
    presetName,
  };
}

export function formValuesToCreative(
  values: SettingsEditorFormValues,
  profile: CreativeSettings['profile'],
): CreativeSettings {
  return creativeSettingsSchema.parse({
    profile,
    tone: values.tone,
    emphasis: values.emphasis,
    surprises: values.surprises,
    tags: values.tags,
    guidance: values.guidance.filter((entry) => entry.trim().length > 0),
  });
}
