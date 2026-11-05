import { getPriceChecks, getStores, storeSearchUrl, type PriceRow } from "@/lib/prices/data";
import { formatPrice } from "@/lib/format";
import { CheckPricesButton, ManualPriceForm, PriceTable } from "./price-panel-client";

type Props = {
  fragrance: { id: string; brand: string; name: string; concentration: string | null };
  preferredSizeMl: number | null;
};

const STATUS_TEXT: Record<string, string> = {
  not_found: "Not carried / no full bottles",
  blocked: "Store refused the check",
  error: "Couldn't read the store",
};

export async function PricePanel({ fragrance, preferredSizeMl }: Props) {
  const [stores, checks] = await Promise.all([getStores(), getPriceChecks(fragrance.id)]);
  const latest = checks[0];
  const storeName = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  const query = [fragrance.brand, fragrance.name, fragrance.concentration].filter(Boolean).join(" ");

  const offers = (latest?.prices ?? []).filter((p): p is PriceRow & { price: number } => p.status === "ok" && p.price !== null);
  const statusByStore = new Map((latest?.prices ?? []).filter((p) => p.status !== "ok").map((p) => [p.store_id, p]));

  const history = checks
    .map((c) => {
      const inStock = c.prices.filter((p) => p.status === "ok" && p.price !== null && p.in_stock !== false);
      const best = inStock.sort((a, b) => a.price! - b.price!)[0];
      return best && { at: c.checked_at, price: best.price!, store: storeName[best.store_id] ?? best.store_id, size: best.size_ml };
    })
    .filter(Boolean)
    .slice(0, 6) as { at: string; price: number; store: string; size: number | null }[];

  return (
    <section id="prices" className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Prices</h2>
          <p className="mt-1 text-sm text-muted">
            {latest
              ? `Last checked ${new Date(latest.checked_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
              : "Not checked yet"}
          </p>
        </div>
        <CheckPricesButton fragranceId={fragrance.id} />
      </div>

      {offers.length > 0 ? (
        <PriceTable
          offers={offers.map((o) => ({
            id: o.id,
            store: storeName[o.store_id] ?? o.store_id,
            title: o.product_title,
            url: o.url,
            size_ml: o.size_ml,
            concentration: o.concentration,
            price: o.price,
            in_stock: o.in_stock,
            is_tester: o.is_tester,
            manual: o.source === "manual",
          }))}
          preferredSizeMl={preferredSizeMl}
        />
      ) : (
        latest && <p className="mt-4 text-sm text-muted">No full-bottle prices found in the last check.</p>
      )}

      <div className="mt-6">
        <h3 className="text-xs uppercase tracking-wider text-muted">Stores</h3>
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
          {stores.map((s) => {
            const status = statusByStore.get(s.id);
            const count = offers.filter((o) => o.store_id === s.id).length;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
                <span className="w-36 font-medium">{s.name}</span>
                <span className="flex-1 text-muted">
                  {s.mode === "auto"
                    ? !latest
                      ? "Checked automatically"
                      : count > 0
                        ? `${count} price${count === 1 ? "" : "s"} found`
                        : status
                          ? STATUS_TEXT[status.status]
                          : "Not checked"
                    : count > 0
                      ? `${count} price${count === 1 ? "" : "s"} added by you`
                      : "Doesn't allow automatic checks"}
                </span>
                <a
                  href={storeSearchUrl(s, query)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line px-3 py-1 text-xs hover:border-accent"
                >
                  Search {s.name} ↗
                </a>
                {s.mode === "link" && <ManualPriceForm fragranceId={fragrance.id} storeId={s.id} />}
              </li>
            );
          })}
        </ul>
      </div>

      {history.length > 1 && (
        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wider text-muted">Best price history</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.at} className="flex justify-between gap-3">
                <span className="text-muted">
                  {new Date(h.at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </span>
                <span>
                  {formatPrice(h.price)} <span className="text-muted">· {h.store}{h.size ? ` · ${h.size} ml` : ""}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
