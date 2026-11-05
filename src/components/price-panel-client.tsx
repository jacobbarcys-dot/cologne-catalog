"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { addManualPrice, checkPrices, removePrice } from "@/app/prices/actions";

const usd = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function CheckPricesButton({ fragranceId }: { fragranceId: string }) {
  const [state, action, pending] = useActionState(checkPrices.bind(null, fragranceId), undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Checking stores…" : "Check prices"}
      </button>
      {state?.error && <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>}
      {state?.message && <span className="text-xs text-muted">{state.message}</span>}
    </form>
  );
}

type TableOffer = {
  id: string;
  store: string;
  title: string | null;
  url: string | null;
  size_ml: number | null;
  concentration: string | null;
  price: number;
  in_stock: boolean | null;
  is_tester: boolean;
  manual: boolean;
};

export function PriceTable({ offers, preferredSizeMl }: { offers: TableOffer[]; preferredSizeMl: number | null }) {
  const sizes = useMemo(
    () => [...new Set(offers.map((o) => o.size_ml).filter((s): s is number => s !== null))].sort((a, b) => a - b),
    [offers],
  );
  const initial = preferredSizeMl && sizes.includes(preferredSizeMl) ? preferredSizeMl : null;
  const [size, setSize] = useState<number | null>(initial);
  const [hideTesters, setHideTesters] = useState(false);
  const [, startTransition] = useTransition();

  const shown = offers
    .filter((o) => size === null || o.size_ml === size)
    .filter((o) => !hideTesters || !o.is_tester)
    .sort((a, b) => Number(a.in_stock === false) - Number(b.in_stock === false) || a.price - b.price);
  const best = shown.find((o) => o.in_stock !== false);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={size === null} onClick={() => setSize(null)}>All sizes</Chip>
        {sizes.map((s) => (
          <Chip key={s} active={size === s} onClick={() => setSize(s)}>
            {s} ml
          </Chip>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={hideTesters} onChange={(e) => setHideTesters(e.target.checked)} />
          Hide testers
        </label>
      </div>

      {best && (
        <p className="mt-4 rounded-xl bg-accent/10 px-4 py-3 text-sm">
          Best price: <span className="font-serif text-2xl">{usd(best.price)}</span> at{" "}
          <span className="font-medium">{best.store}</span>
          {best.size_ml ? ` · ${best.size_ml} ml` : ""}
          {best.is_tester ? " · tester" : ""}
        </p>
      )}

      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
        {shown.map((o) => (
          <li
            key={o.id}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm ${o === best ? "bg-accent/5" : ""} ${o.in_stock === false ? "opacity-55" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{o.store}</p>
              <p className="truncate text-xs text-muted">
                {[o.size_ml && `${o.size_ml} ml`, o.concentration, o.is_tester && "Tester", o.in_stock === false && "Out of stock", o.manual && "added by you"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span className="font-serif text-xl">{usd(o.price)}</span>
            {o.url ? (
              <a href={o.url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                View
              </a>
            ) : (
              <span className="w-8" />
            )}
            {o.manual && (
              <button
                type="button"
                aria-label="Remove price"
                onClick={() => startTransition(() => removePrice(o.id))}
                className="text-xs text-muted hover:text-red-600"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-3 text-sm text-muted">No prices for this size.</p>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs ${active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
    >
      {children}
    </button>
  );
}

export function ManualPriceForm({ fragranceId, storeId }: { fragranceId: string; storeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addManualPrice.bind(null, fragranceId, storeId), undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-accent underline">
        + Add price
      </button>
    );
  }
  return (
    <form action={action} className="flex w-full flex-wrap items-center gap-2 pt-1">
      <input name="price" type="number" step="0.01" min="0" required placeholder="Price $" aria-label="Price" className="w-24 rounded-lg border border-line bg-paper px-2 py-1 text-base sm:text-sm" />
      <input name="size" type="number" step="any" min="0" placeholder="Size" aria-label="Size" className="w-20 rounded-lg border border-line bg-paper px-2 py-1 text-base sm:text-sm" />
      <select name="size_unit" aria-label="Size unit" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">
        <option value="ml">ml</option>
        <option value="oz">oz</option>
      </select>
      <input name="url" type="url" placeholder="Link (optional)" aria-label="Product link" className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-base sm:text-sm" />
      <label className="flex items-center gap-1 text-xs text-muted">
        <input type="checkbox" name="tester" /> Tester
      </label>
      <button disabled={pending} className="rounded-full bg-ink px-3 py-1 text-xs text-paper disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted">
        Cancel
      </button>
      {state?.error && <span className="w-full text-xs text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  );
}
