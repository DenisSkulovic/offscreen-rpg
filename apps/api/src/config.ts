import { z } from 'zod';

const schema = z.object({
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .prefault('3001'),
});

export function readConfig(env: Record<string, string | undefined>) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    // Report field names only; future configuration may contain credentials.
    throw new Error(
      `Invalid API configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  return { host: parsed.data.API_HOST, port: parsed.data.API_PORT };
}
