# Cologne Catalog

Personal web app to catalog colognes, look up any fragrance (accords, notes,
ratings, when to wear), keep a wishlist, and compare prices across discounters.
See [PLAN.md](PLAN.md) for the roadmap.

## Stack

Next.js 16 (App Router, Cache Components) · Supabase (Postgres + Google sign-in) · Tailwind CSS 4

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3000
```

Sign-in uses Google through Supabase. Each site URL's `/auth/callback`
(e.g. `http://localhost:3000/auth/callback`) must be listed under
Supabase → Authentication → URL Configuration → Redirect URLs.

Only accounts in the `cologne_members` table can use the app.

## Database

Schema lives in `supabase/migrations/`. Tables are prefixed `cologne_` because
they share a Supabase project with another app.
