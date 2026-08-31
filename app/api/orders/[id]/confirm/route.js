import { NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/db";
import { getLiveRates } from "@/lib/settings";
import { computePrice } from "@/config/pricing";
import { STATUS } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const order = await getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body || body.token !== order.accessToken) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (![STATUS.AWAITING_OPTIONS, STATUS.AWAITING_PAYMENT].includes(order.status)) {
    return NextResponse.json({ error: "This order can no longer be changed." }, { status: 409 });
  }

  // Load live rates from DB so any admin edits are reflected immediately
  const RATES = await getLiveRates();

  const colorMode = ["bw", "color", "mixed"].includes(body.colorMode) ? body.colorMode : "bw";
  const binding = RATES.bindings[body.binding] ? body.binding : "none";
  const fulfillment = RATES.fulfillment[body.fulfillment] ? body.fulfillment : "pickup";
  const sides = ["single", "double"].includes(body.sides) ? body.sides : "single";
  let copies = parseInt(body.copies, 10);
  if (!Number.isFinite(copies)) copies = 1;
  copies = Math.min(100, Math.max(1, copies));
  const colorPages = colorMode === "mixed" ? String(body.colorPages || "").slice(0, 200) : "";
  const address = fulfillment === "delivery"
    ? String(body.address || "").replace(/[\r\n]+/g, " ").slice(0, 300) : "";
  if (fulfillment === "delivery" && address.trim().length < 8) {
    return NextResponse.json({ error: "Please enter a delivery address." }, { status: 400 });
  }

  const options = { colorMode, colorPages, sides, copies, binding, fulfillment, address };
  const price = computePrice(order.pages, options, RATES);

  const updated = await updateOrder(order.id, { options, price, status: STATUS.AWAITING_PAYMENT });
  return NextResponse.json({ price: updated.price, options: updated.options });
}
