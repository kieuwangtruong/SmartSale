import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { query } from './db.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const schema = await readFile(path.join(here, 'schema.sql'), 'utf8')

for (const statement of schema.split(/;\s*(?:\r?\n|$)/)) {
  const sql = statement.trim()
  if (sql) await query(sql)
}

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME = 'Quản trị viên' } = process.env
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await query(
    `INSERT INTO users (user_name, full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'Admin')
     ON CONFLICT (email) DO NOTHING`,
    [ADMIN_EMAIL.split('@')[0], ADMIN_FULL_NAME, ADMIN_EMAIL.toLowerCase(), passwordHash],
  )
}

console.log('Neon schema is ready.')
