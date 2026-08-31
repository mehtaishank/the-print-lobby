import { NextResponse } from "next/server";
import { listOrders } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { STATUS, STATUS_LABEL } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lists orders for staff. Only paid orders (and beyond) are shown by default,
// since unpaid/abandoned drafts aren't actionable.
export async function GET(request) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const showAll = new URL(request.url).searchParams.get("all") === "1";
  const hiddenBeforePayment = [STATUS.AWAITING_OPTIONS, STATUS.AWAITING_PAYMENT];

  const allOrders = await listOrders();
  const orders = allOrders
    .filter((o) => showAll || !hiddenBeforePayment.includes(o.status))
    .map((o) => ({
      orderId: o.id,
      code: o.code,
      status: o.status,
      statusLabel: STATUS_LABEL[o.status] || o.status,
      originalName: o.originalName,
      pages: o.pages,
      converted: o.converted,
      options: o.options,
      price: o.price,
      phone: o.phone,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
    }));

  return NextResponse.json({ orders });
}
