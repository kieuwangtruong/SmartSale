import { neon } from '@neondatabase/serverless'

let database

export function sql() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL chưa được cấu hình.')
    error.statusCode = 503
    throw error
  }
  database ??= neon(process.env.DATABASE_URL)
  return database
}

export async function query(text, params = []) {
  return sql().query(text, params)
}
