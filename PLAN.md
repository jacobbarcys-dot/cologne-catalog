# Cologne Catalog — Plan of Action

A personal web app (phone + computer) to catalog the colognes I own, look up
any fragrance Fragrantica-style without leaving the site, keep a wishlist, and
compare prices across my preferred discounters.

## Decisions so far

| Topic | Decision |
|---|---|
| Platform | Web app, mobile-friendly, installable on phone home screen (PWA) |
| Users | Just me for now; every record is tied to a user so more users can be added later |
| Collection | Full bottles only (no decants/samples); ~10 to start, entered by name |
| Fragrance info | Search any fragrance in-app and see the full profile on my site |
| Prices | On demand ("Check prices" button per cologne), USD |
| Extras (wear log, compliments) | Not now |

## Fragrance data — how "live" search works

Fragrantica blocks automated access (returns 403) and its terms forbid
scraping, so the app does not pull pages from Fragrantica directly. Instead:

1. Search box queries the app's own fragrance database (instant).
2. If the fragrance isn't there yet, the app runs a **live lookup**: an AI
   research step (Claude API with web search) compiles the profile from public
   sources and saves it. Takes a few seconds; afterwards it's instant.
3. Each profile has a "Refresh" button to re-run the lookup.

Profile contents:
- Main accords (with Fragrantica-style coloured strength bars)
- Note pyramid: top / heart / base
- Description
- Community ratings: overall, longevity, sillage, value (approximate)
- When to wear: seasons (winter/spring/summer/fall) and day/night
- "What people say": summary of common praise and complaints
- Source links

## Price checking

Stores (from my discounters list):

| Store | How we read prices | Notes |
|---|---|---|
| aurafragrance.com | Store search JSON (Shopify) | Easy |
| jomashop.com | Page parsing | Reachable |
| ediscountperfumes.com | Page parsing | Reachable |
| maxaroma.com | Page parsing | Reachable |
| venbafragrance.com | Page parsing | Reachable |
| fragrancenet.com | Headless browser needed | Blocks plain requests (403) |
| fragrancex.com | Headless browser needed | Blocks plain requests (403) |

Each store gets its own small "adapter", so one store breaking doesn't break
the rest. Results are matched on size (ml/oz) and concentration (EDT/EDP/
Parfum), ranked cheapest first, with a link to buy. If a store can't be read,
the app shows a direct "search on this site" link instead.

## Tech stack

- **Next.js (React + TypeScript)** — the website and its server functions
- **Supabase** — database (Postgres) + login, so multi-user is ready later
- **Vercel** — free hosting, works on phone and computer
- **Claude API** — the live fragrance lookup
- **Headless browser service** — only for FragranceNet and FragranceX

## Build steps

1. **Foundation** — project skeleton, database tables, login, deploy a "hello" page.
2. **My Collection** — add/edit/remove bottles (size, concentration, price paid,
   where bought, my rating, notes); grid of cards; search, filter, sort.
3. **Fragrance profiles** — the profile page (accord bars, pyramid, ratings,
   seasons, reviews summary) and the live lookup + search. Enter my 10 colognes.
4. **Wishlist** — add from search, priority, target price, "I bought it" moves
   it to the collection.
5. **Price checker** — store adapters one at a time, starting with the easy
   ones; comparison table; price history saved per check.
6. **Polish** — stats dashboard, phone home-screen install, look and feel.
