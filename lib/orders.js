// Order lifecycle. Staff-approval model: a paid order waits in the queue until
// staff approve it, then moves through printing to pickup/delivery.

export const STATUS = {
  AWAITING_OPTIONS: "awaiting_options", // file uploaded, options not set yet
  AWAITING_PAYMENT: "awaiting_payment", // options + phone verified, not paid
  PAYMENT_REVIEW: "payment_review", // customer says they paid; staff to confirm
  IN_QUEUE: "in_queue", // payment confirmed, waiting for staff approval
  APPROVED: "approved", // staff approved, ready to print
  PRINTED: "printed", // printed
  READY: "ready", // ready for pickup
  OUT_FOR_DELIVERY: "out_for_delivery",
  COMPLETED: "completed",
  REJECTED: "rejected",
};

export const STATUS_LABEL = {
  awaiting_options: "Choosing options",
  awaiting_payment: "Awaiting payment",
  payment_review: "Payment review",
  in_queue: "In queue",
  approved: "Approved",
  printed: "Printed",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  rejected: "Rejected",
};

// Actions staff can take from a given status -> resulting status.
export function nextStatuses(status, fulfillment) {
  switch (status) {
    case STATUS.PAYMENT_REVIEW:
      return [
        { action: "confirm_payment", to: STATUS.IN_QUEUE, label: "Mark paid" },
        { action: "reject", to: STATUS.REJECTED, label: "Reject" },
      ];
    case STATUS.IN_QUEUE:
      return [
        { action: "approve", to: STATUS.APPROVED, label: "Approve" },
        { action: "reject", to: STATUS.REJECTED, label: "Reject" },
      ];
    case STATUS.APPROVED:
      return [{ action: "printed", to: STATUS.PRINTED, label: "Mark printed" }];
    case STATUS.PRINTED:
      return fulfillment === "delivery"
        ? [{ action: "out_for_delivery", to: STATUS.OUT_FOR_DELIVERY, label: "Out for delivery" }]
        : [{ action: "ready", to: STATUS.READY, label: "Ready for pickup" }];
    case STATUS.READY:
    case STATUS.OUT_FOR_DELIVERY:
      return [{ action: "completed", to: STATUS.COMPLETED, label: "Mark completed" }];
    default:
      return [];
  }
}

// Statuses a customer/staff would consider "active" (not finished).
export function isTerminal(status) {
  return status === STATUS.COMPLETED || status === STATUS.REJECTED;
}
