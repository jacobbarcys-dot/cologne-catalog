import {
  concentrationMatches,
  detectConcentration,
  detectSizeMl,
  isFullBottle,
  isTester,
  searchQuery,
  titleMatches,
  type Target,
} from "../match";
import { fetchText, type Offer, type StoreResult } from "../types";

// Shopify stores (Aura, Venba): find product handles, then read each
// product's variants (size / price / availability) from /products/<handle>.js.

type ShopifyProduct = {
  title: string;
  handle: string;
  variants: { title: string; price: number; available: boolean }[];
};

async function productOffers(origin: string, handle: string, target: Target): Promise<Offer[]> {
  const p: ShopifyProduct = JSON.parse(await fetchText(`${origin}/products/${handle}.js`));
  if (!titleMatches(p.title, target)) return [];
  const productConc = detectConcentration(p.title);

  return p.variants.flatMap((v) => {
    const label = `${p.title} ${v.title}`;
    const size = detectSizeMl(v.title) ?? detectSizeMl(p.title);
    const conc = detectConcentration(v.title) ?? productConc;
    if (!isFullBottle(label, size) || !concentrationMatches(conc, target.concentration)) return [];
    return [
      {
        product_title: `${p.title} — ${v.title}`,
        url: `${origin}/products/${handle}`,
        size_ml: size,
        concentration: conc,
        price: v.price / 100,
        in_stock: v.available,
        is_tester: isTester(label),
      },
    ];
  });
}

async function offersFor(origin: string, handles: string[], target: Target): Promise<StoreResult> {
  const settled = await Promise.allSettled(handles.slice(0, 6).map((h) => productOffers(origin, h, target)));
  const offers = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return offers.length ? { status: "ok", offers } : { status: "not_found" };
}

// Aura: Shopify's predictive search JSON gives titles + handles.
export async function checkAura(target: Target): Promise<StoreResult> {
  const origin = "https://www.aurafragrance.com";
  const q = encodeURIComponent(searchQuery(target));
  const data = JSON.parse(
    await fetchText(`${origin}/search/suggest.json?q=${q}&resources[type]=product&resources[limit]=10`),
  );
  const handles: string[] = (data?.resources?.results?.products ?? [])
    .filter((p: { title: string }) => titleMatches(p.title, target))
    .map((p: { handle: string }) => p.handle);
  return offersFor(origin, handles, target);
}

// Venba: read handles from the normal search results page, in result order.
export async function checkVenba(target: Target): Promise<StoreResult> {
  const origin = "https://www.venbafragrance.com";
  const q = encodeURIComponent(searchQuery(target)).replace(/%20/g, "+");
  const html = await fetchText(`${origin}/search?q=${q}&type=product`);
  const handles = [...new Set([...html.matchAll(/href="\/products\/([^"?#/]+)/g)].map((m) => m[1]))].filter(
    (h) => !h.startsWith("sample-") && !h.includes("gift-card"),
  );
  return offersFor(origin, handles, target);
}
