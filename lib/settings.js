// Loads the current pricing rates. In production these come from the database
// so staff can edit them without a redeploy. Falls back to config/pricing.js
// if no DB record exists yet.

import { RATES as DEFAULT_RATES } from "@/config/pricing";
import { getSetting } from "@/lib/db";

export async function getLiveRates() {
  try {
    const stored = await getSetting("pricing");
    if (stored) return stored;
  } catch {
    // DB unavailable — use defaults
  }
  return DEFAULT_RATES;
}
