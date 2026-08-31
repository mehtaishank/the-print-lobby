"use client";

import { useMemo, useRef, useState } from "react";
import { computePrice, RATES, CURRENCY } from "@/config/pricing";
import { SHOP } from "@/config/shop";

const STEPS = ["Upload", "Options", "Phone", "Pay"];

export default function Home() {
  const [step, setStep] = useState(1);
  const [order, setOrder] = useState(null); // { orderId, accessToken, code, pages, converted, originalName }
  const [options, setOptions] = useState({
    colorMode: "bw",
    colorPages: "",
    sides: "single",
    copies: 1,
    binding: "none",
    fulfillment: "pickup",
    address: "",
  });

  const price = useMemo(
    () => (order ? computePrice(order.pages, options) : null),
    [order, options]
  );

  return (
    <div className="container">
      <header className="site-header">
        <div className="wordmark">
          The Print <span className="marker">Lobby</span>
        </div>
        <nav style={{ display: "flex", gap: 16 }}>
          <a className="header-link" href="/pricing">
            Pricing
          </a>
          <a className="header-link" href="/admin">
            Staff
          </a>
        </nav>
      </header>

      <Stepper step={step} />

      {step === 1 && <UploadStep onDone={(o) => { setOrder(o); setStep(2); }} />}
      {step === 2 && order && (
        <OptionsStep
          order={order}
          options={options}
          setOptions={setOptions}
          price={price}
          onBack={() => { setOrder(null); setStep(1); }}
          onDone={() => setStep(3)}
        />
      )}
      {step === 3 && order && (
        <VerifyStep onDone={() => setStep(4)} />
      )}
      {step === 4 && order && price && (
        <PayStep order={order} price={price} onDone={(final) => { setOrder({ ...order, ...final }); setStep(5); }} />
      )}
      {step === 5 && order && (
        <DoneStep order={order} options={options} price={price} />
      )}
    </div>
  );
}

