# Handover guide

Short version of how to run the platform day to day, and where to change things.

---

## First 10 minutes

1. Sign in with the admin account created by `npm run setup`.
2. Go to `/account` and change the password. The seeded one is in a config file.
3. Open `/admin` — that is your home screen.

---

## Everyday tasks

**Answer a client** — `/admin/chat`. The list is ordered by most recent, with an
unread badge. Click a conversation, type, press Enter. The client sees it
instantly if their tab is open, and the badge in their nav if not.

**Suspend an account** — `/admin/users` → Suspend. It takes effect immediately:
the client's existing session is destroyed, not merely expired. Reactivate puts
them straight back.

**Adjust a balance** — `/admin/users`, type an amount in the small box
(`500` to credit, `-500` to debit) and press Apply. This is a practice balance,
not real money movement. Every adjustment is written to the audit log.

**Close a client's position** — `/admin/trades` → Force close. Two clicks,
because it books a real cash movement on their account. It shows in their history
as "Closed by desk".

**Promote a colleague** — `/admin/users` → Make admin. The app refuses to demote
the last remaining admin, and refuses to let you suspend or demote yourself.

---

## How trading works

- Account currency is USD. Every new client starts with a simulated $10,000.
- 1 lot = 100,000 units of the base currency (100 oz for gold).
- Leverage is 1:100. An order is rejected if it needs more margin than is free.
- Buys fill at the ask and close at the bid; sells the other way round. That
  spread is why a position opens slightly negative — same as a real broker.
- Stop loss and take profit are checked **on the server every 3 seconds**, so
  they trigger with the client's browser closed. History records which one fired.
- Max 25 open positions per client, 0.01–50 lots per order.

To change any of these: `LEVERAGE` and the instrument table are in
`src/lib/instruments.ts`; the limits are in `src/lib/trading.ts` and
`src/lib/validation.ts`.

---

## Common changes

| You want to… | Edit |
| --- | --- |
| Rename the platform | `src/lib/site.ts` |
| Change colours | the `@theme` block at the top of `src/app/globals.css` |
| Add or remove an instrument | `INSTRUMENTS` in `src/lib/instruments.ts` |
| Change the starting balance | `balance: 10_000` in `src/app/api/auth/register/route.ts` |
| Change password rules | `passwordSchema` in `src/lib/validation.ts` (form hints follow automatically) |
| Change the news feeds | `NEWS_FEEDS` in `.env` |
| Use real ECB rates | `PRICE_SOURCE=ecb` in `.env` |
| Change the risk warning | `src/lib/site.ts` |

---

## Adding the parked modules later

The codebase was laid out so these do not need a rewrite.

**Real price feed** — implement `midPriceAt(symbol, tSeconds)` in
`src/lib/prices/engine.ts` against your provider and cache it. Quotes, candles,
P/L and the stop sweep all read through that one function.

**Trade alerts / notifications** — `sweepStopsAndTargets()` in
`src/lib/trading.ts` already knows the moment a position closes. Emit from there.

**Pending / limit orders** — add a `PENDING` status to `Trade` and give the
existing 3-second ticker a second pass that converts pending to open.

**Deposits and withdrawals** — the balance is a single `Float` on `User` and the
only writes to it are in `closeTrade` and the admin adjustment route. Add a
`Transaction` table and route the writes through it.

**KYC documents** — `User` is the natural place; the client area already has a
details form to hang an upload off.

---

## Things worth knowing

- **The database is one file.** Back it up with `sqlite3 … ".backup"`, not `cp`.
- **`SESSION_SECRET` must be stable.** Changing it signs everybody out.
- **Rate limits and chat delivery are per process.** Fine on one server, which is
  how it is deployed. If you scale to several, see the notes in
  `docs/DEPLOYMENT.md` §6 — both files say exactly what to swap.
- **SSE needs unbuffered proxying.** If chat or quotes look frozen behind nginx,
  it is `proxy_buffering off;` that is missing.
- **This is a simulated platform.** No real money moves. Before it ever handles
  real funds it needs a payment provider, KYC, and whatever licence your
  jurisdiction requires — none of which is in scope here.

---

## Test accounts

Created by `npm run setup`:

- admin — the email and password from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- client — `demo@example.com` / `DemoTrader1`

Delete the demo client before going live: `/admin/users` → Suspend, or remove the
row directly.
