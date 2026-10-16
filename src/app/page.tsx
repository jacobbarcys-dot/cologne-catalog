import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  const [bottles, wishlist, catalog] = await Promise.all([
    supabase.from("cologne_bottles").select("id", { count: "exact", head: true }),
    supabase.from("cologne_wishlist").select("id", { count: "exact", head: true }),
    supabase.from("cologne_fragrances").select("id", { count: "exact", head: true }),
  ]);

  const firstName = user.name.split(" ")[0];
  const cards = [
    { href: "/collection", title: "My Collection", count: bottles.count ?? 0, unit: "bottles", blurb: "Everything on your shelf." },
    { href: "/search", title: "Search Fragrances", count: catalog.count ?? 0, unit: "in catalog", blurb: "Accords, notes, ratings, when to wear." },
    { href: "/wishlist", title: "Wishlist", count: wishlist.count ?? 0, unit: "wanted", blurb: "Track what's next and find the best price." },
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
