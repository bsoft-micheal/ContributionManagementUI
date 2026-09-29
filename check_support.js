const { Client } = require('pg');

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

    // Get all navigation menus where parent_id = 12 (Support Ticket module children)
    const res1 = await client.query(
      "SELECT feature_id, parent_id, module, sub_module, activity, menu_type, showing_user_right FROM navigation_menus WHERE parent_id = 12 ORDER BY feature_id ASC;"
    );
    console.log('Children of Support Ticket (parent_id=12):');
    res1.rows.forEach(r => console.log(JSON.stringify(r)));

    // Get the feature_id=12 row itself
    const res2 = await client.query(
      "SELECT feature_id, parent_id, module, sub_module, activity, menu_type, showing_user_right FROM navigation_menus WHERE feature_id = 12;"
    );
    console.log('\nSupport Ticket module itself (feature_id=12):');
    res2.rows.forEach(r => console.log(JSON.stringify(r)));

    // Get ALL navigation menus to see full picture
    const res3 = await client.query(
      "SELECT feature_id, parent_id, module, sub_module, activity, menu_type, showing_user_right FROM navigation_menus ORDER BY feature_id ASC;"
    );
    console.log('\nALL navigation menus:');
    res3.rows.forEach(r => console.log(JSON.stringify(r)));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
