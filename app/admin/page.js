"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { nextStatuses } from "@/lib/orders";

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [authError, setAuthError] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/orders${showAll ? "?all=1" : ""}`, {
      cache: "no-store",
    });
    if (res.status === 403) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => ({ orders: [] }));
    setOrders(data.orders || []);
    setLoading(false);
  }, [showAll]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // light polling
    return () => clearInterval(t);
  }, [load]);

  async function act(orderId, action) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (authError) {
    return (
      <div className="container">
        <div className="center-narrow">
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Please sign in</h2>
            <p className="muted">The staff dashboard needs a sign-in.</p>
            <div className="btn-row">
              <a className="btn" href="/admin/login">
                Go to sign in
              </a>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="site-header">
        <div className="wordmark">
          The Print <span className="marker">Lobby</span> · Staff
        </div>
        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a className="header-link" href="/admin/pricing">Edit pricing</a>
          <button className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </nav>
      </header>

      <section className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Order queue</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label
              className="small muted"
              style={{ display: "flex", gap: 6, alignItems: "center" }}
            >
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Show unpaid drafts
            </label>
            <button className="btn btn-ghost" onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="muted" style={{ marginTop: 16 }}>
            Loading…
          </p>
        ) : orders.length === 0 ? (
          <p className="muted" style={{ marginTop: 16 }}>
            No orders yet.
          </p>
        ) : (
          <div className="order-list">
            {orders.map((o) => (
              <OrderCard key={o.orderId} order={o} onAction={act} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OrderCard({ order, onAction }) {
  const o = order;
  const opt = o.options || {};
  const actions = nextStatuses(o.status, opt.fulfillment);

  const colorLabel =
    opt.colorMode === "color"
      ? "All color"
      : opt.colorMode === "mixed"
      ? `Color: ${opt.colorPages || "—"}`
      : "B&W";

  const optionsSummary =
    `${colorLabel}, ${opt.sides === "double" ? "double-sided" : "single-sided"}` +
    (opt.copies > 1 ? `, ×${opt.copies}` : "") +
    (opt.binding && opt.binding !== "none" ? `, ${opt.binding}` : "");

  return (
    <div className="order-card">
      <div className="oc-head">
        <div className="oc-head-left">
          <span className="code">{o.code}</span>
          <span className={`badge ${o.status}`}>{o.statusLabel}</span>
        </div>
        <div className="oc-total">
          {o.price ? `${o.price.currency}${o.price.total.toFixed(2)}` : "—"}
        </div>
      </div>

      <div className="oc-rows">
        <div className="oc-row">
          <span className="k">File</span>
          <span className="v">
            <a href={`/api/files/${o.orderId}`} target="_blank" rel="noreferrer">
              {o.originalName}
            </a>{" "}
            <span className="muted small">
              · {o.pages} pg{o.converted ? " · converted" : ""}
            </span>
          </span>
        </div>
        <div className="oc-row">
          <span className="k">Print</span>
          <span className="v">{optionsSummary}</span>
        </div>
        <div className="oc-row">
          <span className="k">Get it</span>
          <span className="v">
            {opt.fulfillment === "delivery"
              ? `Deliver — ${opt.address || "—"}`
              : "Pickup at shop"}
          </span>
        </div>
        <div className="oc-row">
          <span className="k">Phone</span>
          <span className="v">{o.phone || "—"}</span>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="oc-actions">
          {actions.map((a) => (
            <button
              key={a.action}
              className={a.action === "reject" ? "btn btn-danger" : "btn btn-ghost"}
              style={{ padding: "8px 14px", fontSize: 14 }}
              onClick={() => onAction(o.orderId, a.action)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
