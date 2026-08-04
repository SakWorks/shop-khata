# Shop Khata — Step-by-Step: Local → Supabase → Vercel

A multi-tenant shop accounting web app. Every shopkeeper logs in with their own
phone number and only ever sees their own data — enforced by the database
itself (Postgres Row Level Security), not just app code.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4 + Supabase
(auth + Postgres) + Recharts.

---

## 0. What you need before starting

- [Node.js 18+](https://nodejs.org) installed
- [VS Code](https://code.visualstudio.com)
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account
- A GitHub account (Vercel deploys from a GitHub repo)

---

## 1. Open the project in VS Code

Unzip the project folder, then:

```bash
cd shop-khata
code .
```

Open the built-in terminal in VS Code (Ctrl+`) for every command below.

```bash
npm install
```

---

## 2. Create your Supabase project (the database)

1. Go to supabase.com → **New project**.
2. Pick a name (e.g. `shop-khata`), a strong database password (save it
   somewhere safe), and a region close to Pakistan (e.g. Singapore).
3. Wait ~2 minutes for it to provision.

### Run the database schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this project, copy **all** of it, paste it
   in, and click **Run**.
3. You should see "Success. No rows returned." This created all 6 tables and
   the security rules that keep each shopkeeper's data private.

### Turn on phone number login

1. In Supabase: **Authentication → Sign In / Providers → Phone**.
2. Toggle **Enable Phone provider** on.
3. You need an SMS provider to actually send the codes — Supabase supports
   **Twilio**, **Twilio Verify**, **MessageBird**, and **Vonage**. Twilio is
   the most common:
   - Create a free Twilio account (trial gives free credit).
   - Get a Twilio phone number.
   - In Supabase's Phone provider settings, paste your Twilio Account SID,
     Auth Token, and Messaging Service SID (or "From" number).
4. Save.

> **Note on cost:** every login sends a real SMS, which costs a small amount
> per message once you're past the trial credit. For a shop-owner-facing app
> this is normal (it's what your bank's app does too) — budget a few cents
> per login. If you want to test the app first without spending money on
> SMS, test with your own verified Twilio trial number before opening it up
> to other shopkeepers.

### Get your API keys

1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.

---

## 3. Connect the app to Supabase

In the project folder, copy the example env file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` in VS Code and paste in your real values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

This file is already in `.gitignore` — it will never be pushed to GitHub.

---

## 4. Run it locally

```bash
npm run dev
```

Open http://localhost:3000. You should land on the login page. Enter a phone
number, receive the SMS code, verify, and you're in the dashboard.

Each shopkeeper who logs in gets their own private set of rows automatically
(there's a database trigger that creates their profile on first sign-in) — no
manual setup needed per user.

---

## 5. Put the project on GitHub

```bash
git init
git add .
git commit -m "Shop Khata — initial version"
```

Create a new empty repository on github.com/new (don't add a README there),
then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/shop-khata.git
git branch -M main
git push -u origin main
```

---

## 6. Deploy on Vercel

1. Go to vercel.com/new and **Import** your `shop-khata` GitHub repo.
2. Vercel auto-detects Next.js — leave build settings as default.
3. Before clicking Deploy, open **Environment Variables** and add the same
   two values from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. In about a minute you'll get a live URL like
   `shop-khata.vercel.app`.

### One more Supabase setting after deploying

1. In Supabase: **Authentication → URL Configuration**.
2. Set **Site URL** to your live Vercel URL (e.g. `https://shop-khata.vercel.app`).
3. This keeps auth redirects pointed at your real domain.

That's it — anyone with the link can now sign up with their own phone number,
and each shop's data stays completely separate.

---

## How the numbers are calculated

- **Gross Sales (day)** = (Closing Cash − Opening Cash) + Shop Expenses that day
- **Net Profit (day)** = Closing Cash − Opening Cash
- **Monthly Net Savings** = sum of daily profit − (rent + bills) + profit from
  inventory sold that month

The formula is shown on the Today page itself so it's never a black box.

---

## Project structure

```
src/
  app/
    login/page.tsx              phone OTP login
    dashboard/
      layout.tsx                 sidebar + mobile nav shell
      page.tsx                   Today (opening/closing/expenses)
      history/page.tsx           last 10 days / by month + chart
      bills/page.tsx             rent + monthly bills
      inventory/page.tsx         purchases, sales, profit
      savings/page.tsx           combined monthly summary + tips
  components/                    Sidebar, MobileNav, shared UI (StatCard etc.)
  lib/
    supabase/client.ts           browser Supabase client
    supabase/server.ts           server Supabase client
    calc.ts                      shared calculation + formatting helpers
  middleware.ts                  protects /dashboard, redirects logged-in users away from /login
supabase/schema.sql              run this once in Supabase SQL Editor
```

## Making changes later

- Colors, fonts, spacing: `src/app/globals.css` (all design tokens are at the
  top).
- Add a new page: create a folder under `src/app/dashboard/`, add it to the
  nav arrays in `src/components/Sidebar.tsx` and `MobileNav.tsx`.
- Any schema change: write it as a new SQL migration and run it in Supabase's
  SQL Editor the same way you ran `schema.sql`.
