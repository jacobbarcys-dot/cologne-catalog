import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { AccordBars } from "@/components/fragrance-profile";
import { getCurrentUser } from "@/lib/auth";
import { getShelf } from "@/lib/collection";
import { formatPrice } from "@/lib/format";
import { getLatestBestPrices } from "@/lib/prices/data";
import { createClient } from "@/lib/supabase/server";
import { getWishlist } from "@/lib/wishlist";
import { WearToday } from "./wear-today";

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Suspense fallback={<HomeSkeleton />}>
          <Dashboard />
        </Suspense>
      </main>
    </>
  );
}

async function Dashboard() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [shelf, wishlist, catalog] = await Promise.all([
    getShelf(),
    getWishlist(),
    supabase.from("cologne_fragrances").select("id", { count: "exact", head: true }),
  ]);
  const best = await getLatestBestPrices(wishlist.map((w) => w.fragrance.id));
  const deals = wishlist.filter((w) => {
    const b = best[w.fragrance.id];
    return b && w.target_price !== null && b.price <= w.target_price;
  });

  // Scent profile: accord strengths summed across the shelf, scaled so the top one is 100.
  const totals = new Map<string, number>();
  for (const item of shelf) {
    for (const a of item.fragrance.accords ?? []) totals.set(a.name, (totals.get(a.name) ?? 0) + a.strength);
  }
  const top = [...totals].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = top[0]?.[1] ?? 1;
  const scentProfile = top.map(([name, total]) => ({ name, strength: Math.round((total / max) * 100) }));

  const firstName = user.name.split(" ")[0];
  const cards = [
    { href: "/collection", title: "My Collection", count: shelf.length, unit: "bottles", blurb: "Everything on your shelf." },
    { href: "/search", title: "Search Fragrances", count: catalog.count ?? 0, unit: "in catalog", blurb: "Accords, notes, ratings, when to wear." },
    { href: "/wishlist", title: "Wishlist", count: wishlist.length, unit: "wanted", blurb: "Track what's next and find the best price." },
  ];

  return (
    <>
      <h1 className="font-serif text-4xl">Welcome back, {firstName}</h1>
      <p className="mt-2 text-muted">What are we smelling like today?</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-accent"
          >
            <p className="text-sm text-muted">{card.title}</p>
            <p className="mt-2 font-serif text-4xl">
              {card.count} <span className="font-sans text-sm text-muted">{card.unit}</span>
            </p>
            <p className="mt-3 text-sm text-muted group-hover:text-ink">{card.blurb}</p>
          </Link>
        ))}
      </div>

      {deals.length > 0 && (
        <section className="mt-6 rounded-2xl border border-green-600/40 bg-green-600/10 p-5">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-green-700 dark:text-green-400">
            Below your target price
          </h2>
          <ul className="mt-3 space-y-2">
            {deals.map((w) => (
              <li key={w.id}>
                <Link href={`/fragrance/${w.fragrance.slug}#prices`} className="flex justify-between gap-3 hover:underline">
                  <span>
                    {w.fragrance.brand} {w.fragrance.name}
                  </span>
                  <span className="font-medium">
                    {formatPrice(best[w.fragrance.id].price)}{" "}
                    <span className="text-xs text-muted">target {formatPrice(w.target_price)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shelf.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <WearToday shelf={shelf} />
          {scentProfile.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Your scent profile</h2>
              <p className="mt-1 text-xs text-muted">Main accords across your whole collection</p>
              <div className="mt-4">
                <AccordBars accords={scentProfile} compact />
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 w-72 rounded bg-line" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-line" />
        ))}
      </div>
    </div>
  );
}
