import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { FragranceProfile } from "@/components/fragrance-profile";
import { PricePanel } from "@/components/price-panel";
import { getFragrance, getMyBottles, lookupEnabled } from "@/lib/fragrance";
import { getWishlistEntry } from "@/lib/wishlist";
import { RefreshButton } from "./refresh-button";
import { WishlistButton } from "./wishlist-button";

export const metadata = { title: "Fragrance" };

export default function FragrancePage({ params }: PageProps<"/fragrance/[slug]">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Link href="/search" className="text-sm text-muted hover:text-ink">
          ← Search
        </Link>
        <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-line" />}>
          {params.then(({ slug }) => (
            <FragranceDetail slug={slug} />
          ))}
        </Suspense>
      </main>
    </>
  );
}

async function FragranceDetail({ slug }: { slug: string }) {
  const fragrance = await getFragrance(slug);
  if (!fragrance) notFound();
  const [owned, wish] = await Promise.all([getMyBottles(fragrance.id), getWishlistEntry(fragrance.id)]);
  const preferredSizeMl = wish?.desired_size_ml ?? owned.find((b) => b.size_ml)?.size_ml ?? 100;

  const meta = [
    fragrance.concentration,
    fragrance.gender && `for ${fragrance.gender.toLowerCase()}`,
    fragrance.perfumers.length > 0 && `by ${fragrance.perfumers.join(" & ")}`,
  ].filter(Boolean);

  return (
    <article className="mt-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          {fragrance.brand}
          {fragrance.release_year && <span className="tracking-normal"> · {fragrance.release_year}</span>}
        </p>
        <h1 className="font-serif text-5xl leading-tight">{fragrance.name}</h1>
        {meta.length > 0 && <p className="mt-1 text-muted">{meta.join(" · ")}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          {owned.length > 0 ? (
            <Link
              href={`/collection/${owned[0].id}`}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-paper hover:opacity-90"
            >
              ✓ In your collection
            </Link>
          ) : (
            <Link
              href={`/collection/new?fragrance=${fragrance.id}`}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90"
            >
              + Add to collection
            </Link>
          )}
          <WishlistButton fragranceId={fragrance.id} onWishlist={Boolean(wish)} />
          {lookupEnabled() && <RefreshButton slug={fragrance.slug} />}
        </div>
      </header>

      <div className="mt-8">
        <PricePanel fragrance={fragrance} preferredSizeMl={preferredSizeMl} />
      </div>

      <div className="mt-4">
        <FragranceProfile fragrance={fragrance} />
      </div>
    </article>
  );
}
