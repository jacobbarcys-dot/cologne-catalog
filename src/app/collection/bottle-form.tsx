"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { FormState } from "./actions";
import { CONCENTRATIONS, ROTATIONS, type Bottle, type FragranceSummary } from "@/lib/constants";

type Props = {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  stores: string[];
  catalog?: FragranceSummary[]; // create mode only
  bottle?: Bottle; // edit mode only
  cancelHref: string;
};

const input =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent sm:text-sm";
const label = "mb-1 block text-xs font-medium uppercase tracking-wider text-muted";

export function BottleForm({ action, stores, catalog, bottle, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [fill, setFill] = useState(bottle?.fill_level ?? 100);

  return (
    <form action={formAction} className="space-y-6">
      {catalog && <FragrancePicker catalog={catalog} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>Rotation</span>
          <div className="flex flex-wrap gap-2">
            {ROTATIONS.map((r) => (
              <label key={r.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="rotation"
                  value={r.id}
                  defaultChecked={bottle?.rotation === r.id}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-line px-3 py-1.5 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  {r.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="concentration" className={label}>Concentration</label>
          <select
            id="concentration"
            name="concentration"
            defaultValue={bottle?.concentration ?? bottle?.fragrance.concentration ?? ""}
            className={input}
          >
            <option value="">—</option>
            {CONCENTRATIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="size_ml" className={label}>Bottle size</label>
          <div className="flex gap-2">
            <input
              id="size_ml"
              name="size_ml"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              defaultValue={bottle?.size_ml ?? ""}
              placeholder="100"
              className={input}
            />
            <select name="size_unit" defaultValue="ml" className={`${input} w-24`} aria-label="Size unit">
              <option value="ml">ml</option>
              <option value="oz">oz</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="fill_level" className={label}>How full · {fill}%</label>
          <input
            id="fill_level"
            name="fill_level"
            type="range"
            min="0"
            max="100"
            step="5"
            value={fill}
            onChange={(e) => setFill(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--accent)]"
          />
        </div>

        <div>
          <label htmlFor="purchase_price" className={label}>Price paid (USD)</label>
          <input
            id="purchase_price"
            name="purchase_price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={bottle?.purchase_price ?? ""}
            placeholder="0.00"
            className={input}
          />
        </div>

        <div>
          <label htmlFor="purchase_date" className={label}>Purchase date</label>
          <input
            id="purchase_date"
            name="purchase_date"
            type="date"
            defaultValue={bottle?.purchase_date ?? ""}
            className={input}
          />
        </div>

        <div>
          <label htmlFor="purchased_from" className={label}>Bought from</label>
          <input
            id="purchased_from"
            name="purchased_from"
            list="store-options"
            defaultValue={bottle?.purchased_from ?? ""}
            placeholder="Store or person"
            className={input}
          />
          <datalist id="store-options">
            {stores.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="my_rating" className={label}>My rating (1–10)</label>
          <select id="my_rating" name="my_rating" defaultValue={bottle?.my_rating ?? ""} className={input}>
            <option value="">Not rated</option>
            {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={label}>Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={bottle?.notes ?? ""}
          placeholder="Batch code, how it performs on you, compliments…"
          className={input}
        />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : bottle ? "Save changes" : "Add to collection"}
        </button>
        <Link href={cancelHref} className="rounded-full border border-line px-6 py-2.5 text-sm hover:bg-surface">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FragrancePicker({ catalog }: { catalog: FragranceSummary[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FragranceSummary | null>(null);
  const [addingNew, setAddingNew] = useState(catalog.length === 0);

  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return catalog.slice(0, 8);
    return catalog
      .filter((f) => {
        const hay = `${f.brand} ${f.name} ${f.concentration ?? ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 8);
  }, [catalog, query]);

  if (selected) {
    return (
      <div>
        <span className={label}>Fragrance</span>
        <div className="flex items-center justify-between rounded-xl border border-accent bg-surface px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{selected.brand}</p>
            <p className="font-serif text-xl">
              {selected.name} <span className="font-sans text-sm text-muted">{selected.concentration}</span>
            </p>
          </div>
          <button type="button" onClick={() => setSelected(null)} className="text-sm text-muted underline">
            Change
          </button>
        </div>
        <input type="hidden" name="fragrance_id" value={selected.id} />
      </div>
    );
  }

  if (addingNew) {
    return (
      <div className="space-y-3">
        <span className={label}>New fragrance</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="new_brand" placeholder="Brand (e.g. Creed)" className={input} required />
          <input name="new_name" placeholder="Name (e.g. Aventus)" className={input} required />
        </div>
        <p className="text-xs text-muted">Set the concentration below. Full fragrance details come with search in Step 3.</p>
        {catalog.length > 0 && (
          <button type="button" onClick={() => setAddingNew(false)} className="text-sm text-muted underline">
            Pick from catalog instead
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="fragrance-search" className={label}>Fragrance</label>
      <input
        id="fragrance-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your catalog…"
        className={input}
        autoComplete="off"
      />
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {matches.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setSelected(f)}
              className="flex w-full items-baseline gap-2 px-4 py-2.5 text-left hover:bg-paper"
            >
              <span className="text-xs uppercase tracking-wider text-muted">{f.brand}</span>
              <span>{f.name}</span>
              <span className="ml-auto text-xs text-muted">{f.concentration}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            className="w-full px-4 py-2.5 text-left text-sm text-accent hover:bg-paper"
          >
            + Not listed? Add a new fragrance
          </button>
        </li>
      </ul>
    </div>
  );
}
