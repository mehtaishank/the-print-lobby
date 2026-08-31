// -----------------------------------------------------------------------------
// Pricing configuration + calculation.
//
// This file is imported by BOTH the browser (to show a live estimate) and the
// server (to compute the authoritative price on confirm). The server value is
// the one that is charged — the client number is only a preview.
//
// Edit the rates below to match your shop. All amounts are in the currency set
// by CURRENCY. Per-page rates are per PRINTED page.
// -----------------------------------------------------------------------------

export const CURRENCY = "\u20B9"; // ₹

export const RATES = {
  bwPerPage: 0.6, // black & white, per page
  colorPerPage: 3.0, // color, per page
  minOrder: 10, // minimum charge for the print job (before delivery)
  bindings: {
    none: { label: "No binding", fee: 0 },
    spiral: { label: "Spiral binding", fee: 30 },
    soft: { label: "Soft binding", fee: 50 },
  },
  fulfillment: {
    pickup: { label: "Pick up at shop", fee: 0 },
    delivery: { label: "Local delivery", fee: 40 },
  },
};

// Parse a page-range string like "1,3,5-8" into a de-duplicated list of page
// numbers within [1, totalPages]. Invalid tokens are ignored.
export function parsePageList(input, totalPages) {
  if (!input) return [];
  const set = new Set();
  for (const rawPart of String(input).split(",")) {
    const part = rawPart.trim();
    if (!part) continue;
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      let a = parseInt(range[1], 10);
      let b = parseInt(range[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let p = a; p <= b; p++) {
        if (p >= 1 && p <= totalPages) set.add(p);
      }
    } else if (/^\d+$/.test(part)) {
      const p = parseInt(part, 10);
      if (p >= 1 && p <= totalPages) set.add(p);
    }
  }
  return [...set].sort((x, y) => x - y);
}

// Given the counted page total and the chosen options, return a price breakdown.
// options = { colorMode, colorPages, copies, binding, fulfillment }
//   colorMode: "bw" | "color" | "mixed"
//   colorPages: string page-list (only used when colorMode === "mixed")
//   copies: integer >= 1
//   binding: key of RATES.bindings
//   fulfillment: key of RATES.fulfillment
export function computePrice(totalPages, options, ratesOverride) {
  const RATES_USED = ratesOverride || RATES;
  const pages = Math.max(0, parseInt(totalPages, 10) || 0);
  const copies = Math.max(1, parseInt(options.copies, 10) || 1);
  const binding = RATES_USED.bindings[options.binding] ? options.binding : "none";
  const fulfillment = RATES_USED.fulfillment[options.fulfillment]
    ? options.fulfillment
    : "pickup";

  let colorCount;
  if (options.colorMode === "color") {
    colorCount = pages;
  } else if (options.colorMode === "mixed") {
    colorCount = parsePageList(options.colorPages, pages).length;
  } else {
    colorCount = 0; // "bw"
  }
  const bwCount = Math.max(0, pages - colorCount);

  const bwCost = bwCount * RATES_USED.bwPerPage;
  const colorCost = colorCount * RATES_USED.colorPerPage;
  const bindingFee = RATES_USED.bindings[binding].fee;

  const perCopy = bwCost + colorCost + bindingFee;
  let printTotal = perCopy * copies;
  const belowMinimum = printTotal < RATES_USED.minOrder;
  if (belowMinimum) printTotal = RATES_USED.minOrder;

  const deliveryFee = RATES_USED.fulfillment[fulfillment].fee;
  const total = printTotal + deliveryFee;

  return {
    currency: CURRENCY,
    pages,
    bwCount,
    colorCount,
    copies,
    binding,
    fulfillment,
    bwCost: round2(bwCost),
    colorCost: round2(colorCost),
    bindingFee: round2(bindingFee),
    perCopy: round2(perCopy),
    belowMinimum,
    printTotal: round2(printTotal),
    deliveryFee: round2(deliveryFee),
    total: round2(total),
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
