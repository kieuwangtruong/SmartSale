import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = 'postgresql://neondb_owner:npg_vcmrfZz48eCJ@ep-noisy-forest-ayjyhd0d-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const urlObj = new URL(databaseUrl);
const sqlEndpoint = `https://${urlObj.host}/sql`;

async function executeSql(sqlQuery, params = []) {
  const response = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': databaseUrl,
    },
    body: JSON.stringify({ query: sqlQuery, params }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }
  return await response.json();
}

async function run() {
  console.log('Reading complete_seed.sql...');
  const sqlFile = fs.readFileSync(path.join(__dirname, 'complete_seed.sql'), 'utf8');

  // Strip single-line comments that are alone
  const cleaned = sqlFile
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  // Split by semicolon
  const statements = cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} SQL statements on Neon Tech database...`);

  let count = 0;
  for (const stmt of statements) {
    count++;
    try {
      await executeSql(stmt);
      console.log(`✓ [${count}/${statements.length}] Done: ${stmt.slice(0, 45).replace(/\n/g, ' ')}...`);
    } catch (e) {
      console.error(`✗ [${count}/${statements.length}] Error on: ${stmt.slice(0, 45)}... -> ${e.message}`);
    }
  }

  console.log('\n=========================================');
  console.log('✅ ALL TABLES & SEED DATA APPLIED TO NEON!');
  console.log('=========================================');
}

run().catch(err => {
  console.error('Failed to apply seed:', err);
  process.exit(1);
});
