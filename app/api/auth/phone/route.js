import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/ids";
import { setCustomerSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pilot auth: accept a phone number and set a session immediately, no OTP.
// The customer enters their number, we record it against the order for updates
// and contact. No verification code is sent.
//
// UPGRADE SEAM — when your WhatsApp Business API (or SMS DLT registration) is
// ready, replace this route with the OTP flow already in:
//   app/api/otp/request/route.js
//   app/api/otp/verify/route.js
// The customer UI (app/page.js VerifyStep) is the only other thing to change.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const phone = normalizePhone(body?.phone);
  if (!phone.ok) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 }
    );
  }

  setCustomerSession(phone.e164);
  return NextResponse.json({ ok: true, phone: phone.e164 });
}
