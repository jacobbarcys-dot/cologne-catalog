import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Store = {
  id: string;
  name: string;
  base_url: string;
  mode: "auto" | "link";
  search_url: string | null;
};

export type PriceRow = {
  id: string;
  store_id: string;
  status: "ok" | "not_found" | "blocked" | "error";
  product_title: string | null;
  url: string | null;
  size_ml: number | null;
  concentration: string | null;
  price: number | null;
  in_stock: boolean | null;
  is_tester: boolean;
  error: string | null;
  source: "auto" | "manual";
};

export type PriceCheck = { id: string; checked_at: string; prices: PriceRow[] };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getStores(): Promise<Store[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("cologne_stores")
    .select("id, name, base_url, mode, search_url")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as Store[];
}

// The user's checks for one fragrance, newest first, with their prices.
export async function getPriceChecks(fragranceId: string, limit = 10): Promise<PriceCheck[]> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cologne_price_checks")
    .select(
      "id, checked_at, prices:cologne_prices (id, store_id, status, product_title, url, size_ml, concentration, price, in_stock, is_tester, error, source)",
    )
    .eq("user_id", user.id)
    .eq("fragrance_id", fragranceId)
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    checked_at: c.checked_at,
    prices: (c.prices ?? []).map((p) => ({ ...p, size_ml: num(p.size_ml), price: num(p.price) }) as PriceRow),
  }));
}

export type BestPrice = { price: number; store_id: string; size_ml: number | null; checked_at: string };

// Cheapest in-stock full bottle from each fragrance's latest check (for wishlist cards).
export async function getLatestBestPrices(fragranceIds: string[]): Promise<Record<string, BestPrice>> {
  if (fragranceIds.length === 0) return {};
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("cologne_price_checks")
    .select("fragrance_id, checked_at, prices:cologne_prices (store_id, status, price, in_stock, size_ml)")
    .eq("user_id", user.id)
    .in("fragrance_id", fragranceIds)
    .order("checked_at", { ascending: false });

  const best: Record<string, BestPrice> = {};
  const seen = new Set<string>();
  for (const check of data ?? []) {
    if (seen.has(check.fragrance_id)) continue; // only the latest check per fragrance
    seen.add(check.fragrance_id);
    for (const p of check.prices ?? []) {
      const price = num(p.price);
      if (p.status !== "ok" || price === null || p.in_stock === false) continue;
      const current = best[check.fragrance_id];
      if (!current || price < current.price) {
        best[check.fragrance_id] = { price, store_id: p.store_id, size_ml: num(p.size_ml), checked_at: check.checked_at };
      }
    }
  }
  return best;
}

export function storeSearchUrl(store: Store, query: string) {
  if (!store.search_url) return store.base_url;
  return store.search_url.replace("{q}", encodeURIComponent(query).replace(/%20/g, "+"));
}
