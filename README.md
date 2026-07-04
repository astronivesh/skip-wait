# Skip Wait — working MVP

Order ahead from local kitchens. Skip the line, skip the platform fee.
Two fulfilment modes: **Pick Up** (you collect, ₹0 delivery) and **Delivery** (outsourced rider).

This is a real, runnable app — not a mockup. A FastAPI backend with a database, phone-OTP
login, server-side billing, prepaid kitchen credits, and an OTP-verified pickup handoff, plus a
React (Vite) front-end wired to it with a live-updating tracking screen and kitchen dashboard.

---

## Run it (two terminals)

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
Interactive API docs: http://localhost:8000/docs

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the printed URL (usually http://localhost:5173).

> The frontend talks to `http://localhost:8000` (set in `frontend/src/api.js`). If you run the
> backend elsewhere, change `API` there. To use a second device on the same Wi-Fi, set `API` to
> your machine's LAN IP (e.g. `http://192.168.1.5:8000`) and start uvicorn with `--host 0.0.0.0`.

---

## The demo loop

1. **Log in** — enter any 10-digit number. There's no SMS yet, so the code is shown on screen
   (dev mode). Enter it to continue.
2. **Order** — pick a kitchen, add items, hit checkout, choose **Pick Up** or **Delivery**,
   place the order. Note the **order ID** and the **pickup code / OTP** on the tracking screen.
3. **Run the kitchen** — switch to the **Kitchen** tab (or open the app on a second device and go
   to Kitchen). You'll see the live order. Tap through Accept → Preparing → Ready.
4. **Handoff** — the final pickup step asks for the customer's code. Enter the wrong one → it's
   rejected. Enter the code from the customer's screen → order completes, and the customer's
   tracking screen updates live (it polls every 3s).

Delivery orders skip the code at the kitchen — doorstep proof of delivery is the rider's
(Porter's) job, not yours.

---

## What's real vs stubbed

**Real**
- Persistent kitchens, menus, orders, statuses (SQLite file `backend/skipwait.db`)
- Phone + OTP login with bearer tokens
- Bills computed on the server from real menu prices (never trusted from the client)
- Prepaid kitchen credits — every order burns the ₹5 fee from the kitchen's balance (the B2B
  revenue model). Watch a kitchen's balance drop in the Kitchen tab.
- OTP-verified pickup handoff (the kitchen confirms the customer's code)
- Live status sync via polling

**Stubbed (clearly marked in code)**
- **SMS** — the login/pickup codes are returned in the API response instead of texted.
  Swap in MSG91 / Twilio / Firebase in `request_otp`.
- **Payments** — by design, money never flows through the app. In production the customer pays
  the kitchen by UPI directly; you only collect the ₹5 via prepaid credits (top-ups via a
  payment gateway, B2B). This keeps you out of payment-aggregator licensing.
- **Delivery** — rider details are mocked. Book Porter manually at first; wire the Porter/Pidge
  API once volume justifies it.

---

## Path to production (the build order)

1. **DB** → swap SQLite for Postgres (change `DB_URL` in `app.py`).
2. **Auth** → replace the in-memory session dict with JWTs; add real SMS for the login OTP.
3. **Real-time** → polling works fine to start; move to websockets when you want instant updates.
4. **Money** → prepaid credit top-ups via Razorpay/Cashfree (B2B only); customer pays kitchen by UPI.
5. **Delivery** → integrate Porter/Pidge for the rider leg; rely on their OTP for doorstep proof.
6. **Legal** → business entity, terms + privacy, DPDP consent on signup, confirm kitchens hold FSSAI.
7. **Ship** → PWA first (installable, no app store); deploy backend on Railway/Render/Fly.

---

## Structure
```
skip-wait/
├── backend/
│   ├── app.py            # the whole API (models, auth, orders, seed)
│   ├── requirements.txt
│   └── test_flow.py      # end-to-end test of the order lifecycle
└── frontend/
    ├── src/
    │   ├── App.jsx       # all screens: login, ordering, tracking, kitchen
    │   └── api.js        # fetch layer (point this at your backend)
    ├── index.html
    ├── package.json
    └── vite.config.js
```

Run the backend test any time with: `cd backend && python test_flow.py` (server must be running).
