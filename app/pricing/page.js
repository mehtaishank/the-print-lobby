import { RATES, CURRENCY, computePrice } from "@/config/pricing";

export const metadata = {
  title: "Pricing — The Print Lobby",
  description: "Simple per-page printing rates. See your total before you pay.",
};

function money(n) {
  return `${CURRENCY}${Number(n).toFixed(2)}`;
}

export default function PricingPage() {
  // Worked example, computed from the same engine used at checkout so it can
  // never drift from the real price.
  const example = computePrice(20, {
    colorMode: "bw",
    copies: 1,
    binding: "spiral",
    fulfillment: "pickup",
  });

  return (
    <div className="container">
      <header className="site-header">
        <div className="wordmark">
          The Print <span className="marker">Lobby</span>
        </div>
        <nav style={{ display: "flex", gap: 16 }}>
          <a className="header-link" href="/">
            Home
          </a>
          <a className="header-link" href="/admin">
            Staff
          </a>
        </nav>
      </header>

      <section className="card hero">
        <h1>
          Simple, <span className="marker">per-page</span> pricing
        </h1>
        <p>
          Pay only for what you print. No account needed — upload a file, choose
          your options, and see the total before you pay.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Printing</h2>
        <div className="summary">
          <div className="line">
            <span>Black &amp; white — per page</span>
            <span>{money(RATES.bwPerPage)}</span>
          </div>
          <div className="line">
            <span>Color — per page</span>
            <span>{money(RATES.colorPerPage)}</span>
          </div>
          <div className="total">
            <span>Minimum order</span>
            <span>{money(RATES.minOrder)}</span>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Mixed documents are welcome — tell us which pages are in color and we
          charge the color rate only for those.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Binding &amp; delivery</h2>
        <div className="summary">
          {Object.values(RATES.bindings).map((b) => (
            <div className="line" key={b.label}>
              <span>{b.label}</span>
              <span>{b.fee ? `+${money(b.fee)}` : "Free"}</span>
            </div>
          ))}
          {Object.values(RATES.fulfillment).map((f) => (
            <div className="line" key={f.label}>
              <span>{f.label}</span>
              <span>{f.fee ? `+${money(f.fee)}` : "Free"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Example</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          A 20-page black &amp; white assignment, spiral-bound, picked up at the
          shop:
        </p>
        <div className="summary">
          <div className="line">
            <span>20 pages, black &amp; white</span>
            <span>{money(example.bwCost)}</span>
          </div>
          <div className="line">
            <span>Spiral binding</span>
            <span>{money(RATES.bindings.spiral.fee)}</span>
          </div>
          <div className="total">
            <span>Total</span>
            <span>{money(example.total)}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <p className="small muted" style={{ marginTop: 0 }}>
          Word files are converted to PDF for free, and you preview the result
          before paying. Uploaded files are automatically deleted after 7 days.
        </p>
        <div className="btn-row">
          <a className="btn" href="/">
            Upload a file to start
          </a>
        </div>
      </section>
    </div>
  );
}
