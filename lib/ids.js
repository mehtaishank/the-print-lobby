import crypto from "node:crypto";

// URL-safe random id used for order ids and access tokens.
export function newId(bytes = 16) {
  return crypto.randomBytes(bytes).toString("base64url");
}

// Human-friendly short code shown to staff/customer (e.g. "PR-7QK2").
export function shortCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += alphabet[crypto.randomInt(alphabet.length)];
  }
  return "PR-" + s;
}

// Normalise an Indian mobile number to a canonical form.
// Accepts "9876543210", "+919876543210", "09876543210", spaces/dashes.
// Returns { ok, e164 } — e164 like "+919876543210" — or { ok:false }.
export function normalizePhone(raw) {
  if (!raw) return { ok: false };
  let d = String(raw).replace(/[^\d+]/g, "");
  d = d.replace(/^\+/, "");
  if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return { ok: false };
  return { ok: true, e164: "+91" + d };
}
