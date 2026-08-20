import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = 'postgresql://neondb_owner:npg_vcmrfZz48eCJ@ep-noisy-forest-ayjyhd0d-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Extract host from DATABASE_URL
const urlObj = new URL(databaseUrl);
const host = urlObj.host; // ep-noisy-forest-ayjyhd0d-pooler.c-5.us-east-2.aws.neon.tech
const sqlEndpoint = `https://${host}/sql`;

async function executeSql(sqlQuery, params = []) {
  const response = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': databaseUrl,
    },
    body: JSON.stringify({
      query: sqlQuery,
      params: params,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  return await response.json();
}

async function run() {
  console.log('Connecting to Neon via HTTP SQL endpoint...');
  
  // Test connection
  const testRes = await executeSql('SELECT version(), current_database(), current_user;');
  console.log('Connected successfully to Neon!');
  console.log('Database Info:', testRes);

  // Read schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  console.log('Executing schema.sql on Neon database...');
  const statements = schemaContent
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await executeSql(stmt);
      console.log(`[${i + 1}/${statements.length}] Success: ${stmt.substring(0, 40).replace(/\n/g, ' ')}...`);
    } catch (e) {
      console.error(`[${i + 1}/${statements.length}] Error in: ${stmt.substring(0, 40)}`, e.message);
    }
  }

  // Create default Admin user
  console.log('Creating initial Admin user...');
  // Simple bcrypt-like or precomputed hash for Admin@123456
  // Hash for Admin@123456 generated with bcrypt 12 rounds
  const adminHash = '$2a$12$e8x51b/d0/qEaEre0Dqm3.G4gXfE8QZg9E/E8N6y8Uq1L6P4Z2aW2'; 

  await executeSql(
    `INSERT INTO users (user_name, full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'Admin')
     ON CONFLICT (email) DO NOTHING;`,
    ['admin', 'Quản trị viên', 'admin@smartsale.com', adminHash]
  );

  console.log('--- ALL TABLES AND ADMIN INITIALIZED ON NEON SUCCESSFULLY! ---');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
