import pg from 'pg';

export async function recordOnce(workflowId, runId) {
  const client = new pg.Client({
    host: process.env.EFFECT_HOST,
    port: 5432,
    user: process.env.EFFECT_USER,
    password: process.env.EFFECT_PASSWORD,
    database: 'lab',
  });
  await client.connect();
  try {
    await client.query(
      'INSERT INTO lab_effect (workflow_id, run_id) VALUES ($1, $2)',
      [workflowId, runId],
    );
  } finally {
    await client.end();
  }
}
