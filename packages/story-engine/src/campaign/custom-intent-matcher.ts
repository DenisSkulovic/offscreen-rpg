/**
 * GM01: provider-free template-first custom intent matcher.
 * Never mutates game state; never invents hidden targets or DC.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';

export const customIntentPublicTargetSchema = z.strictObject({
  handle: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
});

export type CustomIntentPublicTarget = z.infer<
  typeof customIntentPublicTargetSchema
>;

const inspectFamily = z.literal('inspect');

export const customIntentMatchSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('reviewable'),
    family: inspectFamily,
    targetHandle: z.string().min(1).max(80),
    targetLabel: z.string().min(1).max(120),
    publicSummary: z.string().min(1).max(400),
    estimatedDurationSeconds: z.number().int().positive(),
    publicRisk: z.literal('observation'),
    interpreter: z.literal('template.v1'),
  }),
  z.strictObject({
    status: z.literal('clarify'),
    question: z.string().min(1).max(240),
    options: z
      .array(
        z.strictObject({
          handle: z.string().min(1).max(80),
          label: z.string().min(1).max(120),
        }),
      )
      .min(2)
      .max(8),
    interpreter: z.literal('template.v1'),
  }),
  z.strictObject({
    status: z.literal('rejected'),
    reason: z.string().min(1).max(240),
    interpreter: z.literal('template.v1'),
  }),
  z.strictObject({
    status: z.literal('unsupported'),
    reason: z.string().min(1).max(240),
    interpreter: z.literal('template.v1'),
  }),
]);

export type CustomIntentMatch = z.infer<typeof customIntentMatchSchema>;

const REJECT_PATTERNS: { re: RegExp; reason: string }[] = [
  {
    re: /\bi already (have|won|got|own)\b/i,
    reason: 'Cannot rewrite established history or quantities.',
  },
  {
    re: /\b(set|make)\b.+\b(true|false|=)\b/i,
    reason: 'Cannot directly mutate game state from free text.',
  },
  {
    re: /\bignore\b.+\b(instruction|developer|system)\b/i,
    reason: 'Cannot override system instructions.',
  },
  {
    re: /\b(disclose|reveal|show)\b.+\b(hidden|secret|dc|prompt)\b/i,
    reason: 'Cannot request hidden mechanical or prompt data.',
  },
  {
    re: /\b(execute|run)\b.+\b(sql|script|code)\b/i,
    reason: 'Cannot run instructions or code.',
  },
  {
    re: /\b(another|other)\s+player'?s?\b|\bcontrol\b.+\bcharacter\b/i,
    reason: 'Cannot control another actor.',
  },
  {
    re: /\bin another story\b|\bcross[- ]story\b/i,
    reason: 'Cannot target another story.',
  },
  {
    re: /\b(someone else'?s|other character'?s)\b.+\b(inventory|items?)\b/i,
    reason: 'Cannot inspect unauthorized private inventory.',
  },
];

const UNSUPPORTED_FAMILY: { re: RegExp; reason: string }[] = [
  { re: /\b(tell|ask|talk|joke|speak|persuade|convince)\b/i, reason: 'Speech and persuasion are not in the first inspect family.' },
  { re: /\b(steal|theft|pickpocket)\b/i, reason: 'Theft is not in the first inspect family.' },
  { re: /\b(distract|escape|flee)\b/i, reason: 'Multi-step or escape actions are unsupported.' },
  { re: /\b(wait|sunrise|until)\b/i, reason: 'Extended waiting is unsupported.' },
  { re: /\b(repeat|routine|all day|shift)\b/i, reason: 'Standing routines are unsupported.' },
  { re: /\b(continue|resume)\b.+\b(action|interrupted)\b/i, reason: 'Resume is unsupported.' },
  { re: /\b(fight|attack|combat)\b/i, reason: 'Combat is unsupported.' },
  { re: /\b(fly|teleport|moon|travel)\b/i, reason: 'Travel/magic movement is unsupported.' },
  { re: /\band\b.+\b(steal|escape|attack)\b/i, reason: 'Multi-action intents are unsupported.' },
];

const INSPECT_PREFIX =
  /^(?:could i\s+)?(?:please\s+)?(?:try to\s+)?(?:inspect|examine|look at|look over|check out)\s+/i;

function normalizeIntentText(raw: string): string | null {
  const trimmed = raw.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const codepoints = [...trimmed];
  if (codepoints.length > 240) return null;
  return trimmed;
}

function canonicalizeTargetKey(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/^(the|a|an)\s+/i, '')
    .trim();
}

function targetKeysOverlap(remainderKey: string, targetKey: string) {
  if (!remainderKey || !targetKey) return false;
  if (
    remainderKey === targetKey ||
    targetKey.includes(remainderKey) ||
    remainderKey.includes(targetKey)
  ) {
    return true;
  }
  const remainderParts = new Set(remainderKey.split(' ').filter(Boolean));
  const targetParts = targetKey.split(' ').filter(Boolean);
  return targetParts.some((part) => part.length >= 4 && remainderParts.has(part));
}

export function hashCustomIntentRequest(input: {
  storyId: string;
  viewerId: string;
  narrativeRevision: number;
  passageId: string;
  text: string;
  targetHandles: readonly string[];
}) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        storyId: input.storyId,
        viewerId: input.viewerId,
        narrativeRevision: input.narrativeRevision,
        passageId: input.passageId,
        text: input.text,
        targetHandles: [...input.targetHandles].sort(),
      }),
    )
    .digest('hex');
}

export function matchCustomIntentTemplate(input: {
  text: string;
  publicTargets: readonly CustomIntentPublicTarget[];
}): CustomIntentMatch {
  const normalized = normalizeIntentText(input.text);
  if (normalized === null) {
    return customIntentMatchSchema.parse({
      status: 'rejected',
      reason: 'Intent text must be 1–240 characters after normalization.',
      interpreter: 'template.v1',
    });
  }

  for (const rule of REJECT_PATTERNS) {
    if (rule.re.test(normalized)) {
      return customIntentMatchSchema.parse({
        status: 'rejected',
        reason: rule.reason,
        interpreter: 'template.v1',
      });
    }
  }

  const targets = input.publicTargets.map((target) =>
    customIntentPublicTargetSchema.parse(target),
  );

  const inspectMatch = normalized.match(INSPECT_PREFIX);
  if (inspectMatch) {
    const remainder = normalized.slice(inspectMatch[0].length).trim();
    if (!remainder || /^(that|it|this)$/i.test(remainder)) {
      if (targets.length >= 2) {
        return customIntentMatchSchema.parse({
          status: 'clarify',
          question: 'Which visible thing do you want to inspect?',
          options: targets.slice(0, 8).map((target) => ({
            handle: target.handle,
            label: target.label,
          })),
          interpreter: 'template.v1',
        });
      }
      return customIntentMatchSchema.parse({
        status: 'unsupported',
        reason: 'No explicit public inspect target is available.',
        interpreter: 'template.v1',
      });
    }

    if (/\band\b/i.test(remainder)) {
      return customIntentMatchSchema.parse({
        status: 'unsupported',
        reason: 'Multi-action intents are unsupported.',
        interpreter: 'template.v1',
      });
    }

    const remainderKey = canonicalizeTargetKey(remainder);
    const matched = targets.filter((target) => {
      const labelKey = canonicalizeTargetKey(target.label);
      const handleKey = canonicalizeTargetKey(target.handle);
      return (
        targetKeysOverlap(remainderKey, labelKey) ||
        targetKeysOverlap(remainderKey, handleKey)
      );
    });

    if (matched.length === 1) {
      const target = matched[0]!;
      return customIntentMatchSchema.parse({
        status: 'reviewable',
        family: 'inspect',
        targetHandle: target.handle,
        targetLabel: target.label,
        publicSummary: `You would attempt to examine ${target.label}. It may take a short look and is an observation only. Success is not guaranteed.`,
        estimatedDurationSeconds: 10,
        publicRisk: 'observation',
        interpreter: 'template.v1',
      });
    }
    if (matched.length > 1) {
      return customIntentMatchSchema.parse({
        status: 'clarify',
        question: 'Which visible thing do you want to inspect?',
        options: matched.slice(0, 8).map((target) => ({
          handle: target.handle,
          label: target.label,
        })),
        interpreter: 'template.v1',
      });
    }

    if (/secret|hidden|assassin|private/i.test(remainder)) {
      return customIntentMatchSchema.parse({
        status: 'unsupported',
        reason: 'That target is not a declared public inspect handle.',
        interpreter: 'template.v1',
      });
    }

    return customIntentMatchSchema.parse({
      status: 'unsupported',
      reason: 'That target is not a declared public inspect handle.',
      interpreter: 'template.v1',
    });
  }

  for (const rule of UNSUPPORTED_FAMILY) {
    if (rule.re.test(normalized)) {
      return customIntentMatchSchema.parse({
        status: 'unsupported',
        reason: rule.reason,
        interpreter: 'template.v1',
      });
    }
  }

  return customIntentMatchSchema.parse({
    status: 'unsupported',
    reason: 'No supported template matched this intent.',
    interpreter: 'template.v1',
  });
}
