export const ML_PER_OZ = 29.5735;

export function formatSize(ml: number | null) {
  if (!ml) return null;
  const oz = ml / ML_PER_OZ;
  return `${Number.isInteger(ml) ? ml : ml.toFixed(1)} ml · ${oz.toFixed(1)} oz`;
}

export function formatPrice(value: number | null) {
  if (value === null) return null;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function slugify(...parts: (string | null | undefined)[]) {
  return parts
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
