// Deletes orders (and their files) older than 7 days.
// Run daily: 0 3 * * * cd /path/to/app && node scripts/cleanup.js

import pkg from "pg";
const { Pool } = pkg;
import { createClient } from "@supabase/supabase-js";

const RETENTION_DAYS = 7;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const storage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Find old orders
  const { rows } = await pool.query(
    "select id from orders where created_at < $1",
    [cutoff]
  );

  let removed = 0;
  for (const { id } of rows) {
    // Delete files from Supabase Storage
    const { data: list } = await storage.storage.from("print-files").list(id);
    if (list && list.length > 0) {
      const paths = list.map((f) => `${id}/${f.name}`);
      await storage.storage.from("print-files").remove(paths);
    }
    // Delete order record
    await pool.query("delete from orders where id=$1", [id]);
    removed++;
  }

  // Clean expired OTPs
  await pool.query("delete from otps where expires_at < $1", [Date.now()]);

  console.log(`Cleanup done. Removed ${removed} order(s) older than ${RETENTION_DAYS} days.`);
  await pool.end();
}

run().catch(console.error);
