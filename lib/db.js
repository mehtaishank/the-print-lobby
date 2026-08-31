// -----------------------------------------------------------------------------
// Supabase / Postgres data store.
// Replaces the dev JSON-file store. All order and OTP operations go through here.
// -----------------------------------------------------------------------------

import pkg from "pg";
const { Pool } = pkg;

let _pool;
function pool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return _pool;
}

// ---- helpers ----------------------------------------------------------------

function rowToOrder(r) {
  if (!r) return null;
  return {
    id: r.id,
    code: r.code,
    accessToken: r.access_token,
    status: r.status,
    originalName: r.original_name,
    kind: r.kind,
    converted: r.converted,
    pages: r.pages,
    options: r.options,
    price: r.price,
    phone: r.phone,
    payment: r.payment,
    history: r.history,
    createdAt: r.created_at,
    paidAt: r.paid_at,
  };
}

// ---- Orders -----------------------------------------------------------------

export async function createOrder(order) {
  const q = `
    insert into orders
      (id, code, access_token, status, original_name, kind, converted, pages,
       options, price, phone, payment, history, created_at, paid_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    returning *`;
  const vals = [
    order.id, order.code, order.accessToken, order.status,
    order.originalName, order.kind, order.converted ?? false, order.pages ?? 0,
    order.options ? JSON.stringify(order.options) : null,
    order.price ? JSON.stringify(order.price) : null,
    order.phone ?? null,
    order.payment ? JSON.stringify(order.payment) : null,
    JSON.stringify(order.history ?? []),
    order.createdAt ?? new Date().toISOString(),
    order.paidAt ?? null,
  ];
  const { rows } = await pool().query(q, vals);
  return rowToOrder(rows[0]);
}

export async function getOrder(id) {
  if (!id) return null;
  const { rows } = await pool().query("select * from orders where id=$1", [id]);
  return rowToOrder(rows[0]);
}

export async function updateOrder(id, patch) {
  const sets = [];
  const vals = [];
  let i = 1;

  const colMap = {
    status: "status",
    phone: "phone",
    paidAt: "paid_at",
    options: "options",
    price: "price",
    payment: "payment",
    history: "history",
    originalName: "original_name",
  };
  const jsonCols = new Set(["options", "price", "payment", "history"]);

  for (const [key, col] of Object.entries(colMap)) {
    if (!(key in patch)) continue;
    sets.push(`${col} = $${i++}`);
    vals.push(jsonCols.has(key) && patch[key] !== null
      ? JSON.stringify(patch[key])
      : patch[key]);
  }
  if (sets.length === 0) return getOrder(id);

  vals.push(id);
  const q = `update orders set ${sets.join(", ")} where id=$${i} returning *`;
  const { rows } = await pool().query(q, vals);
  return rowToOrder(rows[0]);
}

export async function listOrders() {
  const { rows } = await pool().query("select * from orders order by created_at desc");
  return rows.map(rowToOrder);
}

// ---- OTPs -------------------------------------------------------------------

export function getOtp(phone) {
  // Sync wrapper kept for interface compatibility; in practice OTP routes are
  // async — swap to async if you add WhatsApp OTP later.
  throw new Error("getOtp: use getOtpAsync");
}

export async function getOtpAsync(phone) {
  const { rows } = await pool().query("select * from otps where phone=$1", [phone]);
  if (!rows[0]) return null;
  const r = rows[0];
  return { codeHash: r.code_hash, expiresAt: r.expires_at, attempts: r.attempts, sends: r.sends };
}

export async function setOtpAsync(phone, record) {
  await pool().query(`
    insert into otps (phone, code_hash, expires_at, attempts, sends)
    values ($1,$2,$3,$4,$5)
    on conflict (phone) do update
      set code_hash=$2, expires_at=$3, attempts=$4, sends=$5`,
    [phone, record.codeHash, record.expiresAt, record.attempts ?? 0, JSON.stringify(record.sends ?? [])]
  );
}

export async function clearOtpAsync(phone) {
  await pool().query("delete from otps where phone=$1", [phone]);
}

// Sync stubs kept so lib/otp.js compiles — swap when adding real OTP
export function setOtp(phone, record) { return setOtpAsync(phone, record); }
export function clearOtp(phone) { return clearOtpAsync(phone); }

// ---- Settings --------------------------------------------------------------

export async function getSetting(key) {
  const { rows } = await pool().query("select value from settings where key=$1", [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key, value) {
  await pool().query(`
    insert into settings (key, value) values ($1, $2)
    on conflict (key) do update set value = $2`,
    [key, JSON.stringify(value)]
  );
}
