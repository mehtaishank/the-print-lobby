import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getOrder } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { buildUpiUri } from "@/config/shop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns an SVG UPI QR code for the order's exact amount. Access requires the
// order's accessToken (?token=...) or an admin session.
export async function GET(request, { params }) {
  const order = await getOrder(params.id);
  if (!order) return new NextResponse("Not found", { status: 404 });

  const token = new URL(request.url).searchParams.get("token");
  const authorized = isAdmin() || (token && token === order.accessToken);
  if (!authorized) return new NextResponse("Forbidden", { status: 403 });
  if (!order.price) return new NextResponse("No amount", { status: 409 });

  const uri = buildUpiUri(order.price.total, order.code);
  const svg = await QRCode.toString(uri, { type: "svg", margin: 1 });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, no-store",
    },
  });
}
