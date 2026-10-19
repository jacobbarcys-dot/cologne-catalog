"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BottleArt } from "@/components/bottle-art";
import { ROTATIONS, type Bottle } from "@/lib/constants";

const SORTS = {
  added: { label: "Recently added", fn: (a: Bottle, b: Bottle) => b.created_at.localeCompare(a.created_at) },
  name: { label: "Name", fn: (a: Bottle, b: Bottle) => a.fragrance.name.localeCompare(b.fragrance.name) },
  brand: {
    label: "Brand",
    fn: (a: Bottle, b: Bottle) =>
      a.fragrance.brand.localeCompare(b.fragrance.brand) || a.fragrance.name.localeCompare(b.fragrance.name),
  },
  rating: { label: "My rating", fn: (a: Bottle, b: Bottle) => (b.my_rating ?? 0) - (a.my_rating ?? 0) },
  fill: { label: "Emptiest first", fn: (a: Bottle, b: Bottle) => (a.fill_level ?? 100) - (b.fill_level ?? 100) },
} as const;
type SortKey = keyof typeof SORTS;

export function CollectionBrowser({ bottles }: { bottles: Bottle[] }) {
  const [rotation, setRotation] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("brand");

  // Only show tabs for rotations that have bottles.
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    bottles.forEach((b) => b.rotation && counts.set(b.rotation, (counts.get(b.rotation) ?? 0) + 1));
    return [
      { id: "all", label: "All", count: bottles.length },
      ...ROTATIONS.filter((r) => counts.has(r.id)).map((r) => ({ ...r, count: counts.get(r.id)! })),
    ];
  }, [bottles]);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return bottles
      .filter((b) => rotation === "all" || b.rotation === rotation)
      .filter((b) => {
        const hay = `${b.fragrance.brand} ${b.fragrance.name} ${b.concentration ?? ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort(SORTS[sort].fn);
  }, [bottles, rotation, query, sort]);

  if (bottles.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-serif text-2xl">Your shelf is empty</p>
        <p className="mt-2 text-sm text-muted">Add your first bottle to get started.</p>
        <Link href="/collection/new" className="mt-4 inline-block text-accent underline">
          Add a bottle
        </Link>
      </div>
    );
  }

  return (
    <section className="mt-8">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Rotation">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={rotation === t.id}
            onClick={() => setRotation(t.id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
              rotation === t.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
            }`}
          >
            {t.label} <span className="opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your collection"
          aria-label="Search your collection"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-base outline-none focus:border-accent sm:text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort by"
          className="rounded-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 text-center text-muted">No bottles match.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((b) => (
            <li key={b.id}>
              <BottleCard bottle={b} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BottleCard({ bottle }: { bottle: Bottle }) {
  const { fragrance } = bottle;
  const rotationLabel = ROTATIONS.find((r) => r.id === bottle.rotation)?.label;
  const details = [bottle.concentration ?? fragrance.concentration, bottle.size_ml && `${bottle.size_ml} ml`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/collection/${bottle.id}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="flex justify-center rounded-xl bg-paper py-4">
        <BottleArt
          rotation={bottle.rotation}
          fill={bottle.fill_level}
          label={`${fragrance.brand} ${fragrance.name}`}
          className="h-24 w-20"
        />
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wider text-muted">{fragrance.brand}</p>
      <p className="font-serif text-xl leading-tight">{fragrance.name}</p>
      {details && <p className="mt-1 text-xs text-muted">{details}</p>}
      <div className="mt-auto flex items-center justify-between pt-3 text-xs">
        {rotationLabel ? (
          <span className="rounded-full bg-paper px-2 py-0.5 text-muted">{rotationLabel}</span>
        ) : (
          <span />
        )}
        {bottle.my_rating && <span className="font-medium">★ {bottle.my_rating}/10</span>}
      </div>
    </Link>
  );
}