function Stepper({ step }) {
  return (
    <ol className="steps" aria-label="Progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const cls = step === n ? "active" : step > n ? "done" : "";
        return (
          <li key={label} className={`step-pill ${cls}`}>
            <span className="num">{step > n ? "\u2713" : n}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function Notice({ kind = "err", children }) {
  if (!children) return null;
  return <div className={`notice ${kind}`}>{children}</div>;
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---- Step 1: Upload --------------------------------------------------------

function UploadStep({ onDone }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed. Please try another file.");
        return;
      }
      onDone(data);
    } catch {
      setError("Something went wrong uploading. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card hero">
      <h1>
        Print your notes and documents,{" "}
        <span className="marker">without the queue</span>
      </h1>
      <p>
        Upload a PDF or Word file, choose how you want it printed, and pay online.
        Collect it at the shop or get it delivered. Files are auto-deleted after 7 days.
      </p>

      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        style={{ marginTop: 20 }}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) handleFile(e.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      >
        {busy ? (
          <div className="big">Processing your file…</div>
        ) : (
          <>
            <div className="big">Drop a file here, or click to choose</div>
            <div className="muted small" style={{ marginTop: 6 }}>
              PDF, DOCX or DOC · up to 50&nbsp;MB
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <Notice>{error}</Notice>

      <div className="trust">
        <div className="trust-item">
          <span className="tick">✓</span> PDF &amp; Word accepted
        </div>
        <div className="trust-item">
          <span className="tick">✓</span> Files auto-deleted after 7 days
        </div>
        <div className="trust-item">
          <span className="tick">✓</span> Pay securely by UPI
        </div>
      </div>
    </section>
  );
}

// ---- Step 2: Options -------------------------------------------------------

function OptionsStep({ order, options, setOptions, price, onBack, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (patch) => setOptions((o) => ({ ...o, ...patch }));

  async function submit() {
    setError("");
    if (options.fulfillment === "delivery" && options.address.trim().length < 8) {
      setError("Please enter a delivery address.");
      return;
    }
    setBusy(true);
    const { ok, data } = await postJSON(`/api/orders/${order.orderId}/confirm`, {
      token: order.accessToken,
      ...options,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || "Could not save your options.");
      return;
    }
    onDone();
  }

  return (
    <>
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{order.originalName}</div>
            <div className="muted small">
              {order.pages} page{order.pages === 1 ? "" : "s"}
              {order.converted ? " · converted from Word to PDF" : ""}
            </div>
          </div>
          <span className="code">{order.code}</span>
        </div>

        {order.converted && (
          <Notice kind="warn">
            This is the PDF we&apos;ll print. Please check the preview below — if a Word
            font shifted the layout, export to PDF yourself and re-upload.
          </Notice>
        )}

        <div style={{ marginTop: 14 }}>
          <iframe
            className="preview"
            title="Print preview"
            src={`/api/files/${order.orderId}?token=${encodeURIComponent(order.accessToken)}`}
          />
        </div>
      </section>

      <section className="card">
        <label className="field" style={{ marginTop: 0 }}>
          <span className="field-label">Color</span>
          <div className="seg">
            <Seg on={options.colorMode === "bw"} onClick={() => set({ colorMode: "bw" })}>
              Black &amp; white
            </Seg>
            <Seg on={options.colorMode === "color"} onClick={() => set({ colorMode: "color" })}>
              All color
            </Seg>
            <Seg on={options.colorMode === "mixed"} onClick={() => set({ colorMode: "mixed" })}>
              Some color pages
            </Seg>
          </div>
        </label>

        {options.colorMode === "mixed" && (
          <label className="field">
            <span className="field-label">Which pages are in color?</span>
            <input
              type="text"
              placeholder="e.g. 1, 4, 9-12"
              value={options.colorPages}
              onChange={(e) => set({ colorPages: e.target.value })}
            />
          </label>
        )}

        <div className="row" style={{ marginTop: 16 }}>
          <label className="field" style={{ marginTop: 0 }}>
            <span className="field-label">Sides</span>
            <div className="seg">
              <Seg on={options.sides === "single"} onClick={() => set({ sides: "single" })}>
                Single
              </Seg>
              <Seg on={options.sides === "double"} onClick={() => set({ sides: "double" })}>
                Double
              </Seg>
            </div>
          </label>
          <label className="field" style={{ marginTop: 0 }}>
            <span className="field-label">Copies</span>
            <input
              type="number"
              min={1}
              max={100}
              value={options.copies}
              onChange={(e) => set({ copies: e.target.value })}
            />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Binding</span>
          <div className="seg">
            {Object.entries(RATES.bindings).map(([key, b]) => (
              <Seg key={key} on={options.binding === key} onClick={() => set({ binding: key })}>
                {b.label}
                {b.fee ? ` (+${CURRENCY}${b.fee})` : ""}
              </Seg>
            ))}
          </div>
        </label>

        <label className="field">
          <span className="field-label">Get it as</span>
          <div className="seg">
            {Object.entries(RATES.fulfillment).map(([key, f]) => (
              <Seg key={key} on={options.fulfillment === key} onClick={() => set({ fulfillment: key })}>
                {f.label}
                {f.fee ? ` (+${CURRENCY}${f.fee})` : ""}
              </Seg>
            ))}
          </div>
        </label>

        {options.fulfillment === "delivery" && (
          <label className="field">
            <span className="field-label">Delivery address</span>
            <textarea
              placeholder="Hostel / room / address and pincode"
              value={options.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </label>
        )}
      </section>

      <section className="card">
        <PriceSummary price={price} />
        <Notice>{error}</Notice>
        <div className="btn-row">
          <button className="btn" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Continue to verify"}
          </button>
          <button className="btn btn-ghost" onClick={onBack} disabled={busy}>
            Start over
          </button>
        </div>
      </section>
    </>
  );
}

function Seg({ on, onClick, children }) {
  return (
    <button type="button" className={on ? "sel" : ""} onClick={onClick} aria-pressed={on}>
      {children}
    </button>
  );
}

function PriceSummary({ price }) {
  if (!price) return null;
  const money = (n) => `${price.currency}${n.toFixed(2)}`;
  return (
    <div className="summary">
      <div className="line">
        <span>
          Black &amp; white — {price.bwCount} page{price.bwCount === 1 ? "" : "s"}
        </span>
        <span>{money(price.bwCost)}</span>
      </div>
      {price.colorCount > 0 && (
        <div className="line">
          <span>Color — {price.colorCount} page{price.colorCount === 1 ? "" : "s"}</span>
          <span>{money(price.colorCost)}</span>
        </div>
      )}
      {price.bindingFee > 0 && (
        <div className="line">
          <span>Binding</span>
          <span>{money(price.bindingFee)}</span>
        </div>
      )}
      {price.copies > 1 && (
        <div className="line">
          <span>× {price.copies} copies</span>
          <span></span>
        </div>
      )}
      {price.belowMinimum && (
        <div className="line">
          <span>Minimum order</span>
          <span>applied</span>
        </div>
      )}
      {price.deliveryFee > 0 && (
        <div className="line">
          <span>Delivery</span>
          <span>{money(price.deliveryFee)}</span>
        </div>
      )}
      <div className="total">
        <span>Total</span>
        <span>{money(price.total)}</span>
      </div>
    </div>
  );
}

// ---- Step 3: Verify phone --------------------------------------------------

function VerifyStep({ onDone }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    const { ok, data } = await postJSON("/api/auth/phone", { phone });
    setBusy(false);
    if (!ok) {
      setError(data.error || "Could not save your number. Please try again.");
      return;
    }
    onDone();
  }

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Your phone number</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        We use this to send you order updates and to reach you if there&apos;s a
        problem with your printout.
      </p>

      <label className="field">
        <span className="field-label">Mobile number</span>
        <input
          type="tel"
          placeholder="10-digit number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={13}
        />
      </label>

      <Notice>{error}</Notice>

      <div className="btn-row">
        <button
          className="btn"
          onClick={confirm}
          disabled={busy || phone.replace(/\D/g, "").length < 10}
        >
          {busy ? "Saving…" : "Continue to payment"}
        </button>
      </div>
    </section>
  );
}

// ---- Step 4: Pay -----------------------------------------------------------

function PayStep({ order, price, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function claimPaid() {
    setError("");
    setBusy(true);
    const { ok, data } = await postJSON(`/api/orders/${order.orderId}/pay`, {
      token: order.accessToken,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || "Could not record your payment. Please try again.");
      return;
    }
    onDone({ status: data.status, code: data.code });
  }

  const amount = `${price.currency}${price.total.toFixed(2)}`;

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Pay by UPI</h2>
      <PriceSummary price={price} />

      <div className="upi-pay">
        <img
          className="upi-qr"
          alt="UPI payment QR code"
          src={`/api/orders/${order.orderId}/qr?token=${encodeURIComponent(order.accessToken)}`}
        />
        <div className="upi-meta">
          <div className="small muted">
            Scan with any UPI app — GPay, PhonePe, Paytm…
          </div>
          <div className="upi-amount">{amount}</div>
          <div className="small">
            UPI ID: <span className="code">{SHOP.upiVpa}</span>
          </div>
          <div className="small muted">Reference: {order.code}</div>
        </div>
      </div>

      <Notice kind="info">
        After paying in your UPI app, tap the button below. The shop confirms the
        payment and then starts printing — you&apos;ll get an update on your phone.
      </Notice>
      <Notice>{error}</Notice>

      <div className="btn-row">
        <button className="btn" onClick={claimPaid} disabled={busy}>
          {busy ? "Recording…" : "I've completed the payment"}
        </button>
      </div>
    </section>
  );
}

// ---- Done ------------------------------------------------------------------

function DoneStep({ order, options, price }) {
  const delivery = options.fulfillment === "delivery";
  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>
        Thanks — we&apos;ve got your order <span className="marker">✓</span>
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Once the shop confirms your UPI payment, your order goes into the print
        queue. This is usually quick during shop hours.
      </p>
      <div className="summary" style={{ marginTop: 8 }}>
        <div className="line">
          <span>Order code</span>
          <span className="code">{order.code}</span>
        </div>
        <div className="line">
          <span>Amount</span>
          <span>
            {price.currency}
            {price.total.toFixed(2)}
          </span>
        </div>
        <div className="line">
          <span>Collection</span>
          <span>{delivery ? "Delivery to your address" : "Pickup at the shop"}</span>
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>
        Keep your order code handy. {delivery
          ? "We'll message you when it's out for delivery."
          : "We'll message you when it's ready to collect."}
      </p>
      <div className="btn-row">
        <a className="btn" href="/">
          Print something else
        </a>
      </div>
    </section>
  );
}
