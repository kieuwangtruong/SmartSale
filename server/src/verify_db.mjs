const databaseUrl = 'postgresql://neondb_owner:npg_vcmrfZz48eCJ@ep-noisy-forest-ayjyhd0d-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const urlObj = new URL(databaseUrl);
const sqlEndpoint = `https://${urlObj.host}/sql`;

async function executeSql(sqlQuery) {
  const response = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': databaseUrl,
    },
    body: JSON.stringify({ query: sqlQuery }),
  });
  return await response.json();
}

async function verify() {
  const tables = ['users', 'categories', 'suppliers', 'products', 'customers', 'stock_receipts', 'stock_receipt_items', 'orders', 'order_items'];
  console.log('--- DATABASE SUMMARY REPORT ---');
  for (const table of tables) {
    const res = await executeSql(`SELECT COUNT(*) as count FROM ${table};`);
    console.log(`• Table [${table}]: ${res.rows[0].count} records`);
  }
}

verify();
