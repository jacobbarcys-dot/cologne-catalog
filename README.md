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

### Optional: live fragrance lookup

Set one of these server-side keys (never `NEXT_PUBLIC_`) to switch on "Look up"
on the Search page and "Refresh details" on fragrance pages:

- `NVIDIA_API_KEY` (build.nvidia.com, free): model knowledge only, no web
  search. Model list in `src/lib/lookup/nvidia.ts`; override the first with
  `NVIDIA_MODEL`.
- `GEMINI_API_KEY` / `GOOGLE_API_KEY`: Google Search grounded on a paid tier,
  model knowledge on the free tier. Override the first model with `GEMINI_MODEL`.

NVIDIA is used when both are set. Without a key, search covers the existing
catalog only.

## Database

Schema lives in `supabase/migrations/`. Tables are prefixed `cologne_` because
they share a Supabase project with another app.
