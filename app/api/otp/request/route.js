import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/ids";

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
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  }

  const result = await requestOtp(phone.e164);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, retryAfter: result.retryAfter },
      { status: 429 }
    );
  }

  // devCode is only present when APP_ENV !== "production".
  return NextResponse.json({ ok: true, devCode: result.devCode });
}
