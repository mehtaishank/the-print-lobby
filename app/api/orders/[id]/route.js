import { NextResponse } from "next/server";
import { getOrder } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { STATUS_LABEL } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns a safe view of the order. Requires the order's accessToken
// (?token=...) OR an admin session. Prevents guessing other people's orders.
export async function GET(request, { params }) {
  const order = await getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const token = new URL(request.url).searchParams.get("token");
  const authorized = isAdmin() || (token && token === order.accessToken);
  if (!authorized) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  return NextResponse.json(publicView(order));
}

export function publicView(order) {
  return {
    orderId: order.id,
    code: order.code,
    status: order.status,
    statusLabel: STATUS_LABEL[order.status] || order.status,
    originalName: order.originalName,
    pages: order.pages,
    converted: order.converted,
    options: order.options,
    price: order.price,
    phone: order.phone,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  };
}
