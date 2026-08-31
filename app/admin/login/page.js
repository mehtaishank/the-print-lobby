"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Wrong password.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="container">
      <header className="site-header">
        <div className="wordmark">
          The Print <span className="marker">Lobby</span>
        </div>
        <a className="header-link" href="/">
          Back to shop
        </a>
      </header>

      <div className="center-narrow">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Staff sign in</h2>
          <form onSubmit={submit}>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </label>
            {error && <div className="notice err">{error}</div>}
            <div className="btn-row">
              <button className="btn" type="submit" disabled={busy || !password}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
