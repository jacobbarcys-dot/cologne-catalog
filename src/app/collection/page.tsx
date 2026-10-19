import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { getMyBottles } from "@/lib/collection";
import { formatPrice } from "@/lib/format";
import { CollectionBrowser } from "./collection-browser";

export const metadata = { title: "My Collection" };

export default function CollectionPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-serif text-4xl">My Collection</h1>
          <Link
            href="/collection/new"
            className="shrink-0 rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            + Add bottle
          </Link>
        </div>
        <Suspense fallback={<CollectionSkeleton />}>
          <Collection />
        </Suspense>
      </main>
    </>
  );
}

async function Collection() {
  const bottles = await getMyBottles();

  const spent = bottles.reduce((sum, b) => sum + (b.purchase_price ?? 0), 0);
  const totalMl = bottles.reduce((sum, b) => sum + (b.size_ml ?? 0), 0);
  const stats = [
    { label: "Bottles", value: String(bottles.length) },
    { label: "Houses", value: String(new Set(bottles.map((b) => b.fragrance.brand)).size) },
    { label: "Total ml", value: totalMl ? String(Math.round(totalMl)) : "—" },
    { label: "Spent", value: spent ? formatPrice(spent)! : "—" },
  ];

  return (
    <>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
            <dt className="text-xs uppercase tracking-wider text-muted">{s.label}</dt>
            <dd className="mt-1 font-serif text-3xl">{s.value}</dd>
          </div>
        ))}
      </dl>
      <CollectionBrowser bottles={bottles} />
    </>
  );
}

function CollectionSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-line" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-line" />
        ))}
      </div>
    </div>
  );
}
