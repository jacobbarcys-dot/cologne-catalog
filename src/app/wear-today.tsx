"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { ShelfItem } from "@/lib/collection";

type Season = "winter" | "spring" | "summer" | "fall";

function seasonFor(month: number): Season {
  if (month === 11 || month <= 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "fall";
}

// The current time only exists in the browser; render nothing on the server.
const subscribe = () => () => {};
const useNow = () =>
  useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 3_600_000), () => null);

export function WearToday({ shelf }: { shelf: ShelfItem[] }) {
  const hour = useNow();
  const [offset, setOffset] = useState(0);
  if (hour === null) return <div className="h-40 animate-pulse rounded-2xl bg-line" />;

  const now = new Date(hour * 3_600_000);
  const season = seasonFor(now.getMonth());
  const h = now.getHours();
  const time: "day" | "night" = h >= 6 && h < 18 ? "day" : "night";

  const ranked = shelf
    .filter((b) => b.fill_level !== 0)
    .map((b) => {
      const s = b.fragrance.seasons?.[season] ?? 50;
      const t = b.fragrance.time_of_day?.[time] ?? 50;
      const rotationBonus = b.rotation === season ? 15 : b.rotation === "everyday" ? 5 : 0;
      return { b, score: s * 0.6 + t * 0.4 + rotationBonus };
    })
    .sort((a, z) => z.score - a.score);

  if (ranked.length === 0) return null;
  // "Something else" rotates through the top picks.
  const pool = ranked.slice(0, Math.min(6, ranked.length));
  const picks = Array.from({ length: Math.min(3, pool.length) }, (_, i) => pool[(i + offset) % pool.length].b);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">What to wear today</h2>
        <span className="text-xs capitalize text-muted">
          {season} {time === "day" ? "day" : "evening"}
        </span>
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {picks.map((b, i) => (
          <li key={b.bottle_id}>
            <Link
              href={`/collection/${b.bottle_id}`}
              className={`block h-full rounded-xl border p-4 transition hover:border-accent ${i === 0 ? "border-accent bg-accent/5" : "border-line"}`}
            >
              <p className="text-[11px] uppercase tracking-wider text-muted">{i === 0 ? "Top pick · " : ""}{b.fragrance.brand}</p>
              <p className="font-serif text-xl leading-tight">{b.fragrance.name}</p>
              <p className="mt-1 text-xs capitalize text-muted">
                {b.fragrance.accords?.slice(0, 2).map((a) => a.name).join(" · ")}
              </p>
            </Link>
          </li>
        ))}
      </ol>
      {pool.length > 3 && (
        <button type="button" onClick={() => setOffset((o) => o + 1)} className="mt-3 text-sm text-muted underline">
          Something else
        </button>
      )}
    </section>
  );
}
