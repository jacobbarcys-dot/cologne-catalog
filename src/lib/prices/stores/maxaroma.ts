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

// MaxAroma: each size is its own product page ("pid"). Search results link to
// one size; its page lists the other sizes, and each page's structured data
// (JSON-LD) carries that size's price and stock.

const ORIGIN = "https://www.maxaroma.com";

type PageOffer = { price: number; inStock: boolean; description: string };

function pageOffer(html: string): PageOffer | null {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (item?.["@type"] !== "Product") continue;
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        const price = Number(offer?.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        return {
          price,
          inStock: String(offer?.availability ?? "").includes("InStock"),
          description: String(item.description ?? ""),
        };
      }
    } catch {
      // ignore malformed blocks
    }
  }
  return null;
}

function sizeOptions(html: string) {
  const select = html.match(/<select[^>]*name="sizeoption"[\s\S]*?<\/select>/)?.[0] ?? "";
  return [...select.matchAll(/<option value="(\d+)"[^>]*>([^<]+)<\/option>/g)].map((m) => ({
    pid: m[1],
    label: m[2].trim(),
  }));
}

export async function checkMaxAroma(target: Target): Promise<StoreResult> {
  const q = encodeURIComponent(searchQuery(target)).replace(/%20/g, "+");
  const html = await fetchText(`${ORIGIN}/p4u/key-${q}/view`);

  const products = [
    ...html.matchAll(/<div class="product-name"[^>]*>\s*<a href="([^"]+)"[\s\S]*?<u>([^<]+)<\/u>/g),
  ]
    .map((m) => ({ url: m[1], title: m[2].trim() }))
    .filter((p) => p.url.startsWith(ORIGIN) && titleMatches(p.title, target))
    .slice(0, 2);
  if (products.length === 0) return { status: "not_found" };

  const offers: Offer[] = [];
  const seen = new Set<string>();

  for (const product of products) {
    const page = await fetchText(product.url);
    const options = sizeOptions(page)
      .map((o) => ({ ...o, size: detectSizeMl(o.label), conc: detectConcentration(o.label) }))
      .filter((o) => isFullBottle(o.label, o.size) && concentrationMatches(o.conc, target.concentration))
      .filter((o) => !seen.has(o.pid))
      .slice(0, 6);

    const settled = await Promise.allSettled(
      options.map(async (o) => {
        const url = product.url.replace(/\/pid\/\d+\//, `/pid/${o.pid}/`);
        const offer = pageOffer(url === product.url ? page : await fetchText(url));
        return offer && { option: o, url, offer };
      }),
    );
    for (const r of settled) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const { option, url, offer } = r.value;
      seen.add(option.pid);
      // The option label may omit the concentration; the size's own page has it.
      const conc = option.conc ?? detectConcentration(offer.description);
      // Product groups here mix EDT and EDP, so an unconfirmed concentration is skipped.
      if ((target.concentration && !conc) || !concentrationMatches(conc, target.concentration)) continue;
      offers.push({
        product_title: `${product.title} — ${option.label}`,
        url,
        size_ml: option.size,
        concentration: conc,
        price: offer.price,
        in_stock: offer.inStock,
        is_tester: isTester(option.label),
      });
    }
  }

  return offers.length ? { status: "ok", offers } : { status: "not_found" };
}
