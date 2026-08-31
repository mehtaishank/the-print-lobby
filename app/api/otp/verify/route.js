import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/ids";
import { setCustomerSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const phone = normalizePhone(body?.phone);
  if (!phone.ok) {
    return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
  }
  const code = String(body?.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = verifyOtp(phone.e164, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  setCustomerSession(phone.e164);
  return NextResponse.json({ ok: true, phone: phone.e164 });
}
