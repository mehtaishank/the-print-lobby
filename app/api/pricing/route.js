import { NextResponse } from "next/server";
import { RATES, CURRENCY } from "@/config/pricing";

export const dynamic = "force-dynamic";

// Exposes the rate card so any client (or a future native app) can render
// prices without hardcoding them. Rates are not secret.
export async function GET() {
  return NextResponse.json({ currency: CURRENCY, rates: RATES });
}
