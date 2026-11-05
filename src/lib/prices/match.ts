// Deciding whether a store listing is the fragrance we're pricing, and reading
// size / concentration / tester details out of listing text.

export type Target = {
  brand: string;
  name: string;
  concentration: string | null;
  gender: string | null;
};

export function fold(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

const words = (s: string) => new Set(fold(s).split(" ").filter(Boolean));

const STOPWORDS = new Set(["pour", "homme", "for", "him", "men", "man", "de", "the", "eau", "le", "la", "by", "and"]);

// Words that mark a different flanker when they're not part of the target's name.
const FLANKER_WORDS = [
  "elixir", "intense", "intensely", "absolu", "absolute", "extreme", "sport", "night", "noir", "black",
  "blue", "bleu", "aqua", "acqua", "fraiche", "forte", "lumiere", "edition", "collector", "collectors",
  "silver", "gold", "ice", "paradise", "garden", "prive", "oud", "royal", "summer", "cologne", "parfum",
  "privee", "limited", "reserve", "nuit", "leather", "tobacco", "red", "white", "green", "platinum",
];

const NOT_A_FULL_BOTTLE = /\b(set|sets|sample|samples|travel|mini|minis|gift|vial|decant|after ?shave|deodorant|shower|gel|lotion|balm|body|refill|atomizer|coffret|soap|candle|hair)\b/;

const BRAND_ALIASES: Record<string, string[]> = {
  "yves saint laurent": ["ysl", "saint laurent"],
  "giorgio armani": ["armani", "emporio armani"],
  "dolce and gabbana": ["d and g", "dolce gabbana"],
  "jean paul gaultier": ["gaultier", "jpg"],
  dior: ["christian dior"],
  "parfums de marly": ["pdm", "marly"],
};

function hasPhrase(text: string, phrase: string) {
  return ` ${text} `.includes(` ${phrase} `);
}

export function mentionsBrand(title: string, brand: string) {
  const t = fold(title);
  const b = fold(brand);
  return hasPhrase(t, b) || (BRAND_ALIASES[b] ?? []).some((a) => hasPhrase(t, a));
}

export function detectConcentration(text: string): string | null {
  const t = fold(text);
  if (/\bextrait\b/.test(t)) return "Extrait de Parfum";
  if (/\belixir\b/.test(t)) return "Elixir";
  if (/\b(edp|eau de parfum)\b/.test(t)) return /\bintense\b/.test(t) ? "EDP Intense" : "EDP";
  if (/\b(edt|eau de toilette)\b/.test(t)) return /\bintense\b/.test(t) ? "EDT Intense" : "EDT";
  if (/\b(edc|eau de cologne)\b/.test(t)) return "EDC";
  if (/\bparfum\b/.test(t)) return "Parfum";
  return null;
}

// Size in ml, rounded to the usual bottle sizes (3.4 oz -> 100 ml).
export function detectSizeMl(text: string): number | null {
  const t = text.toLowerCase();
  const ml = t.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (ml) return Math.round(Number(ml[1]));
  const oz = t.match(/(\d*\.?\d+)\s*(?:fl\.?\s*)?oz\b/);
  if (oz) {
    const v = Number(oz[1]) * 29.5735;
    return v >= 25 ? Math.round(v / 5) * 5 : Math.round(v);
  }
  return null;
}

export const isTester = (text: string) => /\b(tester|unboxed)\b/i.test(text);
export const isFullBottle = (text: string, sizeMl: number | null) =>
  !NOT_A_FULL_BOTTLE.test(fold(text)) && (sizeMl === null || sizeMl >= 30);

// Is this listing title the target fragrance (not a flanker, not the other gender)?
export function titleMatches(title: string, target: Target) {
  if (!mentionsBrand(title, target.brand)) return false;
  // "Eau de Parfum" etc. describe the concentration, not a flanker.
  const t = words(fold(title).replace(/\beau de (parfum|toilette|cologne)\b/g, " "));
  const nameWords = [...words(target.name)].filter((w) => !STOPWORDS.has(w));
  if (nameWords.length === 0 || !nameWords.every((w) => t.has(w))) return false;

  const allowed = new Set([...words(target.name), ...words(target.brand), ...words(target.concentration ?? "")]);
  if (FLANKER_WORDS.some((w) => t.has(w) && !allowed.has(w))) return false;

  if (target.gender === "Men" && ["women", "woman", "femme", "her"].some((w) => t.has(w))) return false;
  if (target.gender === "Women" && ["men", "homme", "him"].some((w) => t.has(w)) && !t.has("women")) return false;
  return true;
}

// Concentration agreement: unknown on either side counts as a match.
export function concentrationMatches(found: string | null, wanted: string | null) {
  if (!found || !wanted) return true;
  return found === wanted;
}

export function searchQuery(target: Target) {
  return `${target.brand} ${target.name}`.replace(/\s+/g, " ").trim();
}
