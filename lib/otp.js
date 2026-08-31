// -----------------------------------------------------------------------------
// Phone OTP: request a code, then verify it.
//
// In development the code is printed to the server console (and returned in the
// API response only when APP_ENV !== "production") so you can test without an
// SMS account. Codes are stored HASHED, never in clear text, and expire.
//
// PRODUCTION SEAM:
//   * sendSms() below is where you call MSG91 / Fast2SMS / Twilio (or WhatsApp).
//     Indian transactional SMS needs DLT-registered templates — start that early.
//   * Move the otp store from lib/db.js into your database.
// -----------------------------------------------------------------------------

import crypto from "node:crypto";
import { getOtp, setOtp, clearOtp } from "./db.js";

const CODE_TTL_MS = 5 * 60 * 1000; // code valid for 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // min gap between sends
const WINDOW_MS = 15 * 60 * 1000; // rolling window for the send cap
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(phone, code) {
  // Salt the hash with the phone number so identical codes for different
  // numbers don't collide.
  return crypto.createHash("sha256").update(phone + ":" + code).digest("hex");
}

async function sendSms(phone, message) {
  // TODO(production): call your SMS provider here.
  // e.g. await fetch("https://api.msg91.com/...", { ... })
  console.log(`\n[OTP] SMS to ${phone}: ${message}\n`);
}

const isProd = () => process.env.APP_ENV === "production";

// Request a code. Returns { ok } or { ok:false, error, retryAfter }.
// In non-production, also returns { devCode } so the UI can show it.
export async function requestOtp(phone) {
  const now = Date.now();
  const rec = getOtp(phone) || { sends: [], attempts: 0 };

  const recentSends = (rec.sends || []).filter((t) => now - t < WINDOW_MS);
  const lastSend = recentSends[recentSends.length - 1] || 0;

  if (now - lastSend < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      error: "Please wait a moment before requesting another code.",
      retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (now - lastSend)) / 1000),
    };
  }
  if (recentSends.length >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, error: "Too many code requests. Try again later." };
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  recentSends.push(now);

  setOtp(phone, {
    codeHash: hashCode(phone, code),
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    sends: recentSends,
  });

  await sendSms(phone, `Your printing code is ${code}. It expires in 5 minutes.`);

  return isProd() ? { ok: true } : { ok: true, devCode: code };
}

// Verify a code. Returns { ok } or { ok:false, error }.
export function verifyOtp(phone, code) {
  const now = Date.now();
  const rec = getOtp(phone);
  if (!rec || !rec.codeHash) {
    return { ok: false, error: "Request a code first." };
  }
  if (now > rec.expiresAt) {
    clearOtp(phone);
    return { ok: false, error: "That code has expired. Request a new one." };
  }
  if ((rec.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    clearOtp(phone);
    return { ok: false, error: "Too many wrong attempts. Request a new code." };
  }

  const supplied = hashCode(phone, String(code || "").trim());
  const a = Buffer.from(supplied);
  const b = Buffer.from(rec.codeHash);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    setOtp(phone, { ...rec, attempts: (rec.attempts || 0) + 1 });
    return { ok: false, error: "That code isn't right." };
  }

  clearOtp(phone);
  return { ok: true };
}
