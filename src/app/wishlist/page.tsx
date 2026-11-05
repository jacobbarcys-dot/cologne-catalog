import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { AccordBars } from "@/components/fragrance-profile";
import { formatPrice } from "@/lib/format";
import { getLatestBestPrices, getStores } from "@/lib/prices/data";
import { getWishlist, PRIORITIES } from "@/lib/wishlist";
import { WishlistEditor } from "./wishlist-editor";

export const metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-serif text-4xl">Wishlist</h1>
          <Link
            href="/search"
            className="shrink-0 rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            + Find a fragrance
          </Link>
        </div>
        <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-line" />}>
          <Wishlist />
        </Suspense>
      </main>
    </>
  );
}

async function Wishlist() {
  const items = await getWishlist();
  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-serif text-2xl">Nothing on your wishlist yet</p>
        <p className="mt-2 text-sm text-muted">
          Open any fragrance and tap <span className="font-medium">♡ Add to wishlist</span>.
        </p>
      </div>
    );
  }

  const [best, stores] = await Promise.all([getLatestBestPrices(items.map((i) => i.fragrance.id)), getStores()]);
  const storeName = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  return (
    <div className="mt-8 space-y-8">
      {PRIORITIES.map((p) => {
        const group = items.filter((i) => i.priority === p.id);
        if (group.length === 0) return null;
        return (
          <section key={p.id}>
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              {p.label} <span className="opacity-60">{group.length}</span>
            </h2>
            <ul className="mt-3 grid gap-4 md:grid-cols-2">
              {group.map((item) => {
                const deal = best[item.fragrance.id];
                const belowTarget = deal && item.target_price !== null && deal.price <= item.target_price;
                return (
                  <li key={item.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/fragrance/${item.fragrance.slug}`} className="group">
                        <p className="text-[11px] uppercase tracking-wider text-muted">{item.fragrance.brand}</p>
                        <p className="font-serif text-2xl leading-tight group-hover:text-accent">{item.fragrance.name}</p>
                        <p className="text-xs text-muted">
                          {[item.fragrance.concentration, item.desired_size_ml && `${item.desired_size_ml} ml wanted`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </Link>
                      {belowTarget && (
                        <span className="shrink-0 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
                          Below target!
                        </span>
                      )}
                    </div>

                    {item.fragrance.accords.length > 0 && (
                      <div className="mt-3">
                        <AccordBars accords={item.fragrance.accords.slice(0, 3)} compact />
                      </div>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted">Best price found</dt>
                        <dd>
                          {deal ? (
                            <>
                              {formatPrice(deal.price)}{" "}
                              <span className="text-xs text-muted">
                                {storeName[deal.store_id]}
                                {deal.size_ml ? ` · ${deal.size_ml} ml` : ""}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted">Not checked</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Target price</dt>
                        <dd>{item.target_price !== null ? formatPrice(item.target_price) : <span className="text-muted">—</span>}</dd>
                      </div>
                    </dl>
                    {item.notes && <p className="mt-3 text-sm text-muted">{item.notes}</p>}

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                      <Link
                        href={`/fragrance/${item.fragrance.slug}#prices`}
                        className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-accent"
                      >
                        Check prices
                      </Link>
                      <Link
                        href={`/collection/new?fragrance=${item.fragrance.id}&wishlist=${item.id}`}
                        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90"
                      >
                        I bought it
                      </Link>
                      <WishlistEditor item={item} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
