// -----------------------------------------------------------------------------
// Minimal signed-cookie sessions. A session is a small JSON payload plus an
// HMAC signature, so it can't be tampered with. Cookies are HttpOnly and, in
// production, Secure.
//
//   Customer session: { phone, iat } in cookie "sess"
//   Admin session:    { role:"admin", iat } in cookie "admin"
//
// PRODUCTION NOTE: set SESSION_SECRET and ADMIN_PASSWORD to strong random
// values. For a bigger build, consider Supabase Auth (phone) for customers.
// -----------------------------------------------------------------------------

import crypto from "node:crypto";
import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const isProd = () => process.env.APP_ENV === "production";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return payload + "." + sig;
}

function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function baseCookie() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: MAX_AGE,
  };
}

// ---- Customer --------------------------------------------------------------

export function setCustomerSession(phone) {
  cookies().set("sess", sign({ phone, iat: Date.now() }), baseCookie());
}

export function getCustomerPhone() {
  const token = cookies().get("sess")?.value;
  const data = verify(token);
  return data?.phone || null;
}

// ---- Admin -----------------------------------------------------------------

export function setAdminSession() {
  cookies().set("admin", sign({ role: "admin", iat: Date.now() }), baseCookie());
}

export function clearAdminSession() {
  cookies().set("admin", "", { ...baseCookie(), maxAge: 0 });
}

export function isAdmin() {
  const token = cookies().get("admin")?.value;
  const data = verify(token);
  return data?.role === "admin";
}

// Constant-time password comparison for admin login.
export function checkAdminPassword(supplied) {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  const a = Buffer.from(String(supplied || ""));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
