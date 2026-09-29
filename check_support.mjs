import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '192.168.1.14',
  port: 5434,
  database: 'team_contribution_db',
  user: 'postgres',
  password: 'Postgres@#2026',
});

async function run() {
  try {
    await client.connect();

    // Describe role_rights columns
    const res0 = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'role_rights' ORDER BY ordinal_position;"
    );
    console.log('role_rights columns:', res0.rows.map(r => r.column_name).join(', '));

    // Get role_rights for support ticket feature_ids
    const res1 = await client.query(
      "SELECT * FROM role_rights WHERE feature_id IN (12, 55, 56, 57, 58, 59, 60) ORDER BY feature_id ASC;"
    );
    console.log('\nRole rights for Support Ticket (feature_ids 12,55-60):');
    res1.rows.forEach(r => console.log(JSON.stringify(r)));

    // Get all role_rights for Admin role
    const res2 = await client.query(
      "SELECT * FROM role_rights WHERE role = 'Admin' ORDER BY feature_id ASC LIMIT 30;"
    );
    console.log('\nAll Admin role rights (first 30):');
    res2.rows.forEach(r => console.log(JSON.stringify(r)));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
