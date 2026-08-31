# Campus Print — MVP

An online print-on-demand shop for students: upload a PDF or Word file, choose
print options, pay, and pick it up or get it delivered. Staff approve and print
each order from a dashboard.

This is a working **MVP** with a staff-approval workflow. External services
(SMS, payments, database, object storage) run as simple local stubs so you can
try the whole flow on your laptop with **no accounts**, then swap each stub for
a real provider when you go live.

## What works out of the box

- Upload **PDF, DOCX, or DOC** (validated by extension, magic bytes, and size)
- Word files are **converted to PDF** automatically (LibreOffice) and the
  customer **previews and confirms** that PDF before paying
- Automatic **page count** and **live pricing** (B&W / color / mixed, sides,
  copies, binding, pickup vs delivery)
- **Phone OTP login** (code shown on screen in dev; console-logged)
- **Mock payment** that drops the order into the staff queue
- **Staff dashboard** to approve → mark printed → ready/out-for-delivery →
  completed (or reject)
- **7-day auto-delete** of files and order records (cleanup script)

## Requirements

- **Node.js 18+** (developed on Node 22)
- **LibreOffice** on the machine running the app — this is what converts Word to
  PDF. Install:
  - macOS: `brew install --cask libreoffice`
  - Ubuntu/Debian: `sudo apt-get install -y libreoffice`
  - Windows: install LibreOffice and ensure `soffice` is on your PATH
  - Confirm it works: `soffice --version`

  If you don't install LibreOffice, PDF uploads still work; only Word conversion
  fails (with a clear message asking the user to upload a PDF).

## Run it

```bash
npm install
cp .env.example .env.local     # optional in dev; defaults are fine
npm run dev
```

Then open:

- Customer flow: <http://localhost:3000>
- Staff dashboard: <http://localhost:3000/admin>
  (default password `admin123` — change `ADMIN_PASSWORD` in `.env.local`)

Try it end to end: upload a file, pick options, "send code" (the code appears on
screen in dev), verify, then pay by UPI and open `/admin` to confirm the payment
and move it through the queue.

### Payments (pilot method)

The app shows the customer a **UPI QR code** for the exact order amount. They pay
in any UPI app (GPay, PhonePe, Paytm) and tap "I've completed the payment", which
puts the order in **Payment review**. A staff member checks the money landed and
taps **Mark paid**, which sends it to the print queue. No payment gateway or KYC
is needed to run this.

Set your UPI ID in `config/shop.js` (`upiVpa`) so the QR points at your account.

When you want automatic confirmation (no manual "Mark paid"), switch to Razorpay's
QR Codes API + a signature-verified webhook — the seam is documented in
`app/api/orders/[id]/pay/route.js`. That step needs a Razorpay account with KYC
and the app deployed to a public HTTPS URL so the webhook can reach it.

### Auto-delete after 7 days

Run the cleanup on a schedule (cron / Task Scheduler):

```bash
npm run cleanup
```

## Project layout

```
config/pricing.js          Rates + price calc (shared by client and server)
lib/validate.js            Upload checks (extension, magic bytes, size)
lib/pdf.js                 Page counting + Word→PDF (LibreOffice)
lib/storage.js             File storage on disk (path-traversal safe)
lib/db.js                  Order + OTP store (JSON file)
lib/otp.js                 OTP generate/verify + rate limiting
lib/session.js             Signed-cookie sessions (customer + admin)
lib/orders.js              Status lifecycle + allowed transitions
app/page.js                Customer flow (upload → options → verify → pay)
app/admin/                 Staff login + dashboard
app/api/                   Route handlers for everything above
scripts/cleanup.js         7-day retention job
```

## Going to production — the swap list

Each dev stub is isolated so you can replace it without touching the rest.

| Concern | Dev stub (now) | Production |
|---|---|---|
| Database | `lib/db.js` (JSON file) | Supabase / Postgres — reimplement the same functions |
| File storage | `lib/storage.js` (disk) | Supabase Storage / S3 / R2 + a 7-day lifecycle rule |
| OTP SMS | `lib/otp.js` `sendSms()` logs to console | MSG91 / Fast2SMS / Twilio (India needs **DLT-registered** templates — start early) |
| Payment | UPI QR + staff taps "Mark paid" (`config/shop.js`, pay route) | Razorpay QR Codes API for a dynamic per-order QR + a **signature-verified webhook** that auto-confirms |
| Word→PDF fidelity | LibreOffice | Keep LibreOffice, or add a Word-based renderer (e.g. CloudConvert) for tricky files |
| Sessions/secrets | dev defaults | Set strong `SESSION_SECRET` and `ADMIN_PASSWORD`; serve over HTTPS |

Also before launch: set `APP_ENV=production` (hides dev OTP codes and the mock
pay path), put the app behind HTTPS, and add a privacy note about the 7-day
auto-delete.

## The next milestone: one-click printing

Right now staff print manually from the preview link — the simplest reliable
start. To make approved jobs print themselves, add a small **print agent** on the
shop PC that polls for `approved` orders, downloads the PDF, and prints with the
chosen settings (on Windows, SumatraPDF's silent `-print-to` with
`-print-settings` for color/mono, duplex, and copies). The approval step in
`app/api/admin/orders/[id]/route.js` is where that hand-off happens.

## Security notes

- Uploads are validated by extension **and** magic bytes **and** size; files are
  stored under a server-generated id, never a user filename.
- Order data and files are reachable only with the order's access token or an
  admin session (prevents guessing other people's orders).
- OTP requests are rate-limited; codes are stored hashed and expire.
- The price is always recomputed on the server — the browser estimate is never
  trusted for charging.
- Staff state changes are checked against allowed transitions (deny by default).

This is an MVP: review and harden before handling real customer data and money.
