import { NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/db";
import { getCustomerPhone } from "@/lib/session";
import { STATUS } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PILOT PAYMENT — pay by UPI, staff confirms.
// The customer pays via their UPI app (QR shown on the pay screen), then taps
// "I've completed the payment". That moves the order to PAYMENT_REVIEW, where a
// staff member confirms the money landed and taps "Mark paid" (which moves it to
// IN_QUEUE). No payment gateway or KYC needed to run this.
//
// PRODUCTION SEAM — automatic confirmation with Razorpay:
//   Instead of the customer asserting payment, create a dynamic UPI QR via
//   Razorpay's QR Codes API for order.price.total, show that QR here, and add a
//   webhook route (e.g. app/api/webhooks/razorpay) that:
//     1. verifies the webhook signature (X-Razorpay-Signature),
//     2. on the "qr_code.credited" / payment event, looks up the order and
//        calls updateOrder(id, { status: IN_QUEUE, paidAt: now, payment: {...} }).
//   That makes confirmation automatic — the "Mark paid" step disappears.
export async function POST(request, { params }) {
  const order = await getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* body optional */
  }
  if (!body || body.token !== order.accessToken) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const phone = getCustomerPhone();
  if (!phone) {
    return NextResponse.json({ error: "Please verify your phone number first." }, { status: 401 });
  }
  if (order.status !== STATUS.AWAITING_PAYMENT || !order.price) {
    return NextResponse.json({ error: "This order isn't ready for payment." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const updated = await updateOrder(order.id, {
    status: STATUS.PAYMENT_REVIEW,
    phone,
    payment: { method: "upi_manual", amount: order.price.total, claimedAt: now },
    history: [...(order.history || []), { at: now, event: "payment_claimed" }],
  });

  return NextResponse.json({ status: updated.status, code: updated.code });
}
