import { NextResponse } from "next/server";
import { getOrder } from "@/lib/db";
import { readPrintPdf } from "@/lib/storage";
import { isAdmin } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams the converted/print-ready PDF for preview. Access requires the
// order's accessToken (?token=...) or an admin session.
export async function GET(request, { params }) {
  const order = await getOrder(params.id);
  if (!order) return new NextResponse("Not found", { status: 404 });

  const token = new URL(request.url).searchParams.get("token");
  const authorized = isAdmin() || (token && token === order.accessToken);
  if (!authorized) return new NextResponse("Forbidden", { status: 403 });

  const pdf = await readPrintPdf(order.id);
  if (!pdf) return new NextResponse("File not available", { status: 404 });

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"preview.pdf\"",
      "Cache-Control": "private, no-store",
      "Content-Length": String(pdf.length),
    },
  });
}
