export type Offer = {
  product_title: string;
  url: string;
  size_ml: number | null;
  concentration: string | null;
  price: number;
  in_stock: boolean | null;
  is_tester: boolean;
};

export type StoreResult =
  | { status: "ok"; offers: Offer[] }
  | { status: "not_found" }
  | { status: "blocked" | "error"; error: string };

export const USER_AGENT = "Mozilla/5.0 (compatible; CologneCatalog/1.0; personal price check)";

export class BlockedError extends Error {}

export async function fetchText(url: string, timeoutMs = 12_000) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  // The store is refusing automated requests; respect that rather than retrying.
  if (res.status === 403 || res.status === 429) throw new BlockedError(`HTTP ${res.status}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
