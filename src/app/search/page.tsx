import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { AccordBars } from "@/components/fragrance-profile";
import { getCatalog } from "@/lib/collection";
import { lookupEnabled, searchCatalog, type SearchHit } from "@/lib/fragrance";
import { LookupButton } from "./lookup-button";

export const metadata = { title: "Search Fragrances" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="font-serif text-4xl">Search Fragrances</h1>
        <Suspense fallback={<div className="mt-6 h-12 animate-pulse rounded-full bg-line" />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();

  return (
    <>
      <form action="/search" className="mt-6 flex gap-3" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Try “dior sauvage” or “creed aventus”"
          aria-label="Search fragrances"
          autoFocus={!q}
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3 text-base outline-none focus:border-accent"
        />
        <button className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:opacity-90">
          Search
        </button>
      </form>
      {q ? <QueryResults q={q} /> : <Catalog />}
    </>
  );
}

async function QueryResults({ q }: { q: string }) {
  const hits = await searchCatalog(q);
  const enabled = lookupEnabled();

  return (
    <section className="mt-8">
      {hits.length > 0 && (
        <>
          <p className="text-sm text-muted">
            {hits.length} in your catalog for “{q}”
          </p>
          <HitGrid hits={hits} />
        </>
      )}

      <div className="mt-8 rounded-2xl border border-dashed border-line p-6 text-center">
        <p className="font-serif text-2xl">
          {hits.length > 0 ? "Not the one you meant?" : `“${q}” isn't in the catalog yet`}
        </p>
        {enabled ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Look it up live: accords, notes, ratings, and what people say.
            </p>
            <LookupButton q={q} />
          </>
        ) : (
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Live lookup switches on once an NVIDIA or Gemini API key is added. Until then, ask Claude to add
            this fragrance to the catalog.
          </p>
        )}
      </div>
    </section>
  );
}

async function Catalog() {
  const catalog = await getCatalog();
  if (catalog.length === 0) return null;
  return (
    <section className="mt-8">
      <p className="text-sm text-muted">{catalog.length} fragrances in the catalog</p>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {catalog.map((f) => (
          <li key={f.id}>
            <Link href={`/fragrance/${f.slug}`} className="flex items-baseline gap-3 px-5 py-3 hover:bg-paper">
              <span className="w-36 shrink-0 truncate text-xs uppercase tracking-wider text-muted">{f.brand}</span>
              <span className="font-serif text-lg">{f.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted">
                {[f.concentration, f.release_year].filter(Boolean).join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HitGrid({ hits }: { hits: SearchHit[] }) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((f) => (
        <li key={f.id}>
          <Link
            href={`/fragrance/${f.slug}`}
            className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent"
          >
            <p className="text-[11px] uppercase tracking-wider text-muted">{f.brand}</p>
            <p className="font-serif text-2xl leading-tight">{f.name}</p>
            <p className="text-xs text-muted">{[f.concentration, f.release_year].filter(Boolean).join(" · ")}</p>
            {f.accords.length > 0 && (
              <div className="mt-3">
                <AccordBars accords={f.accords.slice(0, 4)} compact />
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
