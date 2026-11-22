export function buildRuntimeDatabaseUrl(input) {
  const username = input.username ?? '';
  const database = input.database ?? '';
  if (!username || username.includes('_mig') || username === 'postgres') {
    throw new Error('runtime database url requires the slot runtime role');
  }
  if (!database.startsWith('dev_') || database === 'dev') {
    throw new Error('runtime database url requires the slot database');
  }
  const user = encodeURIComponent(username);
  const password = encodeURIComponent(input.password ?? '');
  const host = input.host;
  if (!host || host.includes('lab-')) throw new Error('runtime database host must be the dev postgres service');
  return `postgresql://${user}:${password}@${host}/${database}`;
}
