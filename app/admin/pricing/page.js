"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PricingEditor() {
  const router = useRouter();
  const [rates, setRates] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then(async (r) => {
        if (r.status === 403) { router.push("/admin/login"); return null; }
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setLoadError(d.error || `Server error (${r.status}). Check the terminal logs.`);
          return null;
        }
        return r.json();
      })
      .then((d) => d && setRates(d.rates))
      .catch(() => setLoadError("Could not reach the server."));
  }, [router]);

  function setField(path, value) {
    setRates((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rates }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Could not save."); return; }
    setRates(data.rates);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!rates) return (
    <div className="container">
      <header className="site-header">
        <div className="wordmark">The Print <span className="marker">Lobby</span> · Staff</div>
        <a className="header-link" href="/admin">← Queue</a>
      </header>
      {loadError
        ? <div className="notice err">{loadError}</div>
        : <p className="muted">Loading…</p>}
    </div>
  );

  return (
    <div className="container">
      <header className="site-header">
        <div className="wordmark">The Print <span className="marker">Lobby</span> · Staff</div>
        <nav style={{ display: "flex", gap: 12 }}>
          <a className="header-link" href="/admin">← Queue</a>
        </nav>
      </header>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Edit pricing</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Changes take effect immediately for all new orders. Existing orders keep
          the price they were quoted.
        </p>

        {/* Per-page rates */}
        <h3 style={{ marginBottom: 10 }}>Per-page rates</h3>
        <div className="row">
          <label className="field" style={{ marginTop: 0 }}>
            <span className="field-label">Black &amp; white (₹ per page)</span>
            <input type="text" inputMode="decimal"
              value={rates.bwPerPage}
              onChange={(e) => setField("bwPerPage", e.target.value.replace(",", "."))} />
          </label>
          <label className="field" style={{ marginTop: 0 }}>
            <span className="field-label">Color (₹ per page)</span>
            <input type="text" inputMode="decimal"
              value={rates.colorPerPage}
              onChange={(e) => setField("colorPerPage", e.target.value.replace(",", "."))} />
          </label>
          <label className="field" style={{ marginTop: 0 }}>
            <span className="field-label">Minimum order (₹)</span>
            <input type="text" inputMode="decimal"
              value={rates.minOrder}
              onChange={(e) => setField("minOrder", e.target.value.replace(",", "."))} />
          </label>
        </div>

        {/* Bindings */}
        <h3 style={{ marginTop: 24, marginBottom: 10 }}>Binding fees</h3>
        {Object.entries(rates.bindings).map(([key, b]) => (
          <div className="row" key={key} style={{ alignItems: "flex-end" }}>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field-label">Label</span>
              <input type="text" value={b.label}
                onChange={(e) => setField(`bindings.${key}.label`, e.target.value)} />
            </label>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field-label">Fee (₹)</span>
              <input type="text" inputMode="decimal" value={b.fee}
                onChange={(e) => setField(`bindings.${key}.fee`, e.target.value.replace(",", "."))} />
            </label>
          </div>
        ))}

        {/* Fulfillment */}
        <h3 style={{ marginTop: 24, marginBottom: 10 }}>Delivery fees</h3>
        {Object.entries(rates.fulfillment).map(([key, f]) => (
          <div className="row" key={key} style={{ alignItems: "flex-end" }}>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field-label">Label</span>
              <input type="text" value={f.label}
                onChange={(e) => setField(`fulfillment.${key}.label`, e.target.value)} />
            </label>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field-label">Fee (₹)</span>
              <input type="text" inputMode="decimal" value={f.fee}
                onChange={(e) => setField(`fulfillment.${key}.fee`, e.target.value.replace(",", "."))} />
            </label>
          </div>
        ))}

        {error && <div className="notice err" style={{ marginTop: 16 }}>{error}</div>}
        {saved && <div className="notice info" style={{ marginTop: 16 }}>Saved — new orders will use these rates.</div>}

        <div className="btn-row">
          <button className="btn" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save pricing"}
          </button>
          <a className="btn btn-ghost" href="/admin">Cancel</a>
        </div>
      </section>
    </div>
  );
}
