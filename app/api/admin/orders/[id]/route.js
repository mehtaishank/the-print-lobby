import { NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { nextStatuses } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Applies a staff action to an order. The requested action must be a legal
// transition from the order's current status (see lib/orders.js) — this is the
// deny-by-default guard on state changes.
export async function POST(request, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const order = await getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const fulfillment = order.options?.fulfillment;
  const allowed = nextStatuses(order.status, fulfillment);
  const move = allowed.find((m) => m.action === body?.action);
  if (!move) {
    return NextResponse.json({ error: "That action isn't allowed right now." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const patch = {
    status: move.to,
    history: [...(order.history || []), { at: now, event: move.action }],
  };
  if (move.action === "confirm_payment") {
    patch.paidAt = now;
    patch.payment = { ...(order.payment || {}), confirmedAt: now, confirmedBy: "staff" };
  }
  const updated = await updateOrder(order.id, patch);

  // When an order is approved, this is the point where — in the automated
  // version — you would enqueue it for the shop-PC print agent to pick up.
  // In this MVP staff print manually from the preview.

  return NextResponse.json({ status: updated.status });
}
