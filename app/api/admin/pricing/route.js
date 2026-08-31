import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getSetting, setSetting } from "@/lib/db";
import { RATES } from "@/config/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const stored = await getSetting("pricing");
  return NextResponse.json({ rates: stored || RATES });
}

export async function POST(request) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Validate and coerce — never trust raw input for financial config
  const r = body.rates;
  if (!r) return NextResponse.json({ error: "No rates provided." }, { status: 400 });

  const bwPerPage = parseFloat(r.bwPerPage);
  const colorPerPage = parseFloat(r.colorPerPage);
  const minOrder = parseFloat(r.minOrder);

  if ([bwPerPage, colorPerPage, minOrder].some((n) => !Number.isFinite(n) || n < 0)) {
    return NextResponse.json({ error: "Invalid rate values." }, { status: 400 });
  }

  // Validate bindings
  const bindings = {};
  for (const [key, b] of Object.entries(r.bindings || {})) {
    const fee = parseFloat(b.fee);
    if (!Number.isFinite(fee) || fee < 0) continue;
    bindings[key] = { label: String(b.label || key).slice(0, 60), fee };
  }

  // Validate fulfillment
  const fulfillment = {};
  for (const [key, f] of Object.entries(r.fulfillment || {})) {
    const fee = parseFloat(f.fee);
    if (!Number.isFinite(fee) || fee < 0) continue;
    fulfillment[key] = { label: String(f.label || key).slice(0, 60), fee };
  }

  const cleaned = { bwPerPage, colorPerPage, minOrder, bindings, fulfillment };
  await setSetting("pricing", cleaned);

  return NextResponse.json({ ok: true, rates: cleaned });
}
