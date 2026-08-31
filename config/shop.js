// -----------------------------------------------------------------------------
// Shop details for the pay-by-UPI flow. EDIT THESE to your own.
//
// upiVpa is your UPI ID (a.k.a. VPA), e.g. "printshop@okhdfcbank" or a
// phone-linked one like "9876543210@ybl". The customer scans a QR built from
// this and pays the exact order amount; staff then confirm receipt in the
// dashboard. (This is the pilot method — no payment gateway or KYC needed.)
// -----------------------------------------------------------------------------

export const SHOP = {
  name: "The Print Lobby",
  upiVpa: "your-vpa@bank", // <-- put your real UPI ID here
  upiPayeeName: "The Print Lobby",
};

// Build a UPI deep-link / QR payload for a given amount and note (order code).
// Format: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
export function buildUpiUri(amount, note) {
  const enc = encodeURIComponent;
  let uri =
    `upi://pay?pa=${enc(SHOP.upiVpa)}` +
    `&pn=${enc(SHOP.upiPayeeName)}` +
    `&am=${Number(amount).toFixed(2)}` +
    `&cu=INR`;
  if (note) uri += `&tn=${enc(note)}`;
  return uri;
}
