export function isStoryLaunchEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.STORY_LAUNCH_ENABLED === 'true';
}
