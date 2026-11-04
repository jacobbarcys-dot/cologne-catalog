import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { FragranceProfile } from "@/components/fragrance-profile";
import { getFragrance, getMyBottleIds, lookupEnabled } from "@/lib/fragrance";
import { RefreshButton } from "./refresh-button";

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
  const owned = await getMyBottleIds(fragrance.id);

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
              href={`/collection/${owned[0]}`}
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
          {lookupEnabled() && <RefreshButton slug={fragrance.slug} />}
        </div>
      </header>

      <div className="mt-8">
        <FragranceProfile fragrance={fragrance} />
      </div>
    </article>
  );
}
