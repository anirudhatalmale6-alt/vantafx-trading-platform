# VantaFX — forex trading platform with client area

A self-contained web trading platform: public site, live quote stream, order ticket,
password-protected client area with support chat, and an admin dashboard.

No third-party trading API, no paid data feed, no external service of any kind.

---

## What is in the box

**Public site**
- Landing page with a live scrolling ticker and a live rates table
- Registration and sign-in, responsive down to phone width

**Trading terminal** (`/dashboard`)
- 11 instruments: 7 majors, 3 crosses, gold
- Candlestick chart with M1 / M5 / M15 / H1 / H4 / D1 timeframes
- Order ticket: buy/sell, lot size, optional stop loss and take profit in pips
- Live account bar: balance, equity, floating P/L, free margin, margin level
- Open positions revalued on every tick; one-click close
- Full trade history with the reason each position closed
- Market-news strip fed from plain RSS

**Client area**
- `/account` — review and edit personal details, change password
- `/support` — live chat with the desk (server-sent events, instant both ways)

**Admin dashboard** (`/admin`)
- Overview: user counts, open book, realised P/L, audit log
- Users: search, suspend/reactivate, promote/demote, adjust practice balance
- Trades: every open position with live P/L, force-close
- Chat: inbox of all client conversations with unread counts, reply live

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript | one codebase for site, client area and API |
| Styling | Tailwind CSS v4 | responsive without a UI dependency |
| Database | SQLite via Prisma | zero setup; swap to Postgres by changing two lines |
| Auth | own session layer, bcrypt + HttpOnly cookies | no auth vendor, no lock-in |
| Realtime | server-sent events | works on any Node host, no websocket infra |
| Chart | lightweight-charts | the library behind TradingView's free charts |

---

## Quick start

```bash
npm install
cp .env.example .env         # then edit SESSION_SECRET
npm run setup                # creates the database and the first admin
npm run dev                  # http://localhost:3000
```

`npm run setup` prints the seeded credentials. Change the admin password
immediately from `/account`.

Production:

```bash
npm run build
npm start
```

Full server instructions are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
The day-to-day operating guide is in [docs/HANDOVER.md](docs/HANDOVER.md).

---

## Where prices come from

There is no live broker feed and no paid data subscription — by design.

`PRICE_SOURCE=simulated` (default) runs a built-in synthetic feed. The price of a
symbol at any moment is a pure function of `(symbol, timestamp)`, so history is
reproducible, a restart does not break the chart, and two servers behind a load
balancer quote the same number.

`PRICE_SOURCE=ecb` additionally pulls the European Central Bank daily reference
rates from `frankfurter.app` (free, no key, no signup) and re-centres the feed on
today's real rates. The intraday shape stays synthetic. If that endpoint is
unreachable the built-in levels are used and nothing breaks.

Swapping in a commercial tick feed later means implementing one function,
`midPriceAt`, in `src/lib/prices/engine.ts`. Nothing else in the app changes.

---

## Security

- bcrypt (cost 12) password hashing
- Only a SHA-256 of the session token is stored, so a database dump cannot be replayed
- HttpOnly + SameSite=Lax session cookies, Secure in production
- Double-submit CSRF token plus a same-origin check on every mutating request
- Rate limits on sign-in (per IP and per account), registration, password change, orders and chat
- Role checks deny by default; suspension kills live sessions immediately
- Changing a password invalidates every other session
- Strict CSP, `X-Frame-Options: DENY`, `nosniff`, trimmed referrer
- Audit log of registrations, sign-ins, failed sign-ins, trades and admin actions

---

## Layout

```
prisma/schema.prisma      data model
src/lib/                  auth, sessions, CSRF, rate limiting, trading maths, price engine
src/app/(auth)/           sign-in and registration
src/app/(app)/            client area: terminal, account, support
src/app/admin/            admin dashboard
src/app/api/              route handlers
src/components/           UI, terminal widgets, chat
docs/                     deployment and handover guides
```
